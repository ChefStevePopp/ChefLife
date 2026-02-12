/**
 * IntegrationFieldMapper
 *
 * Modal for mapping external integration fields to ChefLife standard data slots.
 * Used in two contexts:
 * 1. Post-connection flow: appears after successful integration connection
 * 2. Settings re-map: accessible from TeamSettings → Roster for adjustments
 *
 * For known integrations (with a template), fields are pre-populated.
 * For unknown integrations, admin builds the mapping from a raw sample payload.
 *
 * @diagnostics src/features/integrations/components/IntegrationFieldMapper.tsx
 * @pattern L5 modal
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Check,
  ArrowRight,
  Info,
  Loader2,
  Unlink,
  Link2,
  Zap,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// ─── TYPES ───────────────────────────────────────────────────────────────────

/** A single field mapping: ChefLife slot → external field path */
export interface FieldMapping {
  path: string;       // Dot-notation path into external_data JSONB
  label: string;      // What the external platform calls this field
  type: string;       // Data type hint: 'text', 'number', 'date'
}

/** The full field map: keys are ChefLife standard slots */
export type FieldMap = Record<string, FieldMapping>;

/** ChefLife standard slot definition (from _cheflife_standard_slots template) */
interface StandardSlot {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
}

/** Props */
interface IntegrationFieldMapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fieldMap: FieldMap) => void;
  integrationKey: string;          // '7shifts', 'deputy', etc.
  integrationName: string;         // Display name
  organizationId: string;
  /** Raw sample payload from integration (overrides template sample) */
  samplePayload?: Record<string, any>;
  /** Existing field map to edit (for re-mapping flow) */
  existingFieldMap?: FieldMap;
  /** If true, show "Skip" instead of "Cancel" (connection flow context) */
  isConnectionFlow?: boolean;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Extract flat field keys from a nested object (1 level deep for now) */
