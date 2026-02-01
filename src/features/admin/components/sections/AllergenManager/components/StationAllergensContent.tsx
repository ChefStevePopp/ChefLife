import React from "react";
import {
  Info,
  Settings,
  Utensils,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Check,
  RotateCcw,
  Save,
} from "lucide-react";
import { ALLERGEN_LIST, type AllergenType } from "@/features/allergens/types";
import { ALLERGENS } from "@/features/allergens/constants";
import { AllergenBadge } from "@/features/allergens/components/AllergenBadge";
import type { AllergenEnvironmentalState, StationAllergenData } from "../types";

// =============================================================================
// STATION ALLERGENS CONTENT
// =============================================================================

interface StationAllergensContentProps {
  kitchenStations: string[];
  stationAllergens: Record<string, StationAllergenData>;
  expandedStation: string | null;
  setExpandedStation: (station: string | null) => void;
  getAllergenState: (station: string, allergen: AllergenType) => AllergenEnvironmentalState;
  handleAllergenStateChange: (station: string, allergen: AllergenType, newState: AllergenEnvironmentalState) => void;
  handleUpdateNotes: (station: string, notes: string) => void;
  getStationAllergenCount: (station: string) => number;
  getActiveAllergens: (station: string) => AllergenType[];
  handleSave: () => Promise<void>;
  handleReset: () => void;
  hasChanges: boolean;
}

export const StationAllergensContent: React.FC<StationAllergensContentProps> = ({
  kitchenStations,
  stationAllergens,
  expandedStation,
  setExpandedStation,
  getAllergenState,
  handleAllergenStateChange,
  handleUpdateNotes,
  getStationAllergenCount,
  getActiveAllergens,
  handleSave,
  handleReset,
  hasChanges,
}) => (
  <div className="pt-4 space-y-4">
    {/* Explanation */}
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-300 font-medium">How Environmental Allergens Work</p>
          <p className="text-sm text-gray-500 mt-1">
            When a recipe is assigned to a station (e.g., "Pans"), it automatically inherits that station's
            environmental allergens. This handles scenarios like flour aerosolization near the breading station
            or nut dust near the dessert line. The chain: Station → Recipe → Customer Declaration.
          </p>
        </div>
      </div>
    </div>

    {/* Station List */}
    {kitchenStations.length === 0 ? (
      <div className="text-center py-8 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700/50">
        <Settings className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No kitchen stations configured</p>
        <p className="text-xs text-gray-600 mt-1">
          Add stations in Operations → Kitchen → Kitchen Stations
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {kitchenStations.map((station) => {
          const isExpanded = expandedStation === station;
          const allergenCount = getStationAllergenCount(station);
          const stationData = stationAllergens[station];

          return (
            <div
              key={station}
              className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden"
            >
              {/* Station Header */}
              <button
                onClick={() => setExpandedStation(isExpanded ? null : station)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
                    <Utensils className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{station}</p>
                    <p className="text-xs text-gray-500">
                      {allergenCount > 0
                        ? `${allergenCount} environmental allergen${allergenCount !== 1 ? 's' : ''}`
                        : 'No environmental allergens'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {allergenCount > 0 && (
                    <div className="flex items-center gap-1">
                      {getActiveAllergens(station).slice(0, 4).map(allergen => (
                        <AllergenBadge key={allergen} type={allergen} size="sm" disableTooltip />
                      ))}
                      {allergenCount > 4 && (
                        <span className="text-xs text-gray-500 ml-1">+{allergenCount - 4}</span>
                      )}
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-700/50">
                  {/* Legend */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-rose-500/20 ring-1 ring-rose-500/30 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                        <span>Contains</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 ring-1 ring-amber-500/30 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <span>May Contain</span>
                      </div>
                    </div>
                  </div>

                  {/* Allergen Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                    {ALLERGEN_LIST.map((allergen) => {
                      const state = getAllergenState(station, allergen);
                      const contains = state === "contains";
                      const mayContain = state === "may_contain";

                      return (
                        <div
                          key={allergen}
                          className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-800/30 border border-gray-700/30 hover:border-gray-600 transition-colors"
                        >
                          {/* Allergen Badge */}
                          <div className="flex-shrink-0">
                            <AllergenBadge type={allergen} size="sm" disableTooltip />
                          </div>

                          {/* Label */}
                          <span className="flex-1 text-xs text-gray-300 min-w-0 truncate">
                            {ALLERGENS[allergen]?.label || allergen}
                          </span>

                          {/* Two-Button Toggle */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Contains */}
                            <button
                              type="button"
                              onClick={() => handleAllergenStateChange(
                                station,
                                allergen,
                                contains ? "none" : "contains"
                              )}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                contains
                                  ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30"
                                  : "bg-gray-800/30 text-gray-600 hover:bg-gray-700/50 hover:text-gray-400"
                              }`}
                              title="Contains this allergen"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            {/* May Contain */}
                            <button
                              type="button"
                              onClick={() => handleAllergenStateChange(
                                station,
                                allergen,
                                mayContain ? "none" : "may_contain"
                              )}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                mayContain
                                  ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                                  : "bg-gray-800/30 text-gray-600 hover:bg-gray-700/50 hover:text-gray-400"
                              }`}
                              title="May contain (cross-contamination risk)"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Station Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={stationData?.notes || ''}
                      onChange={(e) => handleUpdateNotes(station, e.target.value)}
                      placeholder="e.g., Flour aerosolized during breading prep"
                      className="input w-full text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}

    {/* Actions */}
    {kitchenStations.length > 0 && (
      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
        <button onClick={handleReset} className="btn-ghost text-sm" disabled={!hasChanges}>
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Discard Changes
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`btn-primary text-sm ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save Station Allergens
        </button>
      </div>
    )}
  </div>
);
