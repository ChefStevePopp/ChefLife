import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Save,
  Trash2,
  Archive,
  ArchiveRestore,
  Loader2,
  AlertTriangle,
  DollarSign,
  Scale,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  GraduationCap,
  Check,
  Package,
  BarChart3,
  Bell,
  TrendingUp,
  ClipboardList,
  FileText,
  Pencil,
  Lock,
  Ghost,
} from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useOperationsStore } from "@/stores/operationsStore";
import { useIngredientNavigationStore } from "@/stores/ingredientNavigationStore";
import { AllergenSection } from "../EditIngredientModal/AllergenSection";
import { PageHeader } from "./PageHeader";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";

// =============================================================================
// INGREDIENT DETAIL PAGE - L5 Professional
// =============================================================================

// ---------------------------------------------------------------------------
// PRICE SOURCE TYPE
// ---------------------------------------------------------------------------
interface PriceSource {
  type: 'invoice' | 'manual' | 'unknown';
  invoiceNumber?: string;
  vendorName?: string;
  updatedAt: Date;      // Invoice date (when price was effective)
  importedAt?: Date;    // Import date (when we recorded it)
}

// ---------------------------------------------------------------------------
// GUIDED MODE CONTEXT
// ---------------------------------------------------------------------------
const GuidedModeContext = React.createContext<{
  isGuided: boolean;
  setIsGuided: (v: boolean) => void;
}>({ isGuided: false, setIsGuided: () => {} });

const useGuidedMode = () => React.useContext(GuidedModeContext);

// ---------------------------------------------------------------------------
// NORMALIZE INGREDIENT DATA
// ---------------------------------------------------------------------------
const normalizeIngredient = (data: MasterIngredient): MasterIngredient => {
  return {
    ...data,
    product: data.product ?? "",
    vendor: data.vendor ?? "",
    item_code: data.item_code ?? null,
    common_name: data.common_name ?? null,
    case_size: data.case_size ?? "",
    unit_of_measure: data.unit_of_measure ?? "",
    recipe_unit_type: data.recipe_unit_type ?? "",
    storage_area: data.storage_area ?? "",
    units_per_case: data.units_per_case ?? 0,
    current_price: data.current_price ?? 0,
    recipe_unit_per_purchase_unit: data.recipe_unit_per_purchase_unit ?? 0,
    yield_percent: data.yield_percent ?? 100,
    cost_per_recipe_unit: Math.round((data.cost_per_recipe_unit ?? 0) * 10000) / 10000,
    archived: data.archived ?? false,
    // Inventory Units
    inventory_unit_type: data.inventory_unit_type ?? "",
    inventory_unit_cost: data.inventory_unit_cost ?? 0,
    // Reporting & Tracking
    priority_level: data.priority_level ?? "standard",
    inventory_schedule: data.inventory_schedule ?? [],
    show_on_dashboard: data.show_on_dashboard ?? false,
    alert_price_change: data.alert_price_change ?? false,
    alert_low_stock: data.alert_low_stock ?? false,
    par_level: data.par_level ?? undefined,
    reorder_point: data.reorder_point ?? undefined,
    allergen_peanut: data.allergen_peanut ?? false,
    allergen_crustacean: data.allergen_crustacean ?? false,
    allergen_treenut: data.allergen_treenut ?? false,
    allergen_shellfish: data.allergen_shellfish ?? false,
    allergen_sesame: data.allergen_sesame ?? false,
    allergen_soy: data.allergen_soy ?? false,
    allergen_fish: data.allergen_fish ?? false,
    allergen_wheat: data.allergen_wheat ?? false,
    allergen_milk: data.allergen_milk ?? false,
    allergen_sulphite: data.allergen_sulphite ?? false,
    allergen_egg: data.allergen_egg ?? false,
    allergen_gluten: data.allergen_gluten ?? false,
    allergen_mustard: data.allergen_mustard ?? false,
    allergen_celery: data.allergen_celery ?? false,
    allergen_garlic: data.allergen_garlic ?? false,
    allergen_onion: data.allergen_onion ?? false,
    allergen_nitrite: data.allergen_nitrite ?? false,
    allergen_mushroom: data.allergen_mushroom ?? false,
    allergen_hot_pepper: data.allergen_hot_pepper ?? false,
    allergen_citrus: data.allergen_citrus ?? false,
    allergen_pork: data.allergen_pork ?? false,
    allergen_peanut_may_contain: data.allergen_peanut_may_contain ?? false,
    allergen_crustacean_may_contain: data.allergen_crustacean_may_contain ?? false,
    allergen_treenut_may_contain: data.allergen_treenut_may_contain ?? false,
    allergen_shellfish_may_contain: data.allergen_shellfish_may_contain ?? false,
    allergen_sesame_may_contain: data.allergen_sesame_may_contain ?? false,
    allergen_soy_may_contain: data.allergen_soy_may_contain ?? false,
    allergen_fish_may_contain: data.allergen_fish_may_contain ?? false,
    allergen_wheat_may_contain: data.allergen_wheat_may_contain ?? false,
    allergen_milk_may_contain: data.allergen_milk_may_contain ?? false,
    allergen_sulphite_may_contain: data.allergen_sulphite_may_contain ?? false,
    allergen_egg_may_contain: data.allergen_egg_may_contain ?? false,
    allergen_gluten_may_contain: data.allergen_gluten_may_contain ?? false,
    allergen_mustard_may_contain: data.allergen_mustard_may_contain ?? false,
    allergen_celery_may_contain: data.allergen_celery_may_contain ?? false,
    allergen_garlic_may_contain: data.allergen_garlic_may_contain ?? false,
    allergen_onion_may_contain: data.allergen_onion_may_contain ?? false,
    allergen_nitrite_may_contain: data.allergen_nitrite_may_contain ?? false,
    allergen_mushroom_may_contain: data.allergen_mushroom_may_contain ?? false,
    allergen_hot_pepper_may_contain: data.allergen_hot_pepper_may_contain ?? false,
    allergen_citrus_may_contain: data.allergen_citrus_may_contain ?? false,
    allergen_pork_may_contain: data.allergen_pork_may_contain ?? false,
    allergen_custom1_active: data.allergen_custom1_active ?? false,
    allergen_custom1_may_contain: data.allergen_custom1_may_contain ?? false,
    allergen_custom2_active: data.allergen_custom2_active ?? false,
    allergen_custom2_may_contain: data.allergen_custom2_may_contain ?? false,
    allergen_custom3_active: data.allergen_custom3_active ?? false,
    allergen_custom3_may_contain: data.allergen_custom3_may_contain ?? false,
  };
};