function extractFieldKeys(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Go one level deep for nested objects
      keys.push(...extractFieldKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

/** Get a human-readable label from a field key */
function fieldKeyToLabel(key: string): string {
  return key
    .split(".")
    .pop()!
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Infer type from a sample value */
function inferType(value: any): string {
  if (value === null || value === undefined) return "text";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
    if (/^[\d.]+$/.test(value)) return "number";
  }
  return "text";
}

/** Get nested value from object by dot path */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((prev, curr) => prev?.[curr], obj);
}

// =============================================================================
// COMPONENT
// =============================================================================

export const IntegrationFieldMapper: React.FC<IntegrationFieldMapperProps> = ({
  isOpen,
  onClose,
  onSave,
  integrationKey,
  integrationName,
  organizationId,
  samplePayload: propSamplePayload,
  existingFieldMap,
  isConnectionFlow = false,
}) => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [standardSlots, setStandardSlots] = useState<StandardSlot[]>([]);
  const [samplePayload, setSamplePayload] = useState<Record<string, any>>({});
  const [templateFieldMap, setTemplateFieldMap] = useState<FieldMap>({});
  const [mappings, setMappings] = useState<Record<string, string>>({}); // slot → external field path
  const [hasTemplate, setHasTemplate] = useState(false);

  // ─── LOAD DATA ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setIsLoading(true);
      try {
        // 1. Load ChefLife standard slots
        const { data: slotsRow } = await supabase
          .from("integration_templates")
          .select("default_field_map")
          .eq("key", "_cheflife_standard_slots")
          .single();

        if (slotsRow?.default_field_map) {
          const slots: StandardSlot[] = Object.entries(
            slotsRow.default_field_map as Record<string, any>
          ).map(([key, def]) => ({
            key,
            label: def.label,
            type: def.type,
            required: def.required ?? false,
            description: def.description ?? "",
          }));
          // Sort: required first, then alphabetical
          slots.sort((a, b) => {
            if (a.required !== b.required) return a.required ? -1 : 1;
            return a.label.localeCompare(b.label);
          });
          setStandardSlots(slots);
        }

        // 2. Load integration template (if exists)
        const { data: templateRow } = await supabase
          .from("integration_templates")
          .select("default_field_map, sample_payload")
          .eq("key", integrationKey)
          .single();

        if (templateRow) {
          setHasTemplate(true);
          setTemplateFieldMap(templateRow.default_field_map as FieldMap);
          // Use template sample unless prop overrides
          if (!propSamplePayload && templateRow.sample_payload) {
            setSamplePayload(templateRow.sample_payload as Record<string, any>);
          }
        }

        // Use prop sample payload if provided
        if (propSamplePayload) {
          setSamplePayload(propSamplePayload);
        }

        // 3. Initialize mappings from: existing > template > empty
        const source = existingFieldMap || (templateRow?.default_field_map as FieldMap) || {};
        const initial: Record<string, string> = {};
        for (const [slot, mapping] of Object.entries(source)) {
          if (mapping?.path) {
            initial[slot] = mapping.path;
          }
        }
        setMappings(initial);
      } catch (err) {
        console.error("Error loading field mapper data:", err);
        toast.error("Failed to load mapping configuration");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isOpen, integrationKey, propSamplePayload, existingFieldMap]);

  // ─── DERIVED STATE ─────────────────────────────────────────────────────────

  /** All available external field keys from the sample payload */
  const externalFields = useMemo(() => {
    if (!samplePayload || Object.keys(samplePayload).length === 0) return [];
    return extractFieldKeys(samplePayload);
  }, [samplePayload]);

  /** Count of mapped vs total slots */
  const mappedCount = useMemo(
    () => Object.values(mappings).filter(Boolean).length,
    [mappings]
  );

  /** Fields already used in a mapping (prevent duplicate assignment) */
  const usedPaths = useMemo(() => new Set(Object.values(mappings).filter(Boolean)), [mappings]);

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const handleMappingChange = (slotKey: string, externalPath: string) => {
    setMappings((prev) => ({
      ...prev,
      [slotKey]: externalPath,
    }));
  };

  const handleClearMapping = (slotKey: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  const handleAutoMap = () => {
    // Try to auto-match by field name similarity
    const newMappings: Record<string, string> = { ...mappings };
    for (const slot of standardSlots) {
      if (newMappings[slot.key]) continue; // Already mapped
      // Look for exact key match
      const exactMatch = externalFields.find(
        (f) => f.toLowerCase() === slot.key.toLowerCase()
      );
      if (exactMatch) {
        newMappings[slot.key] = exactMatch;
        continue;
      }
      // Look for partial match (e.g., 'phone' matches 'mobile_phone')
      const partialMatch = externalFields.find((f) =>
        f.toLowerCase().includes(slot.key.toLowerCase())
      );
      if (partialMatch && !Object.values(newMappings).includes(partialMatch)) {
        newMappings[slot.key] = partialMatch;
      }
    }
    setMappings(newMappings);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build the field map from current mappings
      const fieldMap: FieldMap = {};
      for (const [slotKey, externalPath] of Object.entries(mappings)) {
        if (!externalPath) continue;
        const sampleValue = getNestedValue(samplePayload, externalPath);
        fieldMap[slotKey] = {
          path: externalPath,
          label: fieldKeyToLabel(externalPath),
          type: inferType(sampleValue),
        };
      }

      // Save to organizations.integrations[key].field_map
      const { data: orgData } = await supabase
        .from("organizations")
        .select("integrations")
        .eq("id", organizationId)
        .single();

      if (orgData?.integrations) {
        const updated = {
          ...orgData.integrations,
          [integrationKey]: {
            ...orgData.integrations[integrationKey],
            field_map: fieldMap,
          },
        };

        const { error } = await supabase
          .from("organizations")
          .update({ integrations: updated, updated_at: new Date().toISOString() })
          .eq("id", organizationId);

        if (error) throw error;
      }

      toast.success(`Field mapping saved — ${Object.keys(fieldMap).length} fields mapped`);
      onSave(fieldMap);
      onClose();
    } catch (err) {
      console.error("Error saving field map:", err);
      toast.error("Failed to save field mapping");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1f2b] rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-700/50">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Map {integrationName} Fields
              </h2>
              <p className="text-sm text-gray-400">
                {hasTemplate
                  ? "Pre-filled from template — confirm or adjust the mappings below"
                  : "Match the external fields to ChefLife data categories"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-gray-400 text-sm">Loading field definitions...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="flex items-start gap-2 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">
                  Map external fields to ChefLife data categories. Mapped fields will appear
                  as checkmarks (✓) in the roster grid. Unmapped fields are ignored — you can
                  always come back and adjust.
                </p>
              </div>

              {/* Stats bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">
                    <span className="text-white font-medium">{mappedCount}</span> of{" "}
                    <span className="text-white font-medium">{standardSlots.length}</span>{" "}
                    fields mapped
                  </span>
                  {externalFields.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {externalFields.length} external fields available
                    </span>
                  )}
                </div>
                {externalFields.length > 0 && (
                  <button
                    onClick={handleAutoMap}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 
                             bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Auto-Map
                  </button>
                )}
              </div>

              {/* No sample data warning */}
              {externalFields.length === 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-300">
                    No sample data available yet. Connect the integration and sync at least one
                    user to enable field mapping. You can skip this step and map fields later.
                  </div>
                </div>
              )}

              {/* Mapping Table */}
              <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_32px_1fr_40px] gap-2 items-center px-4 py-2.5 bg-gray-800/50 border-b border-gray-700/50">
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    ChefLife Slot
                  </span>
                  <span />
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    {integrationName} Field
                  </span>
                  <span />
                </div>

                {/* Mapping Rows */}
                <div className="divide-y divide-gray-700/30">
                  {standardSlots.map((slot) => {
                    const currentPath = mappings[slot.key] || "";
                    const isMapped = !!currentPath;
                    const sampleValue = currentPath
                      ? getNestedValue(samplePayload, currentPath)
                      : null;

                    return (
                      <div
                        key={slot.key}
                        className={`grid grid-cols-[1fr_32px_1fr_40px] gap-2 items-center px-4 py-3 
                                   transition-colors ${
                                     isMapped
                                       ? "bg-green-500/5"
                                       : slot.required
                                       ? "bg-amber-500/5"
                                       : ""
                                   }`}
                      >
                        {/* ChefLife Slot */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium">
                              {slot.label}
                            </span>
                            {slot.required && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium">
                                REQ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {slot.description}
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center">
                          <ArrowRight
                            className={`w-4 h-4 ${
                              isMapped ? "text-green-400" : "text-gray-600"
                            }`}
                          />
                        </div>

                        {/* External Field Dropdown */}
                        <div>
                          <select
                            value={currentPath}
                            onChange={(e) =>
                              handleMappingChange(slot.key, e.target.value)
                            }
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
                                     focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none
                                     appearance-none cursor-pointer"
                          >
                            <option value="">— Not mapped —</option>
                            {externalFields.map((field) => {
                              const isUsed =
                                usedPaths.has(field) && field !== currentPath;
                              return (
                                <option
                                  key={field}
                                  value={field}
                                  disabled={isUsed}
                                >
                                  {fieldKeyToLabel(field)}
                                  {isUsed ? " (in use)" : ""}
                                </option>
                              );
                            })}
                          </select>
                          {/* Preview of sample value */}
                          {isMapped && sampleValue !== null && sampleValue !== undefined && (
                            <p className="text-[10px] text-gray-500 mt-1 truncate">
                              Sample: <span className="text-gray-400">{String(sampleValue)}</span>
                            </p>
                          )}
                        </div>

                        {/* Clear button */}
                        <div className="flex justify-center">
                          {isMapped ? (
                            <button
                              onClick={() => handleClearMapping(slot.key)}
                              className="p-1.5 hover:bg-gray-700/50 rounded transition-colors"
                              title="Clear mapping"
                            >
                              <Unlink className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                            </button>
                          ) : (
                            <div className="w-7" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700/50">
          <div className="text-xs text-gray-500">
            {hasTemplate && (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-400" />
                Pre-filled from {integrationName} template
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isConnectionFlow ? "Skip for now" : "Cancel"}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || mappedCount === 0}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white
                       bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500
                       rounded-lg transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : `Save Mapping (${mappedCount})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
