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
  FileEdit,
  CheckCircle,
  Info,
} from "lucide-react";
import { useRecipeStore } from "../../stores/recipeStore";
import { useRecipeNavigationStore } from "@/stores/recipeNavigationStore";
import { useAuth } from "@/hooks/useAuth";
import { useOperationsStore } from "@/stores/operationsStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// Shared L5 components
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

// Local components
import { PageHeader } from "./PageHeader";
import { RecipeTabs } from "./RecipeTabs";
import { useTabChanges } from "./useTabChanges";

// Recipe Editor Sections
import BasicInformation from "../RecipeEditor/BasicInformation";
import { Production } from "../RecipeEditor/Production";
import { LabelRequirements } from "../RecipeEditor/LabelRequirements";
import { InstructionEditor } from "../RecipeEditor/InstructionEditor";
import { StationEquipment } from "../RecipeEditor/StationEquipment";
import { QualityStandards } from "../RecipeEditor/QualityStandards";
import { AllergenControl } from "../RecipeEditor/AllergenControl";
import { MediaManager } from "../RecipeEditor/MediaManager";
import { TrainingModule } from "../RecipeEditor/TrainingModule";
import { VersionHistory } from "../RecipeEditor/VersionHistory";

import type { Recipe } from "../../types/recipe";

/**
 * =============================================================================
 * RECIPE DETAIL PAGE - L5 Professional
 * =============================================================================
 * URL-routed recipe editor replacing RecipeEditorModal.
 * Benefits: Bookmarkable URLs, email links for team review, auth refresh
 * doesn't lose work, natural back button behavior.
 * =============================================================================
 */

// Create empty recipe for new entries
const createNewRecipe = (organizationId: string): Omit<Recipe, "id"> => ({
  organization_id: organizationId,
  type: "prepared",
  status: "draft",
  name: "",
  description: "",
  station: "",
  prep_time: 0,
  cook_time: 0,
  rest_time: 0,
  total_time: 0,
  recipe_unit_ratio: "1",
  unit_type: "",
  yield_amount: 0,
  yield_unit: "",
  cost_per_unit: 0,
  labor_cost_per_hour: 0,
  total_cost: 0,
  target_cost_percent: 0,
  ingredients: [],
  steps: [],
  equipment: [],
  quality_standards: {},
  allergens: {
    contains: [],
    mayContain: [],
    crossContactRisk: [],
  },
  media: [],
  training: {},
  versions: [],
  version: "1.0",
});

