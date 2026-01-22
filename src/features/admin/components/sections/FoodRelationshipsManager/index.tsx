/**
 * =============================================================================
 * FOOD RELATIONSHIPS MANAGER - L5 with Guided Mode
 * =============================================================================
 * Your taxonomy for ingredients, recipes, and reporting.
 * 
 * The universal organizational structure:
 *   Major Groups → Categories → Sub-Categories
 * 
 * Key features:
 *   - Guided Mode education for onboarding
 *   - System groups (🔒) that can't be deleted (but can be archived)
 *   - Recipe type groups drive Recipe Manager tabs
 *   - Search across all columns
 *   - Lucide icons (no emoji)
 * 
 * Architectural insight:
 *   MIS EN PLACE, FINAL GOODS, RECEIVING are recipe types, not just categories.
 *   This enables Recipe Manager tabs to be dynamic based on taxonomy.
 * 
 * Location: Admin → Organization → Operations → Food Relationships Tab
 * =============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FolderTree,
  Plus,
  GripVertical,
  ChevronRight,
  ChevronUp,
  Edit,
  Archive,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  Lock,
  X,
  Info,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { getLucideIcon, getSuggestedIcon } from "@/utils/iconMapping";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import toast from "react-hot-toast";

// L5 Shared Components
import {
  GuidedModeProvider,
  GuidedModeToggle,
  GuidanceTip,
  useGuidedMode,
} from "@/shared/components/L5";
import { iconOptions, lucideIconMap } from "@/utils/iconMapping";

// =============================================================================
// TYPES
// =============================================================================

interface EditingItem {
  id: string;
  type: "group" | "category" | "sub";
  name: string;
  description: string;
  originalDescription: string; // For detecting unsaved changes
  archived?: boolean;
  is_system?: boolean;
  is_recipe_type?: boolean; // For Major Groups - creates Recipe Manager tab
  originalIsRecipeType?: boolean; // For detecting unsaved changes
  icon?: string; // For Major Groups
}

const MAX_RECIPE_TYPES = 8;

const DESCRIPTION_MAX_LENGTH = 500;

// =============================================================================
// EDIT MODAL COMPONENT (needs to be inside GuidedModeProvider)
// =============================================================================

interface EditModalProps {
  editingItem: EditingItem;
  setEditingItem: React.Dispatch<React.SetStateAction<EditingItem | null>>;
  onSave: () => void;
  onClose: () => void;
  recipeTypeCount: number; // Current count of recipe types for cap validation
}

const EditModal: React.FC<EditModalProps> = ({
  editingItem,
  setEditingItem,
  onSave,
  onClose,
  recipeTypeCount,
}) => {
  const { isEnabled: isGuidedMode } = useGuidedMode();
  
  // Track original values for change detection
  const [originalIcon] = useState(editingItem.icon);
  const [originalIsRecipeType] = useState(editingItem.is_recipe_type);
  
  const hasDescriptionChanged = editingItem.description !== editingItem.originalDescription;
  const hasIconChanged = editingItem.type === "group" && editingItem.icon !== originalIcon;
  const hasRecipeTypeChanged = editingItem.type === "group" && editingItem.is_recipe_type !== originalIsRecipeType;
  const hasUnsavedChanges = hasDescriptionChanged || hasIconChanged || hasRecipeTypeChanged;
  
  // Check if we can enable recipe type (cap at 8)
  const wouldExceedCap = !originalIsRecipeType && editingItem.is_recipe_type && recipeTypeCount >= MAX_RECIPE_TYPES;
  
  const charCount = editingItem.description.length;
  const isOverLimit = charCount > DESCRIPTION_MAX_LENGTH;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md border border-gray-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              editingItem.type === "group" ? "bg-primary-500/20" :
              editingItem.type === "category" ? "bg-emerald-500/20" : "bg-amber-500/20"
            }`}>
              {editingItem.type === "group" ? (
                (() => {
                  const Icon = getLucideIcon(editingItem.icon);
                  return <Icon className="w-4 h-4 text-primary-400" />;
                })()
              ) : (
                <FolderTree className={`w-4 h-4 ${
                  editingItem.type === "category" ? "text-emerald-400" : "text-amber-400"
                }`} />
              )}
            </div>
            <div>
              <h3 className="text-base font-medium text-white">
                Edit {editingItem.type === "group" ? "Major Group" : editingItem.type === "category" ? "Category" : "Sub-Category"}
              </h3>
              <p className="text-xs text-gray-500">{editingItem.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Guided tip */}
          {isGuidedMode && (
            <GuidanceTip color="blue">
              {editingItem.type === "group" ? (
                <>Descriptions help your team understand what belongs here. Icons make groups easy to spot in dropdowns.</>
              ) : editingItem.type === "category" ? (
                <>Categories become filter options throughout ChefLife. Good names = faster workflows.</>
              ) : (
                <>Sub-categories are the finest detail level — they show up in your food cost reports.</>
              )}
            </GuidanceTip>
          )}

          {/* Name field (disabled) */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={editingItem.name}
                className="input w-full text-sm bg-gray-800/30 cursor-not-allowed"
                disabled
              />
              {editingItem.is_system && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                    <Lock className="w-3 h-3" />
                    System
                  </span>
                </div>
              )}
            </div>
            {editingItem.is_system && (
              <p className="text-[11px] text-gray-500 mt-1">
                System groups cannot be renamed or deleted
              </p>
            )}
          </div>

          {/* Icon picker (Major Groups only) */}
          {editingItem.type === "group" && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Icon
              </label>
              <div className="grid grid-cols-8 gap-1 p-2 bg-gray-800/30 rounded-lg border border-gray-700/50 max-h-32 overflow-y-auto">
                {iconOptions.map((opt) => {
                  const Icon = lucideIconMap[opt.value];
                  const isSelected = editingItem.icon === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setEditingItem({ ...editingItem, icon: opt.value })}
                      className={`p-2 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary-500/30 text-primary-400 ring-1 ring-primary-500/50"
                          : "hover:bg-gray-700/50 text-gray-400 hover:text-gray-300"
                      }`}
                      title={opt.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
              {isGuidedMode && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Pick an icon that represents this group. It appears in dropdowns and lists.
                </p>
              )}
            </div>
          )}

          {/* Recipe Type toggle (Major Groups only) */}
          {editingItem.type === "group" && (
            <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-sm font-medium text-white">Recipe Type</span>
                    <p className="text-xs text-gray-500">Creates a tab in Recipe Manager</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Don't allow enabling if at cap (unless it was already enabled)
                    if (!editingItem.is_recipe_type && recipeTypeCount >= MAX_RECIPE_TYPES) {
                      toast.error(`Maximum ${MAX_RECIPE_TYPES} recipe types. Archive one to add another.`);
                      return;
                    }
                    setEditingItem({ ...editingItem, is_recipe_type: !editingItem.is_recipe_type });
                  }}
                  disabled={editingItem.is_system && originalIsRecipeType}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editingItem.is_recipe_type
                      ? "bg-blue-500"
                      : "bg-gray-600"
                  } ${
                    editingItem.is_system && originalIsRecipeType
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  title={editingItem.is_system && originalIsRecipeType ? "System recipe types cannot be changed" : undefined}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editingItem.is_recipe_type ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {editingItem.is_system && originalIsRecipeType && (
                <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  System default — cannot be disabled
                </p>
              )}
              {wouldExceedCap && (
                <p className="text-[11px] text-rose-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Maximum {MAX_RECIPE_TYPES} recipe types reached. Archive one to add another.
                </p>
              )}
              {isGuidedMode && !editingItem.is_system && (
                <p className="text-[11px] text-gray-500 mt-2">
                  Enable this to create a dedicated tab in Recipe Manager for recipes in this group.
                </p>
              )}
            </div>
          )}

          {/* Description field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-400">
                Description
              </label>
              <span className={`text-[11px] ${
                isOverLimit ? "text-rose-400" : charCount > DESCRIPTION_MAX_LENGTH * 0.8 ? "text-amber-400" : "text-gray-500"
              }`}>
                {charCount} / {DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <textarea
              value={editingItem.description}
              onChange={(e) => {
                if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                  setEditingItem({ ...editingItem, description: e.target.value });
                }
              }}
              className={`input w-full h-28 text-sm resize-none ${
                isOverLimit ? "border-rose-500/50 focus:border-rose-500" : ""
              }`}
              placeholder="Add a description to help your team understand this category..."
              autoFocus={editingItem.type !== "group"} // Focus description for non-groups
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left: Unsaved indicator */}
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unsaved changes
                </span>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={!hasUnsavedChanges || isOverLimit || wouldExceedCap}
                className={`btn-primary btn-sm ${
                  !hasUnsavedChanges || isOverLimit || wouldExceedCap ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const FoodRelationshipsManager: React.FC = () => {
  // ---------------------------------------------------------------------------
  // STORE & STATE
  // ---------------------------------------------------------------------------
  const store = useFoodRelationshipsStore();
  const {
    fetchFoodRelationships,
    isLoading,
    addItem,
    updateItem,
    toggleArchiveItem,
  } = store;
  const majorGroups = store.majorGroups || [];
  const categories = store.categories || [];
  const subCategories = store.subCategories || [];

  const { showDiagnostics } = useDiagnostics();

  // Selection state
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Modal state
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [showAddModal, setShowAddModal] = useState<"group" | "category" | "sub" | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // UI state
  const [showArchivedItems, setShowArchivedItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchFoodRelationships();
  }, [fetchFoodRelationships]);

  // Reset category selection when group changes
  useEffect(() => {
    if (!selectedGroup) setSelectedCategory(null);
  }, [selectedGroup]);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - FILTERED DATA
  // ---------------------------------------------------------------------------
  const searchLower = searchQuery.toLowerCase().trim();

  const filteredMajorGroups = useMemo(() => {
    return majorGroups.filter((g) => {
      // Archive filter
      if (!showArchivedItems && g.archived) return false;
      // Search filter
      if (searchLower && !g.name.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [majorGroups, showArchivedItems, searchLower]);

  const filteredCategories = useMemo(() => {
    if (!selectedGroup) return [];
    return categories.filter((c) => {
      // Parent filter
      if (c.group_id !== selectedGroup) return false;
      // Archive filter
      if (!showArchivedItems && c.archived) return false;
      // Search filter (search inside selected group)
      if (searchLower && !c.name.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [categories, selectedGroup, showArchivedItems, searchLower]);

  const filteredSubCategories = useMemo(() => {
    if (!selectedCategory) return [];
    return subCategories.filter((s) => {
      // Parent filter
      if (s.category_id !== selectedCategory) return false;
      // Archive filter
      if (!showArchivedItems && s.archived) return false;
      // Search filter (search inside selected category)
      if (searchLower && !s.name.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [subCategories, selectedCategory, showArchivedItems, searchLower]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast.error("Please enter a name");
      return;
    }

    try {
      if (showAddModal === "group") {
        await addItem("group", {
          name: newItemName,
          description: newItemDescription,
          icon: getSuggestedIcon(newItemName),
          color: "gray", // Default color - not actively used but required by DB
          sort_order: majorGroups.length,
        });
      } else if (showAddModal === "category" && selectedGroup) {
        await addItem("category", {
          name: newItemName,
          description: newItemDescription,
          group_id: selectedGroup,
          sort_order: categories.filter((c) => c.group_id === selectedGroup).length,
        });
      } else if (showAddModal === "sub" && selectedCategory) {
        await addItem("sub", {
          name: newItemName,
          description: newItemDescription,
          category_id: selectedCategory,
          sort_order: subCategories.filter((s) => s.category_id === selectedCategory).length,
        });
      }

      setNewItemName("");
      setNewItemDescription("");
      setShowAddModal(null);
      toast.success("Item added successfully");
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const updates: Record<string, any> = {
        description: editingItem.description,
      };
      
      // Include icon and is_recipe_type for Major Groups
      if (editingItem.type === "group") {
        if (editingItem.icon) {
          updates.icon = editingItem.icon;
        }
        // Only include is_recipe_type if it's defined (changed)
        if (editingItem.is_recipe_type !== undefined) {
          updates.is_recipe_type = editingItem.is_recipe_type;
        }
      }
      
      await updateItem(editingItem.type, editingItem.id, updates);
      setShowEditModal(false);
      setEditingItem(null);
      toast.success("Item updated successfully");
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  // Direct archive handler for TwoStageButton (no modal needed)
  const handleArchiveItem = useCallback(async (
    type: "group" | "category" | "sub",
    id: string,
    currentlyArchived: boolean
  ) => {
    try {
      await toggleArchiveItem(type, id, !currentlyArchived);

      // Reset selection if we archived the selected item
      if (!currentlyArchived) {
        if (type === "group" && selectedGroup === id) {
          setSelectedGroup(null);
        } else if (type === "category" && selectedCategory === id) {
          setSelectedCategory(null);
        }
      }

      toast.success(`Item ${currentlyArchived ? "restored" : "archived"} successfully`);
    } catch (error) {
      console.error("Error archiving item:", error);
      toast.error("Failed to update item");
    }
  }, [toggleArchiveItem, selectedGroup, selectedCategory]);

  const clearSearch = () => setSearchQuery("");

  // ---------------------------------------------------------------------------
  // COMPUTED - Stats for header
  // ---------------------------------------------------------------------------
  const activeGroups = majorGroups.filter(g => !g.archived).length;
  const activeCategories = categories.filter(c => !c.archived).length;
  const activeSubCategories = subCategories.filter(s => !s.archived).length;
  
  // Count of recipe types for the 8-cap validation
  const recipeTypeCount = majorGroups.filter(g => g.is_recipe_type && !g.archived).length;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading food relationships...</div>
      </div>
    );
  }

  const showEmptyState = !majorGroups?.length || majorGroups.length === 0;

  return (
    <GuidedModeProvider defaultEnabled={showEmptyState}>
      <div className="space-y-4">
        {/* Diagnostic Path */}
        {showDiagnostics && (
          <div className="text-xs text-gray-500 font-mono">
            src/features/admin/components/sections/FoodRelationshipsManager/index.tsx
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* L5 TAB CONTENT HEADER - Following VIM Settings gold standard */}
        {/* Reference: VendorSettings.tsx pattern */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
          <div className="flex flex-col gap-4">
            {/* Top row: Icon/Title + Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <FolderTree className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Food Relationships
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Your taxonomy for ingredients and reporting
                  </p>
                </div>
              </div>

              {/* Stats Pills */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <span className="text-white font-medium">{activeGroups}</span>
                  <span className="text-gray-500 text-sm ml-1">Groups</span>
                </div>
                <div className="px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <span className="text-white font-medium">{activeCategories}</span>
                  <span className="text-gray-500 text-sm ml-1">Categories</span>
                </div>
                <div className="px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <span className="text-white font-medium">{activeSubCategories}</span>
                  <span className="text-gray-500 text-sm ml-1">Sub-Cat</span>
                </div>
              </div>
            </div>

            {/* Expandable Info Section - THE explanation goes here */}
            <div className={`expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
              <button
                onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                className="expandable-info-header w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-300">
                    About Food Relationships
                  </span>
                </div>
                <ChevronUp className="w-4 h-4 text-gray-400" />
              </button>
              <div className="expandable-info-content">
                <div className="p-4 pt-2 space-y-4">
                  <p className="text-sm text-gray-400">
                    Food Relationships is your taxonomy — the organizational structure that powers 
                    everything in ChefLife. Think of it like folders on a computer:
                  </p>
                  
                  {/* Feature cards - matches Price History pattern */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="subheader-feature-card">
                      <FolderTree className="w-4 h-4 text-primary-400/80" />
                      <div>
                        <span className="subheader-feature-title text-white">Major Groups</span>
                        <p className="subheader-feature-desc">Top-level buckets: FOOD, ALCOHOL, MIS EN PLACE, FINAL GOODS</p>
                      </div>
                    </div>
                    <div className="subheader-feature-card">
                      <FolderTree className="w-4 h-4 text-emerald-400/80" />
                      <div>
                        <span className="subheader-feature-title text-white">Categories</span>
                        <p className="subheader-feature-desc">Subdivisions: Proteins, Produce, Dairy, Dry Goods</p>
                      </div>
                    </div>
                    <div className="subheader-feature-card">
                      <FolderTree className="w-4 h-4 text-amber-400/80" />
                      <div>
                        <span className="subheader-feature-title text-white">Sub-Categories</span>
                        <p className="subheader-feature-desc">Finest detail: Beef, Pork, Chicken (shows in reports)</p>
                      </div>
                    </div>
                    <div className="subheader-feature-card">
                      <Info className="w-4 h-4 text-blue-400/80" />
                      <div>
                        <span className="subheader-feature-title text-white">Guided Mode</span>
                        <p className="subheader-feature-desc">Toggle on for step-by-step tips while building your taxonomy</p>
                      </div>
                    </div>
                    <div className="subheader-feature-card">
                      <Archive className="w-4 h-4 text-purple-400/80" />
                      <div>
                        <span className="subheader-feature-title text-white">Archived</span>
                        <p className="subheader-feature-desc">Hide items without deleting — restore anytime with the eye toggle</p>
                      </div>
                    </div>
                  </div>

                  {/* Icons explanation */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      System group (can archive, cannot delete)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px]">recipe</span>
                      Drives Recipe Manager tabs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* L5 SUB-HEADER: Search + Controls */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3">
          <div className="flex items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all categories..."
                className="w-full pl-9 pr-8 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500/50"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <GuidedModeToggle />
              <button
                onClick={() => setShowArchivedItems(!showArchivedItems)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  showArchivedItems
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:text-gray-400"
                }`}
              >
                {showArchivedItems ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>Archived</span>
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* EMPTY STATE - First time / No data */}
        {/* ------------------------------------------------------------------- */}
        {showEmptyState ? (
          <div className="text-center py-16 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <FolderTree className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Welcome to Food Relationships
            </h3>
            <p className="text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed">
              This is where you'll organize everything in ChefLife. Create Major Groups 
              (like FOOD, ALCOHOL), then Categories (Proteins, Produce), then Sub-Categories 
              (Beef, Pork, Chicken). Your reports and filters will thank you.
            </p>
            <button onClick={() => setShowAddModal("group")} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Major Group
            </button>
            <p className="text-xs text-gray-600 mt-4">
              Pro tip: Start with FOOD — it's where most ingredients live.
            </p>
          </div>
        ) : (
          /* ----------------------------------------------------------------- */
          /* THREE-COLUMN LAYOUT */
          /* ----------------------------------------------------------------- */
          <div className="grid grid-cols-3 gap-4">
            {/* ============================================================= */}
            {/* MAJOR GROUPS COLUMN */}
            {/* ============================================================= */}
            <div className="card p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Major Groups</h3>
                <button onClick={() => setShowAddModal("group")} className="btn-ghost btn-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </button>
              </div>

              <GuidanceTip color="green">
                Top-level buckets. <Lock className="w-3 h-3 inline mx-0.5 text-amber-500" /> = system (archive only, no delete).
              </GuidanceTip>

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {filteredMajorGroups.map((group) => {
                  const Icon = getLucideIcon(group.icon);
                  const isSelected = selectedGroup === group.id;
                  const activeCount = categories.filter(
                    (c) => c.group_id === group.id && !c.archived
                  ).length;

                  return (
                    <div key={group.id}>
                      <button
                        onClick={() => setSelectedGroup(isSelected ? null : group.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                          isSelected
                            ? "bg-primary-500/20 border border-primary-500/30"
                            : group.archived
                              ? "bg-gray-800/30 hover:bg-gray-800/50"
                              : "bg-gray-800/50 hover:bg-gray-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <GripVertical className="w-3.5 h-3.5 text-gray-600 cursor-grab flex-shrink-0" />
                          {group.is_system && (
                            <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" title="System group — cannot delete" />
                          )}
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-primary-400" : "text-gray-400"}`} />
                          <span className={`font-medium truncate ${
                            group.archived 
                              ? "text-gray-500 line-through" 
                              : isSelected 
                                ? "text-primary-300" 
                                : "text-gray-300"
                          }`}>
                            {group.name}
                          </span>
                          {group.is_recipe_type && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 flex-shrink-0">
                              recipe
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem({
                                id: group.id,
                                type: "group",
                                name: group.name,
                                description: group.description || "",
                                originalDescription: group.description || "",
                                archived: group.archived,
                                is_system: group.is_system,
                                is_recipe_type: group.is_recipe_type || false,
                                originalIsRecipeType: group.is_recipe_type || false,
                                icon: group.icon,
                              });
                              setShowEditModal(true);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <div onClick={(e) => e.stopPropagation()}>
                            <TwoStageButton
                              onConfirm={() => handleArchiveItem("group", group.id, group.archived || false)}
                              icon={group.archived ? RotateCcw : Archive}
                              confirmText={group.archived ? "Restore?" : "Archive?"}
                              variant="warning"
                              size="xs"
                              title={group.archived ? "Restore" : "Archive"}
                            />
                          </div>
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isSelected ? "rotate-90" : ""}`}
                          />
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isSelected && (
                        <div className="mt-1.5 ml-2 mr-2 p-2.5 bg-gray-900/50 rounded-lg border border-gray-700/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-400">
                              <span className="text-primary-400 font-medium">{activeCount}</span> categories active
                            </span>
                          </div>
                          {group.description ? (
                            <p className="text-xs text-gray-400 leading-relaxed">
                              {group.description}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-600 italic">No description</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredMajorGroups.length === 0 && (
                  <div className="text-center py-8">
                    <FolderTree className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    {searchQuery ? (
                      <p className="text-gray-500 text-xs">No groups match "{searchQuery}"</p>
                    ) : (
                      <>
                        <p className="text-gray-400 text-sm mb-3">No major groups yet</p>
                        <button 
                          onClick={() => setShowAddModal("group")} 
                          className="btn-ghost btn-xs text-primary-400 hover:text-primary-300"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add your first group
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================= */}
            {/* CATEGORIES COLUMN */}
            {/* ============================================================= */}
            <div className="card p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Categories</h3>
                <button
                  onClick={() => setShowAddModal("category")}
                  className="btn-ghost btn-xs"
                  disabled={!selectedGroup}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </button>
              </div>

              <GuidanceTip color="green">
                Subdivide groups — FOOD → Proteins, Produce, Dairy. These become your filter dropdowns.
              </GuidanceTip>

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {selectedGroup ? (
                  filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => {
                      const isSelected = selectedCategory === category.id;
                      const activeCount = subCategories.filter(
                        (s) => s.category_id === category.id && !s.archived
                      ).length;

                      return (
                        <div key={category.id}>
                          <button
                          onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                          isSelected
                          ? "bg-emerald-500/20 border border-emerald-500/30"
                          : category.archived
                          ? "bg-gray-800/30 hover:bg-gray-800/50"
                          : "bg-gray-800/50 hover:bg-gray-700/50"
                          }`}
                          >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                          <GripVertical className="w-3.5 h-3.5 text-gray-600 cursor-grab flex-shrink-0" />
                          {category.archived ? (
                            <Archive className="w-4 h-4 flex-shrink-0 text-gray-500" />
                          ) : (
                            <FolderTree className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-emerald-400" : "text-gray-400"}`} />
                          )}
                          <span className={`font-medium truncate ${
                          category.archived 
                          ? "text-gray-500 line-through" 
                          : isSelected 
                          ? "text-emerald-300" 
                          : "text-gray-300"
                          }`}>
                          {category.name}
                          </span>
                          </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem({
                                    id: category.id,
                                    type: "category",
                                    name: category.name,
                                    description: category.description || "",
                                    originalDescription: category.description || "",
                                    archived: category.archived,
                                  });
                                  setShowEditModal(true);
                                }}
                                className="p-1 text-gray-500 hover:text-blue-400"
                                title="Edit"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <div onClick={(e) => e.stopPropagation()}>
                                <TwoStageButton
                                  onConfirm={() => handleArchiveItem("category", category.id, category.archived || false)}
                                  icon={category.archived ? RotateCcw : Archive}
                                  confirmText={category.archived ? "Restore?" : "Archive?"}
                                  variant="warning"
                                  size="xs"
                                  title={category.archived ? "Restore" : "Archive"}
                                />
                              </div>
                              <ChevronRight
                                className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isSelected ? "rotate-90" : ""}`}
                              />
                            </div>
                          </button>

                          {/* Expanded details */}
                          {isSelected && (
                            <div className="mt-1.5 ml-2 mr-2 p-2.5 bg-gray-900/50 rounded-lg border border-gray-700/30">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-gray-400">
                                  <span className="text-emerald-400 font-medium">{activeCount}</span> sub-categories active
                                </span>
                              </div>
                              {category.description ? (
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  {category.description}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-600 italic">No description</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <FolderTree className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                      {searchQuery ? (
                        <p className="text-gray-500 text-xs">No categories match "{searchQuery}"</p>
                      ) : (
                        <>
                          <p className="text-gray-400 text-sm mb-3">No categories in this group</p>
                          <button 
                            onClick={() => setShowAddModal("category")} 
                            className="btn-ghost btn-xs text-emerald-400 hover:text-emerald-300"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add first category
                          </button>
                        </>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <ChevronRight className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Select a major group</p>
                    <p className="text-gray-600 text-xs mt-1">to see its categories</p>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================= */}
            {/* SUB-CATEGORIES COLUMN */}
            {/* ============================================================= */}
            <div className="card p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Sub-Categories</h3>
                <button
                  onClick={() => setShowAddModal("sub")}
                  className="btn-ghost btn-xs"
                  disabled={!selectedCategory}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </button>
              </div>

              <GuidanceTip color="green">
                Finest detail — Proteins → Beef, Pork, Chicken. This is what shows in your food cost reports.
              </GuidanceTip>

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {selectedCategory ? (
                  filteredSubCategories.length > 0 ? (
                    filteredSubCategories.map((subCategory) => {
                      const isExpanded = expandedSubId === subCategory.id;

                      return (
                        <div key={subCategory.id}>
                          <button
                            onClick={() => setExpandedSubId(isExpanded ? null : subCategory.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left ${
                              subCategory.archived
                                ? "bg-gray-800/30 hover:bg-gray-800/50"
                                : "bg-gray-800/50 hover:bg-gray-700/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <GripVertical className="w-3.5 h-3.5 text-gray-600 cursor-grab flex-shrink-0" />
                              {subCategory.archived ? (
                                <Archive className="w-4 h-4 flex-shrink-0 text-gray-500" />
                              ) : (
                                <FolderTree className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              )}
                              <span className={`font-medium truncate ${
                                subCategory.archived ? "text-gray-500 line-through" : "text-gray-300"
                              }`}>
                                {subCategory.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem({
                                    id: subCategory.id,
                                    type: "sub",
                                    name: subCategory.name,
                                    description: subCategory.description || "",
                                    originalDescription: subCategory.description || "",
                                    archived: subCategory.archived,
                                  });
                                  setShowEditModal(true);
                                }}
                                className="p-1 text-gray-500 hover:text-blue-400"
                                title="Edit"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <div onClick={(e) => e.stopPropagation()}>
                                <TwoStageButton
                                  onConfirm={() => handleArchiveItem("sub", subCategory.id, subCategory.archived || false)}
                                  icon={subCategory.archived ? RotateCcw : Archive}
                                  confirmText={subCategory.archived ? "Restore?" : "Archive?"}
                                  variant="warning"
                                  size="xs"
                                  title={subCategory.archived ? "Restore" : "Archive"}
                                />
                              </div>
                              <ChevronRight
                                className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              />
                            </div>
                          </button>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-1.5 ml-2 mr-2 p-2.5 bg-gray-900/50 rounded-lg border border-gray-700/30">
                              {subCategory.description ? (
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  {subCategory.description}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-600 italic">No description</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <FolderTree className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                      {searchQuery ? (
                        <p className="text-gray-500 text-xs">No sub-categories match "{searchQuery}"</p>
                      ) : (
                        <>
                          <p className="text-gray-400 text-sm mb-3">No sub-categories yet</p>
                          <button 
                            onClick={() => setShowAddModal("sub")} 
                            className="btn-ghost btn-xs text-amber-400 hover:text-amber-300"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add first sub-category
                          </button>
                        </>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <ChevronRight className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Select a category</p>
                    <p className="text-gray-600 text-xs mt-1">to see its sub-categories</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ADD MODAL */}
        {/* =================================================================== */}
        {showAddModal && (() => {
          const descCharCount = newItemDescription.length;
          const descIsOverLimit = descCharCount > DESCRIPTION_MAX_LENGTH;
          const descIsNearLimit = descCharCount > DESCRIPTION_MAX_LENGTH * 0.8;
          const canAdd = newItemName.trim() && !descIsOverLimit;
          
          return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 rounded-lg w-full max-w-md border border-gray-800">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      showAddModal === "group" ? "bg-primary-500/20" :
                      showAddModal === "category" ? "bg-emerald-500/20" : "bg-amber-500/20"
                    }`}>
                      <FolderTree className={`w-4 h-4 ${
                        showAddModal === "group" ? "text-primary-400" :
                        showAddModal === "category" ? "text-emerald-400" : "text-amber-400"
                      }`} />
                    </div>
                    <h3 className="text-base font-medium text-white">
                      Add {showAddModal === "group" ? "Major Group" : showAddModal === "category" ? "Category" : "Sub-Category"}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddModal(null);
                      setNewItemName("");
                      setNewItemDescription("");
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="input w-full text-sm"
                      placeholder="Enter name..."
                      autoFocus
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-400">
                        Description <span className="text-gray-600">(optional)</span>
                      </label>
                      <span className={`text-[11px] ${
                        descIsOverLimit ? "text-rose-400 font-medium" : 
                        descIsNearLimit ? "text-amber-400" : "text-gray-500"
                      }`}>
                        {descCharCount} / {DESCRIPTION_MAX_LENGTH}
                      </span>
                    </div>
                    <textarea
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      className={`input w-full h-24 text-sm resize-none ${
                        descIsOverLimit ? "border-rose-500/50 focus:border-rose-500" : ""
                      }`}
                      placeholder="Add a description to help your team understand this category..."
                    />
                    {descIsOverLimit && (
                      <p className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Description exceeds {DESCRIPTION_MAX_LENGTH} characters. Please shorten it.
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAddModal(null);
                      setNewItemName("");
                      setNewItemDescription("");
                    }}
                    className="btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddItem} 
                    disabled={!canAdd}
                    className={`btn-primary btn-sm ${!canAdd ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Add {showAddModal === "group" ? "Group" : showAddModal === "category" ? "Category" : "Sub-Category"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* =================================================================== */}
        {/* EDIT MODAL */}
        {/* =================================================================== */}
        {showEditModal && editingItem && (
          <EditModal
            editingItem={editingItem}
            setEditingItem={setEditingItem}
            onSave={handleSaveEdit}
            onClose={() => {
              setShowEditModal(false);
              setEditingItem(null);
            }}
            recipeTypeCount={recipeTypeCount}
          />
        )}

      </div>
    </GuidedModeProvider>
  );
};

export default FoodRelationshipsManager;
