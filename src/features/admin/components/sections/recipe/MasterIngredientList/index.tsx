import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Database,
  Info,
  ChevronUp,
  Upload,
  Download,
  Shield,
  Filter,
  Package,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Printer,
} from "lucide-react";
import { CategoryStats } from "./CategoryStats";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { ExcelDataGrid } from "@/shared/components/ExcelDataGrid";
import { masterIngredientColumns, allergenViewColumns } from "./columns";
import { EditIngredientModal } from "./EditIngredientModal";
import { MasterIngredient } from "@/types/master-ingredient";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { AllergenBadge } from "@/features/allergens/components/AllergenBadge";
import type { AllergenType } from "@/features/allergens/types";
import { ALLERGENS, getAllergenTypes } from "@/features/allergens/constants";
import toast from "react-hot-toast";

// =============================================================================
// MASTER INGREDIENT LIST - L5 Design (Tabbed)
// =============================================================================
// Reference: L5-BUILD-STRATEGY.md - Rich Header (Variant B) with Tabs
// Location: Admin → Data Management → Master Ingredient List
// Tabs: Ingredients | Allergens | Import | Export
// =============================================================================

// Tab definitions with L5 color progression
// Order: primary → green → amber → rose → purple → lime → red → cyan
const TABS = [
  { id: "ingredients", label: "Ingredients", icon: Database, color: "primary" },
  { id: "allergens", label: "Allergens", icon: Shield, color: "green" },
  { id: "import", label: "Import", icon: Upload, color: "amber" },
  { id: "export", label: "Export", icon: Download, color: "rose" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export const MasterIngredientList = () => {
  const { organization } = useAuth();
  const { showDiagnostics } = useDiagnostics();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const activeTab = (searchParams.get("tab") as TabId) || "ingredients";
  const [newIngredient, setNewIngredient] = useState<MasterIngredient | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<MasterIngredient | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  // Allergen tab state
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([]);
  const [allergenFilterMode, setAllergenFilterMode] = useState<"any" | "all">("any");

  // ---------------------------------------------------------------------------
  // STORES
  // ---------------------------------------------------------------------------
  const { ingredients, fetchIngredients, createIngredient, updateIngredient } = useMasterIngredientsStore();
  const { fetchFoodRelationships } = useFoodRelationshipsStore();

  // ---------------------------------------------------------------------------
  // TAB NAVIGATION
  // ---------------------------------------------------------------------------
  const setActiveTab = (tab: TabId) => {
    setSearchParams({ tab });
  };

  // ---------------------------------------------------------------------------
  // FILTERED DATA - Ingredients Tab
  // ---------------------------------------------------------------------------
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ingredient) => {
      if (!showArchived && ingredient.archived) return false;
      return true;
    });
  }, [ingredients, showArchived]);

  // ---------------------------------------------------------------------------
  // FILTERED DATA - Allergens Tab
  // ---------------------------------------------------------------------------
  const allergenFilteredIngredients = useMemo(() => {
    if (selectedAllergens.length === 0) {
      // Show all ingredients with at least one allergen
      return ingredients.filter((ing) => {
        return getAllergenTypes().some((type) => {
          const key = `allergen_${type}` as keyof MasterIngredient;
          return ing[key] === true;
        });
      });
    }

    return ingredients.filter((ing) => {
      if (allergenFilterMode === "any") {
        return selectedAllergens.some((type) => {
          const key = `allergen_${type}` as keyof MasterIngredient;
          return ing[key] === true;
        });
      } else {
        return selectedAllergens.every((type) => {
          const key = `allergen_${type}` as keyof MasterIngredient;
          return ing[key] === true;
        });
      }
    });
  }, [ingredients, selectedAllergens, allergenFilterMode]);

  // ---------------------------------------------------------------------------
  // ALLERGEN STATS
  // ---------------------------------------------------------------------------
  const allergenStats = useMemo(() => {
    const stats: Record<AllergenType, number> = {} as any;
    getAllergenTypes().forEach((type) => {
      stats[type] = ingredients.filter((ing) => {
        const key = `allergen_${type}` as keyof MasterIngredient;
        return ing[key] === true;
      }).length;
    });
    return stats;
  }, [ingredients]);

  const ingredientsWithAllergens = useMemo(() => {
    return ingredients.filter((ing) => {
      return getAllergenTypes().some((type) => {
        const key = `allergen_${type}` as keyof MasterIngredient;
        return ing[key] === true;
      });
    }).length;
  }, [ingredients]);

  const ingredientsWithoutAllergens = ingredients.length - ingredientsWithAllergens;

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (organization?.id) {
      Promise.all([fetchIngredients(), fetchFoodRelationships()]).catch((error) => {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      });
    }
  }, [organization?.id, fetchIngredients, fetchFoodRelationships]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleSaveIngredient = async (ingredient: MasterIngredient) => {
    if (!organization?.id) return;
    try {
      await updateIngredient(ingredient.id, { ...ingredient, organization_id: organization.id });
      toast.success("Ingredient updated successfully");
    } catch (error) {
      console.error("Error updating ingredient:", error);
      toast.error("Failed to update ingredient");
      throw error;
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchIngredients();
      toast.success("Ingredients refreshed");
    } catch (error) {
      console.error("Error refreshing ingredients:", error);
      toast.error("Failed to refresh ingredients");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateIngredient = () => {
    setNewIngredient({
      product: "",
      major_group: null,
      category: null,
      sub_category: null,
      vendor: "",
      item_code: "",
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
      allergen_custom1_name: null,
      allergen_custom1_active: false,
      allergen_custom2_name: null,
      allergen_custom2_active: false,
      allergen_custom3_name: null,
      allergen_custom3_active: false,
      allergen_notes: null,
      organization_id: organization?.id,
      archived: false,
    } as MasterIngredient);
  };

  const toggleAllergenFilter = (type: AllergenType) => {
    setSelectedAllergens((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const getIngredientAllergens = (ingredient: MasterIngredient): AllergenType[] => {
    return getAllergenTypes().filter((type) => {
      const key = `allergen_${type}` as keyof MasterIngredient;
      return ingredient[key] === true;
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/recipe/MasterIngredientList/index.tsx
        </div>
      )}

      {/* ========================================================================
       * L5 HEADER CARD - Variant B (Rich with Tabs)
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Master Ingredient List
                </h1>
                <p className="text-gray-400 text-sm">
                  Your ingredient database with costs, allergens & vendor info
                </p>
              </div>
            </div>

            <button onClick={handleCreateIngredient} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient
            </button>
          </div>

          {/* Expandable Info Section */}
          <div className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  About Master Ingredients
                </span>
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-3">
                <p className="text-sm text-gray-400">
                  The Master Ingredient List is your central hub for managing all purchased 
                  ingredients. Use the tabs to manage costs, track allergens for food safety, 
                  import from spreadsheets, or export reports.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const colorMap: Record<string, string> = {
                      primary: "text-primary-400",
                      green: "text-green-400",
                      amber: "text-amber-400",
                      rose: "text-rose-400",
                    };
                    return (
                      <div key={tab.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${colorMap[tab.color]}`} />
                          <span className="text-sm font-medium text-white">{tab.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {tab.id === "ingredients" && "Main view with costs, vendors, categories"}
                          {tab.id === "allergens" && "Food safety compliance & allergen tracking"}
                          {tab.id === "import" && "Bulk import from Excel or CSV files"}
                          {tab.id === "export" && "Export data for reports or backups"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
       * TABS + CONTENT CARD
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* L5 Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex gap-2 p-4 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab ${tab.color} ${isActive ? "active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* ================================================================
           * INGREDIENTS TAB
           * ================================================================ */}
          {activeTab === "ingredients" && (
            <div className="space-y-4">
              {/* Category Stats */}
              <CategoryStats ingredients={ingredients} />

              {/* Archive Toggle - Minimal, no duplicate search */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {filteredIngredients.length} of {ingredients.length} ingredients
                  {showArchived && " (including archived)"}
                </div>
                <div className="flex items-center gap-3">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                    />
                    <div className="toggle-switch-track" />
                  </label>
                  <span className="text-sm text-gray-400 whitespace-nowrap">Show Archived</span>
                </div>
              </div>

              {/* Data Grid - Has its own search */}
              <ExcelDataGrid
                data={isRefreshing ? [] : filteredIngredients}
                columns={masterIngredientColumns}
                onRowClick={(row) => setEditingIngredient(row)}
                onRefresh={handleRefresh}
                isLoading={isRefreshing}
                type="master-ingredients"
              />
            </div>
          )}

          {/* ================================================================
           * ALLERGENS TAB
           * ================================================================ */}
          {activeTab === "allergens" && (
            <AllergensTab
              ingredients={ingredients}
              allergenStats={allergenStats}
              ingredientsWithAllergens={ingredientsWithAllergens}
              ingredientsWithoutAllergens={ingredientsWithoutAllergens}
              selectedAllergens={selectedAllergens}
              allergenFilterMode={allergenFilterMode}
              filteredIngredients={allergenFilteredIngredients}
              onToggleAllergen={toggleAllergenFilter}
              onSetFilterMode={setAllergenFilterMode}
              onClearFilters={() => setSelectedAllergens([])}
              onEditIngredient={setEditingIngredient}
              getIngredientAllergens={getIngredientAllergens}
            />
          )}

          {/* ================================================================
           * IMPORT TAB
           * ================================================================ */}
          {activeTab === "import" && (
            <ImportTab
              organizationId={organization?.id}
              ingredients={ingredients}
              createIngredient={createIngredient}
              updateIngredient={updateIngredient}
              fetchIngredients={fetchIngredients}
            />
          )}

          {/* ================================================================
           * EXPORT TAB
           * ================================================================ */}
          {activeTab === "export" && (
            <ExportTab ingredients={ingredients} />
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {(editingIngredient || newIngredient) && (
        <EditIngredientModal
          ingredient={editingIngredient || newIngredient}
          onClose={() => (editingIngredient ? setEditingIngredient(null) : setNewIngredient(null))}
          onSave={async (ingredient) => {
            if (editingIngredient) {
              await handleSaveIngredient(ingredient);
            } else {
              try {
                if (!organization?.id) throw new Error("Organization ID is required");
                const { id, created_at, updated_at, major_group_name, category_name, sub_category_name, ...rest } = ingredient;
                await createIngredient({
                  ...rest,
                  organization_id: organization.id,
                  vendor: rest.vendor || "",
                  item_code: rest.item_code || "",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                } as any);
                setNewIngredient(null);
                toast.success("Ingredient created successfully");
              } catch (error) {
                console.error("Error creating ingredient:", error);
                toast.error("Failed to create ingredient");
                throw error;
              }
            }
          }}
          isNew={!editingIngredient}
        />
      )}
    </div>
  );
};

// =============================================================================
// ALLERGENS TAB COMPONENT
// =============================================================================
interface AllergensTabProps {
  ingredients: MasterIngredient[];
  allergenStats: Record<AllergenType, number>;
  ingredientsWithAllergens: number;
  ingredientsWithoutAllergens: number;
  selectedAllergens: AllergenType[];
  allergenFilterMode: "any" | "all";
  filteredIngredients: MasterIngredient[];
  onToggleAllergen: (type: AllergenType) => void;
  onSetFilterMode: (mode: "any" | "all") => void;
  onClearFilters: () => void;
  onEditIngredient: (ingredient: MasterIngredient) => void;
  getIngredientAllergens: (ingredient: MasterIngredient) => AllergenType[];
}

const AllergensTab: React.FC<AllergensTabProps> = ({
  ingredients,
  allergenStats,
  ingredientsWithAllergens,
  ingredientsWithoutAllergens,
  selectedAllergens,
  allergenFilterMode,
  filteredIngredients,
  onToggleAllergen,
  onSetFilterMode,
  onClearFilters,
  onEditIngredient,
  getIngredientAllergens,
}) => {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Group allergens by severity
  const highSeverity: AllergenType[] = ["peanut", "crustacean", "treenut", "shellfish", "sesame"];
  const mediumSeverity: AllergenType[] = ["soy", "fish", "wheat", "milk", "sulphite", "egg", "gluten", "mustard", "pork"];
  const lowSeverity: AllergenType[] = ["celery", "garlic", "onion", "nitrite", "mushroom", "hot_pepper", "citrus"];

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleExportMatrix = () => {
    const allergenTypes = getAllergenTypes();
    const headers = ["Product", "Category", ...allergenTypes.map(t => ALLERGENS[t].label)];
    const rows = filteredIngredients.map(ing => [
      ing.product,
      ing.category_name || ing.category || "",
      ...allergenTypes.map(t => {
        const key = `allergen_${t}` as keyof MasterIngredient;
        return ing[key] ? "\u2713" : "";
      })
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `allergen-matrix-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast.success(`Exported ${filteredIngredients.length} items with allergen data`);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Stats Summary - L5 StatBar with icons */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-700/30">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-700/40 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Items</div>
                <div className="text-xl font-bold text-white">{ingredients.length}</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-700/40 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">With Allergens</div>
                <div className="text-xl font-bold text-white">{ingredientsWithAllergens}</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-700/40 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Unassigned</div>
                <div className="text-xl font-bold text-white">{ingredientsWithoutAllergens}</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-700/40 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status</div>
                <div className="text-lg font-bold text-white">
                  {ingredientsWithoutAllergens > 0 ? "Needs Review" : "Complete"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Allergen Filter Controls - Expandable Section */}
      <div className={`expandable-info-section ${isFilterExpanded ? "expanded" : ""}`}>
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300">Filter by Allergen</span>
            {selectedAllergens.length > 0 && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                {selectedAllergens.length} selected
              </span>
            )}
          </div>
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2 space-y-4">
            {/* Filter Mode Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Show items with</span>
                <select
                  value={allergenFilterMode}
                  onChange={(e) => onSetFilterMode(e.target.value as "any" | "all")}
                  className="input py-1 px-2 text-sm"
                >
                  <option value="any">ANY</option>
                  <option value="all">ALL</option>
                </select>
                <span className="text-gray-400">selected allergens</span>
              </div>
              {selectedAllergens.length > 0 && (
                <button onClick={onClearFilters} className="text-sm text-gray-400 hover:text-white">
                  Clear all
                </button>
              )}
            </div>

            {/* High Severity */}
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">High Priority (Life-threatening)</div>
              <div className="flex flex-wrap gap-2">
                {highSeverity.map((type) => (
                  <button
                    key={type}
                    onClick={() => onToggleAllergen(type)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedAllergens.includes(type)
                        ? "bg-red-500/20 border border-red-500/40 text-white"
                        : "bg-gray-800/50 border border-gray-700 hover:border-gray-600 text-gray-400"
                    }`}
                  >
                    <AllergenBadge type={type} size="sm" disableTooltip />
                    <span>{ALLERGENS[type].label}</span>
                    <span className="text-xs text-gray-500">({allergenStats[type]})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Medium Severity */}
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">Medium Priority</div>
              <div className="flex flex-wrap gap-2">
                {mediumSeverity.map((type) => (
                  <button
                    key={type}
                    onClick={() => onToggleAllergen(type)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedAllergens.includes(type)
                        ? "bg-amber-500/20 border border-amber-500/40 text-white"
                        : "bg-gray-800/50 border border-gray-700 hover:border-gray-600 text-gray-400"
                    }`}
                  >
                    <AllergenBadge type={type} size="sm" disableTooltip />
                    <span>{ALLERGENS[type].label}</span>
                    <span className="text-xs text-gray-500">({allergenStats[type]})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Low Severity */}
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">Low Priority (Sensitivities)</div>
              <div className="flex flex-wrap gap-2">
                {lowSeverity.map((type) => (
                  <button
                    key={type}
                    onClick={() => onToggleAllergen(type)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedAllergens.includes(type)
                        ? "bg-blue-500/20 border border-blue-500/40 text-white"
                        : "bg-gray-800/50 border border-gray-700 hover:border-gray-600 text-gray-400"
                    }`}
                  >
                    <AllergenBadge type={type} size="sm" disableTooltip />
                    <span>{ALLERGENS[type].label}</span>
                    <span className="text-xs text-gray-500">({allergenStats[type]})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">
          {selectedAllergens.length === 0 
            ? "All Items with Allergens" 
            : `Items with ${selectedAllergens.map(t => ALLERGENS[t].label).join(allergenFilterMode === "all" ? " AND " : " OR ")}`
          }
        </h3>
        <span className="text-sm text-gray-400">{filteredIngredients.length} items</span>
      </div>

      {/* ExcelDataGrid - Consistent with Ingredients tab */}
      <ExcelDataGrid
        data={filteredIngredients}
        columns={allergenViewColumns}
        onRowClick={(row) => onEditIngredient(row)}
        type="allergens"
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleExportMatrix} className="btn-ghost">
          <Download className="w-4 h-4 mr-2" />
          Export Allergen Matrix
        </button>
        <button onClick={() => window.print()} className="btn-ghost">
          <Printer className="w-4 h-4 mr-2" />
          Print Allergen Chart
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// IMPORT TAB COMPONENT
// =============================================================================
interface ImportTabProps {
  organizationId?: string;
  ingredients: MasterIngredient[];
  createIngredient: (data: any) => Promise<void>;
  updateIngredient: (id: string, data: any) => Promise<void>;
  fetchIngredients: () => Promise<void>;
}

const ImportTab: React.FC<ImportTabProps> = ({
  organizationId,
  ingredients,
  createIngredient,
  updateIngredient,
  fetchIngredients,
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  
  const ImportExcelModal = React.lazy(() => 
    import("@/features/admin/components/ImportExcelModal").then(mod => ({ default: mod.ImportExcelModal }))
  );

  const handleImport = async (data: any[], sheetName: string) => {
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        const existingByCode = row.item_code ? ingredients.find(i => i.item_code === row.item_code) : null;
        const existingByName = ingredients.find(i => i.product?.toLowerCase() === row.product?.toLowerCase());
        const existing = existingByCode || existingByName;

        const ingredientData = {
          product: row.product || "",
          item_code: row.item_code || null,
          vendor: row.vendor || "",
          major_group: row.major_group || null,
          category: row.category || null,
          sub_category: row.sub_category || null,
          unit_of_measure: row.unit_of_measure || "",
          current_price: parseFloat(row.current_price) || 0,
          units_per_case: parseInt(row.units_per_case) || 0,
          recipe_unit_type: row.recipe_unit_type || "",
          recipe_unit_per_purchase_unit: parseFloat(row.recipe_unit_per_purchase_unit) || 0,
          yield_percent: parseFloat(row.yield_percent) || 100,
          storage_area: row.storage_area || "",
          organization_id: organizationId,
          archived: false,
        };

        if (existing) {
          await updateIngredient(existing.id, { ...existing, ...ingredientData });
        } else {
          await createIngredient(ingredientData as any);
        }
        successCount++;
      } catch (error) {
        console.error("Error importing row:", row, error);
        errorCount++;
      }
    }

    await fetchIngredients();

    if (errorCount > 0) {
      toast.error(`Imported ${successCount} items, ${errorCount} failed`);
    } else {
      toast.success(`Successfully imported ${successCount} ingredients`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Instructions */}
      <div className="bg-amber-500/10 rounded-lg p-6 border border-amber-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Upload className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Import from Spreadsheet</h3>
            <p className="text-sm text-gray-400 mb-4">
              Upload an Excel (.xlsx) or CSV file to bulk import ingredients. 
              You'll be able to map your columns to our fields before importing.
            </p>
            <button onClick={() => setShowImportModal(true)} className="btn-primary">
              <Upload className="w-4 h-4 mr-2" />
              Select File to Import
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <h4 className="text-sm font-medium text-white mb-3">Import Tips</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-amber-400">✓</span>
            First row should contain column headers
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400">✓</span>
            At minimum, include a "Product Name" column
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400">✓</span>
            Existing items will be updated if matched by Item Code or Product Name
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400">✓</span>
            Supported formats: .xlsx, .xls, .csv
          </li>
        </ul>
      </div>

      {/* Recent Imports - placeholder */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Recent Imports</h4>
        <div className="text-sm text-gray-500 italic">No imports yet</div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <React.Suspense fallback={<div>Loading...</div>}>
          <ImportExcelModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={handleImport}
            type="master-ingredients"
          />
        </React.Suspense>
      )}
    </div>
  );
};

// =============================================================================
// EXPORT TAB COMPONENT
// =============================================================================
interface ExportTabProps {
  ingredients: MasterIngredient[];
}

const ExportTab: React.FC<ExportTabProps> = ({ ingredients }) => {
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "xlsx">("csv");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "product", "item_code", "vendor", "category", "sub_category",
    "unit_of_measure", "current_price", "recipe_unit_type", "storage_area"
  ]);

  const availableColumns = [
    { key: "product", label: "Product Name" },
    { key: "item_code", label: "Item Code" },
    { key: "vendor", label: "Vendor" },
    { key: "major_group", label: "Major Group" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub-Category" },
    { key: "unit_of_measure", label: "Unit of Measure" },
    { key: "current_price", label: "Current Price" },
    { key: "units_per_case", label: "Units per Case" },
    { key: "recipe_unit_type", label: "Recipe Unit" },
    { key: "recipe_unit_per_purchase_unit", label: "Recipe Units per Purchase" },
    { key: "yield_percent", label: "Yield %" },
    { key: "cost_per_recipe_unit", label: "Cost per Recipe Unit" },
    { key: "storage_area", label: "Storage Area" },
  ];

  const handleExport = () => {
    const dataToExport = includeArchived 
      ? ingredients 
      : ingredients.filter(i => !i.archived);
    
    const headers = selectedColumns.map(key => 
      availableColumns.find(c => c.key === key)?.label || key
    );
    
    const rows = dataToExport.map(ing => 
      selectedColumns.map(key => {
        const value = ing[key as keyof MasterIngredient];
        return value !== null && value !== undefined ? String(value) : "";
      })
    );
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `master-ingredients-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast.success(`Exported ${dataToExport.length} ingredients`);
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <div className="bg-rose-500/10 rounded-lg p-6 border border-rose-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-rose-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white mb-2">Export Ingredients</h3>
            <p className="text-sm text-gray-400 mb-4">
              Download your ingredient database as a spreadsheet for backups, reporting, or sharing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Format</label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as "csv" | "xlsx")}
                  className="input w-full"
                >
                  <option value="csv">CSV (Comma Separated)</option>
                  <option value="xlsx">Excel (.xlsx)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">Include archived items</span>
                </label>
              </div>
            </div>

            <button onClick={handleExport} className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Export {includeArchived ? ingredients.length : ingredients.filter(i => !i.archived).length} Ingredients
            </button>
          </div>
        </div>
      </div>

      {/* Column Selection */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <h4 className="text-sm font-medium text-white mb-3">Select Columns to Export</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableColumns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/30 hover:bg-gray-900/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(col.key)}
                onChange={() => toggleColumn(col.key)}
                className="rounded"
              />
              <span className="text-sm text-gray-300">{col.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Quick Exports */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Quick Exports</h4>
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost text-sm">
            Export for Vendor Order
          </button>
          <button className="btn-ghost text-sm">
            Export Allergen Matrix
          </button>
          <button className="btn-ghost text-sm">
            Export Costing Report
          </button>
        </div>
      </div>
    </div>
  );
};