export const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { organization, user, isDev } = useAuth();
  const { showDiagnostics } = useDiagnostics();
  const { settings, fetchSettings } = useOperationsStore();
  const { createRecipe, updateRecipe, deleteRecipe } = useRecipeStore();

  // Navigation store for prev/next and contextual back
  const {
    recipeIds,
    setCurrentIndex,
    getPrevId,
    getNextId,
    getPosition,
    returnTo,
  } = useRecipeNavigationStore();

  const isNew = !id || id === "new";
  const position = getPosition();
  const prevId = getPrevId();
  const nextId = getNextId();

  // Organization ID from URL or auth
  const urlOrgId = searchParams.get("org_id");
  const organizationId = urlOrgId || organization?.id || "";

  // Initial type/major_group from URL params (for new recipes from specific tab)
  const initialType = searchParams.get("type") || "prepared";
  const initialMajorGroup = searchParams.get("major_group") || "";

  // Derive back button label from returnTo path
  const backLabel = "Back to Recipes";

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState<Recipe | Omit<Recipe, "id"> | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("recipe");

  // Tab-level change tracking
  const { changedTabs, getChangeSummary } = useTabChanges(
    formData,
    originalData
  );

  // ---------------------------------------------------------------------------
  // FETCH SETTINGS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchSettings().catch((error) => {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    });
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
      navigate(`/admin/recipes/${prevId}`);
    }
  };

  const navigateToNext = () => {
    if (nextId && !hasUnsavedChanges()) {
      navigate(`/admin/recipes/${nextId}`);
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
        if (formData?.name && !isSaving) handleSave();
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
        toast.error("You do not have permission to manage recipes");
        navigate("/admin/recipes");
      } else {
        setHasPermission(true);
      }
    };
    checkPermissions();
  }, [organizationId, user?.id, isDev, navigate, isNew]);

  // ---------------------------------------------------------------------------
  // LOAD RECIPE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadRecipe = async () => {
      if (isNew) {
        if (organizationId) {
          const newRecipe = createNewRecipe(organizationId);
          // Apply initial type/major_group from URL params
          newRecipe.type = initialType as Recipe["type"];
          if (initialMajorGroup) {
            newRecipe.major_group = initialMajorGroup;
          }
          setFormData(newRecipe);
          setOriginalData(newRecipe as Recipe);
        }
        return;
      }
      if (!id || !organizationId) return;

      // Update navigation index
      const index = recipeIds.indexOf(id);
      if (index >= 0) setCurrentIndex(index);

      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", id)
          .eq("organization_id", organizationId)
          .single();
        if (fetchError) throw fetchError;
        if (!data) {
          setError("Recipe not found");
          return;
        }
        setFormData(data);
        setOriginalData(data);
      } catch (err) {
        console.error("Error loading recipe:", err);
        setError("Failed to load recipe");
      } finally {
        setIsLoading(false);
      }
    };
    loadRecipe();
  }, [id, isNew, organizationId, recipeIds, setCurrentIndex, initialType, initialMajorGroup]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleChange = (updates: Partial<Recipe>) => {
    setFormData((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleSave = async () => {
    if (!formData || !organizationId) return;
    setIsSaving(true);
    try {
      if (isNew) {
        await createRecipe(formData as Recipe);
        toast.success("Recipe created successfully");
      } else {
        if (!("id" in formData)) {
          toast.error("Cannot update recipe: No ID found");
          return;
        }
        await updateRecipe(formData.id, formData);
        toast.success("Recipe saved successfully");
      }
      setOriginalData(formData as Recipe);
      navigate(returnTo);
    } catch (err) {
      console.error("Error saving recipe:", err);
      toast.error("Failed to save recipe");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!formData || isNew || !("id" in formData)) return;
    setIsDeleting(true);
    try {
      await deleteRecipe(formData.id);
      toast.success("Recipe deleted");
      navigate(returnTo);
    } catch (err) {
      console.error("Error deleting recipe:", err);
      toast.error("Failed to delete recipe");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleArchive = () => {
    if (!formData) return;
    const newStatus = formData.status === "archived" ? "draft" : "archived";
    handleChange({ status: newStatus });
  };

  // ---------------------------------------------------------------------------
  // LOADING / ERROR STATES
  // ---------------------------------------------------------------------------
  if (isLoading || (!isNew && hasPermission === null) || (isNew && !organizationId)) {
    return (
      <div className="admin-container pb-24">
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
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-800 rounded-lg w-28" />
            ))}
          </div>
          <div className="bg-[#1a1f2b] rounded-lg p-6 h-96" />
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
          Back to Recipes
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
    <div className="admin-container pb-24">
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono mb-2">
          src/features/recipes/components/RecipeDetailPage/index.tsx
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

          {position && recipeIds.length > 1 && (
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
        title="Delete Recipe"
        message={`Permanently delete "${formData.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Page Header */}
      <PageHeader
        recipe={formData as Recipe}
        isNew={isNew}
        hasUnsavedChanges={hasUnsavedChanges()}
        onBack={handleBack}
        onChange={handleChange}
        onNavigateToTab={setActiveTab}
        backLabel={backLabel}
      />

      {/* Tab Navigation */}
      <RecipeTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        changedTabs={changedTabs}
      />

      {/* Tab Content */}
      <div className="mt-6 bg-[#1a1f2b] rounded-2xl p-6">
        {activeTab === "recipe" && (
          <BasicInformation
            recipe={formData as Recipe}
            onChange={handleChange}
            settings={settings}
          />
        )}
        {activeTab === "instructions" && (
          <InstructionEditor recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "production" && (
          <Production recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "labels" && (
          <LabelRequirements recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "stations" && (
          <StationEquipment recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "quality" && (
          <QualityStandards recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "allergens" && (
          <AllergenControl recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "media" && (
          <MediaManager recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "training" && (
          <TrainingModule recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "versions" && (
          <VersionHistory recipe={formData as Recipe} onChange={handleChange} />
        )}
      </div>

      {/* =====================================================================
       * FLOATING ACTION BAR
       * ===================================================================== */}
      {(changedTabs.length > 0 || isNew) && (
        <div
          className={`floating-action-bar ${
            changedTabs.length > 0 ? "warning" : ""
          }`}
        >
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <div className="flex items-center gap-3">
                {changedTabs.length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Unsaved:</span>
                    <span className="text-amber-300">{getChangeSummary()}</span>
                  </span>
                )}
                {!isNew && (
                  <>
                    <div className="w-px h-6 bg-gray-700" />
                    <button
                      type="button"
                      onClick={handleToggleArchive}
                      className={`btn-ghost text-sm py-1.5 px-3 ${
                        formData.status === "archived" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {formData.status === "archived" ? (
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
                  disabled={isSaving || !formData.name}
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
                      {isNew ? "Create Recipe" : "Save Changes"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetailPage;