const createEmptyIngredient = (organizationId: string): MasterIngredient => ({
  id: crypto.randomUUID(),
  organization_id: organizationId,
  product: "",
  major_group: null,
  category: null,
  sub_category: null,
  vendor: "",
  item_code: null,
  common_name: null,
  case_size: "",
  units_per_case: 0,
  recipe_unit_type: "",
  yield_percent: 100,
  cost_per_recipe_unit: 0,
  current_price: 0,
  recipe_unit_per_purchase_unit: 0,
  unit_of_measure: "",
  storage_area: "",
  image_url: null,
  archived: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // Inventory Units
  inventory_unit_type: "",
  inventory_unit_cost: 0,
  // Reporting & Tracking
  priority_level: "standard",
  inventory_schedule: [],
  show_on_dashboard: false,
  alert_price_change: false,
  alert_low_stock: false,
  par_level: undefined,
  reorder_point: undefined,
  allergen_peanut: false,
  allergen_crustacean: false,
  allergen_treenut: false,
  allergen_shellfish: false,
  allergen_sesame: false,
  allergen_soy: false,
  allergen_fish: false,
  allergen_wheat: false,
  allergen_milk: false,
  allergen_sulphite: false,
  allergen_egg: false,
  allergen_gluten: false,
  allergen_mustard: false,
  allergen_celery: false,
  allergen_garlic: false,
  allergen_onion: false,
  allergen_nitrite: false,
  allergen_mushroom: false,
  allergen_hot_pepper: false,
  allergen_citrus: false,
  allergen_pork: false,
  allergen_peanut_may_contain: false,
  allergen_crustacean_may_contain: false,
  allergen_treenut_may_contain: false,
  allergen_shellfish_may_contain: false,
  allergen_sesame_may_contain: false,
  allergen_soy_may_contain: false,
  allergen_fish_may_contain: false,
  allergen_wheat_may_contain: false,
  allergen_milk_may_contain: false,
  allergen_sulphite_may_contain: false,
  allergen_egg_may_contain: false,
  allergen_gluten_may_contain: false,
  allergen_mustard_may_contain: false,
  allergen_celery_may_contain: false,
  allergen_garlic_may_contain: false,
  allergen_onion_may_contain: false,
  allergen_nitrite_may_contain: false,
  allergen_mushroom_may_contain: false,
  allergen_hot_pepper_may_contain: false,
  allergen_citrus_may_contain: false,
  allergen_pork_may_contain: false,
  allergen_custom1_name: null,
  allergen_custom1_active: false,
  allergen_custom1_may_contain: false,
  allergen_custom2_name: null,
  allergen_custom2_active: false,
  allergen_custom2_may_contain: false,
  allergen_custom3_name: null,
  allergen_custom3_active: false,
  allergen_custom3_may_contain: false,
  allergen_notes: null,
});

// ---------------------------------------------------------------------------
// L5 CUSTOM SELECT COMPONENT
// ---------------------------------------------------------------------------
interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface L5SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

