import React from "react";
import { Info, Circle, AlertCircle } from "lucide-react";
import { MasterIngredient, AllergenState, getAllergenState, setAllergenState } from "@/types/master-ingredient";
import { AllergenBadge } from "@/features/allergens/components/AllergenBadge";
import { ALLERGENS } from "@/features/allergens/constants";
import type { AllergenType } from "@/features/allergens/types";

// =============================================================================
// ALLERGEN SECTION - Tri-State Controls
// =============================================================================
// States:
//   - None:        Not present in ingredient
//   - Contains:    Ingredient IS the allergen
//   - May Contain: Supplier cross-contamination warning
//
// Environment (kitchen cross-contact) is handled at Recipe level, not here.
// =============================================================================

interface AllergenSectionProps {
  formData: MasterIngredient;
  onChange: (updates: Partial<MasterIngredient>) => void;
}

// Standard allergens grouped by severity (matches constants.ts)
const HIGH_SEVERITY: AllergenType[] = ["peanut", "crustacean", "treenut", "shellfish", "sesame", "fish"];
const MEDIUM_SEVERITY: AllergenType[] = ["soy", "wheat", "milk", "sulphite", "egg", "gluten", "mustard", "pork"];
const LOW_SEVERITY: AllergenType[] = ["celery", "garlic", "onion", "nitrite", "mushroom", "hot_pepper", "citrus"];

// Helper to ensure boolean
const ensureBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
};

// ---------------------------------------------------------------------------
// TRI-STATE ALLERGEN CONTROL
// ---------------------------------------------------------------------------
interface AllergenControlProps {
  type: AllergenType;
  contains: boolean;
  mayContain: boolean;
  onChange: (state: AllergenState) => void;
}

