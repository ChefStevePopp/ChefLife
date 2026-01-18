import React, { useState, useMemo } from "react";
import {
  Trash2,
  Edit,
  Save,
  Umbrella,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Link2Off,
  TrendingUp,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { UmbrellaIngredientWithDetails } from "@/types/umbrella-ingredient";
import { useUmbrellaIngredientsStore } from "@/stores/umbrellaIngredientsStore";
import { useMasterIngredientsStore } from "@/stores/masterIngredientsStore";
import { useVendorPriceChangesStore } from "@/stores/vendorPriceChangesStore";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface UmbrellaItemCardProps {
  umbrella: UmbrellaIngredientWithDetails;
  onEdit: (umbrella: UmbrellaIngredientWithDetails) => void;
  onDelete: (id: string) => void;
  onLinkIngredient: (umbrellaId: string) => void;
  onRefresh: () => void;
}

export const UmbrellaItemCard: React.FC<UmbrellaItemCardProps> = ({
  umbrella,
  onEdit,
  onDelete,
  onLinkIngredient,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string | null>(
    umbrella.primary_master_ingredient_id || null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [priceHistoryModal, setPriceHistoryModal] = useState<{
    ingredientId: string;
    productName: string;
  } | null>(null);

  const { updateUmbrellaIngredient, removeMasterIngredientFromUmbrella } =
    useUmbrellaIngredientsStore();

  // Build category breadcrumb
  const categoryBreadcrumb = [
    umbrella.major_group_name,
    umbrella.category_name,
    umbrella.sub_category_name,
  ]
    .filter(Boolean)
    .join(" › ");

  // Filter out umbrella-type items from linked ingredients
  const vendorIngredients = useMemo(() => {
    return (umbrella.master_ingredient_details || []).filter((ing) => {
      const isUmbrella = 
        ing.vendor?.toUpperCase() === "UMBRELLA" || 
        ing.item_code?.startsWith("UMB-");
      return !isUmbrella;
    });
  }, [umbrella.master_ingredient_details]);

  const linkedCount = vendorIngredients.length;

  const primaryIngredient = vendorIngredients.find(
    (ing) => ing.id === umbrella.primary_master_ingredient_id
  );

  // Handle setting primary ingredient
  const handleSetPrimary = async () => {
    if (!selectedPrimaryId) {
      toast.error("Please select a primary ingredient first");
      return;
    }

    const selectedItem = vendorIngredients.find(i => i.id === selectedPrimaryId);
    if (!selectedItem) {
      toast.error("Invalid selection");
      return;
    }

    setIsSaving(true);

    try {
      const { data: masterIngredientData, error } = await supabase
        .from("master_ingredients_with_categories")
        .select("*")
        .eq("id", selectedPrimaryId)
        .single();

      if (error || !masterIngredientData) {
        throw new Error("Failed to fetch primary ingredient data");
      }

      await updateUmbrellaIngredient(umbrella.id, {
        name: umbrella.name,
        description: umbrella.description,
        primary_master_ingredient_id: selectedPrimaryId,
        major_group: masterIngredientData.major_group || "",
        category: masterIngredientData.category || "",
        sub_category: masterIngredientData.sub_category || "",
        storage_area: masterIngredientData.storage_area || "",
        recipe_unit_type: masterIngredientData.recipe_unit_type || "",
        cost_per_recipe_unit: masterIngredientData.cost_per_recipe_unit || 0,
        allergen_peanut: Boolean(masterIngredientData.allergen_peanut),
        allergen_crustacean: Boolean(masterIngredientData.allergen_crustacean),
        allergen_treenut: Boolean(masterIngredientData.allergen_treenut),
        allergen_shellfish: Boolean(masterIngredientData.allergen_shellfish),
        allergen_sesame: Boolean(masterIngredientData.allergen_sesame),
        allergen_soy: Boolean(masterIngredientData.allergen_soy),
        allergen_fish: Boolean(masterIngredientData.allergen_fish),
        allergen_wheat: Boolean(masterIngredientData.allergen_wheat),
        allergen_milk: Boolean(masterIngredientData.allergen_milk),
        allergen_sulphite: Boolean(masterIngredientData.allergen_sulphite),
        allergen_egg: Boolean(masterIngredientData.allergen_egg),
        allergen_gluten: Boolean(masterIngredientData.allergen_gluten),
        allergen_mustard: Boolean(masterIngredientData.allergen_mustard),
        allergen_celery: Boolean(masterIngredientData.allergen_celery),
        allergen_garlic: Boolean(masterIngredientData.allergen_garlic),
        allergen_onion: Boolean(masterIngredientData.allergen_onion),
        allergen_nitrite: Boolean(masterIngredientData.allergen_nitrite),
        allergen_mushroom: Boolean(masterIngredientData.allergen_mushroom),
        allergen_hot_pepper: Boolean(masterIngredientData.allergen_hot_pepper),
        allergen_citrus: Boolean(masterIngredientData.allergen_citrus),
        allergen_pork: Boolean(masterIngredientData.allergen_pork),
        allergen_custom1_name: masterIngredientData.allergen_custom1_name || null,
        allergen_custom1_active: Boolean(masterIngredientData.allergen_custom1_active),
        allergen_custom2_name: masterIngredientData.allergen_custom2_name || null,
        allergen_custom2_active: Boolean(masterIngredientData.allergen_custom2_active),
        allergen_custom3_name: masterIngredientData.allergen_custom3_name || null,
        allergen_custom3_active: Boolean(masterIngredientData.allergen_custom3_active),
        allergen_notes: masterIngredientData.allergen_notes || null,
      });

      await useMasterIngredientsStore
        .getState()
        .updatePrimaryMasterIngredientFromUmbrella(umbrella.id);

      toast.success("Primary ingredient saved and synced");
      setTimeout(() => onRefresh(), 500);
    } catch (err) {
      console.error("Error setting primary ingredient:", err);
      toast.error("Failed to save primary ingredient");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className={`expandable-info-section ${isExpanded ? "expanded" : ""}`}>
        {/* Header - Always Visible */}
        <button
          className="expandable-info-header w-full"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Left side: Icon, Name, Category, Primary */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <Umbrella className="w-4 h-4 text-rose-400/80" />
            </div>
            <div className="min-w-0 flex-1">
              {/* Line 1: Name + count */}
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white truncate">
                  {umbrella.name}
                </h4>
                <span className="text-xs bg-gray-700/50 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                  {linkedCount}
                </span>
              </div>
              {/* Line 2: Category breadcrumb */}
              {categoryBreadcrumb && (
                <p className="text-xs text-gray-500 truncate">{categoryBreadcrumb}</p>
              )}
              {/* Line 3: Primary ingredient info */}
              {primaryIngredient && (
                <div className="flex items-center gap-2 mt-1">
                  {/* Mini icon badge for check */}
                  <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-gray-300 truncate">
                    {primaryIngredient.product}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({primaryIngredient.vendor})
                  </span>
                  <span className="text-xs font-medium text-emerald-400">
                    ${primaryIngredient.cost_per_recipe_unit.toFixed(2)}/{primaryIngredient.recipe_unit_type || "EA"}
                  </span>
                </div>
              )}
              {/* Line 3 alt: No primary set - AMBER WARNING */}
              {!primaryIngredient && linkedCount > 0 && (
                <p className="text-xs text-amber-400/80 mt-1">No primary set</p>
              )}
            </div>
          </div>

          {/* Right side: Link pill + Action buttons + Chevron */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Link New pill */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLinkIngredient(umbrella.id);
              }}
              className="text-xs bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Link New
            </button>
            
            {/* Edit button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(umbrella);
              }}
              className="w-8 h-8 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all"
              title="Edit umbrella"
            >
              <Edit className="w-4 h-4" />
            </button>
            
            {/* Delete button - 2-stage */}
            <div onClick={(e) => e.stopPropagation()}>
              <TwoStageButton
                onConfirm={() => onDelete(umbrella.id)}
                icon={Trash2}
                confirmText="Delete?"
                title="Delete umbrella"
                variant="danger"
                size="md"
                className="border border-gray-700/50 hover:border-rose-500/30"
              />
            </div>
            
            {/* Expand/Collapse */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-8 h-8 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-600 transition-all"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </button>

        {/* Expandable Content */}
        <div className="expandable-info-content">
          <div className="p-4 pt-2">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Vendor Sources
              </h5>
            </div>

            {/* Linked Vendor Ingredients List */}
            {linkedCount === 0 ? (
              <div className="text-center py-4 bg-gray-800/30 rounded-lg">
                <p className="text-gray-500 text-xs">
                  No vendor ingredients linked. Link ingredients to compare prices and set a primary.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {vendorIngredients.map((ingredient) => {
                    const isSelected = selectedPrimaryId === ingredient.id;
                    const isCurrentPrimary = umbrella.primary_master_ingredient_id === ingredient.id;

                    return (
                      <div
                        key={ingredient.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                      >
                        {/* Left: Selection + Product Info */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Selection circle - emerald when selected */}
                          <button
                            onClick={() => setSelectedPrimaryId(ingredient.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-gray-600 hover:border-gray-500"
                            }`}
                            title="Set as primary"
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm truncate ${
                                isCurrentPrimary ? "text-white font-medium" : "text-gray-300"
                              }`}>
                                {ingredient.product}
                              </span>
                              {isCurrentPrimary && (
                                <span className="text-2xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{ingredient.vendor}</span>
                              <span>•</span>
                              <span>{ingredient.item_code}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Price + Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Price - emerald */}
                          <div className="text-right mr-1">
                            <div className="text-sm font-medium text-emerald-400">
                              ${ingredient.cost_per_recipe_unit.toFixed(2)}
                            </div>
                            <div className="text-2xs text-gray-600">
                              per {ingredient.recipe_unit_type || "EA"}
                            </div>
                          </div>
                          
                          {/* Price history button */}
                          <button
                            onClick={() => setPriceHistoryModal({
                              ingredientId: ingredient.id,
                              productName: ingredient.product,
                            })}
                            className="w-7 h-7 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-gray-600 hover:text-primary-400 hover:border-primary-500/30 hover:bg-primary-500/10 transition-all"
                            title="View price history"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Unlink button - 2-stage */}
                          <TwoStageButton
                            onConfirm={() => removeMasterIngredientFromUmbrella(umbrella.id, ingredient.id)}
                            icon={Link2Off}
                            confirmText="Unlink?"
                            title="Unlink ingredient"
                            variant="danger"
                            size="sm"
                            className="border border-gray-700/50 hover:border-rose-500/30"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save Primary Button - only shows when selection changed */}
                {selectedPrimaryId !== umbrella.primary_master_ingredient_id && (
                  <div className="flex justify-end mt-3 pt-3 border-t border-gray-700/30">
                    <button
                      onClick={handleSetPrimary}
                      disabled={isSaving}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-1.5" />
                          Set as Primary
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Price History Modal */}
      {priceHistoryModal && (
        <PriceHistoryModal
          ingredientId={priceHistoryModal.ingredientId}
          productName={priceHistoryModal.productName}
          onClose={() => setPriceHistoryModal(null)}
        />
      )}
    </>
  );
};

// =============================================================================
// PRICE HISTORY MODAL - With Recharts sparkline
// =============================================================================

interface PriceHistoryModalProps {
  ingredientId: string;
  productName: string;
  onClose: () => void;
}

const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  ingredientId,
  productName,
  onClose,
}) => {
  const { priceChanges, fetchPriceChanges, isLoading } = useVendorPriceChangesStore();
  const [localChanges, setLocalChanges] = useState<any[]>([]);

  // Fetch price history for this specific ingredient
  React.useEffect(() => {
    const fetchHistory = async () => {
      await fetchPriceChanges(90, { ingredientId });
    };
    fetchHistory();
  }, [ingredientId, fetchPriceChanges]);

  // Filter to this ingredient
  React.useEffect(() => {
    const filtered = priceChanges
      .filter((change) => change.ingredient_id === ingredientId && change.change_percent !== 0)
      .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());
    setLocalChanges(filtered);
  }, [priceChanges, ingredientId]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return localChanges.map((change) => ({
      date: new Date(change.invoice_date).toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      }),
      price: change.new_price,
      oldPrice: change.old_price,
      change: change.change_percent,
    }));
  }, [localChanges]);

  // Calculate stats
  const stats = useMemo(() => {
    if (localChanges.length === 0) return null;
    
    const prices = localChanges.map(c => c.new_price);
    const firstPrice = localChanges[0]?.old_price || prices[0];
    const lastPrice = prices[prices.length - 1];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const totalChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
    
    return { firstPrice, lastPrice, minPrice, maxPrice, avgPrice, totalChange };
  }, [localChanges]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Price History</h3>
              <p className="text-xs text-gray-500 truncate max-w-[280px]">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[65vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : localChanges.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No price changes recorded</p>
              <p className="text-xs text-gray-500 mt-1">
                Price history is tracked when invoices are imported
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Row */}
              {stats && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <p className="text-2xs text-gray-500 uppercase">First</p>
                    <p className="text-sm font-medium text-gray-300">${stats.firstPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <p className="text-2xs text-gray-500 uppercase">Current</p>
                    <p className="text-sm font-medium text-white">${stats.lastPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <p className="text-2xs text-gray-500 uppercase">Avg</p>
                    <p className="text-sm font-medium text-gray-300">${stats.avgPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <p className="text-2xs text-gray-500 uppercase">Change</p>
                    <p className={`text-sm font-medium ${
                      stats.totalChange > 0 ? "text-rose-400" : stats.totalChange < 0 ? "text-emerald-400" : "text-gray-400"
                    }`}>
                      {stats.totalChange > 0 ? "+" : ""}{stats.totalChange.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {/* Chart */}
              {chartData.length > 1 && (
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={["dataMin - 0.1", "dataMax + 0.1"]}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v.toFixed(2)}`}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                        labelStyle={{ color: "#9ca3af" }}
                      />
                      {stats && (
                        <ReferenceLine 
                          y={stats.avgPrice} 
                          stroke="#6b7280" 
                          strokeDasharray="3 3"
                          strokeWidth={1}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
                        activeDot={{ fill: "#34d399", strokeWidth: 0, r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Change List */}
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Price Changes
                </h4>
                {[...localChanges].reverse().map((change) => (
                  <div
                    key={change.id}
                    className="flex items-center justify-between p-2.5 bg-gray-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-xs text-gray-500">
                        {new Date(change.invoice_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-300">{change.vendor_id}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          ${change.old_price?.toFixed(2) || "—"}
                        </span>
                        <span className="text-gray-600">→</span>
                        <span className="text-sm text-white font-medium">
                          ${change.new_price?.toFixed(2) || "—"}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${
                        change.change_percent > 0 
                          ? "text-rose-400" 
                          : "text-emerald-400"
                      }`}>
                        {change.change_percent > 0 ? "+" : ""}
                        {change.change_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            Last 90 days • {localChanges.length} price change{localChanges.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
};
