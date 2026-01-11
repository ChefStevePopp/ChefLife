import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Ghost,
  Trash2,
  Pencil,
  RefreshCw,
  Package,
  Filter,
  ShoppingCart,
  ChefHat,
  Info,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useIngredientNavigationStore } from "@/stores/ingredientNavigationStore";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// =============================================================================
// TRIAGE PANEL - Pending Additions Workflow
// =============================================================================
// Shows items that need attention:
// 1. Skipped items from VIM import (0% complete - in pending_import_items)
// 2. Incomplete ingredients from Quick Add (partial % - in master_ingredients)
// =============================================================================

interface PendingItem {
  id: string;
  item_code: string;
  product_name: string;
  unit_price: number | null;
  unit_of_measure: string | null;
  vendor_id: string | null;
  vendor_name?: string;
  source: "skipped" | "incomplete";
  ingredient_type: "purchased" | "prep";
  percent_complete: number;
  created_at: string;
  // For incomplete ingredients
  ingredient_id?: string;
}

// Fields that count toward completion
const COMPLETION_FIELDS = [
  "major_group",
  "category", 
  "sub_category",
  "recipe_unit_type",
  "recipe_unit_per_purchase_unit",
  "yield_percent",
  "storage_area",
] as const;

export const TriagePanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ingredients, fetchIngredients } = useMasterIngredientsStore();
  const { setNavigationContext } = useIngredientNavigationStore();
  
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "skipped" | "incomplete" | "purchased" | "prep">("all");
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  // ---------------------------------------------------------------------------
  // FETCH DATA
  // ---------------------------------------------------------------------------
  const fetchPendingData = async () => {
    if (!user?.user_metadata?.organizationId) return;
    
    setIsLoading(true);
    try {
      // 1. Fetch skipped items from pending_import_items
      const { data: skippedItems, error: skippedError } = await supabase
        .from("pending_import_items")
        .select(`
          id,
          item_code,
          product_name,
          unit_price,
          unit_of_measure,
          vendor_id,
          created_at,
          vendors(name)
        `)
        .eq("organization_id", user.user_metadata.organizationId)
        .eq("status", "pending");

      if (skippedError) {
        console.warn("Could not fetch pending items:", skippedError);
      }

      // 2. Get incomplete ingredients from store
      await fetchIngredients();

      // Transform skipped items (always purchased - they come from VIM)
      const skippedPending: PendingItem[] = (skippedItems || []).map((item: any) => ({
        id: item.id,
        item_code: item.item_code,
        product_name: item.product_name,
        unit_price: item.unit_price,
        unit_of_measure: item.unit_of_measure,
        vendor_id: item.vendor_id,
        vendor_name: item.vendors?.name,
        source: "skipped" as const,
        ingredient_type: "purchased" as const,
        percent_complete: 0,
        created_at: item.created_at,
      }));

      // Transform incomplete ingredients
      const incompletePending: PendingItem[] = ingredients
        .filter((ing) => {
          // Calculate completion - if less than 100%, it's incomplete
          const filledFields = COMPLETION_FIELDS.filter((field) => {
            const value = ing[field as keyof typeof ing];
            return value !== null && value !== undefined && value !== "" && value !== 0;
          });
          const percent = Math.round((filledFields.length / COMPLETION_FIELDS.length) * 100);
          return percent < 100;
        })
        .map((ing) => {
          const filledFields = COMPLETION_FIELDS.filter((field) => {
            const value = ing[field as keyof typeof ing];
            return value !== null && value !== undefined && value !== "" && value !== 0;
          });
          const percent = Math.round((filledFields.length / COMPLETION_FIELDS.length) * 100);
          
          return {
            id: ing.id,
            item_code: ing.item_code || "",
            product_name: ing.product || "",
            unit_price: ing.current_price,
            unit_of_measure: ing.unit_of_measure,
            vendor_id: null,
            source: "incomplete" as const,
            // Use explicit field if set, otherwise default to purchased
            // Only mark as prep if explicitly set or linked to recipe
            ingredient_type: (() => {
              // Explicit type field takes priority
              if ((ing as any).ingredient_type === 'prep') return 'prep' as const;
              if ((ing as any).ingredient_type === 'purchased') return 'purchased' as const;
              // Has source recipe = prep
              if ((ing as any).source_recipe_id) return 'prep' as const;
              // Default: assume purchased (manual vendor codes vary widely)
              return 'purchased' as const;
            })(),
            percent_complete: percent,
            created_at: ing.created_at || "",
            ingredient_id: ing.id,
          };
        });

      setPendingItems([...skippedPending, ...incompletePending]);
    } catch (error) {
      console.error("Error fetching triage data:", error);
      toast.error("Failed to load pending items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
  }, [user?.user_metadata?.organizationId]);

  // ---------------------------------------------------------------------------
  // FILTERED & SORTED DATA
  // ---------------------------------------------------------------------------
  const filteredItems = useMemo(() => {
    let items = [...pendingItems];
    
    if (filter === "skipped") {
      items = items.filter((i) => i.source === "skipped");
    } else if (filter === "incomplete") {
      items = items.filter((i) => i.source === "incomplete");
    } else if (filter === "purchased") {
      items = items.filter((i) => i.ingredient_type === "purchased");
    } else if (filter === "prep") {
      items = items.filter((i) => i.ingredient_type === "prep");
    }
    
    // Sort by percent complete (0% first), then by date
    return items.sort((a, b) => {
      if (a.percent_complete !== b.percent_complete) {
        return a.percent_complete - b.percent_complete;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [pendingItems, filter]);

  // Stats
  const stats = useMemo(() => ({
    total: pendingItems.length,
    skipped: pendingItems.filter((i) => i.source === "skipped").length,
    incomplete: pendingItems.filter((i) => i.source === "incomplete").length,
    purchased: pendingItems.filter((i) => i.ingredient_type === "purchased").length,
    prep: pendingItems.filter((i) => i.ingredient_type === "prep").length,
    zeroPercent: pendingItems.filter((i) => i.percent_complete === 0).length,
  }), [pendingItems]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleDelete = async (item: PendingItem) => {
    try {
      if (item.source === "skipped") {
        // Delete from pending_import_items
        const { error } = await supabase
          .from("pending_import_items")
          .delete()
          .eq("id", item.id);
        
        if (error) throw error;
      } else {
        // Archive the incomplete ingredient
        const { error } = await supabase
          .from("master_ingredients")
          .update({ archived: true })
          .eq("id", item.id);
        
        if (error) throw error;
      }
      
      toast.success(`Removed ${item.product_name}`);
      fetchPendingData();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to remove item");
    }
  };

  const handleDeleteAllZero = async () => {
    const zeroItems = pendingItems.filter((i) => i.percent_complete === 0);
    if (zeroItems.length === 0) return;

    try {
      // Delete all skipped items (they're all 0%)
      const skippedIds = zeroItems
        .filter((i) => i.source === "skipped")
        .map((i) => i.id);
      
      if (skippedIds.length > 0) {
        const { error } = await supabase
          .from("pending_import_items")
          .delete()
          .in("id", skippedIds);
        
        if (error) throw error;
      }

      toast.success(`Removed ${zeroItems.length} items at 0%`);
      fetchPendingData();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Failed to remove items");
    }
  };

  const handleEdit = (item: PendingItem) => {
    // Set navigation context with Triage as return destination
    const incompleteIds = filteredItems
      .filter(i => i.source === "incomplete" && i.ingredient_id)
      .map(i => i.ingredient_id!);
    
    setNavigationContext(
      incompleteIds,
      `Triage (${filteredItems.length} items)`,
      "/admin/data/invoices?tab=triage"
    );
    
    if (item.source === "incomplete" && item.ingredient_id) {
      // Navigate to ingredient detail page
      navigate(`/admin/data/ingredients/${item.ingredient_id}`);
    } else if (item.source === "skipped") {
      // For skipped items, we need to create the ingredient first
      // Navigate to new ingredient with pre-filled data
      navigate(`/admin/data/ingredients/new?item_code=${item.item_code}&product=${encodeURIComponent(item.product_name)}&price=${item.unit_price || ""}&pending_id=${item.id}`);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-700/30">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-700/40 flex items-center justify-center">
                <Package className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                <div className="text-xl font-bold text-white">{stats.total}</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Ghost className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Skipped</div>
                <div className="text-xl font-bold text-amber-400">{stats.skipped}</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Incomplete</div>
                <div className="text-xl font-bold text-rose-400">{stats.incomplete}</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Status</div>
                <div className="text-lg font-bold text-white">
                  {stats.total === 0 ? "All Clear" : "Needs Work"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Source:</span>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-gray-600 text-white"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter("skipped")}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === "skipped"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
            }`}
          >
            <Ghost className="w-3 h-3" />
            Skipped ({stats.skipped})
          </button>
          <button
            onClick={() => setFilter("incomplete")}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === "incomplete"
                ? "bg-rose-500/20 text-rose-400"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Incomplete ({stats.incomplete})
          </button>
          
          <span className="text-gray-700 mx-1">|</span>
          <span className="text-xs text-gray-500">Type:</span>
          <button
            onClick={() => setFilter("purchased")}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === "purchased"
                ? "bg-primary-500/20 text-primary-400"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
            }`}
          >
            <ShoppingCart className="w-3 h-3" />
            Purchased ({stats.purchased})
          </button>
          <button
            onClick={() => setFilter("prep")}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === "prep"
                ? "bg-purple-500/20 text-purple-400"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
            }`}
          >
            <ChefHat className="w-3 h-3" />
            Prep ({stats.prep})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPendingData}
            className="btn-ghost text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </button>
          {stats.zeroPercent > 0 && (
            <TwoStageButton
              onConfirm={handleDeleteAllZero}
              icon={Trash2}
              confirmText={`Delete ${stats.zeroPercent} at 0%?`}
              variant="danger"
            />
          )}
        </div>
      </div>

      {/* Expandable Legend */}
      <div className={`expandable-info-section ${isLegendExpanded ? "expanded" : ""}`}>
        <button
          onClick={() => setIsLegendExpanded(!isLegendExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300">
              Icon Legend
            </span>
          </div>
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Source</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Ghost className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-sm text-gray-300">Skipped — Not created yet, parked during import</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    </div>
                    <span className="text-sm text-gray-300">Incomplete — Created but missing required fields</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Type</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-primary-400" />
                    </div>
                    <span className="text-sm text-gray-300">Purchased — Bought from vendor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <ChefHat className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-sm text-gray-300">Prep — Made in kitchen from recipe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
          <p className="text-gray-400 text-sm">
            No pending additions to triage. Import more invoices to see items here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400 w-16">Source</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400 w-16">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Item Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Product Name</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Price</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">% Complete</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredItems.map((item) => (
                <tr 
                  key={`${item.source}-${item.id}`}
                  className="hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-center">
                    {item.source === "skipped" ? (
                      <div 
                        className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto"
                        title="Skipped - Not created yet"
                      >
                        <Ghost className="w-4 h-4 text-amber-400" />
                      </div>
                    ) : (
                      <div 
                        className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center mx-auto"
                        title="Incomplete - Missing required fields"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.ingredient_type === "prep" ? (
                      <div 
                        className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto"
                        title="Prep - Made in kitchen"
                      >
                        <ChefHat className="w-4 h-4 text-purple-400" />
                      </div>
                    ) : (
                      <div 
                        className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center mx-auto"
                        title="Purchased - From vendor"
                      >
                        <ShoppingCart className="w-4 h-4 text-primary-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                    {item.item_code || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    {item.product_name}
                    {item.vendor_name && (
                      <div className="text-xs text-gray-500">{item.vendor_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 text-right">
                    {item.unit_price ? `$${item.unit_price.toFixed(2)}` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.percent_complete === 0
                              ? "bg-gray-600"
                              : item.percent_complete < 50
                              ? "bg-rose-500"
                              : item.percent_complete < 100
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${item.percent_complete}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        item.percent_complete === 0
                          ? "text-gray-500"
                          : item.percent_complete < 50
                          ? "text-rose-400"
                          : item.percent_complete < 100
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}>
                        {item.percent_complete}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-800/50 hover:bg-primary-500/20 text-gray-400 hover:text-primary-400 transition-colors"
                        title="Edit / Complete Setup"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <TwoStageButton
                        onConfirm={() => handleDelete(item)}
                        icon={Trash2}
                        confirmText="Sure?"
                        variant="danger"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 text-center">
        Click the <Pencil className="w-3 h-3 inline" /> to edit and complete setup. Expand the legend above for icon meanings.
      </div>
    </div>
  );
};

export default TriagePanel;