const L5Select: React.FC<L5SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Group options
  const grouped = options.reduce((acc, opt) => {
    const group = opt.group || "";
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, SelectOption[]>);

  const selectedOption = options.find(o => o.value === value);
  const hasGroups = Object.keys(grouped).some(k => k !== "");

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger - uses .input class to match header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input w-full flex items-center justify-between gap-2 text-left"
      >
        <span className={selectedOption ? "text-white" : "text-gray-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1f2b] border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Options */}
          <div className="max-h-64 overflow-y-auto">
            {/* Empty option */}
            <button
              type="button"
              onClick={() => { onChange(""); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-800/50 transition-colors ${
                !value ? "text-primary-400" : "text-gray-500"
              }`}
            >
              {placeholder}
            </button>

            {Object.entries(grouped).map(([group, opts]) => (
              <div key={group || "default"}>
                {/* Group header - only show if we have named groups */}
                {group && hasGroups && (
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-800/30 border-t border-gray-700/50">
                    {group}
                  </div>
                )}
                {/* Options */}
                {opts.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-800/50 transition-colors ${
                      opt.value === value ? "text-primary-400 bg-primary-500/10" : "text-gray-300"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// L5 INPUT COMPONENT
// ---------------------------------------------------------------------------
interface L5InputProps {
  type?: "text" | "number";
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const L5Input: React.FC<L5InputProps> = ({
  type = "text",
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  min,
  max,
  step,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`input w-full ${prefix ? "pl-8" : ""} ${suffix ? "pr-10" : ""}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          {suffix}
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// FIELD WRAPPER WITH LABEL
// ---------------------------------------------------------------------------
interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, hint, children }) => {
  const { isGuided } = useGuidedMode();
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1">
        {label}
      </label>
      {children}
      {isGuided && hint && (
        <p className="text-xs text-gray-500 mt-1.5">{hint}</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// GUIDANCE TIP COMPONENT
// ---------------------------------------------------------------------------
interface GuidanceTipProps {
  children: React.ReactNode;
  color?: "green" | "amber" | "blue";
}

const GuidanceTip: React.FC<GuidanceTipProps> = ({ children, color = "blue" }) => {
  const { isGuided } = useGuidedMode();
  if (!isGuided) return null;

  const colors = {
    green: "bg-green-500/10 border-green-500/20",
    amber: "bg-amber-500/10 border-amber-500/20",
    blue: "bg-primary-500/10 border-primary-500/20",
  };
  
  const iconColors = {
    green: "text-green-400",
    amber: "text-amber-400",
    blue: "text-primary-400",
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[color]} mb-4`}>
      <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors[color]}`} />
      <p className="text-sm text-gray-300">{children}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// EXPANDABLE SECTION COMPONENT
// ---------------------------------------------------------------------------
interface ExpandableSectionProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  helpText?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  helpText,
  defaultExpanded = true,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors text-left rounded-t-lg"
      >
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-300">{title}</h2>
            <span className="text-xs text-gray-500">{subtitle}</span>
          </div>
        </div>
        {helpText && (
          <div className="group relative" onClick={(e) => e.stopPropagation()}>
            <HelpCircle className="w-4 h-4 text-gray-600 hover:text-gray-400 transition-colors" />
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 border border-gray-700">
              <p className="text-xs text-gray-300 leading-relaxed">{helpText}</p>
            </div>
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      
      {/* Section Content - with border separator and subtle tint like header */}
      {isExpanded && (
        <div className="border-t border-gray-700/50">
          <div className="px-4 py-4 bg-primary-800/10 rounded-b-lg">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// COST CALCULATOR (The Payoff)
// ---------------------------------------------------------------------------
interface CostCalculatorProps {
  price: number;
  recipeUnits: number;
  yieldPercent: number;
  unitType: string;
  productName: string;
}

const CostCalculator: React.FC<CostCalculatorProps> = ({
  price,
  recipeUnits,
  yieldPercent,
  unitType,
  productName,
}) => {
  const { isGuided } = useGuidedMode();
  const baseUnitCost = recipeUnits > 0 ? price / recipeUnits : 0;
  const adjustedCost = yieldPercent > 0 ? baseUnitCost / (yieldPercent / 100) : baseUnitCost;
  const finalCost = Math.round(adjustedCost * 10000) / 10000;
  const isCalculable = price > 0 && recipeUnits > 0;
  const hasYieldAdjustment = yieldPercent !== 100;

  const exampleQty = unitType?.toLowerCase().includes('oz') ? 4 : 
                     unitType?.toLowerCase().includes('lb') ? 1 :
                     unitType?.toLowerCase().includes('each') ? 2 : 1;
  const exampleCost = finalCost * exampleQty;

  return (
    <div className={`bg-[#1a1f2b] rounded-lg shadow-lg overflow-hidden ${
      isCalculable ? "ring-1 ring-purple-500/30" : ""
    }`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isCalculable ? "bg-purple-500/20" : "bg-gray-800/50"
        }`}>
          <Calculator className={`w-4 h-4 ${isCalculable ? "text-purple-400" : "text-gray-500"}`} />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-300">Cost per Recipe Unit</h2>
          <span className="text-xs text-gray-500">Calculated from purchase data</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {isCalculable ? (
          <>
            {/* Visual Equation */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap py-4">
              <div className="text-center min-w-[50px]">
                <div className="text-lg sm:text-xl font-bold text-white">${price.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Price</div>
              </div>
              <div className="text-lg text-gray-600">÷</div>
              <div className="text-center min-w-[50px]">
                <div className="text-lg sm:text-xl font-bold text-white">{recipeUnits}</div>
                <div className="text-xs text-gray-500">Units</div>
              </div>
              {hasYieldAdjustment && (
                <>
                  <div className="text-lg text-gray-600">×</div>
                  <div className="text-center min-w-[50px]">
                    <div className="text-lg sm:text-xl font-bold text-amber-400">{(100 / yieldPercent).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Yield</div>
                  </div>
                </>
              )}
              <div className="text-lg text-gray-600">=</div>
              <div className="text-center px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                <div className="text-xl sm:text-2xl font-bold text-purple-400">${finalCost.toFixed(4)}</div>
                <div className="text-xs text-purple-400/70">per {unitType || "unit"}</div>
              </div>
            </div>

            {/* Example (Guided mode only) */}
            {isGuided && (
              <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-800/30 rounded-lg text-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-gray-400">
                  Recipe calls for <span className="text-white">{exampleQty} {unitType}</span>? 
                  That's <span className="text-purple-400">${exampleCost.toFixed(2)}</span>
                </span>
              </div>
            )}

            {hasYieldAdjustment && (
              <div className="mt-2 text-center text-xs text-gray-500">
                * Adjusted for {yieldPercent}% usable yield
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gray-800/50 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm">Awaiting purchase data</p>
            <p className="text-xs text-gray-500 mt-1">Complete the fields above to calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// GUIDED MODE TOGGLE
// ---------------------------------------------------------------------------
const GuidedModeToggle: React.FC = () => {
  const { isGuided, setIsGuided } = useGuidedMode();
  
  return (
    <button
      onClick={() => setIsGuided(!isGuided)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        isGuided 
          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-lg shadow-primary-500/10" 
          : "bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:text-gray-400 hover:border-gray-600"
      }`}
      title={isGuided ? "Guided mode: ON" : "Guided mode: OFF"}
    >
      <GraduationCap className="w-3.5 h-3.5" />
      <span>{isGuided ? "Guided" : "Guide"}</span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export const IngredientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { organization, user, isDev } = useAuth();
  const { showDiagnostics } = useDiagnostics();
  const { settings, fetchSettings } = useOperationsStore();
  
  // Navigation store for prev/next and contextual back
  const { 
    ingredientIds, 
    setCurrentIndex, 
    getPrevId, 
    getNextId, 
    getPosition,
    returnTo,
  } = useIngredientNavigationStore();
  
  const isNew = !id || id === "new";
  const position = getPosition();
  const prevId = getPrevId();
  const nextId = getNextId();
  
  // ---------------------------------------------------------------------------
  // ORGANIZATION ID - Use URL param (passed from list) or fall back to auth
  // This avoids race condition where auth hasn't resolved org yet
  // ---------------------------------------------------------------------------
  const urlOrgId = searchParams.get('org_id');
  const organizationId = urlOrgId || organization?.id;
  
  // ---------------------------------------------------------------------------
  // TRIAGE FLOW - Extract pending import data from URL params
  // When coming from Triage, URL looks like:
  // /admin/data/ingredients/new?pending_id=xxx&item_code=xxx&product=xxx&price=xxx&vendor=xxx&uom=xxx
  // ---------------------------------------------------------------------------
  const triageData = isNew ? {
    pendingId: searchParams.get('pending_id'),
    itemCode: searchParams.get('item_code'),
    product: searchParams.get('product'),
    price: searchParams.get('price'),
    vendor: searchParams.get('vendor'),
    uom: searchParams.get('uom'),
  } : null;
  const isFromTriage = !!(triageData?.pendingId);
  
  // Derive back button label from returnTo path
  const backLabel = returnTo.includes("triage") 
    ? "Back to Triage" 
    : "Back to Ingredients";
  
  // Guided mode state
  const [isGuided, setIsGuided] = useState(() => {
    const stored = localStorage.getItem("cheflife-guided-mode");
    return stored === "true";
  });
  
  useEffect(() => {
    localStorage.setItem("cheflife-guided-mode", isGuided.toString());
  }, [isGuided]);

  // Form state
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<MasterIngredient | null>(null);
  const [formData, setFormData] = useState<MasterIngredient | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // Price source tracking - shows where the current price came from
  const [priceSource, setPriceSource] = useState<PriceSource | null>(null);
  const [isPriceOverrideEnabled, setIsPriceOverrideEnabled] = useState(false);
  const [priceAtOverride, setPriceAtOverride] = useState<number | null>(null); // Track price when override started

  // Build purchase unit options from settings (for Purchase Information section)
  const purchaseUnitOptions: SelectOption[] = React.useMemo(() => {
    if (!settings?.purchase_unit_measures) return [];
    return settings.purchase_unit_measures.map((unit: string) => ({
      value: unit,
      label: unit,
    }));
  }, [settings]);

  // Build unit options from settings (for Inventory section - more detailed categories)
  const unitOfMeasureOptions: SelectOption[] = React.useMemo(() => {
    if (!settings) return [];
    const options: SelectOption[] = [];
    
    const addGroup = (items: string[] | undefined, group: string) => {
      if (items?.length) {
        items.forEach(item => options.push({ value: item, label: item, group }));
      }
    };
    
    addGroup(settings.weight_measures, "Weight");
    addGroup(settings.volume_measures, "Volume");
    addGroup(settings.dry_goods_measures, "Dry Goods");
    addGroup(settings.batch_units, "Batch");
    addGroup(settings.protein_measures, "Protein");
    addGroup(settings.alcohol_measures, "Alcohol");
    
    return options;
  }, [settings]);

  const recipeUnitOptions: SelectOption[] = React.useMemo(() => {
    if (!settings?.recipe_unit_measures) return [];
    return settings.recipe_unit_measures.map((unit: string) => ({
      value: unit,
      label: unit,
    }));
  }, [settings]);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Unsaved changes detection
  const hasUnsavedChanges = useCallback(() => {
    if (!formData || !originalData) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [formData, originalData]);

  // Browser close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleBack();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (formData?.product && !isSaving) handleSave();
      }
      // Arrow key navigation (only if no unsaved changes)
      if (e.key === "ArrowLeft" && prevId && !hasUnsavedChanges()) {
        e.preventDefault();
        navigateToPrev();
      }
      if (e.key === "ArrowRight" && nextId && !hasUnsavedChanges()) {
        e.preventDefault();
        navigateToNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formData, isSaving, prevId, nextId, hasUnsavedChanges]);

  // Navigation handlers
  const navigateToPrev = () => {
    if (prevId && !hasUnsavedChanges()) {
      navigate(`/admin/data/ingredients/${prevId}`);
    }
  };

  const navigateToNext = () => {
    if (nextId && !hasUnsavedChanges()) {
      navigate(`/admin/data/ingredients/${nextId}`);
    }
  };

  // Permission check
  useEffect(() => {
    const checkPermissions = async () => {
      // For new ingredients, skip permission check - if user can access MIL, they can create
      if (isNew) {
        setHasPermission(true);
        return;
      }
      
      // Dev users always have permission
      if (isDev) { setHasPermission(true); return; }
      if (!organizationId || !user?.id) return;
      const { data: roles } = await supabase
        .from("organization_roles")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();
      if (!roles || !["owner", "admin"].includes(roles.role)) {
        setHasPermission(false);
        toast.error("You do not have permission to manage ingredients");
        navigate("/admin/data/ingredients");
      } else {
        setHasPermission(true);
      }
    };
    checkPermissions();
  }, [organizationId, user?.id, isDev, navigate, isNew]);

  // Load ingredient
  useEffect(() => {
    const loadIngredient = async () => {
      if (isNew) {
        if (organizationId) {
          const newIngredient = createEmptyIngredient(organizationId);
          
          // Pre-fill from Triage data if coming from Triage
          if (isFromTriage && triageData) {
            newIngredient.product = triageData.product || "";
            newIngredient.item_code = triageData.itemCode || null;
            newIngredient.current_price = triageData.price ? parseFloat(triageData.price) : 0;
            newIngredient.vendor = triageData.vendor || "";
            newIngredient.unit_of_measure = triageData.uom || "";
          }
          
          setFormData(newIngredient);
          setOriginalData(newIngredient);
        }
        return;
      }
      if (!id || !organizationId) return;
      
      // Update navigation index
      const index = ingredientIds.indexOf(id);
      if (index >= 0) setCurrentIndex(index);
      
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("master_ingredients")
          .select("*")
          .eq("id", id)
          .eq("organization_id", organizationId)
          .single();
        if (fetchError) throw fetchError;
        if (!data) { setError("Ingredient not found"); return; }
        const normalized = normalizeIngredient(data);
        setFormData(normalized);
        setOriginalData(normalized);
        
        // Fetch latest price source from vendor_price_history
        // Pass ingredient's updated_at as fallback for legacy/manual entries
        fetchPriceSource(id, data.updated_at);
      } catch (err) {
        console.error("Error loading ingredient:", err);
        setError("Failed to load ingredient");
      } finally {
        setIsLoading(false);
      }
    };
    loadIngredient();
  }, [id, isNew, organizationId, ingredientIds, setCurrentIndex]);

  // Fetch price source from vendor_price_history
  // Falls back to ingredient's updated_at for legacy/manual entries
  const fetchPriceSource = async (ingredientId: string, ingredientUpdatedAt?: string) => {
    try {
      // Get most recent price history entry for this ingredient
      const { data: priceHistory, error } = await supabase
        .from('vendor_price_history')
        .select(`
          id,
          price,
          created_at,
          source_type,
          vendor_id,
          vendor_import_id,
          vendor_imports (
            invoice_number,
            invoice_date,
            vendor_id,
            file_name,
            created_at
          )
        `)
        .eq('master_ingredient_id', ingredientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        console.error('Error fetching price source:', error);
        return;
      }

      if (priceHistory) {
        const vendorImport = priceHistory.vendor_imports as any;
        // Use invoice_date (when price was effective) not created_at (when we imported)
        const invoiceDate = vendorImport?.invoice_date 
          ? new Date(vendorImport.invoice_date)
          : new Date(priceHistory.created_at);
        const importDate = vendorImport?.created_at 
          ? new Date(vendorImport.created_at)
          : new Date(priceHistory.created_at);
          
        setPriceSource({
          type: 'invoice',
          invoiceNumber: vendorImport?.invoice_number || undefined,
          vendorName: vendorImport?.vendor_id || priceHistory.vendor_id || undefined,
          updatedAt: invoiceDate,
          importedAt: importDate,
        });
      } else {
        // No price history - set as manual/legacy with ingredient's updated_at
        setPriceSource({
          type: 'manual',
          updatedAt: ingredientUpdatedAt ? new Date(ingredientUpdatedAt) : new Date(),
        });
      }
    } catch (err) {
      console.error('Error fetching price source:', err);
    }
  };

  // Auto-calculate cost
  useEffect(() => {
    if (!formData) return;
    const { current_price, recipe_unit_per_purchase_unit, yield_percent } = formData;
    const baseUnitCost = recipe_unit_per_purchase_unit > 0 ? current_price / recipe_unit_per_purchase_unit : 0;
    const adjustedCost = yield_percent > 0 ? baseUnitCost / (yield_percent / 100) : baseUnitCost;
    const roundedCost = Math.round(adjustedCost * 10000) / 10000;
    if (roundedCost !== formData.cost_per_recipe_unit) {
      setFormData(prev => prev ? { ...prev, cost_per_recipe_unit: roundedCost } : null);
    }
  }, [formData?.current_price, formData?.recipe_unit_per_purchase_unit, formData?.yield_percent]);

  // Handlers
  const handleChange = (updates: Partial<MasterIngredient>) => {
    setFormData((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleSave = async () => {
    if (!formData || !organizationId) return;
    setIsSaving(true);
    try {
      const dataToSave = { ...formData, organization_id: organizationId, updated_at: new Date().toISOString() };
      
      // Check if price was changed via system override
      const priceWasOverridden = isPriceOverrideEnabled && 
        priceAtOverride !== null && 
        formData.current_price !== priceAtOverride;
      
      if (isNew) {
        const { error: insertError } = await supabase.from("master_ingredients").insert(dataToSave);
        if (insertError) throw insertError;
        
        // If created from Triage, mark the pending import as resolved and fire NEXUS event
        if (isFromTriage && triageData?.pendingId) {
          const { error: deleteError } = await supabase
            .from("pending_import_items")
            .delete()
            .eq("id", triageData.pendingId);
          
          if (deleteError) {
            console.error("Error removing pending import item:", deleteError);
            // Don't throw - ingredient was created successfully, just log the cleanup error
          }
          
          // Fire NEXUS event for Triage conversion tracking
          if (user?.id) {
            nexus({
              organization_id: organizationId,
              user_id: user.id,
              activity_type: 'triage_item_converted',
              details: {
                ingredient_id: dataToSave.id,
                ingredient_name: dataToSave.product,
                item_code: triageData.itemCode,
                vendor: triageData.vendor,
                price: dataToSave.current_price,
                pending_import_id: triageData.pendingId,
              },
              metadata: {
                source: 'triage_to_ingredient',
                original_triage_data: triageData,
              },
            });
          }
        }
        
        toast.success("Ingredient created successfully");
      } else {
        const { error: updateError } = await supabase.from("master_ingredients").update(dataToSave).eq("id", formData.id).eq("organization_id", organizationId);
        if (updateError) throw updateError;
        toast.success("Ingredient saved successfully");
        
        // Fire CRITICAL NEXUS event if price was changed via system override
        if (priceWasOverridden && user?.id) {
          nexus({
            organization_id: organizationId,
            user_id: user.id,
            activity_type: 'system_override_price',
            details: {
              ingredient_id: formData.id,
              ingredient_name: formData.product,
              old_price: priceAtOverride,
              new_price: formData.current_price,
              price_change: formData.current_price - priceAtOverride,
              price_change_percent: priceAtOverride > 0 
                ? ((formData.current_price - priceAtOverride) / priceAtOverride * 100).toFixed(2)
                : 'N/A',
            },
            metadata: {
              diffs: {
                table_name: 'master_ingredients',
                record_id: formData.id,
                old_values: { current_price: priceAtOverride },
                new_values: { current_price: formData.current_price },
                diff: { current_price: { from: priceAtOverride, to: formData.current_price } },
              },
            },
            severity: 'critical',
            requires_acknowledgment: true,
          });
        }
      }
      setOriginalData(dataToSave);
      navigate(returnTo);
    } catch (err) {
      console.error("Error saving ingredient:", err);
      toast.error("Failed to save ingredient");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!formData || isNew) return;
    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("master_ingredients").delete().eq("id", formData.id).eq("organization_id", organizationId);
      if (deleteError) throw deleteError;
      toast.success("Ingredient deleted");
      navigate(returnTo);
    } catch (err) {
      console.error("Error deleting ingredient:", err);
      toast.error("Failed to delete ingredient");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleArchive = () => {
    if (!formData) return;
    handleChange({ archived: !formData.archived });
  };

  const safeNavigate = (path: string) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(path);
      setShowUnsavedDialog(true);
    } else {
      navigate(path);
    }
  };

  const handleBack = () => safeNavigate(returnTo);

  const handleDiscardAndNavigate = () => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) navigate(pendingNavigation);
  };

  // Loading/Error states
  // For new ingredients: only need organizationId (from URL param)
  // For existing ingredients: need permission check to complete
  if (isLoading || (!isNew && hasPermission === null) || (isNew && !organizationId)) {
    return (
      <div className="max-w-3xl mx-auto pb-24">
        {/* Skeleton Loading */}
        <div className="animate-pulse space-y-4">
          {/* Navigation bar skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-gray-800 rounded-lg" />
            <div className="h-6 w-24 bg-gray-800 rounded-lg" />
          </div>
          {/* Header skeleton */}
          <div className="bg-[#1a1f2b] rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-800 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-gray-800 rounded" />
                <div className="h-4 w-32 bg-gray-800/50 rounded" />
              </div>
            </div>
          </div>
          {/* Section skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1a1f2b] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg" />
                <div className="h-4 w-40 bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="w-12 h-12 text-rose-400" />
        <p className="text-gray-400">{error}</p>
        <button onClick={handleBack} className="btn-ghost">Back to Ingredients</button>
      </div>
    );
  }
  if (!formData) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>;
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <GuidedModeContext.Provider value={{ isGuided, setIsGuided }}>
      <div className="max-w-3xl mx-auto pb-24">
        {showDiagnostics && (
          <div className="text-xs text-gray-500 font-mono mb-2">
            src/features/admin/.../IngredientDetailPage/index.tsx
          </div>
        )}

        {/* Navigation Bar - Always show back button, show prev/next only when multiple items */}
        <div className="mb-4">
          {/* Navigation Guidance Tip - only when multiple items */}
          {isGuided && position && ingredientIds.length > 1 && (
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-primary-500/10 border-primary-500/20 mb-3">
              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-400" />
              <div className="text-sm text-gray-300">
                <span className="font-medium text-white">Quick Navigation:</span> You're viewing a filtered set from the list page. 
                Use the <span className="text-primary-400">← →</span> buttons or <span className="text-primary-400">arrow keys</span> to 
                move through your {position.total} items without going back. Changes must be saved first.
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {backLabel}
            </button>
            
            {/* Prev/Next only when multiple items */}
            {position && ingredientIds.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {position.current} of {position.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={navigateToPrev}
                    disabled={!prevId || hasUnsavedChanges()}
                    aria-label="Previous ingredient"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      prevId && !hasUnsavedChanges()
                        ? "bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white"
                        : "bg-gray-800/20 text-gray-700 cursor-not-allowed"
                    }`}
                    title={hasUnsavedChanges() ? "Save changes first" : prevId ? "Previous (←)" : "No previous"}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={navigateToNext}
                    disabled={!nextId || hasUnsavedChanges()}
                    aria-label="Next ingredient"
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      nextId && !hasUnsavedChanges()
                        ? "bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white"
                        : "bg-gray-800/20 text-gray-700 cursor-not-allowed"
                    }`}
                    title={hasUnsavedChanges() ? "Save changes first" : nextId ? "Next (→)" : "No next"}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <ConfirmDialog
          isOpen={showUnsavedDialog}
          onClose={() => { setShowUnsavedDialog(false); setPendingNavigation(null); }}
          onConfirm={handleDiscardAndNavigate}
          title="Unsaved Changes"
          message="You have unsaved changes that will be lost if you leave this page."
          confirmLabel="Discard Changes"
          cancelLabel="Keep Editing"
          variant="warning"
        />
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Ingredient"
          message={`Permanently delete "${formData.product}"? This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={isDeleting}
        />

        {/* Page Header */}
        <PageHeader
          ingredient={formData}
          isNew={isNew}
          hasUnsavedChanges={hasUnsavedChanges()}
          onBack={handleBack}
          onChange={handleChange}
          guidedModeToggle={<GuidedModeToggle />}
          backLabel={backLabel}
        />

        {/* Triage Ghost Banner - Shows when creating from skipped import */}
        {isFromTriage && triageData && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Ghost className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-300">Creating from Triage</div>
              <p className="text-xs text-gray-400">
                This ingredient was skipped during invoice import. Complete the setup below and save to add it to your Master Ingredients List.
                {triageData.vendor && <span className="text-amber-400/70"> • From {triageData.vendor}</span>}
                {triageData.itemCode && <span className="text-gray-500"> • Code: {triageData.itemCode}</span>}
              </p>
            </div>
          </div>
        )}

        {/* =======================================================================
         * MAIN CONTENT - Sections with descending z-index for dropdown stacking
         * ======================================================================= */}
        <div className="mt-6 space-y-4">

          {/* SECTION 1: Purchase Information - BUY IT */}
          <div className="relative" style={{ zIndex: 40 }}>
            <ExpandableSection
              icon={DollarSign}
              iconColor="text-green-400"
              iconBg="bg-green-500/20"
              title="Purchase Information"
              subtitle="Invoice details and pricing"
              helpText="Enter the purchase details exactly as they appear on your vendor invoice."
            >
              <GuidanceTip color="green">
                Look at your vendor invoice for this item. What's the description, price, and how is it sold?
              </GuidanceTip>

              <div className="space-y-4">
                <Field 
                  label="Case/Package Description"
                  hint='Copy this from your invoice, e.g., "1 × 5KG", "Case of 24"'
                >
                  <L5Input
                    value={formData.case_size}
                    onChange={(v) => handleChange({ case_size: v })}
                    placeholder='e.g., "1 × 5KG", "Case of 24"'
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Purchase Price
                    </label>
                    
                    {/* Guided mode warning about system override */}
                    {isGuided && !isNew && (
                      <div className="flex items-start gap-2 p-2 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                        <p className="text-xs text-amber-200/80">
                          <span className="font-medium text-amber-300">Protected Field:</span> Prices should come from invoice imports to maintain audit trail. 
                          The lock allows emergency overrides, but changes are logged and require admin acknowledgement.
                        </p>
                      </div>
                    )}
                    
                    {/* Price input with lock button inside */}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        value={formData.current_price || ""}
                        onChange={(e) => handleChange({ current_price: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        readOnly={!isNew && !isPriceOverrideEnabled}
                        className={`input w-full pl-8 pr-10 ${
                          !isNew && !isPriceOverrideEnabled
                            ? 'bg-gray-800/30 cursor-not-allowed text-gray-400'
                            : ''
                        }`}
                      />
                      {/* Two-stage unlock button - ALWAYS show for existing ingredients */}
                      {/* Editing price here is a SYSTEM override that bypasses VIM audit trail */}
                      {!isNew && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {!isPriceOverrideEnabled ? (
                            <TwoStageButton
                              onConfirm={() => {
                                setIsPriceOverrideEnabled(true);
                                setPriceAtOverride(formData.current_price); // Capture price at override
                                toast('System override enabled - changes bypass invoice audit trail', { icon: '⚠️' });
                                
                                // Fire NEXUS event
                                if (organizationId && user?.id) {
                                  nexus({
                                    organization_id: organizationId,
                                    user_id: user.id,
                                    activity_type: 'system_override_initiated',
                                    details: {
                                      ingredient_id: formData.id,
                                      ingredient_name: formData.product,
                                      current_price: formData.current_price,
                                    },
                                  });
                                }
                              }}
                              icon={Lock}
                              confirmIcon={Pencil}
                              confirmText="Edit?"
                              variant="warning"
                              timeout={3000}
                              size="xs"
                            />
                          ) : (
                            <Pencil className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {isGuided && (
                      <p className="text-xs text-gray-500 mt-1.5">The price you pay for one purchase unit</p>
                    )}
                  </div>

                  <Field 
                    label="Unit of Measure"
                    hint="How the vendor sells it (Case, kg, lb, Box, etc.)"
                  >
                    <L5Select
                      value={formData.unit_of_measure}
                      onChange={(v) => handleChange({ unit_of_measure: v })}
                      options={purchaseUnitOptions}
                      placeholder="Select unit..."
                    />
                  </Field>
                </div>
              </div>
            </ExpandableSection>

            {/* Purchase Summary Card - Outside section, always visible */}
            {!isNew && formData.current_price > 0 && (
              <div className={`bg-[#1a1f2b] rounded-lg shadow-lg overflow-hidden ring-1 ring-green-500/30`}>
                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-gray-300">Purchase Summary</h2>
                    <span className="text-xs text-gray-500">
                      {priceSource?.type === 'invoice' ? 'From invoice import' : 'Current pricing'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4">
                  {/* Main equation row */}
                  <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap py-4">
                    {/* Item */}
                    <div className="text-center min-w-[80px]">
                      <div className="text-lg sm:text-xl font-bold text-white truncate max-w-[140px]" title={formData.common_name || formData.product}>
                        {formData.common_name || formData.product || '—'}
                      </div>
                      <div className="text-xs text-gray-500">Item</div>
                    </div>
                    
                    <div className="text-lg text-gray-600 hidden sm:block">•</div>
                    
                    {/* Vendor */}
                    <div className="text-center min-w-[80px]">
                      <div className="text-lg sm:text-xl font-bold text-white truncate max-w-[120px]" title={priceSource?.vendorName || formData.vendor}>
                        {priceSource?.vendorName || formData.vendor || '—'}
                      </div>
                      <div className="text-xs text-gray-500">Vendor</div>
                    </div>
                    
                    <div className="text-lg text-gray-600 hidden sm:block">•</div>
                    
                    {/* Price Result */}
                    <div className="text-center px-4 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
                      <div className="text-xl sm:text-2xl font-bold text-green-400">
                        ${formData.current_price.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-400/70">per {formData.unit_of_measure || 'unit'}</div>
                    </div>
                    
                    <div className="text-lg text-gray-600 hidden sm:block">•</div>
                    
                    {/* Invoice Date */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg sm:text-xl font-bold text-white">
                        {priceSource?.updatedAt 
                          ? priceSource.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {priceSource?.type === 'invoice' ? 'Invoice Date' : 'Updated'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Source indicator */}
                  {priceSource?.type === 'invoice' && (
                    <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-800/30 rounded-lg text-sm">
                      <FileText className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-gray-400">
                        {priceSource.invoiceNumber && (
                          <>Invoice <span className="text-white">#{priceSource.invoiceNumber}</span></>  
                        )}
                        {priceSource.importedAt && (
                          <span className="text-gray-500 ml-2">
                            • Imported {priceSource.importedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {priceSource?.type === 'manual' && (
                    <div className="text-center text-xs text-gray-500">
                      * Manual entry or legacy data — no invoice on file
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Inventory Units - STORE IT */}
          <div className="relative" style={{ zIndex: 35 }}>
            <ExpandableSection
              icon={Package}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/20"
              title="Inventory Units"
              subtitle="How you count this on the shelf"
              helpText="Define how this ingredient is counted during inventory taking. This is separate from recipe units - you might use OZ in recipes but count by the LB on the shelf."
              defaultExpanded={false}
            >
              <GuidanceTip color="blue">
                When you do inventory, what unit do you count this item in? Cases? Pounds? Individual units?
              </GuidanceTip>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field 
                    label="Inventory Unit Type"
                    hint="The unit you count in during inventory (LB, EACH, CASE, %)"
                  >
                    <L5Select
                      value={formData.inventory_unit_type || ""}
                      onChange={(v) => handleChange({ inventory_unit_type: v })}
                      options={[
                        // Use same units as purchase, plus % for visual estimation
                        ...unitOfMeasureOptions,
                        { value: "PERCENT", label: "% (Percentage remaining)", group: "Estimation" },
                      ]}
                      placeholder="Select unit..."
                    />
                  </Field>

                  <Field 
                    label="Inventory Units per Purchase"
                    hint={`How many ${formData.inventory_unit_type || "inventory units"} in one ${formData.case_size || "purchase unit"}?`}
                  >
                    <L5Input
                      type="number"
                      value={formData.units_per_case || ""}
                      onChange={(v) => handleChange({ units_per_case: parseFloat(v) || 0 })}
                      placeholder="Enter conversion..."
                      min={0}
                      step={0.01}
                    />
                  </Field>
                </div>

                {/* Inventory Cost Calculator - Read-only result */}
                {formData.current_price > 0 && formData.units_per_case > 0 && (
                  <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap py-4">
                    <div className="text-center min-w-[50px]">
                      <div className="text-lg sm:text-xl font-bold text-white">${formData.current_price.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Price</div>
                    </div>
                    <div className="text-lg text-gray-600">÷</div>
                    <div className="text-center min-w-[50px]">
                      <div className="text-lg sm:text-xl font-bold text-white">{formData.units_per_case}</div>
                      <div className="text-xs text-gray-500">Units</div>
                    </div>
                    <div className="text-lg text-gray-600">=</div>
                    <div className="text-center px-3 py-1.5 bg-amber-500/20 rounded-lg border border-amber-500/30">
                      <div className="text-xl sm:text-2xl font-bold text-amber-400">
                        ${(formData.current_price / formData.units_per_case).toFixed(4)}
                      </div>
                      <div className="text-xs text-amber-400/70">per {formData.inventory_unit_type || "unit"}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field 
                    label="Par Level"
                    hint={`Target stock (in ${formData.inventory_unit_type || "inventory units"})`}
                  >
                    <L5Input
                      type="number"
                      value={formData.par_level || ""}
                      onChange={(v) => handleChange({ par_level: parseFloat(v) || undefined })}
                      placeholder="Target stock level"
                      min={0}
                      step={1}
                    />
                  </Field>

                  <Field 
                    label="Reorder Point"
                    hint="Alert when stock falls below this"
                  >
                    <L5Input
                      type="number"
                      value={formData.reorder_point || ""}
                      onChange={(v) => handleChange({ reorder_point: parseFloat(v) || undefined })}
                      placeholder="Reorder threshold"
                      min={0}
                      step={1}
                    />
                  </Field>
                </div>
              </div>
            </ExpandableSection>
          </div>

          {/* SECTION 3: Recipe Units - USE IT */}
          <div className="relative" style={{ zIndex: 30 }}>
            <ExpandableSection
              icon={Scale}
              iconColor="text-rose-400"
              iconBg="bg-rose-500/20"
              title="Recipe Units"
              subtitle="Conversion and yield"
              helpText="Define how this ingredient is measured in your recipes and the conversion from purchase units."
            >
              <GuidanceTip color="amber">
                <span className="font-medium">ChefLife's Secret Weapon:</span> We distill every ingredient down to just three recipe units — <span className="text-white">OZ</span>, <span className="text-white">FL.OZ</span>, or <span className="text-white">EACH</span>. 
                No cups, tablespoons, or pounds in recipes. This makes costing dead simple — every recipe speaks the same language.
              </GuidanceTip>

              <div className="space-y-4">
                <Field 
                  label="Recipe Unit Type"
                  hint="The unit you'll use in recipes (OZ, EACH, etc.)"
                >
                  <L5Select
                    value={formData.recipe_unit_type}
                    onChange={(v) => handleChange({ recipe_unit_type: v })}
                    options={recipeUnitOptions}
                    placeholder="Select unit..."
                  />
                </Field>

                <Field 
                  label="Recipe Units per Purchase Unit"
                  hint={`How many ${formData.recipe_unit_type || "recipe units"} in one ${formData.case_size || "purchase unit"}?`}
                >
                  <L5Input
                    type="number"
                    value={formData.recipe_unit_per_purchase_unit || ""}
                    onChange={(v) => handleChange({ recipe_unit_per_purchase_unit: parseFloat(v) || 0 })}
                    placeholder="Enter conversion..."
                    min={0}
                    step={0.01}
                  />
                </Field>

                <Field 
                  label="Yield Percentage"
                  hint="After prep (trimming, etc.), what % is usable? 100% = no waste"
                >
                  <L5Input
                    type="number"
                    value={formData.yield_percent}
                    onChange={(v) => handleChange({ yield_percent: parseFloat(v) || 100 })}
                    placeholder="100"
                    suffix="%"
                    min={1}
                    max={100}
                    step={1}
                  />
                </Field>
              </div>
            </ExpandableSection>
          </div>

          {/* SECTION 4: Cost Calculator - THE PAYOFF */}
          <div className="relative" style={{ zIndex: 20 }}>
            <CostCalculator
              price={formData.current_price}
              recipeUnits={formData.recipe_unit_per_purchase_unit}
              yieldPercent={formData.yield_percent}
              unitType={formData.recipe_unit_type}
              productName={formData.product}
            />
          </div>

          {/* SECTION 5: Reporting & Tracking - TRACK IT */}
          <div className="relative" style={{ zIndex: 15 }}>
            <ExpandableSection
              icon={BarChart3}
              iconColor="text-lime-400"
              iconBg="bg-lime-500/20"
              title="Reporting & Tracking"
              subtitle="Dashboard visibility and inventory schedules"
              helpText="Control which inventories this item appears in and whether it's highlighted on the admin dashboard."
              defaultExpanded={false}
            >
              <div className="space-y-4">
                <Field 
                  label="Priority Level"
                  hint="Higher priority items get more visibility on dashboards"
                >
                  <L5Select
                    value={formData.priority_level || "standard"}
                    onChange={(v) => handleChange({ priority_level: v as MasterIngredient['priority_level'] })}
                    options={[
                      { value: "critical", label: "Critical - Daily tracking, always visible" },
                      { value: "high", label: "High - Weekly focus, prominent display" },
                      { value: "standard", label: "Standard - Normal tracking" },
                      { value: "low", label: "Low - Minimal tracking" },
                    ]}
                    placeholder="Select priority..."
                  />
                </Field>

                {/* Inventory Schedule Checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Include in Inventory Counts
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "daily", label: "Daily Count", desc: "Proteins, high-value items" },
                      { key: "weekly", label: "Weekly Count", desc: "Standard full inventory" },
                      { key: "monthly", label: "Monthly Count", desc: "Stable dry goods" },
                      { key: "spot", label: "Spot Check Only", desc: "Random audits" },
                    ].map(({ key, label, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const current = formData.inventory_schedule || [];
                          const updated = current.includes(key)
                            ? current.filter(s => s !== key)
                            : [...current, key];
                          handleChange({ inventory_schedule: updated });
                        }}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                          (formData.inventory_schedule || []).includes(key)
                            ? "bg-gray-700/30 border-gray-500/50 text-white"
                            : "bg-gray-800/20 border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          (formData.inventory_schedule || []).includes(key)
                            ? "bg-gray-500 border-gray-500"
                            : "border-gray-600"
                        }`}>
                          {(formData.inventory_schedule || []).includes(key) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-gray-500">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alert Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Alerts & Dashboard
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange({ show_on_dashboard: !formData.show_on_dashboard })}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        formData.show_on_dashboard
                          ? "bg-gray-700/30 border-gray-500/50 text-white"
                          : "bg-gray-800/20 border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.show_on_dashboard ? "bg-gray-500 border-gray-500" : "border-gray-600"
                      }`}>
                        {formData.show_on_dashboard && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">Show on Dashboard</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange({ alert_price_change: !formData.alert_price_change })}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        formData.alert_price_change
                          ? "bg-gray-700/30 border-gray-500/50 text-white"
                          : "bg-gray-800/20 border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.alert_price_change ? "bg-gray-500 border-gray-500" : "border-gray-600"
                      }`}>
                        {formData.alert_price_change && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span className="text-sm">Price Change Alerts</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange({ alert_low_stock: !formData.alert_low_stock })}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        formData.alert_low_stock
                          ? "bg-gray-700/30 border-gray-500/50 text-white"
                          : "bg-gray-800/20 border-gray-700/30 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.alert_low_stock ? "bg-gray-500 border-gray-500" : "border-gray-600"
                      }`}>
                        {formData.alert_low_stock && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        <span className="text-sm">Low Stock Alerts</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </ExpandableSection>
          </div>

          {/* SECTION 6: Allergens - SAFETY */}
          <div className="relative" style={{ zIndex: 10 }}>
            <ExpandableSection
              icon={ShieldAlert}
              iconColor="text-red-400"
              iconBg="bg-red-500/20"
              title="Allergen Information"
              subtitle="Food safety and dietary compliance"
              helpText="Mark allergens present in this ingredient. This data flows through to recipe costing and menu labeling."
              defaultExpanded={false}
            >
              <AllergenSection formData={formData} onChange={handleChange} />
            </ExpandableSection>
          </div>
        </div>

        {/* =======================================================================
         * FLOATING ACTION BAR
         * ======================================================================= */}
        {(hasUnsavedChanges() || isNew) && (
          <div className={`floating-action-bar ${hasUnsavedChanges() ? 'warning' : ''}`}>
            <div className="floating-action-bar-inner">
              <div className="floating-action-bar-content">
                <div className="flex items-center gap-3">
                  {hasUnsavedChanges() && (
                    <span className="flex items-center gap-1.5 text-sm text-amber-400">
                      <AlertTriangle className="w-4 h-4" />Unsaved
                    </span>
                  )}
                  {!isNew && (
                    <>
                      <div className="w-px h-6 bg-gray-700" />
                      <button
                        type="button"
                        onClick={handleToggleArchive}
                        className={`btn-ghost text-sm py-1.5 px-3 ${formData.archived ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {formData.archived ? <><ArchiveRestore className="w-4 h-4 mr-1" />Restore</> : <><Archive className="w-4 h-4 mr-1" />Archive</>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteDialog(true)}
                        className="btn-ghost text-sm py-1.5 px-3 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />Delete
                      </button>
                    </>
                  )}
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleBack} className="btn-ghost text-sm py-1.5 px-4">Cancel</button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !formData.product}
                    className="btn-primary text-sm py-1.5 px-4"
                  >
                    {isSaving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-1" />{isNew ? "Create" : "Save"}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </GuidedModeContext.Provider>
  );
};
