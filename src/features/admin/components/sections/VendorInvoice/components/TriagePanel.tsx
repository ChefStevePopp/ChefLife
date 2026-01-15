import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Ghost,
  Trash2,
  Pencil,
  RefreshCw,
  Package,
  ShoppingCart,
  ChefHat,
  Info,
  ChevronUp,
  Inbox,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useIngredientNavigationStore } from "@/stores/ingredientNavigationStore";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { useNavigate } from "react-router-dom";
import { ExcelDataGrid } from "@/shared/components/ExcelDataGrid";
import { StatBar, type StatItem } from "@/shared/components/StatBar";
import type { ExcelColumn } from "@/types/excel";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import toast from "react-hot-toast";

// =============================================================================
// TRIAGE PANEL - L5 Design (Refactored)
// =============================================================================
// Shows items that need attention:
// 1. Skipped items from VIM import (0% complete - in pending_import_items)
// 2. Incomplete ingredients from Quick Add (partial % - in master_ingredients)
//
// Now uses:
// - StatBar for muted gray stat cards
// - ExcelDataGrid for filtering, sorting, pagination
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

// =============================================================================
// COLUMN DEFINITIONS FOR EXCEL DATA GRID
// =============================================================================

const getTriageColumns = (
  onEdit: (item: PendingItem) => void,
  onDelete: (item: PendingItem) => void
): ExcelColumn[] => [
  {
    key: "source",
    name: "Source",
    type: "custom",
    filterType: "select",
    width: 80,
    filterable: true,
    sortable: true,
    align: "center",
    render: (value: string) => (
      <div className="w-full flex justify-center">
        {value === "skipped" ? (
          <div className="icon-badge-amber" title="Skipped - Not created yet">
            <Ghost />
          </div>
        ) : (
          <div className="icon-badge-rose" title="Incomplete - Missing required fields">
            <AlertTriangle />
          </div>
        )}
      </div>
    ),
  },
  {
    key: "ingredient_type",
    name: "Type",
    type: "custom",
    filterType: "select",
    width: 80,
    filterable: true,
    sortable: true,
    align: "center",
    render: (value: string) => (
      <div className="w-full flex justify-center">
        {value === "prep" ? (
          <div className="icon-badge-purple" title="Prep - Made in kitchen">
            <ChefHat />
          </div>
        ) : (
          <div className="icon-badge-primary" title="Purchased - From vendor">
            <ShoppingCart />
          </div>
        )}
      </div>
    ),
  },
  {
    key: "item_code",
    name: "Code",
    type: "custom",
    filterType: "text",
    width: 110,
    filterable: true,
    sortable: true,
    align: "center",
    render: (value: string) => (
      <span className="text-sm text-gray-500 font-mono">{value}</span>
    ),
  },
  {
    key: "product_name",
    name: "Product Name",
    type: "custom",
    filterType: "text",
    width: 280,
    filterable: true,
    sortable: true,
    align: "center",
    render: (value: string, row: PendingItem) => (
      <div className="text-center">
        <span className="text-white font-medium">{value}</span>
        {row.vendor_name && (
          <div className="text-xs text-gray-600">{row.vendor_name}</div>
        )}
      </div>
    ),
  },
  {
    key: "unit_price",
    name: "Price",
    type: "custom",
    filterType: "number",
    width: 90,
    filterable: true,
    sortable: true,
    align: "center",
    render: (value: number | null) => (
      <span className="font-semibold">
        <span className="text-emerald-500">$</span>
        <span className="text-white">{value != null ? value.toFixed(2) : "—"}</span>
      </span>
    ),
  },
  {
    key: "percent_complete",
    name: "Complete",
    type: "custom",
    filterType: "number",
    width: 130,
    filterable: true,
    sortable: true,
    align: "center",
    render: (value: number) => (
      <div className="w-full flex items-center justify-center gap-2">
        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-500/40"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 tabular-nums">
          {value}%
        </span>
      </div>
    ),
  },
  {
    key: "actions",
    name: "",
    type: "custom",
    width: 100,
    sortable: false,
    filterable: false,
    align: "center",
    render: (_: any, row: PendingItem) => (
      <div className="w-full flex justify-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
          className="h-8 w-8 rounded-lg flex items-center justify-center bg-gray-800/50 hover:bg-primary-500/20 text-gray-500 hover:text-primary-400 transition-colors"
          title="Edit / Complete Setup"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <TwoStageButton
          onConfirm={() => onDelete(row)}
          icon={Trash2}
          confirmText="Sure?"
          variant="danger"
        />
      </div>
    ),
  },
];