const AllergenControl: React.FC<AllergenControlProps> = ({
  type,
  contains,
  mayContain,
  onChange,
}) => {
  const state = getAllergenState(contains, mayContain);
  const allergen = ALLERGENS[type];
  
  if (!allergen) return null;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30 transition-colors">
      {/* Allergen Badge */}
      <div className="flex-shrink-0">
        <AllergenBadge type={type} size="sm" />
      </div>
      
      {/* Label */}
      <span className="flex-1 text-sm text-gray-300 min-w-0 truncate">
        {allergen.label}
      </span>
      
      {/* Tri-State Toggle */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* None */}
        <button
          type="button"
          onClick={() => onChange("none")}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            state === "none"
              ? "bg-gray-600 text-white"
              : "bg-gray-800 text-gray-500 hover:bg-gray-700"
          }`}
          title="Not present"
        >
          <Circle className="w-3 h-3" />
        </button>
        
        {/* Contains */}
        <button
          type="button"
          onClick={() => onChange("contains")}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            state === "contains"
              ? "bg-rose-500 text-white"
              : "bg-gray-800 text-gray-500 hover:bg-gray-700"
          }`}
          title="Contains this allergen"
        >
          <Circle className="w-3 h-3 fill-current" />
        </button>
        
        {/* May Contain */}
        <button
          type="button"
          onClick={() => onChange("may_contain")}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
            state === "may_contain"
              ? "bg-amber-500 text-white"
              : "bg-gray-800 text-gray-500 hover:bg-gray-700"
          }`}
          title="May contain (supplier warning)"
        >
          <AlertCircle className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export const AllergenSection: React.FC<AllergenSectionProps> = ({
  formData,
  onChange,
}) => {
  // Handler for allergen state changes
  const handleAllergenChange = (type: AllergenType, state: AllergenState) => {
    const { contains, mayContain } = setAllergenState(state);
    const containsKey = `allergen_${type}` as keyof MasterIngredient;
    const mayContainKey = `allergen_${type}_may_contain` as keyof MasterIngredient;
    
    onChange({
      [containsKey]: contains,
      [mayContainKey]: mayContain,
    } as Partial<MasterIngredient>);
  };

  // Get current state for an allergen
  const getState = (type: AllergenType) => {
    const containsKey = `allergen_${type}` as keyof MasterIngredient;
    const mayContainKey = `allergen_${type}_may_contain` as keyof MasterIngredient;
    return {
      contains: ensureBoolean(formData[containsKey]),
      mayContain: ensureBoolean(formData[mayContainKey]),
    };
  };

  // Count active allergens
  const countActive = () => {
    let contains = 0;
    let mayContain = 0;
    
    [...HIGH_SEVERITY, ...MEDIUM_SEVERITY, ...LOW_SEVERITY].forEach((type) => {
      const state = getState(type);
      if (state.contains) contains++;
      if (state.mayContain) mayContain++;
    });
    
    return { contains, mayContain };
  };

  const counts = countActive();

  return (
    <div className="space-y-6">
      {/* Legend + Environment Hint */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center">
              <Circle className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-gray-400">None</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-rose-500 flex items-center justify-center">
              <Circle className="w-2.5 h-2.5 text-white fill-current" />
            </div>
            <span className="text-gray-400">Contains</span>
            {counts.contains > 0 && (
              <span className="text-rose-400">({counts.contains})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center">
              <AlertCircle className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-gray-400">May Contain</span>
            {counts.mayContain > 0 && (
              <span className="text-amber-400">({counts.mayContain})</span>
            )}
          </div>
        </div>

        {/* Environment hint */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Kitchen environment risks are set at recipe level</span>
        </div>
      </div>

      {/* High Severity - Life Threatening */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            High Priority — Life-threatening
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {HIGH_SEVERITY.map((type) => {
            const state = getState(type);
            return (
              <AllergenControl
                key={type}
                type={type}
                contains={state.contains}
                mayContain={state.mayContain}
                onChange={(newState) => handleAllergenChange(type, newState)}
              />
            );
          })}
        </div>
      </div>

      {/* Medium Severity */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Medium Priority
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {MEDIUM_SEVERITY.map((type) => {
            const state = getState(type);
            return (
              <AllergenControl
                key={type}
                type={type}
                contains={state.contains}
                mayContain={state.mayContain}
                onChange={(newState) => handleAllergenChange(type, newState)}
              />
            );
          })}
        </div>
      </div>

      {/* Low Severity - Sensitivities */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Low Priority — Sensitivities
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {LOW_SEVERITY.map((type) => {
            const state = getState(type);
            return (
              <AllergenControl
                key={type}
                type={type}
                contains={state.contains}
                mayContain={state.mayContain}
                onChange={(newState) => handleAllergenChange(type, newState)}
              />
            );
          })}
        </div>
      </div>

      {/* Custom Allergens */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Custom Allergens
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((num) => {
            const nameKey = `allergen_custom${num}_name` as keyof MasterIngredient;
            const activeKey = `allergen_custom${num}_active` as keyof MasterIngredient;
            const mayContainKey = `allergen_custom${num}_may_contain` as keyof MasterIngredient;
            
            const name = formData[nameKey] as string | null;
            const active = ensureBoolean(formData[activeKey]);
            const mayContain = ensureBoolean(formData[mayContainKey]);
            
            const state = getAllergenState(active, mayContain);

            return (
              <div key={num} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <input
                  type="text"
                  value={name || ""}
                  onChange={(e) => onChange({ [nameKey]: e.target.value || null })}
                  placeholder={`Custom allergen ${num}`}
                  className="input w-full text-sm mb-3"
                />
                {name && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const { contains, mayContain } = setAllergenState("none");
                        onChange({ [activeKey]: contains, [mayContainKey]: mayContain });
                      }}
                      className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                        state === "none"
                          ? "bg-gray-600 text-white"
                          : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const { contains, mayContain } = setAllergenState("contains");
                        onChange({ [activeKey]: contains, [mayContainKey]: mayContain });
                      }}
                      className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                        state === "contains"
                          ? "bg-rose-500 text-white"
                          : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                      }`}
                    >
                      Contains
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const { contains, mayContain } = setAllergenState("may_contain");
                        onChange({ [activeKey]: contains, [mayContainKey]: mayContain });
                      }}
                      className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                        state === "may_contain"
                          ? "bg-amber-500 text-white"
                          : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                      }`}
                    >
                      May Contain
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Allergen Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
          Notes
        </label>
        <textarea
          value={formData.allergen_notes || ""}
          onChange={(e) => onChange({ allergen_notes: e.target.value || null })}
          className="input w-full h-20 text-sm"
          placeholder="Additional allergen information, supplier documentation, etc..."
        />
      </div>
    </div>
  );
};
