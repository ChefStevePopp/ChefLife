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
    width: 90,
    filterable: true,
    sortable: true,
    align: "center",
    render: (value: string) => (
      <div className="flex justify-center">
        {value === "skipped" ? (
          <div 
            className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center"
            title="Skipped - Not created yet"
          >
            <Ghost className="w-4 h-4 text-amber-400" />
          </div>
        ) : (
          <div 
            className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center"
            title="Incomplete - Missing required fields"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
        )}
      </div>
    ),
  },
  {
    key: "ingredient_type",
    name: "Type",
    type: "custom",
    width: 90,
    filterable: true,
    sortable: true,
    align: "center",
    render: (value: string) => (
      <div className="flex justify-center">
        {value === "prep" ? (
          <div 
            className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center"
            title="Prep - Made in kitchen"
          >
            <ChefHat className="w-4 h-4 text-purple-400" />
          </div>
        ) : (
          <div 
            className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center"
            title="Purchased - From vendor"
          >
            <ShoppingCart className="w-4 h-4 text-primary-400" />
          </div>
        )}
      </div>
    ),
  },
  {
    key: "item_code",
    name: "Item Code",
    type: "text",
    width: 140,
    filterable: true,
    sortable: true,
  },
  {
    key: "product_name",
    name: "Product Name",
    type: "custom",
    width: 300,
    filterable: true,
    sortable: true,
    render: (value: string, row: PendingItem) => (
      <div>
        <span className="text-white">{value}</span>
        {row.vendor_name && (
          <div className="text-xs text-gray-500">{row.vendor_name}</div>
        )}
      </div>
    ),
  },
  {
    key: "unit_price",
    name: "Price",
    type: "custom",
    width: 100,
    sortable: true,
    align: "right",
    render: (value: number | null) => (
      <span className="text-gray-300">
        {value != null ? `$${value.toFixed(2)}` : "-"}
      </span>
    ),
  },
  {
    key: "percent_complete",
    name: "% Complete",
    type: "custom",
    width: 140,
    sortable: true,
    align: "center",
    render: (value: number) => (
      <div className="flex items-center justify-center gap-2">
        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              value === 0
                ? "bg-gray-600"
                : value < 50
                ? "bg-rose-500"
                : value < 100
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={`text-xs font-medium w-8 ${
          value === 0
            ? "text-gray-500"
            : value < 50
            ? "text-rose-400"
            : value < 100
            ? "text-amber-400"
            : "text-emerald-400"
        }`}>
          {value}%
        </span>
      </div>
    ),
  },
  {
    key: "actions",
    name: "Actions",
    type: "custom",
    width: 100,
    sortable: false,
    filterable: false,
    align: "center",
    render: (_: any, row: PendingItem) => (
      <div className="flex justify-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-800/50 hover:bg-primary-500/20 text-gray-400 hover:text-primary-400 transition-colors"
          title="Edit / Complete Setup"
        >
          <Pencil className="w-3.5 h-3.5" />
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
      const currentIngredients = useMasterIngredientsStore.getState().ingredients;

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
    </div>
  );
};

export default TriagePanel;
