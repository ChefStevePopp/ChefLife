import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  Info,
  ChevronUp,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SECURITY_LEVELS } from "@/config/security";
import { useOperationsStore } from "@/stores/operationsStore";
import { ALLERGEN_LIST, type AllergenType } from "@/features/allergens/types";
import toast from "react-hot-toast";
import { CustomIconsContent } from "./components/CustomIconsContent";
import { StationAllergensContent } from "./components/StationAllergensContent";
import type { AllergenEnvironmentalState, AllergenSectionId, StationAllergenData } from "./types";

// =============================================================================
// ALLERGEN MANAGER - L5 Module
// =============================================================================
// Comprehensive allergen management system spanning ingredients, stations,
// recipes, and customer-facing declarations. Supports Natasha's Law, Health
// Canada, FDA, and FSANZ regulatory compliance requirements.
// =============================================================================

const ALLERGEN_SECTIONS = [
  {
    id: "custom_icons" as const,
    icon: Sparkles,
    color: "purple",
    label: "Custom Allergen Icons",
    subtitle: "White-label branding for allergen displays",
    comingSoon: true,
  },
  {
    id: "station_allergens" as const,
    icon: AlertTriangle,
    color: "rose",
    label: "Station Environmental Allergens",
    subtitle: "Configure allergens present at each kitchen station",
    comingSoon: false,
  },
  {
    id: "portal_config" as const,
    icon: Globe,
    color: "cyan",
    label: "Customer Portal Configuration",
    subtitle: "Public-facing allergen information settings",
    comingSoon: true,
  },
] as const;

