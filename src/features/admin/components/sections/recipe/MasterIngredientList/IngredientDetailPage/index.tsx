import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Save,
  Trash2,
  Archive,
  ArchiveRestore,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Ghost,
} from "lucide-react";
import { MasterIngredient } from "@/types/master-ingredient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useOperationsStore } from "@/stores/operationsStore";
import { useIngredientNavigationStore } from "@/stores/ingredientNavigationStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";

// Shared L5 components
import {
  GuidedModeProvider,
  GuidedModeToggle,
  ExpandableSection,
  SelectOption,
} from "@/shared/components/L5";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { PriceHistoryModalById } from "@/features/admin/components/sections/VendorInvoice/components/PriceHistory/PriceHistoryModalById";

// Local components & sections
import { PageHeader } from "./PageHeader";
import { AllergenSection } from "../EditIngredientModal/AllergenSection";
import {
  PurchaseInfoSection,
  PurchaseSummaryCard,
  InventoryUnitsSection,
  RecipeUnitsSection,
  CostCalculator,
  ReportingSection,
} from "./sections";

// Hooks & Utils
import { usePriceSource } from "./hooks";
import { normalizeIngredient, createEmptyIngredient } from "./utils";

/**
 * =============================================================================
 * INGREDIENT DETAIL PAGE - L5 Professional
 * =============================================================================
 * The single source of truth view for an ingredient.
 * Modular sections, guided mode support, price audit trail.
 * =============================================================================
 */

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

  // Organization ID - Use URL param (passed from list) or fall back to auth
  const urlOrgId = searchParams.get("org_id");
  const organizationId = urlOrgId || organization?.id;

  // Triage flow - Extract pending import data from URL params
  const triageData = isNew
    ? {
        pendingId: searchParams.get("pending_id"),
        itemCode: searchParams.get("item_code"),
        product: searchParams.get("product"),
        price: searchParams.get("price"),
        vendor: searchParams.get("vendor"),
        uom: searchParams.get("uom"),
      }
    : null;
  const isFromTriage = !!triageData?.pendingId;

  // Derive back button label from returnTo path
  const backLabel = returnTo.includes("triage")
    ? "Back to Triage"
    : "Back to Ingredients";

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
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

  // Price override tracking
  const [priceOverrideState, setPriceOverrideState] = useState<{
    enabled: boolean;
    priceAtOverride: number | null;
  }>({ enabled: false, priceAtOverride: null });

  // Price history modal
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);

  // Price source hook
  const { priceSource, fetchPriceSource } = usePriceSource();

  // ---------------------------------------------------------------------------
  // DERIVED OPTIONS FROM SETTINGS
  // ---------------------------------------------------------------------------
  const purchaseUnitOptions: SelectOption[] = React.useMemo(() => {
    if (!settings?.purchase_unit_measures) return [];
    return settings.purchase_unit_measures.map((unit: string) => ({
      value: unit,
      label: unit,
    }));
  }, [settings]);

  const unitOfMeasureOptions: SelectOption[] = React.useMemo(() => {
    if (!settings) return [];
    const options: SelectOption[] = [];
    const addGroup = (items: string[] | undefined, group: string) => {
      if (items?.length) {
        items.forEach((item) => options.push({ value: item, label: item, group }));
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

  // ---------------------------------------------------------------------------
  // UNSAVED CHANGES DETECTION
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // PERMISSION CHECK
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const checkPermissions = async () => {
      if (isNew) {
        setHasPermission(true);
        return;
      }
      if (isDev) {
        setHasPermission(true);
        return;
      }
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

  // ---------------------------------------------------------------------------
  // LOAD INGREDIENT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadIngredient = async () => {
      if (isNew) {
        if (organizationId) {
          const newIngredient = createEmptyIngredient(organizationId);

          // Pre-fill from Triage data if coming from Triage
          if (isFromTriage && triageData) {
            newIngredient.product = triageData.product || "";
            newIngredient.item_code = triageData.itemCode || null;
            newIngredient.current_price = triageData.price
              ? parseFloat(triageData.price)
              : 0;
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
        if (!data) {
          setError("Ingredient not found");
          return;
        }
        const normalized = normalizeIngredient(data);
        setFormData(normalized);
        setOriginalData(normalized);

        // Fetch price source
        fetchPriceSource(id, data.updated_at);
      } catch (err) {
        console.error("Error loading ingredient:", err);
        setError("Failed to load ingredient");
      } finally {
        setIsLoading(false);
      }
    };
    loadIngredient();
  }, [id, isNew, organizationId, ingredientIds, setCurrentIndex, fetchPriceSource]);

  // ---------------------------------------------------------------------------
  // AUTO-CALCULATE COST
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!formData) return;
    const { current_price, recipe_unit_per_purchase_unit, yield_percent } = formData;
    const baseUnitCost =
      recipe_unit_per_purchase_unit > 0
        ? current_price / recipe_unit_per_purchase_unit
        : 0;
    const adjustedCost =
      yield_percent > 0 ? baseUnitCost / (yield_percent / 100) : baseUnitCost;
    const roundedCost = Math.round(adjustedCost * 10000) / 10000;
    if (roundedCost !== formData.cost_per_recipe_unit) {
      setFormData((prev) =>
        prev ? { ...prev, cost_per_recipe_unit: roundedCost } : null
      );
    }
  }, [
    formData?.current_price,
    formData?.recipe_unit_per_purchase_unit,
    formData?.yield_percent,
  ]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleChange = (updates: Partial<MasterIngredient>) => {
    setFormData((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleSave = async () => {
    if (!formData || !organizationId) return;
    setIsSaving(true);
    try {
      const dataToSave = {
        ...formData,
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      };

      // Check if price was changed via system override
      const priceWasOverridden =
        priceOverrideState.enabled &&
        priceOverrideState.priceAtOverride !== null &&
        formData.current_price !== priceOverrideState.priceAtOverride;

      if (isNew) {
        // Insert and get back the new ID
        const { data: newIngredient, error: insertError } = await supabase
          .from("master_ingredients")
          .insert(dataToSave)
          .select("id")
          .single();
        if (insertError) throw insertError;

        // If created from Triage, create price history and mark pending item resolved
        if (isFromTriage && triageData?.pendingId && newIngredient) {
          // Look up the pending item to get import_batch_id for audit trail
          const { data: pendingItem } = await supabase
            .from("pending_import_items")
            .select("import_batch_id, unit_price")
            .eq("id", triageData.pendingId)
            .single();

          // Create initial price history record - THIS IS THE FIX!
          const priceHistoryRecord = {
            organization_id: organizationId,
            master_ingredient_id: newIngredient.id,
            vendor_id: triageData.vendor || "UNKNOWN",
            price: dataToSave.current_price,
            previous_price: null, // First record, no previous
            effective_date: new Date().toISOString(),
            source_type: "manual_entry", // Triage conversion = manual setup
            vendor_import_id: pendingItem?.import_batch_id || null,
            notes: `Created from Triage. Item code: ${triageData.itemCode || "N/A"}`,
          };

          const { error: priceHistoryError } = await supabase
            .from("vendor_price_history")
            .insert(priceHistoryRecord);

          if (priceHistoryError) {
            console.error("[Triage] Failed to create price history:", {
              error: priceHistoryError,
              record: priceHistoryRecord,
            });
            // Non-fatal: log but don't fail ingredient creation
          } else {
            console.log(
              `[Triage] Price history created for ${triageData.itemCode}: ${dataToSave.current_price}`
            );
          }

          // Remove from pending imports
          const { error: deleteError } = await supabase
            .from("pending_import_items")
            .delete()
            .eq("id", triageData.pendingId);

          if (deleteError) {
            console.error("Error removing pending import item:", deleteError);
          }

          // Fire NEXUS event for Triage conversion tracking
          if (user?.id) {
            nexus({
              organization_id: organizationId,
              user_id: user.id,
              activity_type: "triage_item_converted",
              details: {
                ingredient_id: newIngredient.id,
                ingredient_name: dataToSave.product,
                item_code: triageData.itemCode,
                vendor: triageData.vendor,
                price: dataToSave.current_price,
                pending_import_id: triageData.pendingId,
                import_batch_id: pendingItem?.import_batch_id,
              },
              metadata: {
                source: "triage_to_ingredient",
                original_triage_data: triageData,
              },
            });
          }
        }

        toast.success("Ingredient created successfully");
      } else {
        const { error: updateError } = await supabase
          .from("master_ingredients")
          .update(dataToSave)
          .eq("id", formData.id)
          .eq("organization_id", organizationId);
        if (updateError) throw updateError;
        toast.success("Ingredient saved successfully");

        // Fire CRITICAL NEXUS event if price was changed via system override
        if (priceWasOverridden && user?.id) {
          nexus({
            organization_id: organizationId,
            user_id: user.id,
            activity_type: "system_override_price",
            details: {
              ingredient_id: formData.id,
              ingredient_name: formData.product,
              old_price: priceOverrideState.priceAtOverride,
              new_price: formData.current_price,
              price_change:
                formData.current_price - priceOverrideState.priceAtOverride!,
              price_change_percent:
                priceOverrideState.priceAtOverride! > 0
                  ? (
                      ((formData.current_price -
                        priceOverrideState.priceAtOverride!) /
                        priceOverrideState.priceAtOverride!) *
                      100
                    ).toFixed(2)
                  : "N/A",
            },
            metadata: {
              diffs: {
                table_name: "master_ingredients",
                record_id: formData.id,
                old_values: { current_price: priceOverrideState.priceAtOverride },
                new_values: { current_price: formData.current_price },
                diff: {
                  current_price: {
                    from: priceOverrideState.priceAtOverride,
                    to: formData.current_price,
                  },
                },
              },
            },
            severity: "critical",
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
      const { error: deleteError } = await supabase
        .from("master_ingredients")
        .delete()
        .eq("id", formData.id)
        .eq("organization_id", organizationId);
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

  const handlePriceOverrideChange = (enabled: boolean, priceAtOverride: number | null) => {
    setPriceOverrideState({ enabled, priceAtOverride });
  };

  // ---------------------------------------------------------------------------
  // LOADING / ERROR STATES
  // ---------------------------------------------------------------------------
  if (isLoading || (!isNew && hasPermission === null) || (isNew && !organizationId)) {
    return (
      <div className="max-w-3xl mx-auto pb-24">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-gray-800 rounded-lg" />
            <div className="h-6 w-24 bg-gray-800 rounded-lg" />
          </div>
          <div className="bg-[#1a1f2b] rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-800 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-gray-800 rounded" />
                <div className="h-4 w-32 bg-gray-800/50 rounded" />
              </div>
            </div>
          </div>
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
        <button onClick={handleBack} className="btn-ghost">
          Back to Ingredients
        </button>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <GuidedModeProvider>
      <div className="max-w-3xl mx-auto pb-24">
        {showDiagnostics && (
          <div className="text-xs text-gray-500 font-mono mb-2">
            src/features/admin/.../IngredientDetailPage/index.tsx
          </div>
        )}

        {/* Navigation Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {backLabel}
            </button>

            {position && ingredientIds.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {position.current} of {position.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={navigateToPrev}
                    disabled={!prevId || hasUnsavedChanges()}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      prevId && !hasUnsavedChanges()
                        ? "bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white"
                        : "bg-gray-800/20 text-gray-700 cursor-not-allowed"
                    }`}
                    title={
                      hasUnsavedChanges()
                        ? "Save changes first"
                        : prevId
                        ? "Previous (←)"
                        : "No previous"
                    }
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={navigateToNext}
                    disabled={!nextId || hasUnsavedChanges()}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      nextId && !hasUnsavedChanges()
                        ? "bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white"
                        : "bg-gray-800/20 text-gray-700 cursor-not-allowed"
                    }`}
                    title={
                      hasUnsavedChanges()
                        ? "Save changes first"
                        : nextId
                        ? "Next (→)"
                        : "No next"
                    }
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
          onClose={() => {
            setShowUnsavedDialog(false);
            setPendingNavigation(null);
          }}
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

        {/* Price History Modal */}
        <PriceHistoryModalById
          isOpen={showPriceHistoryModal}
          onClose={() => setShowPriceHistoryModal(false)}
          ingredientId={formData.id}
          ingredientName={formData.product}
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

        {/* Triage Ghost Banner */}
        {isFromTriage && triageData && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Ghost className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-300">
                Creating from Triage
              </div>
              <p className="text-xs text-gray-400">
                This ingredient was skipped during invoice import. Complete the
                setup below and save to add it to your Master Ingredients List.
                {triageData.vendor && (
                  <span className="text-amber-400/70">
                    {" "}
                    • From {triageData.vendor}
                  </span>
                )}
                {triageData.itemCode && (
                  <span className="text-gray-500">
                    {" "}
                    • Code: {triageData.itemCode}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* =====================================================================
         * MAIN CONTENT - Sections with descending z-index for dropdown stacking
         * ===================================================================== */}
        <div className="mt-6 space-y-4">
          {/* SECTION 1: Purchase Information - BUY IT */}
          <div className="relative" style={{ zIndex: 40 }}>
            <PurchaseInfoSection
              formData={formData}
              onChange={handleChange}
              purchaseUnitOptions={purchaseUnitOptions}
              isNew={isNew}
              onPriceOverrideChange={handlePriceOverrideChange}
            />

            {/* Purchase Summary Card - Outside section, always visible */}
            {!isNew && formData.current_price > 0 && (
              <PurchaseSummaryCard
                productName={formData.product}
                commonName={formData.common_name}
                vendorName={formData.vendor}
                currentPrice={formData.current_price}
                unitOfMeasure={formData.unit_of_measure}
                priceSource={priceSource}
                onViewPriceHistory={() => setShowPriceHistoryModal(true)}
              />
            )}
          </div>

          {/* SECTION 2: Inventory Units - STORE IT */}
          <div className="relative" style={{ zIndex: 35 }}>
            <InventoryUnitsSection
              formData={formData}
              onChange={handleChange}
              unitOfMeasureOptions={unitOfMeasureOptions}
            />
          </div>

          {/* SECTION 3: Recipe Units - USE IT */}
          <div className="relative" style={{ zIndex: 30 }}>
            <RecipeUnitsSection
              formData={formData}
              onChange={handleChange}
              recipeUnitOptions={recipeUnitOptions}
            />
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
            <ReportingSection formData={formData} onChange={handleChange} />
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

        {/* =====================================================================
         * FLOATING ACTION BAR
         * ===================================================================== */}
        {(hasUnsavedChanges() || isNew) && (
          <div
            className={`floating-action-bar ${
              hasUnsavedChanges() ? "warning" : ""
            }`}
          >
            <div className="floating-action-bar-inner">
              <div className="floating-action-bar-content">
                <div className="flex items-center gap-3">
                  {hasUnsavedChanges() && (
                    <span className="flex items-center gap-1.5 text-sm text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      Unsaved
                    </span>
                  )}
                  {!isNew && (
                    <>
                      <div className="w-px h-6 bg-gray-700" />
                      <button
                        type="button"
                        onClick={handleToggleArchive}
                        className={`btn-ghost text-sm py-1.5 px-3 ${
                          formData.archived ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {formData.archived ? (
                          <>
                            <ArchiveRestore className="w-4 h-4 mr-1" />
                            Restore
                          </>
                        ) : (
                          <>
                            <Archive className="w-4 h-4 mr-1" />
                            Archive
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteDialog(true)}
                        className="btn-ghost text-sm py-1.5 px-3 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="btn-ghost text-sm py-1.5 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !formData.product}
                    className="btn-primary text-sm py-1.5 px-4"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        {isNew ? "Create" : "Save"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </GuidedModeProvider>
  );
};

export default IngredientDetailPage;
