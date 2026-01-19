import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  RefreshCw,
  AlertTriangle,
  Umbrella,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  Package,
  Calculator,
  Sparkles,
  Check,
  Link2,
} from "lucide-react";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { useUmbrellaIngredientsStore } from "@/stores/umbrellaIngredientsStore";
import {
  UmbrellaIngredient,
  UmbrellaIngredientWithDetails,
} from "@/types/umbrella-ingredient";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import toast from "react-hot-toast";
import { LinkMasterIngredientModal } from "./LinkMasterIngredientModal";
import { UmbrellaItemCard } from "./UmbrellaItemCard";

export const UmbrellaIngredientManager: React.FC = () => {
  const {
    umbrellaIngredients,
    fetchUmbrellaIngredients,
    createUmbrellaIngredient,
    updateUmbrellaIngredient,
    deleteUmbrellaIngredient,
    addMasterIngredientToUmbrella,
    isLoading,
    error,
  } = useUmbrellaIngredientsStore();

  const { ingredients, fetchIngredients } = useMasterIngredientsStore();
  const { user } = useAuth();
  const { showDiagnostics } = useDiagnostics();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingUmbrella, setEditingUmbrella] = useState<UmbrellaIngredientWithDetails | null>(null);
  const [newUmbrellaName, setNewUmbrellaName] = useState("");
  const [newUmbrellaMajorGroup, setNewUmbrellaMajorGroup] = useState("");
  const [newUmbrellaCategory, setNewUmbrellaCategory] = useState("");
  const [newUmbrellaSubCategory, setNewUmbrellaSubCategory] = useState("");
  const [filteredUmbrellaIngredients, setFilteredUmbrellaIngredients] =
    useState<UmbrellaIngredientWithDetails[]>([]);
  const [isLinkingIngredient, setIsLinkingIngredient] = useState<string | null>(null);
  const [infoExpanded, setInfoExpanded] = useState(false);
  
  // Suggested umbrella state
  const [selectedSuggestion, setSelectedSuggestion] = useState<{
    commonName: string;
    ingredientIds: string[];
  } | null>(null);
  const [autoLinkOnCreate, setAutoLinkOnCreate] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Get food relationships for cascading dropdowns
  const {
    majorGroups,
    categories,
    subCategories,
    fetchFoodRelationships,
  } = useFoodRelationshipsStore();

  // Get operations settings
  const { fetchSettings } = useOperationsStore();

  // Load data on mount
  useEffect(() => {
    fetchUmbrellaIngredients();
    fetchIngredients();
    fetchFoodRelationships();
    fetchSettings();
  }, [fetchUmbrellaIngredients, fetchIngredients, fetchFoodRelationships, fetchSettings]);

  // Get filtered categories based on major group
  const filteredCategories = useMemo(() => {
    if (!newUmbrellaMajorGroup) return [];
    return categories.filter((c) => c.group_id === newUmbrellaMajorGroup);
  }, [categories, newUmbrellaMajorGroup]);

  // Get filtered subcategories based on category
  const filteredSubCategories = useMemo(() => {
    if (!newUmbrellaCategory) return [];
    return subCategories.filter((s) => s.category_id === newUmbrellaCategory);
  }, [subCategories, newUmbrellaCategory]);

  // =============================================================================
  // SUGGESTED UMBRELLAS - Scan MIL for common_names with 2+ ingredients
  // =============================================================================
  const suggestedUmbrellas = useMemo(() => {
    // Group ingredients by common_name
    const commonNameGroups: Record<string, { ids: string[]; ingredients: typeof ingredients }> = {};
    
    ingredients.forEach((ing) => {
      const commonName = (ing as any).common_name;
      if (commonName && typeof commonName === 'string' && commonName.trim()) {
        const normalized = commonName.trim();
        if (!commonNameGroups[normalized]) {
          commonNameGroups[normalized] = { ids: [], ingredients: [] };
        }
        commonNameGroups[normalized].ids.push(ing.id);
        commonNameGroups[normalized].ingredients.push(ing);
      }
    });
    
    // Get existing umbrella names (lowercase for comparison)
    const existingNames = new Set(
      umbrellaIngredients.map((u) => u.name.toLowerCase())
    );
    
    // Filter to 2+ ingredients AND no existing umbrella with that name
    const suggestions = Object.entries(commonNameGroups)
      .filter(([name, group]) => {
        // Must have 2+ ingredients
        if (group.ids.length < 2) return false;
        // Must not already have an umbrella with this name
        if (existingNames.has(name.toLowerCase())) return false;
        return true;
      })
      .map(([name, group]) => ({
        commonName: name,
        count: group.ids.length,
        ingredientIds: group.ids,
        // Get sample vendors for display
        vendors: [...new Set(group.ingredients.map((i) => i.vendor))].slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count); // Most ingredients first
    
    return suggestions;
  }, [ingredients, umbrellaIngredients]);

  // Filter umbrella ingredients based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUmbrellaIngredients(umbrellaIngredients);
      return;
    }

    const filtered = umbrellaIngredients.filter(
      (umbrella) =>
        umbrella.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (umbrella.category_name &&
          umbrella.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (umbrella.sub_category_name &&
          umbrella.sub_category_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredUmbrellaIngredients(filtered);
    setCurrentPage(1);
  }, [searchTerm, umbrellaIngredients]);

  // Calculate total pages
  useEffect(() => {
    setTotalPages(Math.ceil(filteredUmbrellaIngredients.length / itemsPerPage));
  }, [filteredUmbrellaIngredients, itemsPerPage]);

  // Get paginated data
  const paginatedUmbrellaIngredients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUmbrellaIngredients.slice(startIndex, endIndex);
  }, [filteredUmbrellaIngredients, currentPage, itemsPerPage]);

  // Handle creating a new umbrella ingredient
  const handleCreateUmbrella = async () => {
    if (!newUmbrellaName || !user?.user_metadata?.organizationId) {
      toast.error("Please enter a name for the umbrella ingredient");
      return;
    }

    try {
      // Create the umbrella
      const newUmbrella = await createUmbrellaIngredient({
        name: newUmbrellaName,
        organization_id: user.user_metadata.organizationId,
        major_group: newUmbrellaMajorGroup || undefined,
        category: newUmbrellaCategory || undefined,
        sub_category: newUmbrellaSubCategory || undefined,
      });

      // If we used a suggestion and auto-link is enabled, link the ingredients
      if (selectedSuggestion && autoLinkOnCreate && newUmbrella?.id) {
        const linkCount = selectedSuggestion.ingredientIds.length;
        toast.loading(`Linking ${linkCount} ingredients...`, { id: 'linking' });
        
        // Link each ingredient
        for (const ingredientId of selectedSuggestion.ingredientIds) {
          await addMasterIngredientToUmbrella(newUmbrella.id, ingredientId);
        }
        
        toast.success(`Created "${newUmbrellaName}" with ${linkCount} ingredients linked`, { id: 'linking' });
      } else {
        toast.success("Umbrella ingredient created");
      }

      resetForm();
      setIsCreating(false);
    } catch (err) {
      console.error("Error creating umbrella ingredient:", err);
      toast.error("Failed to create umbrella");
    }
  };

  // Handle updating an umbrella ingredient
  const handleUpdateUmbrella = async () => {
    if (!editingUmbrella || !newUmbrellaName) {
      toast.error("Please enter a name for the umbrella ingredient");
      return;
    }

    try {
      await updateUmbrellaIngredient(editingUmbrella.id, {
        name: newUmbrellaName,
        major_group: newUmbrellaMajorGroup || undefined,
        category: newUmbrellaCategory || undefined,
        sub_category: newUmbrellaSubCategory || undefined,
      });

      resetForm();
      setEditingUmbrella(null);
      toast.success("Umbrella ingredient updated");
    } catch (err) {
      console.error("Error updating umbrella ingredient:", err);
    }
  };

  // Start editing an umbrella
  const startEditing = (umbrella: UmbrellaIngredientWithDetails) => {
    setEditingUmbrella(umbrella);
    setNewUmbrellaName(umbrella.name);
    setNewUmbrellaMajorGroup(umbrella.major_group || "");
    setNewUmbrellaCategory(umbrella.category || "");
    setNewUmbrellaSubCategory(umbrella.sub_category || "");
    setIsCreating(false);
  };

  // Reset form
  const resetForm = () => {
    setNewUmbrellaName("");
    setNewUmbrellaMajorGroup("");
    setNewUmbrellaCategory("");
    setNewUmbrellaSubCategory("");
    setSelectedSuggestion(null);
    setAutoLinkOnCreate(true);
  };

  // Handle using a suggestion - auto-fill name and prepare for auto-linking
  const useSuggestion = (suggestion: typeof suggestedUmbrellas[0]) => {
    setNewUmbrellaName(suggestion.commonName);
    setSelectedSuggestion({
      commonName: suggestion.commonName,
      ingredientIds: suggestion.ingredientIds,
    });
    setAutoLinkOnCreate(true);
  };

  // Handle delete with confirmation
  const handleDelete = async (id: string) => {
    const umbrella = umbrellaIngredients.find((u) => u.id === id);
    if (!umbrella) return;

    if (window.confirm(`Are you sure you want to delete "${umbrella.name}"? This cannot be undone.`)) {
      await deleteUmbrellaIngredient(id);
      toast.success("Umbrella ingredient deleted");
    }
  };

  // Stats
  const totalUmbrellas = umbrellaIngredients.length;
  const withPrimary = umbrellaIngredients.filter(u => u.primary_master_ingredient_id).length;
  const totalLinked = umbrellaIngredients.reduce((sum, u) => sum + (u.master_ingredient_details?.length || 0), 0);

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 text-rose-400 rounded-lg flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" />
        <div>
          <h3 className="font-medium">Error Loading Umbrella Ingredients</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/VendorInvoice/components/UmbrellaIngredientManager.tsx
        </div>
      )}

      {/* L5 Sub-header - Gold Standard Pattern */}
      <div className="subheader">
        <div className="subheader-row">
          {/* Left: Icon + Title */}
          <div className="subheader-left">
            <div className="subheader-icon-box rose">
              <Umbrella className="w-5 h-5" />
            </div>
            <div>
              <h3 className="subheader-title">Umbrella Ingredients</h3>
              <p className="subheader-subtitle">Group similar products for flexible recipe costing</p>
            </div>
          </div>
          
          {/* Right: Stats | Actions */}
          <div className="subheader-right">
            {/* Stats Pills */}
            <span className="subheader-pill">
              <span className="subheader-pill-value">{totalUmbrellas}</span>
              <span className="subheader-pill-label">Umbrellas</span>
            </span>
            {withPrimary > 0 && (
              <span className="subheader-pill">
                <span className="subheader-pill-value">{withPrimary}</span>
                <span className="subheader-pill-label">Primary</span>
              </span>
            )}
            <span className="subheader-pill">
              <span className="subheader-pill-value">{totalLinked}</span>
              <span className="subheader-pill-label">Linked</span>
            </span>
            
            {/* Suggestions pill */}
            {suggestedUmbrellas.length > 0 && (
              <button
                onClick={() => {
                  resetForm();
                  setEditingUmbrella(null);
                  setIsCreating(true);
                }}
                className="subheader-pill highlight animate-attention"
                title={`${suggestedUmbrellas.length} umbrella suggestions based on your ingredients`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="subheader-pill-value">{suggestedUmbrellas.length}</span>
                <span className="subheader-pill-label">Suggested</span>
              </button>
            )}
            
            {/* Divider */}
            <div className="subheader-divider" />
            
            {/* Action Buttons */}
            <button 
              onClick={() => fetchUmbrellaIngredients()} 
              className="btn-ghost px-2" 
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => {
                resetForm();
                setEditingUmbrella(null);
                setIsCreating(true);
              }}
              className="btn-ghost-blue ml-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </button>
          </div>
        </div>

        {/* Expandable Info Section - Inside subheader */}
        <div className={`subheader-info expandable-info-section ${infoExpanded ? "expanded" : ""}`}>
          <button
            onClick={() => setInfoExpanded(!infoExpanded)}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">About Umbrella Ingredients</span>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${infoExpanded ? "" : "rotate-180"}`} />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                Umbrella Ingredients let you group similar products that serve the same purpose
                in your kitchen. Instead of updating every recipe when you switch vendors or
                find a better price, you update the umbrella once.
              </p>
              
              {/* Feature cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="subheader-feature-card">
                  <Package className="w-4 h-4 text-rose-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Group Products</span>
                    <p className="subheader-feature-desc">Link brands, sizes, vendors under one umbrella</p>
                  </div>
                </div>
                
                <div className="subheader-feature-card">
                  <Calculator className="w-4 h-4 text-rose-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Smart Costing</span>
                    <p className="subheader-feature-desc">Set primary, all recipes inherit that cost</p>
                  </div>
                </div>
                
                <div className="subheader-feature-card">
                  <Lightbulb className="w-4 h-4 text-rose-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Price Intelligence</span>
                    <p className="subheader-feature-desc">Compare prices to spot savings</p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Example: "Olive Oil" umbrella with Sysco EVOO, GFS bulk, specialty bottles — switch suppliers, all recipes update
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input
          type="text"
          placeholder="Search umbrella ingredients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10 w-full"
        />
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingUmbrella) && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              {editingUmbrella ? (
                <>Edit "{editingUmbrella.name}"</>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-rose-400" />
                  Create New Umbrella
                </>
              )}
            </h4>
            <button
              onClick={() => {
                resetForm();
                setIsCreating(false);
                setEditingUmbrella(null);
              }}
              className="text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ================================================================= */}
          {/* SUGGESTED UMBRELLAS - Sparkle feature */}
          {/* ================================================================= */}
          {isCreating && !editingUmbrella && suggestedUmbrellas.length > 0 && (
            <div className="mb-4">
              {/* Selected suggestion indicator */}
              {selectedSuggestion ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-300">
                        Using suggestion: {selectedSuggestion.commonName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedSuggestion.ingredientIds.length} ingredients will be auto-linked
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Auto-link toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoLinkOnCreate}
                        onChange={(e) => setAutoLinkOnCreate(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500/50"
                      />
                      <span className="text-xs text-gray-400">Auto-link</span>
                    </label>
                    <button
                      onClick={() => {
                        setSelectedSuggestion(null);
                        setNewUmbrellaName("");
                      }}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                /* Suggestions list */
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400/80 uppercase tracking-wide">
                      Suggested from your ingredients
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedUmbrellas.slice(0, 6).map((suggestion) => (
                      <button
                        key={suggestion.commonName}
                        onClick={() => useSuggestion(suggestion)}
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                      >
                        <span className="text-sm text-gray-300 group-hover:text-amber-300">
                          {suggestion.commonName}
                        </span>
                        <span className="text-xs bg-gray-700/60 text-gray-500 px-1.5 py-0.5 rounded group-hover:bg-amber-500/20 group-hover:text-amber-400">
                          {suggestion.count}
                        </span>
                        <Link2 className="w-3 h-3 text-gray-600 group-hover:text-amber-400" />
                      </button>
                    ))}
                    {suggestedUmbrellas.length > 6 && (
                      <span className="text-xs text-gray-600 self-center px-2">
                        +{suggestedUmbrellas.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newUmbrellaName}
                onChange={(e) => setNewUmbrellaName(e.target.value)}
                placeholder="e.g., Olive Oil"
                className="input w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Major Group
              </label>
              <select
                value={newUmbrellaMajorGroup}
                onChange={(e) => {
                  setNewUmbrellaMajorGroup(e.target.value);
                  setNewUmbrellaCategory("");
                  setNewUmbrellaSubCategory("");
                }}
                className="input w-full"
              >
                <option value="">Select...</option>
                {majorGroups?.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Category
              </label>
              <select
                value={newUmbrellaCategory}
                onChange={(e) => {
                  setNewUmbrellaCategory(e.target.value);
                  setNewUmbrellaSubCategory("");
                }}
                className="input w-full"
                disabled={!newUmbrellaMajorGroup}
              >
                <option value="">Select...</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Sub-Category
              </label>
              <select
                value={newUmbrellaSubCategory}
                onChange={(e) => setNewUmbrellaSubCategory(e.target.value)}
                className="input w-full"
                disabled={!newUmbrellaCategory}
              >
                <option value="">Select...</option>
                {filteredSubCategories.map((subCategory) => (
                  <option key={subCategory.id} value={subCategory.id}>
                    {subCategory.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                resetForm();
                setIsCreating(false);
                setEditingUmbrella(null);
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={editingUmbrella ? handleUpdateUmbrella : handleCreateUmbrella}
              className="btn-primary flex items-center"
              disabled={!newUmbrellaName}
            >
              {editingUmbrella ? (
                "Save Changes"
              ) : selectedSuggestion ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Create & Link {selectedSuggestion.ingredientIds.length}
                </>
              ) : (
                "Create"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Umbrella List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredUmbrellaIngredients.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl">
            <div className="w-12 h-12 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center mb-3">
              <Umbrella className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-base font-medium text-gray-300 mb-1">
              {searchTerm ? "No Matches" : "No Umbrella Ingredients"}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
              {searchTerm
                ? `No results for "${searchTerm}"`
                : "Create your first umbrella to start grouping similar ingredients."}
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
                className="btn-ghost text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create First Umbrella
              </button>
            )}
          </div>
        ) : (
          paginatedUmbrellaIngredients.map((umbrella) => (
            <UmbrellaItemCard
              key={umbrella.id}
              umbrella={umbrella}
              onEdit={startEditing}
              onDelete={handleDelete}
              onLinkIngredient={setIsLinkingIngredient}
              onRefresh={fetchUmbrellaIngredients}
            />
          ))
        )}

        {/* Pagination */}
        {filteredUmbrellaIngredients.length > itemsPerPage && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-gray-500">
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredUmbrellaIngredients.length)} of {filteredUmbrellaIngredients.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-gray-800/50 text-gray-500 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 px-2">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-gray-800/50 text-gray-500 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link Master Ingredient Modal */}
      {isLinkingIngredient && (
        <LinkMasterIngredientModal
          isOpen={!!isLinkingIngredient}
          onClose={() => setIsLinkingIngredient(null)}
          onLink={(masterIngredientId) => {
            if (isLinkingIngredient) {
              addMasterIngredientToUmbrella(isLinkingIngredient, masterIngredientId);
            }
          }}
          currentLinkedIds={
            isLinkingIngredient
              ? umbrellaIngredients.find((u) => u.id === isLinkingIngredient)?.master_ingredients || []
              : []
          }
          umbrellaName={
            isLinkingIngredient
              ? umbrellaIngredients.find((u) => u.id === isLinkingIngredient)?.name || "Umbrella"
              : "Umbrella"
          }
        />
      )}
    </div>
  );
};