export const AllergenManager: React.FC = () => {
  const navigate = useNavigate();
  const { securityLevel } = useAuth();
  const { settings: operationsSettings, updateSettings, fetchSettings } = useOperationsStore();
  const [stationAllergens, setStationAllergens] = useState<Record<string, StationAllergenData>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedStation, setExpandedStation] = useState<string | null>(null);

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  // Accordion state with localStorage persistence
  const STORAGE_KEY = "cheflife-allergen-manager-expanded";
  const [expandedSections, setExpandedSections] = useState<Set<AllergenSectionId>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored) as AllergenSectionId[]);
      }
    } catch (e) {
      console.error("Error loading expanded state:", e);
    }
    return new Set(["station_allergens"]); // Default: station allergens open
  });

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedSections)));
  }, [expandedSections]);

  const toggleSection = (sectionId: AllergenSectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Fetch operations settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Initialize from saved settings
  useEffect(() => {
    if (operationsSettings?.kitchen_station_allergens) {
      setStationAllergens(operationsSettings.kitchen_station_allergens);
    }
  }, [operationsSettings?.kitchen_station_allergens]);

  const kitchenStations = operationsSettings?.kitchen_stations || [];

  const handleAllergenStateChange = (
    station: string,
    allergen: AllergenType,
    newState: AllergenEnvironmentalState
  ) => {
    setStationAllergens(prev => {
      const currentAllergens = prev[station]?.environmentalAllergens || {} as Record<AllergenType, AllergenEnvironmentalState>;
      return {
        ...prev,
        [station]: {
          ...prev[station],
          environmentalAllergens: {
            ...currentAllergens,
            [allergen]: newState
          }
        }
      };
    });
    setHasChanges(true);
  };

  const getAllergenState = (station: string, allergen: AllergenType): AllergenEnvironmentalState => {
    return stationAllergens[station]?.environmentalAllergens?.[allergen] || "none";
  };

  const handleUpdateNotes = (station: string, notes: string) => {
    setStationAllergens(prev => ({
      ...prev,
      [station]: {
        ...prev[station],
        environmentalAllergens: prev[station]?.environmentalAllergens || {} as Record<AllergenType, AllergenEnvironmentalState>,
        notes
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!operationsSettings) return;
    try {
      await updateSettings({
        ...operationsSettings,
        kitchen_station_allergens: stationAllergens
      });
      setHasChanges(false);
      toast.success("Station allergens saved");
    } catch (error) {
      toast.error("Failed to save station allergens");
    }
  };

  const handleReset = () => {
    if (operationsSettings?.kitchen_station_allergens) {
      setStationAllergens(operationsSettings.kitchen_station_allergens);
    } else {
      setStationAllergens({});
    }
    setHasChanges(false);
  };

  const getStationAllergenCount = (station: string) => {
    const allergens = stationAllergens[station]?.environmentalAllergens || {};
    return Object.values(allergens).filter(state => state !== "none").length;
  };

  const getActiveAllergens = (station: string): AllergenType[] => {
    const allergens = stationAllergens[station]?.environmentalAllergens || {};
    return Object.entries(allergens)
      .filter(([_, state]) => state !== "none")
      .map(([allergen]) => allergen as AllergenType);
  };

  const getTotalStationAllergensConfigured = () => {
    let total = 0;
    Object.values(stationAllergens).forEach(station => {
      const allergens = station.environmentalAllergens || {};
      total += Object.values(allergens).filter(state => state !== "none").length;
    });
    return total;
  };

  // Color classes for sections
  const colorClasses: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary-500/20", text: "text-primary-400" },
    amber: { bg: "bg-amber-500/20", text: "text-amber-400" },
    emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
    rose: { bg: "bg-rose-500/20", text: "text-rose-400" },
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  };

  return (
    <div className="space-y-6">
      {/* Diagnostic Path - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/AllergenManager/index.tsx
        </div>
      )}

      {/* L5 Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/modules')}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Back to Feature Modules"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Allergen Manager
              </h1>
              <p className="text-gray-400 text-sm">
                Comprehensive allergen tracking and customer disclosure
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Intro - Expandable Info */}
      <div className={`expandable-info-section ${expandedSections.has('portal_config') ? 'expanded' : ''}`}>
        <button
          onClick={() => toggleSection('portal_config')}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300">About Allergen Manager</span>
          </div>
          <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.has('portal_config') ? '' : 'rotate-180'}`} />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2 space-y-4">
            <p className="text-sm text-gray-400">
              The Allergen Manager is a comprehensive system for managing allergen data across your organization - from
              environmental risks at kitchen stations to customer-facing allergen declarations. This data flows through
              ingredients → recipes → menu items → customer portal.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-medium text-purple-300">White-label Icons</h4>
                </div>
                <p className="text-xs text-gray-400">
                  Upload custom allergen icons to match your brand across all customer touchpoints
                </p>
              </div>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h4 className="text-sm font-medium text-rose-300">Environmental Tracking</h4>
                </div>
                <p className="text-xs text-gray-400">
                  Track allergens present at kitchen stations - automatically cascades to assigned recipes
                </p>
              </div>
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-medium text-cyan-300">Customer Portal</h4>
                </div>
                <p className="text-xs text-gray-400">
                  Embeddable widget for your website with QR code generation for table tents
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-medium text-emerald-300">Three-State System</h4>
                </div>
                <p className="text-xs text-gray-400">
                  Contains, May Contain, or None - nuanced allergen risk communication at every level
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Sections */}
      {ALLERGEN_SECTIONS.map(section => {
        const isExpanded = expandedSections.has(section.id);
        const colors = colorClasses[section.color];
        const Icon = section.icon;

        // Calculate stat for each section
        let statValue = 0;
        let statSuffix = "";
        if (section.id === "station_allergens") {
          statValue = getTotalStationAllergensConfigured();
          statSuffix = "configured";
        } else if (section.id === "custom_icons") {
          statValue = 0; // Future: count of custom icons uploaded
          statSuffix = "custom";
        }

        return (
          <div
            key={section.id}
            className={`card overflow-hidden transition-all duration-300 ${
              isExpanded ? "bg-gray-800/50" : "bg-gray-800/30"
            } ${section.comingSoon ? "opacity-60" : ""}`}
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
              disabled={section.comingSoon && section.id === "portal_config"}
            >
              {/* Left: Icon + Title */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-white">{section.label}</h3>
                    {section.comingSoon && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-500 uppercase tracking-wide">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{section.subtitle}</p>
                </div>
              </div>

              {/* Right: Stat Pill + Chevron */}
              <div className="flex items-center gap-3">
                {!section.comingSoon && (
                  <div className="flex items-baseline gap-1.5 px-3 py-1 bg-gray-700/50 border border-gray-600/50 rounded-lg">
                    <span className="text-base font-semibold text-gray-300 tabular-nums">
                      {statValue}
                    </span>
                    <span className="text-xs text-gray-500">{statSuffix}</span>
                  </div>
                )}

                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-700/50">
                {section.id === "custom_icons" && <CustomIconsContent />}
                {section.id === "station_allergens" && (
                  <StationAllergensContent
                    kitchenStations={kitchenStations}
                    stationAllergens={stationAllergens}
                    expandedStation={expandedStation}
                    setExpandedStation={setExpandedStation}
                    getAllergenState={getAllergenState}
                    handleAllergenStateChange={handleAllergenStateChange}
                    handleUpdateNotes={handleUpdateNotes}
                    getStationAllergenCount={getStationAllergenCount}
                    getActiveAllergens={getActiveAllergens}
                    handleSave={handleSave}
                    handleReset={handleReset}
                    hasChanges={hasChanges}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Architecture Note */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-400">
              <strong className="text-gray-300">Regulatory Compliance:</strong> Allergen Manager supports
              Natasha's Law (UK), Health Canada allergen labeling requirements, FDA Big 9 (US), and FSANZ
              regulations (Australia/NZ). Configure your allergen tracking to meet your jurisdiction's requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllergenManager;
