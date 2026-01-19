import React, { useState, useMemo } from "react";
import {
  Trash2,
  Edit,
  Umbrella,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Link2Off,
  TrendingUp,
  X,
  Save,
  Scale,
  Target,
  Calculator,
} from "lucide-react";
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  ComposedChart,
} from "recharts";
import { UmbrellaIngredientWithDetails, UmbrellaPriceMode } from "@/types/umbrella-ingredient";
import { useUmbrellaIngredientsStore } from "@/stores/umbrellaIngredientsStore";
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
  
  // Aggregate history modal for umbrella-wide price analysis
  const [showAggregateHistory, setShowAggregateHistory] = useState(false);
  
  // Price mode state - synced with database
  const [priceMode, setPriceMode] = useState<UmbrellaPriceMode>(
    umbrella.price_mode || 'primary'
  );
  const [pendingPriceMode, setPendingPriceMode] = useState<UmbrellaPriceMode | null>(null);
  const [isSavingPriceMode, setIsSavingPriceMode] = useState(false);

  // Sync price mode when umbrella data changes (e.g., after refresh)
  React.useEffect(() => {
    setPriceMode(umbrella.price_mode || 'primary');
    setPendingPriceMode(null); // Clear pending on external update
  }, [umbrella.price_mode]);

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

  // =============================================================================
  // PRICE MODE - Uses database computed_cost (calculated by Supabase triggers)
  // =============================================================================
  
  // The active price comes from the database - already computed based on price_mode
  const activePrice = umbrella.computed_cost ?? primaryIngredient?.cost_per_recipe_unit ?? 0;
  
  // Check if we have invoice data for weighted mode
  const hasInvoiceData = umbrella.cost_computed_at != null;
  
  // Price mode label for display
  const priceModeLabel = useMemo(() => {
    const mode = pendingPriceMode || priceMode;
    switch (mode) {
      case 'weighted': return hasInvoiceData ? `weighted ${umbrella.price_lookback_days || 180}d` : 'avg (no data)';
      case 'average': return `avg of ${vendorIngredients.length}`;
      case 'primary': return 'primary';
      default: return '';
    }
  }, [priceMode, pendingPriceMode, hasInvoiceData, umbrella.price_lookback_days, vendorIngredients.length]);

  // The display mode (pending takes precedence for UI)
  const displayPriceMode = pendingPriceMode || priceMode;
  const hasPendingPriceModeChange = pendingPriceMode !== null && pendingPriceMode !== priceMode;

  // Handle price mode selection - just sets pending, doesn't save
  const handlePriceModeSelect = (newMode: UmbrellaPriceMode) => {
    if (newMode === priceMode) {
      // Clicking current mode clears pending
      setPendingPriceMode(null);
    } else {
      setPendingPriceMode(newMode);
    }
  };

  // Save pending price mode to database
  const handleSavePriceMode = async () => {
    if (!pendingPriceMode || pendingPriceMode === priceMode) return;
    
    setIsSavingPriceMode(true);
    
    try {
      await updateUmbrellaIngredient(umbrella.id, { price_mode: pendingPriceMode });
      setPriceMode(pendingPriceMode);
      setPendingPriceMode(null);
      onRefresh();
      toast.success(`Price mode updated to ${pendingPriceMode}`);
    } catch (error) {
      console.error('Failed to update price mode:', error);
      toast.error('Failed to update price mode');
    } finally {
      setIsSavingPriceMode(false);
    }
  };

  // Cancel pending price mode change
  const handleCancelPriceMode = () => {
    setPendingPriceMode(null);
  };

  // =============================================================================
  // PRIMARY SELECTION - Live preview support
  // =============================================================================
  
  // The currently selected primary (may be pending save)
  const selectedPrimary = vendorIngredients.find(ing => ing.id === selectedPrimaryId);
  
  // Are we previewing a change that hasn't been saved yet?
  const isPendingPrimaryChange = selectedPrimaryId !== umbrella.primary_master_ingredient_id;

  // Handle setting primary ingredient
  // Data flow: Vendor Ingredient → Umbrella → UMB- Master Ingredient (one-way, audit-friendly)
  const handleSetPrimary = async () => {
    if (!selectedPrimaryId) {
      toast.error("Please select a primary ingredient first");
      return;
    }

    if (!selectedPrimary) {
      toast.error("Invalid selection");
      return;
    }

    setIsSaving(true);

    try {
      // Let the store handle all syncing - pass only what's needed
      // The store will: 1) fetch primary data, 2) update umbrella, 3) sync to UMB- item
      await updateUmbrellaIngredient(umbrella.id, {
        name: umbrella.name,
        description: umbrella.description,
        primary_master_ingredient_id: selectedPrimaryId,
      });

      toast.success("Primary ingredient saved and synced");
      onRefresh();
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
        {/* Header - More breathing room */}
        <button
          className="expandable-info-header w-full py-4 px-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Left side: Icon, Name, Category, Primary */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <Umbrella className="w-5 h-5 text-rose-400/80" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              {/* Line 1: Name + count - BIGGER */}
              <div className="flex items-center gap-3">
                <h4 className="text-base font-semibold text-white truncate">
                  {umbrella.name}
                </h4>
                <span className="text-xs bg-gray-700/60 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
                  {linkedCount}
                </span>
              </div>
              {/* Line 2: Category breadcrumb - smaller, muted */}
              {categoryBreadcrumb && (
                <p className="text-xs text-gray-500 truncate">{categoryBreadcrumb}</p>
              )}
              {/* Line 3: Price display - simple, no mode toggle here */}
              {linkedCount > 0 && (
                <div className="flex items-center gap-2 pt-0.5">
                  {/* Active price */}
                  <span className="text-sm font-medium text-teal-400/70">
                    ${activePrice.toFixed(2)}/{primaryIngredient?.recipe_unit_type || "EA"}
                  </span>
                  
                  {/* Mode label - hint that there's more */}
                  <span className="text-xs text-gray-600">
                    ({priceModeLabel})
                  </span>
                </div>
              )}
              {/* No linked ingredients warning */}
              {linkedCount === 0 && (
                <p className="text-xs text-gray-600 pt-0.5">No ingredients linked</p>
              )}
            </div>
          </div>

          {/* Right side: Link pill + Action buttons + Chevron */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Link New pill */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLinkIngredient(umbrella.id);
              }}
              className="text-xs bg-primary-500/15 text-primary-400/90 hover:bg-primary-500/25 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
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
          <div className="px-5 pb-5 pt-2">
            {/* Section Header */}
            <div className="mb-3">
              <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Vendor Sources
              </h5>
            </div>

            {/* Linked Vendor Ingredients List */}
            {linkedCount === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-gray-500 text-sm">
                  No vendor ingredients linked yet.
                </p>
              </div>
            ) : (
              <>
                {/* Placemat for vendor list */}
                <div className="card p-4 space-y-2">
                  {vendorIngredients.map((ingredient) => {
                    const isSelected = selectedPrimaryId === ingredient.id;
                    const isCurrentPrimary = umbrella.primary_master_ingredient_id === ingredient.id;

                    return (
                      <div
                        key={ingredient.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/30 transition-colors"
                      >
                        {/* Left: Selection + Product Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Selection circle - muted emerald when selected */}
                          <button
                            onClick={() => setSelectedPrimaryId(ingredient.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                              isSelected
                                ? "border-teal-400/70 bg-teal-500/80"
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
                                <span className="text-2xs bg-teal-500/10 text-teal-400/70 px-1.5 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span>{ingredient.vendor}</span>
                              <span>•</span>
                              <span className="text-gray-600">{ingredient.item_code}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Price + Action buttons */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Price - muted teal */}
                          <div className="text-right mr-1">
                            <div className="text-sm font-medium text-teal-400/70">
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
                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-700/30">
                    <button
                      onClick={handleSetPrimary}
                      disabled={isSaving}
                      className="btn-primary text-sm px-4 py-2 flex items-center"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Set as Primary
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* ================================================================= */}
                {/* BOTTOM SECTION: Price Calculation + Inherited Properties */}
                {/* ================================================================= */}
                <div className="mt-6 pt-5 border-t border-gray-700/30">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    
                    {/* LEFT COLUMN: Price Calculation (3/5 width) */}
                    <div className="lg:col-span-3">
                      <div className="mb-3">
                        <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                          Price Calculation
                        </h5>
                        <p className="text-xs text-gray-500 mt-1">
                          Independent from Primary — choose how recipe costs are calculated
                        </p>
                      </div>

                      {/* Placemat for price options */}
                      <div className="card p-4 space-y-2">
                        {/* Primary Mode */}
                        <button
                          onClick={() => handlePriceModeSelect('primary')}
                          disabled={isSavingPriceMode}
                          className={`w-full p-3 rounded-lg text-left transition-all ${isSavingPriceMode ? 'opacity-70' : ''} ${
                            displayPriceMode === 'primary'
                              ? 'ring-2 ring-gray-500 bg-gray-700/20'
                              : 'hover:bg-gray-700/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="icon-badge bg-gray-700/50">
                              <Target className={`w-4 h-4 ${displayPriceMode === 'primary' ? 'text-gray-300' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${
                                displayPriceMode === 'primary' ? 'text-white' : 'text-gray-400'
                              }`}>
                                Primary Vendor
                              </span>
                              <p className="text-2xs text-gray-500 mt-0.5">
                                Use price from your designated primary
                              </p>
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-teal-400/70">
                              ${(primaryIngredient?.cost_per_recipe_unit || 0).toFixed(2)}
                            </span>
                            {displayPriceMode === 'primary' && (
                              <Check className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Average Mode */}
                        <button
                          onClick={() => handlePriceModeSelect('average')}
                          disabled={isSavingPriceMode || vendorIngredients.length < 2}
                          className={`w-full p-3 rounded-lg text-left transition-all ${
                            displayPriceMode === 'average'
                              ? 'ring-2 ring-gray-500 bg-gray-700/20'
                              : vendorIngredients.length < 2
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-gray-700/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="icon-badge bg-gray-700/50">
                              <Calculator className={`w-4 h-4 ${displayPriceMode === 'average' ? 'text-gray-300' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${
                                displayPriceMode === 'average' ? 'text-white' : 'text-gray-400'
                              }`}>
                                Average of All
                              </span>
                              <p className="text-2xs text-gray-500 mt-0.5">
                                Simple mean of {vendorIngredients.length} vendor{vendorIngredients.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-teal-400/70">
                              ${vendorIngredients.length >= 1 
                                ? (vendorIngredients.reduce((sum, ing) => sum + (ing.cost_per_recipe_unit || 0), 0) / vendorIngredients.length).toFixed(2)
                                : '0.00'
                              }
                            </span>
                            {displayPriceMode === 'average' && (
                              <Check className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Weighted Mode */}
                        <button
                          onClick={() => handlePriceModeSelect('weighted')}
                          disabled={isSavingPriceMode || vendorIngredients.length < 2}
                          className={`w-full p-3 rounded-lg text-left transition-all ${
                            displayPriceMode === 'weighted'
                              ? 'ring-2 ring-gray-500 bg-gray-700/20'
                              : vendorIngredients.length < 2
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-gray-700/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="icon-badge bg-gray-700/50">
                              <Scale className={`w-4 h-4 ${displayPriceMode === 'weighted' ? 'text-gray-300' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${
                                displayPriceMode === 'weighted' ? 'text-white' : 'text-gray-400'
                              }`}>
                                Weighted by Purchases
                              </span>
                              <p className="text-2xs text-gray-500 mt-0.5">
                                Based on actual quantities over {umbrella.price_lookback_days || 180} days
                              </p>
                              {displayPriceMode === 'weighted' && !hasInvoiceData && (
                                <p className="text-2xs text-amber-500/80 mt-1">
                                  No invoice data — using average
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-teal-400/70">
                              ${(umbrella.computed_cost || 0).toFixed(2)}
                            </span>
                            {displayPriceMode === 'weighted' && (
                              <Check className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* View Aggregate History Button */}
                        <button
                          onClick={() => setShowAggregateHistory(true)}
                          className="w-full p-2 mt-1 rounded-lg hover:bg-gray-700/30 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-xs">View aggregate purchase history</span>
                        </button>

                        {/* Last updated - inside placemat */}
                        {umbrella.cost_computed_at && (
                          <p className="text-2xs text-gray-500 pt-3 text-right border-t border-gray-700/30">
                            Updated {new Date(umbrella.cost_computed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Inherited from Primary (2/5 width) */}
                    <div className="lg:col-span-2">
                      <div className="mb-3">
                        <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                          From Primary
                        </h5>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            {isPendingPrimaryChange && (
                              <span className="text-amber-400 font-medium">Preview: </span>
                            )}
                            Inherited from {selectedPrimary?.product || 'primary vendor'}
                          </p>
                          {selectedPrimary?.item_code && (
                            <span className="text-2xs bg-gray-700/60 text-gray-400 px-2 py-0.5 rounded-full">
                              {selectedPrimary.item_code}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Placemat for inherited properties - shows SELECTED primary's data (live preview) */}
                      <div className={`card p-4 space-y-4 ${isPendingPrimaryChange ? 'ring-1 ring-amber-500/30' : ''}`}>
                        {/* Active Allergens - from selected primary */}
                        <div>
                          <p className="text-2xs text-gray-500 uppercase tracking-wide mb-2">Allergens</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPrimary ? (
                              <>
                                {[
                                  { key: 'allergen_peanut', label: 'Peanut' },
                                  { key: 'allergen_treenut', label: 'Tree Nut' },
                                  { key: 'allergen_milk', label: 'Milk' },
                                  { key: 'allergen_egg', label: 'Egg' },
                                  { key: 'allergen_wheat', label: 'Wheat' },
                                  { key: 'allergen_gluten', label: 'Gluten' },
                                  { key: 'allergen_soy', label: 'Soy' },
                                  { key: 'allergen_fish', label: 'Fish' },
                                  { key: 'allergen_shellfish', label: 'Shellfish' },
                                  { key: 'allergen_crustacean', label: 'Crustacean' },
                                  { key: 'allergen_sesame', label: 'Sesame' },
                                  { key: 'allergen_mustard', label: 'Mustard' },
                                  { key: 'allergen_celery', label: 'Celery' },
                                  { key: 'allergen_sulphite', label: 'Sulphite' },
                                  { key: 'allergen_garlic', label: 'Garlic' },
                                  { key: 'allergen_onion', label: 'Onion' },
                                  { key: 'allergen_nitrite', label: 'Nitrite' },
                                  { key: 'allergen_mushroom', label: 'Mushroom' },
                                  { key: 'allergen_hot_pepper', label: 'Hot Pepper' },
                                  { key: 'allergen_citrus', label: 'Citrus' },
                                  { key: 'allergen_pork', label: 'Pork' },
                                ].filter(a => selectedPrimary[a.key as keyof typeof selectedPrimary]).map(allergen => (
                                  <span 
                                    key={allergen.key}
                                    className="px-2 py-0.5 rounded-full text-2xs font-medium bg-rose-500/20 text-rose-400"
                                  >
                                    {allergen.label}
                                  </span>
                                ))}
                                {/* Show "None" if no allergens */}
                                {![
                                  'allergen_peanut', 'allergen_treenut', 'allergen_milk', 'allergen_egg',
                                  'allergen_wheat', 'allergen_gluten', 'allergen_soy', 'allergen_fish',
                                  'allergen_shellfish', 'allergen_crustacean', 'allergen_sesame', 'allergen_mustard',
                                  'allergen_celery', 'allergen_sulphite', 'allergen_garlic', 'allergen_onion',
                                  'allergen_nitrite', 'allergen_mushroom', 'allergen_hot_pepper', 'allergen_citrus', 'allergen_pork'
                                ].some(key => selectedPrimary[key as keyof typeof selectedPrimary]) && (
                                  <span className="text-2xs text-gray-600 italic">None flagged</span>
                                )}
                              </>
                            ) : (
                              <span className="text-2xs text-gray-600 italic">Select a primary</span>
                            )}
                          </div>
                        </div>

                        {/* Storage & Unit - from selected primary */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-2xs text-gray-500 uppercase tracking-wide mb-1">Storage</p>
                            <p className="text-sm text-gray-300">
                              {selectedPrimary?.storage_area || <span className="text-gray-600 italic">Not set</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-2xs text-gray-500 uppercase tracking-wide mb-1">Recipe Unit</p>
                            <p className="text-sm text-gray-300">
                              {selectedPrimary?.recipe_unit_type || <span className="text-gray-600 italic">Not set</span>}
                            </p>
                          </div>
                        </div>

                        {/* Category - from selected primary */}
                        {selectedPrimary && (selectedPrimary.major_group_name || selectedPrimary.category_name) && (
                          <div>
                            <p className="text-2xs text-gray-500 uppercase tracking-wide mb-1">Category</p>
                            <p className="text-xs text-gray-400">
                              {[selectedPrimary.major_group_name, selectedPrimary.category_name, selectedPrimary.sub_category_name]
                                .filter(Boolean)
                                .join(' › ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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

      {/* Aggregate Purchase History Modal */}
      {showAggregateHistory && (
        <AggregatePurchaseHistoryModal
          umbrellaName={umbrella.name}
          vendorIngredients={vendorIngredients}
          lookbackDays={umbrella.price_lookback_days || 180}
          weightedAvg={umbrella.computed_cost || 0}
          onClose={() => setShowAggregateHistory(false)}
        />
      )}

      {/* Floating Action Bar - Price Mode Change */}
      {hasPendingPriceModeChange && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-gray-300">
                  Price mode: <span className="text-white font-medium">{priceMode}</span>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="text-amber-400 font-medium">{pendingPriceMode}</span>
                </span>
              </div>
              <div className="w-px h-6 bg-gray-700" />
              <button
                onClick={handleCancelPriceMode}
                className="btn-ghost text-sm py-1.5 px-4"
                disabled={isSavingPriceMode}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePriceMode}
                disabled={isSavingPriceMode}
                className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5"
              >
                {isSavingPriceMode ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// =============================================================================
// PRICE HISTORY MODAL - With Recharts
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
                      stats.totalChange > 0 ? "text-rose-400/80" : stats.totalChange < 0 ? "text-teal-400/70" : "text-gray-400"
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
                        stroke="#2dd4bf"
                        strokeWidth={2}
                        dot={{ fill: "#2dd4bf", strokeWidth: 0, r: 3 }}
                        activeDot={{ fill: "#5eead4", strokeWidth: 0, r: 5 }}
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
                          ? "text-rose-400/80" 
                          : "text-teal-400/70"
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

// =============================================================================
// AGGREGATE PURCHASE HISTORY MODAL - Multi-vendor overlay chart
// =============================================================================

interface AggregatePurchaseHistoryModalProps {
  umbrellaName: string;
  vendorIngredients: Array<{
    id: string;
    product: string;
    vendor: string;
    cost_per_recipe_unit: number;
    recipe_unit_type?: string;
  }>;
  lookbackDays: number;
  weightedAvg: number;
  onClose: () => void;
}

// Color palette for vendors (up to 8)
const VENDOR_COLORS = [
  { stroke: "#2dd4bf", fill: "#2dd4bf" }, // teal
  { stroke: "#f59e0b", fill: "#f59e0b" }, // amber
  { stroke: "#a78bfa", fill: "#a78bfa" }, // purple
  { stroke: "#fb7185", fill: "#fb7185" }, // rose
  { stroke: "#38bdf8", fill: "#38bdf8" }, // sky
  { stroke: "#4ade80", fill: "#4ade80" }, // green
  { stroke: "#f472b6", fill: "#f472b6" }, // pink
  { stroke: "#facc15", fill: "#facc15" }, // yellow
];

interface PurchaseDataPoint {
  date: number; // timestamp for sorting
  dateStr: string;
  price: number;
  quantity: number;
  vendor: string;
  product: string;
  ingredientId: string;
}

const AggregatePurchaseHistoryModal: React.FC<AggregatePurchaseHistoryModalProps> = ({
  umbrellaName,
  vendorIngredients,
  lookbackDays,
  weightedAvg,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseData, setPurchaseData] = useState<PurchaseDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch invoice line items for all linked ingredients
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const ingredientIds = vendorIngredients.map(ing => ing.id);
        if (ingredientIds.length === 0) {
          setPurchaseData([]);
          setIsLoading(false);
          return;
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - lookbackDays);

        // Fetch invoice items with joined invoice data
        const { data, error: fetchError } = await supabase
          .from('vendor_invoice_items')
          .select(`
            id,
            master_ingredient_id,
            unit_price,
            quantity_received,
            vendor_invoices!inner (
              invoice_date,
              vendor_id
            )
          `)
          .in('master_ingredient_id', ingredientIds)
          .gte('vendor_invoices.invoice_date', startDate.toISOString().split('T')[0])
          .lte('vendor_invoices.invoice_date', endDate.toISOString().split('T')[0])
          .order('vendor_invoices(invoice_date)', { ascending: true });

        if (fetchError) throw fetchError;

        // Map to our data structure
        const mapped: PurchaseDataPoint[] = (data || []).map((item: any) => {
          const ingredient = vendorIngredients.find(ing => ing.id === item.master_ingredient_id);
          const invoiceDate = new Date(item.vendor_invoices.invoice_date);
          
          return {
            date: invoiceDate.getTime(),
            dateStr: invoiceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: item.unit_price || 0,
            quantity: item.quantity_received || 0,
            vendor: item.vendor_invoices.vendor_id || ingredient?.vendor || 'Unknown',
            product: ingredient?.product || 'Unknown',
            ingredientId: item.master_ingredient_id,
          };
        }).filter((p: PurchaseDataPoint) => p.price > 0);

        setPurchaseData(mapped);
      } catch (err) {
        console.error('Failed to fetch aggregate purchase history:', err);
        setError('Failed to load purchase data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [vendorIngredients, lookbackDays]);

  // Calculate stats
  const stats = useMemo(() => {
    if (purchaseData.length === 0) return null;

    const prices = purchaseData.map(p => p.price);
    const quantities = purchaseData.map(p => p.quantity);
    const totalQuantity = quantities.reduce((a, b) => a + b, 0);
    
    // Simple average
    const simpleAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Weighted average (by quantity)
    const weightedSum = purchaseData.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const calculatedWeightedAvg = totalQuantity > 0 ? weightedSum / totalQuantity : simpleAvg;
    
    // Price spread
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spread = maxPrice - minPrice;

    // Group by vendor for legend
    const vendorStats = vendorIngredients.map((ing, idx) => {
      const vendorPurchases = purchaseData.filter(p => p.ingredientId === ing.id);
      const vendorQuantity = vendorPurchases.reduce((sum, p) => sum + p.quantity, 0);
      return {
        id: ing.id,
        product: ing.product,
        vendor: ing.vendor,
        color: VENDOR_COLORS[idx % VENDOR_COLORS.length],
        purchaseCount: vendorPurchases.length,
        totalQuantity: vendorQuantity,
      };
    }).filter(v => v.purchaseCount > 0);

    return {
      simpleAvg,
      weightedAvg: weightedAvg || calculatedWeightedAvg,
      minPrice,
      maxPrice,
      spread,
      totalPurchases: purchaseData.length,
      totalQuantity,
      vendorStats,
    };
  }, [purchaseData, vendorIngredients, weightedAvg]);

  // Prepare chart data - group by vendor for scatter plot
  const chartDataByVendor = useMemo(() => {
    const byVendor: Record<string, PurchaseDataPoint[]> = {};
    
    vendorIngredients.forEach((ing) => {
      byVendor[ing.id] = purchaseData.filter(p => p.ingredientId === ing.id);
    });
    
    return byVendor;
  }, [purchaseData, vendorIngredients]);

  // Calculate chart domain
  const chartDomain = useMemo(() => {
    if (purchaseData.length === 0) return { min: 0, max: 100 };
    const prices = purchaseData.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.15 || 1;
    return { 
      min: Math.max(0, min - padding), 
      max: max + padding 
    };
  }, [purchaseData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as PurchaseDataPoint;
    
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-xl">
        <p className="text-xs text-gray-400">{data.dateStr}</p>
        <p className="text-sm font-medium text-white">${data.price.toFixed(2)}</p>
        <p className="text-xs text-gray-500">{data.product}</p>
        <p className="text-xs text-gray-500">Qty: {data.quantity}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <Scale className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Aggregate Purchase History</h3>
              <p className="text-xs text-gray-500 truncate max-w-[400px]">{umbrellaName} • {lookbackDays} days</p>
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
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <TrendingUp className="w-10 h-10 text-rose-400/50 mx-auto mb-2" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          ) : purchaseData.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No purchase data found</p>
              <p className="text-xs text-gray-500 mt-1">
                Import invoices to see aggregate pricing
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Row */}
              {stats && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
                    <p className="text-2xs text-gray-500 uppercase">Weighted Avg</p>
                    <p className="text-sm font-semibold text-teal-400 tabular-nums">${stats.weightedAvg.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
                    <p className="text-2xs text-gray-500 uppercase">Simple Avg</p>
                    <p className="text-sm font-medium text-gray-300 tabular-nums">${stats.simpleAvg.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
                    <p className="text-2xs text-gray-500 uppercase">Spread</p>
                    <p className="text-sm font-medium text-amber-400/70 tabular-nums">${stats.spread.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-2.5 text-center">
                    <p className="text-2xs text-gray-500 uppercase">Purchases</p>
                    <p className="text-sm font-medium text-gray-300 tabular-nums">{stats.totalPurchases}</p>
                  </div>
                </div>
              )}

              {/* Chart */}
              <div className="bg-gray-900/50 rounded-lg p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <XAxis 
                      dataKey="date"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(timestamp) => {
                        const d = new Date(timestamp);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      dataKey="price"
                      type="number"
                      domain={[chartDomain.min, chartDomain.max]}
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v.toFixed(0)}`}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Weighted average reference line */}
                    {stats && (
                      <ReferenceLine 
                        y={stats.weightedAvg} 
                        stroke="#2dd4bf" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `${stats.weightedAvg.toFixed(2)} weighted`,
                          fill: '#2dd4bf',
                          fontSize: 10,
                          position: 'right',
                        }}
                      />
                    )}
                    
                    {/* Scatter series for each vendor */}
                    {vendorIngredients.map((ing, idx) => {
                      const color = VENDOR_COLORS[idx % VENDOR_COLORS.length];
                      const data = chartDataByVendor[ing.id] || [];
                      if (data.length === 0) return null;
                      
                      return (
                        <Scatter
                          key={ing.id}
                          name={ing.product}
                          data={data}
                          fill={color.fill}
                          opacity={0.8}
                        >
                          {data.map((entry, i) => {
                            // Scale dot size by quantity (min 6, max 16)
                            const minQty = Math.min(...data.map(d => d.quantity));
                            const maxQty = Math.max(...data.map(d => d.quantity));
                            const range = maxQty - minQty || 1;
                            const normalizedQty = (entry.quantity - minQty) / range;
                            const size = 6 + (normalizedQty * 10);
                            
                            return (
                              <circle
                                key={`dot-${i}`}
                                cx={0}
                                cy={0}
                                r={size / 2}
                                fill={color.fill}
                                fillOpacity={0.7}
                                stroke={color.stroke}
                                strokeWidth={1}
                              />
                            );
                          })}
                        </Scatter>
                      );
                    })}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              {stats && stats.vendorStats.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Vendor Sources
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {stats.vendorStats.map((vendor) => (
                      <div
                        key={vendor.id}
                        className="flex items-center justify-between p-2.5 bg-gray-900/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: vendor.color.fill }}
                          />
                          <div>
                            <p className="text-sm text-gray-300">{vendor.product}</p>
                            <p className="text-xs text-gray-500">{vendor.vendor}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-300 tabular-nums">
                            {vendor.purchaseCount} purchase{vendor.purchaseCount !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-500 tabular-nums">
                            {vendor.totalQuantity.toLocaleString()} units
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="p-3 bg-gray-900/30 rounded-lg border border-gray-700/30">
                <p className="text-xs text-gray-500">
                  <span className="text-teal-400">Weighted average</span> reflects actual purchasing patterns — 
                  bigger orders have more influence than small ones. Dot size indicates purchase quantity.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            {lookbackDays} day lookback • {purchaseData.length} data point{purchaseData.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};
