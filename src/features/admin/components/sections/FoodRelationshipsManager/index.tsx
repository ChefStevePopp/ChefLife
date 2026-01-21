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

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFoodRelationshipsStore } from "@/stores/foodRelationshipsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { getLucideIcon, getSuggestedIcon } from "@/utils/iconMapping";
import toast from "react-hot-toast";

// L5 Shared Components
import {
  GuidedModeProvider,
  GuidedModeToggle,
  GuidanceTip,
} from "@/shared/components/L5";

// =============================================================================
// TYPES
// =============================================================================

interface EditingItem {
  id: string;
  type: "group" | "category" | "sub";
  name: string;
  description: string;
  archived?: boolean;
  is_system?: boolean;
}

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
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

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
      await updateItem(editingItem.type, editingItem.id, {
        description: editingItem.description,
      });
      setShowEditModal(false);
      setEditingItem(null);
      toast.success("Item updated successfully");
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const handleArchive = async () => {
    if (!editingItem) return;

    try {
      const currentStatus = editingItem.archived || false;
      await toggleArchiveItem(editingItem.type, editingItem.id, !currentStatus);

      // Reset selection if we archived the selected item
      if (!currentStatus) {
        if (editingItem.type === "group" && selectedGroup === editingItem.id) {
          setSelectedGroup(null);
        } else if (editingItem.type === "category" && selectedCategory === editingItem.id) {
          setSelectedCategory(null);
        }
      }

      setShowArchiveConfirm(false);
      setEditingItem(null);
      toast.success(`Item ${currentStatus ? "restored" : "archived"} successfully`);
    } catch (error) {
      console.error("Error archiving item:", error);
      toast.error("Failed to update item");
    }
  };

  const clearSearch = () => setSearchQuery("");

  // ---------------------------------------------------------------------------
  // COMPUTED - Stats for header
  // ---------------------------------------------------------------------------
  const activeGroups = majorGroups.filter(g => !g.archived).length;
  const activeCategories = categories.filter(c => !c.archived).length;
  const activeSubCategories = subCategories.filter(s => !s.archived).length;

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
    <GuidedModeProvider defaultEnabled={false}>
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
                  
                  {/* Hierarchy explanation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderTree className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-medium text-primary-400">Major Groups</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Top-level buckets: FOOD, ALCOHOL, MIS EN PLACE, FINAL GOODS
                      </p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderTree className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400">Categories</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Subdivisions: Proteins, Produce, Dairy, Dry Goods
                      </p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderTree className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-400">Sub-Categories</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Finest detail: Beef, Pork, Chicken (shows in reports)
                      </p>
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
        {/* EMPTY STATE */}
        {/* ------------------------------------------------------------------- */}
        {showEmptyState ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-lg">
            <FolderTree className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No Categories Set Up
            </h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Start by adding major groups, then create categories and
              sub-categories to organize your ingredients.
            </p>
            <button onClick={() => setShowAddModal("group")} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Major Group
            </button>
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
                                archived: group.archived,
                                is_system: group.is_system,
                              });
                              setShowEditModal(true);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem({
                                id: group.id,
                                type: "group",
                                name: group.name,
                                description: group.description || "",
                                archived: group.archived,
                                is_system: group.is_system,
                              });
                              setShowArchiveConfirm(true);
                            }}
                            className="p-1 text-gray-500 hover:text-amber-400"
                            title={group.archived ? "Restore" : "Archive"}
                          >
                            {group.archived ? (
                              <RotateCcw className="w-3 h-3" />
                            ) : (
                              <Archive className="w-3 h-3" />
                            )}
                          </button>
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
                  <div className="text-center py-6 text-gray-500 text-xs">
                    {searchQuery ? "No groups match search" : "No major groups"}
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
                          <FolderTree className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-emerald-400" : "text-gray-400"}`} />
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
                                    archived: category.archived,
                                  });
                                  setShowEditModal(true);
                                }}
                                className="p-1 text-gray-500 hover:text-blue-400"
                                title="Edit"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem({
                                    id: category.id,
                                    type: "category",
                                    name: category.name,
                                    description: category.description || "",
                                    archived: category.archived,
                                  });
                                  setShowArchiveConfirm(true);
                                }}
                                className="p-1 text-gray-500 hover:text-amber-400"
                                title={category.archived ? "Restore" : "Archive"}
                              >
                                {category.archived ? (
                                  <RotateCcw className="w-3 h-3" />
                                ) : (
                                  <Archive className="w-3 h-3" />
                                )}
                              </button>
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
                    <div className="text-center py-6 text-gray-500 text-xs">
                      {searchQuery ? "No categories match search" : "No categories in this group"}
                    </div>
                  )
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    Select a major group
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
                              <FolderTree className="w-4 h-4 text-amber-400 flex-shrink-0" />
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
                                    archived: subCategory.archived,
                                  });
                                  setShowEditModal(true);
                                }}
                                className="p-1 text-gray-500 hover:text-blue-400"
                                title="Edit"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem({
                                    id: subCategory.id,
                                    type: "sub",
                                    name: subCategory.name,
                                    description: subCategory.description || "",
                                    archived: subCategory.archived,
                                  });
                                  setShowArchiveConfirm(true);
                                }}
                                className="p-1 text-gray-500 hover:text-amber-400"
                                title={subCategory.archived ? "Restore" : "Archive"}
                              >
                                {subCategory.archived ? (
                                  <RotateCcw className="w-3 h-3" />
                                ) : (
                                  <Archive className="w-3 h-3" />
                                )}
                              </button>
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
                    <div className="text-center py-6 text-gray-500 text-xs">
                      {searchQuery ? "No sub-categories match search" : "No sub-categories"}
                    </div>
                  )
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">
                    Select a category
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ADD MODAL */}
        {/* =================================================================== */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-md border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-base font-medium text-white">
                  Add {showAddModal === "group" ? "Major Group" : showAddModal === "category" ? "Category" : "Sub-Category"}
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
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
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="input w-full h-20 text-sm"
                    placeholder="Enter description..."
                  />
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
                <button onClick={handleAddItem} className="btn-primary btn-sm">
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* EDIT MODAL */}
        {/* =================================================================== */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-md border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-base font-medium text-white">
                  Edit {editingItem.type === "group" ? "Major Group" : editingItem.type === "category" ? "Category" : "Sub-Category"}
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingItem.name}
                    className="input w-full text-sm opacity-60"
                    disabled
                  />
                  {editingItem.is_system && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> System group — name locked
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="input w-full h-20 text-sm"
                    placeholder="Enter description..."
                    autoFocus
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="btn-primary btn-sm">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ARCHIVE CONFIRMATION MODAL */}
        {/* =================================================================== */}
        {showArchiveConfirm && editingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-sm border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-base font-medium text-white">
                  {editingItem.archived ? "Restore" : "Archive"} {editingItem.name}?
                </h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-300">
                  {editingItem.archived ? (
                    <>This will restore <strong>{editingItem.name}</strong> and make it visible again.</>
                  ) : (
                    <>
                      This will hide <strong>{editingItem.name}</strong> from view.
                      {editingItem.type !== "sub" && (
                        <span className="block mt-2 text-xs text-amber-400">
                          All items inside will also be hidden.
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowArchiveConfirm(false);
                    setEditingItem(null);
                  }}
                  className="btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  className={`btn-sm ${editingItem.archived ? "btn-primary" : "btn-warning"}`}
                >
                  {editingItem.archived ? "Restore" : "Archive"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GuidedModeProvider>
  );
};

export default FoodRelationshipsManager;
