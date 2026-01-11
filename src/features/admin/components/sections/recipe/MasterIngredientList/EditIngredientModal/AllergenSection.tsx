import React from "react";
import { Check, AlertTriangle, Info } from "lucide-react";
import { MasterIngredient, AllergenState, getAllergenState, setAllergenState } from "@/types/master-ingredient";
import { AllergenBadge } from "@/features/allergens/components/AllergenBadge";
import { ALLERGENS } from "@/features/allergens/constants";
import type { AllergenType } from "@/features/allergens/types";

// =============================================================================
// ALLERGEN SECTION - L5 Design
// =============================================================================
// Two-state marking (default = not present):
//   - Contains:    Check icon, rose — Ingredient IS the allergen
//   - May Contain: Alert icon, amber — Supplier cross-contamination warning
//
// Environment (kitchen cross-contact) is handled at Recipe level, not here.
// =============================================================================

interface AllergenSectionProps {
  formData: MasterIngredient;
  onChange: (updates: Partial<MasterIngredient>) => void;
}

// Standard allergens grouped by severity
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
// ALLERGEN CONTROL - Two toggles (Check / Alert)
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
  const allergen = ALLERGENS[type];
  if (!allergen) return null;

  const handleContainsClick = () => {
    onChange(contains ? "none" : "contains");
  };

  const handleMayContainClick = () => {
    onChange(mayContain ? "none" : "may_contain");
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/30 transition-colors">
      {/* Allergen Badge */}
      <div className="flex-shrink-0">
        <AllergenBadge type={type} size="sm" />
      </div>
      
      {/* Label */}
      <span className="flex-1 text-sm text-gray-300 min-w-0 truncate">
        {allergen.label}
      </span>
      
      {/* Two-Button Toggle */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Contains */}
        <button
          type="button"
          onClick={handleContainsClick}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            contains
              ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30"
              : "bg-gray-800/30 text-gray-600 hover:bg-gray-700/50 hover:text-gray-400"
          }`}
          title="Contains this allergen"
        >
          <Check className="w-4 h-4" />
        </button>
        
        {/* May Contain */}
        <button
          type="button"
          onClick={handleMayContainClick}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            mayContain
              ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
              : "bg-gray-800/30 text-gray-600 hover:bg-gray-700/50 hover:text-gray-400"
          }`}
          title="May contain (supplier warning)"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CUSTOM ALLERGEN CONTROL
// ---------------------------------------------------------------------------
interface CustomAllergenControlProps {
  num: 1 | 2 | 3;
  name: string | null;
  contains: boolean;
  mayContain: boolean;
  onNameChange: (name: string | null) => void;
  onStateChange: (state: AllergenState) => void;
  placeholder: string;
}

const CustomAllergenControl: React.FC<CustomAllergenControlProps> = ({
  name,
  contains,
  mayContain,
  onNameChange,
  onStateChange,
  placeholder,
}) => {
  const handleContainsClick = () => {
    onStateChange(contains ? "none" : "contains");
  };

  const handleMayContainClick = () => {
    onStateChange(mayContain ? "none" : "may_contain");
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-800/20 border border-gray-700/30">
      {/* Editable Name */}
      <input
        type="text"
        value={name || ""}
        onChange={(e) => onNameChange(e.target.value || null)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none min-w-0"
      />
      
      {/* Two-Button Toggle - Only show if named */}
      {name && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleContainsClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              contains
                ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30"
                : "bg-gray-800/30 text-gray-600 hover:bg-gray-700/50 hover:text-gray-400"
            }`}
            title="Contains this allergen"
          >
            <Check className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={handleMayContainClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              mayContain
                ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                : "bg-gray-800/30 text-gray-600 hover:bg-gray-700/50 hover:text-gray-400"
            }`}
            title="May contain (supplier warning)"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SEVERITY GROUP HEADER - Mini L5 style
// ---------------------------------------------------------------------------
interface SeverityHeaderProps {
  color: string;
  bgColor: string;
  label: string;
  count: number;
}

const SeverityHeader: React.FC<SeverityHeaderProps> = ({ color, bgColor, label, count }) => (
  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-slate-800/30 ring-1 ring-slate-700/30">
    <div className={`w-2 h-2 rounded-full ${color}`} />
    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
    {count > 0 && (
      <span className={`text-xs font-medium ${color.replace('bg-', 'text-')}`}>({count})</span>
    )}
  </div>
);

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

  // Count active allergens per severity
  const countActive = (types: AllergenType[]) => {
    let count = 0;
    types.forEach((type) => {
      const state = getState(type);
      if (state.contains || state.mayContain) count++;
    });
    return count;
  };

  // Custom allergen placeholders
  const customPlaceholders = [
    "e.g., Kiwi, Latex...",
    "e.g., Mango, Avocado...",
    "e.g., Banana, Papaya...",
  ];

  return (
    <div className="space-y-6">
      {/* Compact Legend */}
      <div className="flex items-center justify-between text-xs text-gray-500">
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
        <div className="flex items-center gap-1.5 text-gray-600">
          <Info className="w-3.5 h-3.5" />
          <span>Environment risks set at recipe level</span>
        </div>
      </div>

      {/* High Severity */}
      <div>
        <SeverityHeader
          color="bg-rose-500"
          bgColor="bg-rose-500/20"
          label="High Priority — Life-threatening"
          count={countActive(HIGH_SEVERITY)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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
        <SeverityHeader
          color="bg-amber-500"
          bgColor="bg-amber-500/20"
          label="Medium Priority"
          count={countActive(MEDIUM_SEVERITY)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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

      {/* Low Severity */}
      <div>
        <SeverityHeader
          color="bg-sky-500"
          bgColor="bg-sky-500/20"
          label="Sensitivities"
          count={countActive(LOW_SEVERITY)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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
        <SeverityHeader
          color="bg-purple-500"
          bgColor="bg-purple-500/20"
          label="Custom Allergens"
          count={0}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((num, idx) => {
            const nameKey = `allergen_custom${num}_name` as keyof MasterIngredient;
            const activeKey = `allergen_custom${num}_active` as keyof MasterIngredient;
            const mayContainKey = `allergen_custom${num}_may_contain` as keyof MasterIngredient;
            
            const name = formData[nameKey] as string | null;
            const contains = ensureBoolean(formData[activeKey]);
            const mayContain = ensureBoolean(formData[mayContainKey]);

            return (
              <CustomAllergenControl
                key={num}
                num={num}
                name={name}
                contains={contains}
                mayContain={mayContain}
                onNameChange={(newName) => onChange({ [nameKey]: newName })}
                onStateChange={(state) => {
                  const { contains, mayContain } = setAllergenState(state);
                  onChange({ [activeKey]: contains, [mayContainKey]: mayContain });
                }}
                placeholder={customPlaceholders[idx]}
              />
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
          Additional Notes
        </label>
        <textarea
          value={formData.allergen_notes || ""}
          onChange={(e) => onChange({ allergen_notes: e.target.value || null })}
          className="input w-full h-20 text-sm resize-none"
          placeholder="Supplier documentation, specific warnings, etc..."
        />
      </div>
    </div>
  );
};