// =============================================================================
// TRIAGE STATS COMPONENT
// =============================================================================

interface TriageStatsProps {
  pendingItems: PendingItem[];
}

const TriageStats: React.FC<TriageStatsProps> = ({ pendingItems }) => {
  const stats = useMemo((): StatItem[] => {
    const skipped = pendingItems.filter((i) => i.source === "skipped").length;
    const incomplete = pendingItems.filter((i) => i.source === "incomplete").length;
    const purchased = pendingItems.filter((i) => i.ingredient_type === "purchased").length;
    const prep = pendingItems.filter((i) => i.ingredient_type === "prep").length;

    return [
      {
        icon: Package,
        label: "Total Items",
        value: pendingItems.length,
        subtext: pendingItems.length === 0 ? "all clear" : "need attention",
      },
      {
        icon: Ghost,
        label: "Skipped",
        value: skipped,
        subtext: "from import",
      },
      {
        icon: AlertTriangle,
        label: "Incomplete",
        value: incomplete,
        subtext: "missing fields",
      },
      {
        icon: ShoppingCart,
        label: "Purchased",
        value: purchased,
        subtext: "from vendors",
      },
      {
        icon: ChefHat,
        label: "Prep Items",
        value: prep,
        subtext: "made in-house",
      },
    ];
  }, [pendingItems]);

  return <StatBar stats={stats} primaryIndex={0} />;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TriagePanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showDiagnostics } = useDiagnostics();
  const { ingredients, fetchIngredients } = useMasterIngredientsStore();
  const { setNavigationContext } = useIngredientNavigationStore();
  
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [prepWarningItem, setPrepWarningItem] = useState<PendingItem | null>(null);

  // ---------------------------------------------------------------------------
  // FETCH DATA
  // ---------------------------------------------------------------------------
  const fetchPendingData = async () => {
    if (!user?.user_metadata?.organizationId) return;
    
    setIsLoading(true);
    try {
      // 1. Fetch skipped items from pending_import_items
      // vendor_id is TEXT (stores vendor name from operations_settings.vendors)
      // Note: actual columns are vendor_description (not product_name), import_batch_id (not vendor_import_id)
      const { data: skippedItems, error: skippedError } = await supabase
        .from("pending_import_items")
        .select(`
          id,
          item_code,
          vendor_description,
          unit_price,
          unit_of_measure,
          vendor_id,
          import_batch_id,
          created_at
        `)
        .eq("organization_id", user.user_metadata.organizationId)
        .eq("status", "pending");

      if (skippedError) {
        console.error("Could not fetch pending items:", skippedError);
      }

      // 2. Get incomplete ingredients from store
      await fetchIngredients();
      const currentIngredients = useMasterIngredientsStore.getState().ingredients;

      // Transform skipped items (always purchased - they come from VIM)
      // vendor_id column stores TEXT vendor name (e.g., "HIGHLAND")
      const skippedPending: PendingItem[] = (skippedItems || []).map((item: any) => ({
        id: item.id,
        item_code: item.item_code,
        product_name: item.vendor_description, // actual column name
        unit_price: item.unit_price,
        unit_of_measure: item.unit_of_measure,
        vendor_id: item.vendor_id,
        vendor_name: item.vendor_id, // vendor_id IS the vendor name (TEXT)
        source: "skipped" as const,
        ingredient_type: "purchased" as const,
        percent_complete: 0,
        created_at: item.created_at,
      }));

      // Transform incomplete ingredients (exclude archived)
      const incompletePending: PendingItem[] = currentIngredients
        .filter((ing) => !ing.archived)
        .filter((ing) => {
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
            ingredient_type: (() => {
              if ((ing as any).ingredient_type === 'prep') return 'prep' as const;
              if ((ing as any).ingredient_type === 'purchased') return 'purchased' as const;
              if ((ing as any).source_recipe_id) return 'prep' as const;
              return 'purchased' as const;
            })(),
            percent_complete: percent,
            created_at: ing.created_at || "",
            ingredient_id: ing.id,
          };
        });

      // Sort by percent complete (0% first), then by date
      const allItems = [...skippedPending, ...incompletePending].sort((a, b) => {
        if (a.percent_complete !== b.percent_complete) {
          return a.percent_complete - b.percent_complete;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setPendingItems(allItems);
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
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleDelete = async (item: PendingItem) => {
    try {
      if (item.source === "skipped") {
        const { error } = await supabase
          .from("pending_import_items")
          .delete()
          .eq("id", item.id);
        
        if (error) throw error;
      } else {
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

  const handleEdit = (item: PendingItem) => {
    // If it's a prep item, show warning instead of navigating
    if (item.ingredient_type === "prep") {
      setPrepWarningItem(item);
      return;
    }

    const incompleteIds = pendingItems
      .filter(i => i.source === "incomplete" && i.ingredient_id)
      .map(i => i.ingredient_id!);
    
    setNavigationContext(
      incompleteIds,
      `Triage (${pendingItems.length} items)`,
      "/admin/data/invoices?tab=triage"
    );
    
    if (item.source === "incomplete" && item.ingredient_id) {
      navigate(`/admin/data/ingredients/${item.ingredient_id}`);
    } else if (item.source === "skipped") {
      navigate(`/admin/data/ingredients/new?item_code=${item.item_code}&product=${encodeURIComponent(item.product_name)}&price=${item.unit_price || ""}&pending_id=${item.id}`);
    }
  };

  const handleGoToRecipeManager = () => {
    setPrepWarningItem(null);
    navigate("/admin/recipes");
  };

  // ---------------------------------------------------------------------------
  // COLUMN DEFINITIONS (with handlers)
  // ---------------------------------------------------------------------------
  const columns = useMemo(
    () => getTriageColumns(handleEdit, handleDelete),
    [pendingItems]
  );

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Omega Diagnostics */}
      {showDiagnostics && (
        <div className="text-xs text-gray-600 font-mono">
          src/features/admin/components/sections/VendorInvoice/components/TriagePanel.tsx
        </div>
      )}

      {/* Stats Bar - L5 Muted Gray Palette */}
      <TriageStats pendingItems={pendingItems} />

      {/* Expandable Legend */}
      <div className={`expandable-info-section ${isLegendExpanded ? "expanded" : ""}`}>
        <button
          onClick={() => setIsLegendExpanded(!isLegendExpanded)}
          className="expandable-info-header w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-400">
              Icon Legend
            </span>
          </div>
          <ChevronUp className="w-4 h-4 text-gray-500" />
        </button>
        <div className="expandable-info-content">
          <div className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Source</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="icon-badge-amber">
                      <Ghost />
                    </div>
                    <span className="text-sm text-gray-400">Skipped — Parked during import</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="icon-badge-rose">
                      <AlertTriangle />
                    </div>
                    <span className="text-sm text-gray-400">Incomplete — Missing required fields</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Type</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="icon-badge-primary">
                      <ShoppingCart />
                    </div>
                    <span className="text-sm text-gray-400">Purchased — From vendor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="icon-badge-purple">
                      <ChefHat />
                    </div>
                    <span className="text-sm text-gray-400">Prep — Made in kitchen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Grid or Empty State */}
      {pendingItems.length === 0 && !isLoading ? (
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
        <ExcelDataGrid
          columns={columns}
          data={pendingItems}
          type="triage"
          onRefresh={fetchPendingData}
          isLoading={isLoading}
        />
      )}

      {/* Help Text */}
      {pendingItems.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          Click the edit button to complete setup. Use column filters to narrow down items.
        </div>
      )}

      {/* Prep Item Warning Action Bar - L5 Standard */}
      {prepWarningItem && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              {/* Status indicator */}
              <div className="flex items-center gap-2 text-amber-400">
                <ChefHat className="w-4 h-4" />
                <span className="text-sm font-medium">Prep Item</span>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-700" />

              {/* Message */}
              <span className="text-sm text-gray-300">
                <span className="text-white font-medium">{prepWarningItem.product_name}</span>
                <span className="text-gray-500 mx-2">—</span>
                Edit in Recipe Manager
              </span>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-700" />

              {/* Actions */}
              <button
                onClick={() => setPrepWarningItem(null)}
                className="btn-ghost text-sm py-1.5"
              >
                Dismiss
              </button>
              <button
                onClick={handleGoToRecipeManager}
                className="btn-ghost text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 text-sm py-1.5"
              >
                <BookOpen className="w-4 h-4" />
                Recipes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriagePanel;
