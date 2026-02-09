import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { nexus } from "@/lib/nexus";
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
import { useAllergenAutoSync } from "../RecipeEditor/useAllergenAutoSync";
import { useRecipeChangeDetection } from "../RecipeEditor/useRecipeChangeDetection";
import { MediaManager } from "../RecipeEditor/MediaManager";
import { TrainingModule } from "../RecipeEditor/TrainingModule";
import { VersionHistory } from "../RecipeEditor/VersionHistory";

import type { Recipe } from "../../types/recipe";
import { getRecipeAllergenBooleans } from '@/features/allergens/utils';

/**
 * =============================================================================
 * RECIPE DETAIL PAGE - L5 Professional
 * =============================================================================
 * URL-routed recipe editor. Full-page with bookmarkable URLs.
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
  allergenInfo: {
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

  // =========================================================================
  // VERSION SNAPSHOT — Comparison baseline for VersionHistory change detection
  // =========================================================================
  // Separate from originalData (DB baseline). This snapshot resets when
  // the operator creates a version bump in VersionHistory, so the Pending
  // Changes panel clears immediately — even before Save persists to DB.
  // After Save, originalData catches up and both are in sync again.
  // =========================================================================
  const [versionSnapshot, setVersionSnapshot] = useState<Recipe | null>(null);

  // Sync snapshot whenever the DB baseline updates (load + post-save)
  useEffect(() => {
    if (originalData) setVersionSnapshot({ ...originalData });
  }, [originalData]);

  // ---------------------------------------------------------------------------
  // HANDLERS (defined early — hooks below depend on handleChange)
  // ---------------------------------------------------------------------------
  const handleChange = (updates: Partial<Recipe>) => {
    setFormData((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // Tab-level change tracking
  const { changedTabs, getChangeSummary } = useTabChanges(
    formData,
    originalData
  );

  // =========================================================================
  // ALLERGEN AUTO-SYNC — Runs regardless of active tab
  // When ingredients change on ANY tab, allergenInfo stays current.
  // Life-safety: no stale declarations, no phantom allergens after removal.
  // =========================================================================
  useAllergenAutoSync({ recipe: formData, onChange: handleChange });

  // =========================================================================
  // CHANGE DETECTION — Drives auto-versioning on save
  // Compares formData vs originalData (DB baseline). When handleSave runs,
  // if no manual version bump happened on the Versions tab, the detection
  // result determines the auto-bump tier and generates change notes.
  // =========================================================================
  const saveDetection = useRecipeChangeDetection(
    (formData || {}) as Recipe,
    originalData
  );

  // =========================================================================
  // ALLERGEN REVIEW GATE — Save interceptor
  // =========================================================================
  // When allergens change (add OR remove), the operator MUST explicitly
  // confirm the declaration via the "Confirm Declaration & Save" button
  // on the Allergens tab. Save is blocked until confirmation.
  //
  // Flow: Save clicked → allergens/ingredients differ from baseline?
  //       → redirect to Allergens tab → operator clicks "Confirm"
  //       → gate satisfied + save fires in one action.
  //
  // Key principle: Visiting the tab isn't reviewing. Looking isn't
  // accepting responsibility. Only explicit confirmation counts.
  //
  // allergenReviewedRef resets whenever allergenInfo changes. ONLY
  // handleConfirmDeclaration sets it to true.
  // =========================================================================
  const allergenReviewedRef = useRef(false);

  // Detect when auto-sync changes allergenInfo — reset the review gate.
  // ANY change to the declaration (add or remove) requires explicit confirmation
  // via the "Confirm Declaration & Save" button. Visiting the tab alone
  // doesn't count — looking isn't accepting responsibility.
  const prevAllergenFingerprintRef = useRef<string>('');
  useEffect(() => {
    if (!formData) return;
    // Read from boolean columns (Phase 3)
    const bools = getRecipeAllergenBooleans(formData);
    const fp = JSON.stringify({
      c: [...bools.contains].sort(),
      m: [...bools.mayContain].sort(),
    });
    if (prevAllergenFingerprintRef.current && fp !== prevAllergenFingerprintRef.current) {
      // Allergens changed — require explicit confirmation again
      allergenReviewedRef.current = false;
    }
    prevAllergenFingerprintRef.current = fp;
  // Re-run when any boolean column changes (formData reference updates on every onChange)
  }, [formData]);

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

  const handleSave = async () => {
    if (!formData || !organizationId) return;

    // -----------------------------------------------------------------------
    // ALLERGEN REVIEW GATE — Intercept save if declaration changed
    // -----------------------------------------------------------------------
    // Two checks, because auto-sync runs in useEffect (asynchronous):
    //
    //   CHECK 1: allergenInfo already differs from baseline
    //            → auto-sync caught up, declaration visibly changed
    //
    //   CHECK 2: ingredient composition changed vs baseline
    //            → auto-sync may NOT have caught up yet (race condition)
    //            → different ingredients = potential allergen change
    //            → removing an allergen-carrying ingredient is just as
    //              dangerous as adding one — must review either way
    //
    // Life-safety: both additions AND removals require review.
    // -----------------------------------------------------------------------
    if (!isNew && originalData && !allergenReviewedRef.current) {
      // Check 1: boolean allergen columns differ from baseline
      const origBools = getRecipeAllergenBooleans(originalData);
      const currBools = getRecipeAllergenBooleans(formData);
      const origContains = JSON.stringify([...origBools.contains].sort());
      const origMayContain = JSON.stringify([...origBools.mayContain].sort());
      const currContains = JSON.stringify([...currBools.contains].sort());
      const currMayContain = JSON.stringify([...currBools.mayContain].sort());
      const allergenInfoDiffers = origContains !== currContains || origMayContain !== currMayContain;

      // Check 2: ingredient composition changed (catches auto-sync race)
      const ingredientFp = (ings: any[]) =>
        (ings || []).map(i => i.master_ingredient_id || i.prepared_recipe_id || i.id).sort().join('|');
      const ingredientsDiffer = ingredientFp(formData.ingredients) !== ingredientFp(originalData.ingredients);

      if (allergenInfoDiffers || ingredientsDiffer) {
        setActiveTab('allergens');
        toast(
          allergenInfoDiffers
            ? 'Allergen declaration changed \u2014 please review before saving.'
            : 'Ingredients changed \u2014 please review allergen declaration before saving.',
          {
            icon: '\u{1F6E1}\uFE0F',
            duration: 5000,
            style: {
              background: '#1a1a2e',
              color: '#f9fafb',
              border: '1px solid rgba(244,63,94,0.3)',
            },
          }
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      // =================================================================
      // AUTO VERSION BUMP — Every detected change gets a version number
      // =================================================================
      // If the operator manually bumped on the Versions tab, formData.version
      // already differs from originalData.version — skip auto-bump.
      //
      // Otherwise, run the detection result (useRecipeChangeDetection) to
      // determine the tier and auto-generate change notes.
      //
      // Tier mapping (from architecture doc):
      //   MAJOR — CONTAINS allergen add/remove, ingredient-sourced allergen
      //   MINOR — MAY CONTAIN, ingredient add/remove, yield, method
      //   PATCH — Cross-contact notes, description, production notes
      //
      // NEXUS events fire based on the bump tier. Every change gets an
      // audit trail. Nothing is ever silently changed.
      // =================================================================
      let saveData = { ...formData };

      if (!isNew && originalData && formData.version === originalData.version && saveDetection.hasChanges) {
        const bumpType = saveDetection.suggestedTier;
        const normalizeVersion = (v: string) => {
          const parts = (v || '1.0.0').split('.').map(p => parseInt(p) || 0);
          while (parts.length < 3) parts.push(0);
          return parts;
        };
        const [major, minor, patch] = normalizeVersion(saveData.version || '1.0.0');
        const newVersion = bumpType === 'major'
          ? `${major + 1}.0.0`
          : bumpType === 'minor'
            ? `${major}.${minor + 1}.0`
            : `${major}.${minor}.${patch + 1}`;

        // Auto-generate notes from detected changes
        const autoNotes = saveDetection.changes
          .map(c => c.description)
          .join('; ');

        const versionEntry = {
          version: `${major}.${minor}.${patch}`,
          date: saveData.updated_at || new Date().toISOString(),
          changedBy: user?.id,
          notes: autoNotes,
          status: saveData.status,
          bumpType,
          changes: saveDetection.changes.map(c => ({
            category: c.category,
            description: c.description,
            tier: c.suggestedTier,
            safetyFloor: c.isSafetyFloor,
          })),
        };

        saveData = {
          ...saveData,
          version: newVersion,
          versions: [versionEntry, ...(saveData.versions || [])],
          modified_by: user?.id,
          updated_at: new Date().toISOString(),
        };

        // MINOR/MAJOR resets to draft (substantive change needs re-approval)
        if (bumpType !== 'patch') {
          saveData.status = 'draft';
        }

        // Update formData so NEXUS emission below sees the bumped version
        setFormData(saveData);
      }

      if (isNew) {
        const created = await createRecipe(saveData as Recipe);
        toast.success("Recipe created successfully");
        setOriginalData(saveData as Recipe);
        // Navigate to the new recipe's real URL
        navigate(returnTo);
      } else {
        if (!("id" in saveData)) {
          toast.error("Cannot update recipe: No ID found");
          return;
        }
        // Stamp declaration timestamp when operator explicitly confirmed
        if (allergenReviewedRef.current) {
          saveData.allergen_declared_at = new Date().toISOString();
        }

        await updateRecipe(saveData.id, saveData);
        toast.success("Recipe saved successfully");

        // =================================================================
        // NEXUS EVENT EMISSION — Post-save, fire events for version bumps
        // and allergen declaration changes. These go to the activity_logs
        // table and drive notifications, card badges, and audit trail.
        // =================================================================
        if (organizationId && user?.id && originalData) {
          const recipeId = saveData.id;
          const recipeName = saveData.name || 'Untitled';

          // --- Version bump detection ---
          if (saveData.version !== originalData.version) {
            // Read bump type and structured changes from the latest version entry
            const latestEntry = (saveData.versions || [])[0];
            const bumpType = latestEntry?.bumpType || 'patch';
            const activityType = bumpType === 'major'
              ? 'recipe_version_major' as const
              : bumpType === 'minor'
                ? 'recipe_version_minor' as const
                : 'recipe_version_patch' as const;

            nexus({
              organization_id: organizationId,
              user_id: user.id,
              activity_type: activityType,
              details: {
                recipe_id: recipeId,
                name: recipeName,
                version: saveData.version,
                previous_version: originalData.version,
                bump_type: bumpType,
                notes: latestEntry?.notes || '',
                // Structured change audit trail — every detected change
                // with its category, tier, and safety floor status
                changes: latestEntry?.changes || [],
              },
            });
          }

          // --- Allergen declaration change detection (from boolean columns) ---
          const origBoolsN = getRecipeAllergenBooleans(originalData);
          const saveBoolsN = getRecipeAllergenBooleans(saveData);
          const origContainsN = JSON.stringify([...origBoolsN.contains].sort());
          const origMayContainN = JSON.stringify([...origBoolsN.mayContain].sort());
          const currContainsN = JSON.stringify([...saveBoolsN.contains].sort());
          const currMayContainN = JSON.stringify([...saveBoolsN.mayContain].sort());

          if (origContainsN !== currContainsN || origMayContainN !== currMayContainN) {
            const origCSet = new Set(origBoolsN.contains);
            const currCSet = new Set(saveBoolsN.contains);
            const addedC = [...currCSet].filter(a => !origCSet.has(a));
            const removedC = [...origCSet].filter(a => !currCSet.has(a));
            const summaryParts: string[] = [];
            if (addedC.length) summaryParts.push(`+${addedC.join(', ')}`);
            if (removedC.length) summaryParts.push(`-${removedC.join(', ')}`);

            nexus({
              organization_id: organizationId,
              user_id: user.id,
              activity_type: 'recipe_allergen_changed',
              severity: 'critical',
              details: {
                recipe_id: recipeId,
                name: recipeName,
                version: saveData.version,
                summary: summaryParts.join(', ') || 'allergen profile updated',
                contains_added: addedC,
                contains_removed: removedC,
                new_contains: [...saveBoolsN.contains],
                new_may_contain: [...saveBoolsN.mayContain],
                previous_contains: [...origBoolsN.contains],
                previous_may_contain: [...origBoolsN.mayContain],
              },
            });
          }

          // --- Allergen declaration confirmation (explicit button) ---
          if (allergenReviewedRef.current) {
            nexus({
              organization_id: organizationId,
              user_id: user.id,
              activity_type: 'recipe_allergen_declared',
              details: {
                recipe_id: recipeId,
                name: recipeName,
                version: saveData.version,
                contains: [...saveBoolsN.contains],
                may_contain: [...saveBoolsN.mayContain],
              },
            });

            // =============================================================
            // LEGAL AUDIT TRAIL — Immutable declaration record
            // =============================================================
            // Every "Confirm Declaration & Save" creates a permanent row in
            // recipe_allergen_declarations. This is the legal receipt:
            // who accepted responsibility, what was disclosed, and what
            // ingredients were present. No updates, no deletes, ever.
            // =============================================================
            const ingredientIds = (saveData.ingredients || [])
              .map((i: any) => i.master_ingredient_id || i.prepared_recipe_id || i.name || i.id)
              .filter(Boolean)
              .sort();
            const ingredientHash = ingredientIds.join('|');

            // Compute delta from previous declaration (original baseline)
            const origCSetAudit = new Set(origBoolsN.contains);
            const currCSetAudit = new Set(saveBoolsN.contains);
            const origMSetAudit = new Set(origBoolsN.mayContain);
            const currMSetAudit = new Set(saveBoolsN.mayContain);

            // Fetch previous declaration ID for chain linking
            const { data: prevDecl } = await supabase
              .from('recipe_allergen_declarations')
              .select('id')
              .eq('recipe_id', recipeId)
              .order('declared_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            supabase.from('recipe_allergen_declarations').insert({
              recipe_id: recipeId,
              organization_id: organizationId,
              declared_by: user.id,
              declared_at: new Date().toISOString(),
              recipe_version: saveData.version || '1.0.0',
              recipe_name: recipeName,
              ingredient_hash: ingredientHash,
              ingredient_count: ingredientIds.length,
              contains: [...saveBoolsN.contains],
              may_contain: [...saveBoolsN.mayContain],
              cross_contact_notes: saveData.allergenInfo?.crossContactRisk || [],
              manual_overrides: saveData.allergenManualOverrides || null,
              previous_declaration_id: prevDecl?.id || null,
              contains_added: [...currCSetAudit].filter(a => !origCSetAudit.has(a)),
              contains_removed: [...origCSetAudit].filter(a => !currCSetAudit.has(a)),
              may_contain_added: [...currMSetAudit].filter(a => !origMSetAudit.has(a)),
              may_contain_removed: [...origMSetAudit].filter(a => !currMSetAudit.has(a)),
              declaration_method: 'editor',
            }).then(({ error: declError }) => {
              if (declError) {
                console.error('Failed to write allergen declaration audit record:', declError);
                // Non-blocking — save already succeeded, audit is supplementary
              }
            });
          }
        }

        // Stay on page — reset baseline so dirty tracking clears
        setOriginalData(saveData as Recipe);
        // Reset review gate for next edit cycle
        allergenReviewedRef.current = false;
      }
    } catch (err) {
      console.error("Error saving recipe:", err);
      toast.error("Failed to save recipe");
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // CONFIRM DECLARATION — Operator explicitly accepts allergen disclosure
  // Satisfies the review gate, then triggers save in one action.
  // -------------------------------------------------------------------------
  const handleConfirmDeclaration = () => {
    allergenReviewedRef.current = true;
    handleSave();
  };

  // -------------------------------------------------------------------------
  // VERSION CREATED — Reset snapshot so Pending Changes panel clears
  // Called by VersionHistory after operator commits a version bump.
  // The bump is in formData (via onChange) but not yet persisted.
  // -------------------------------------------------------------------------
  const handleVersionCreated = useCallback(() => {
    if (formData) {
      setVersionSnapshot(formData as Recipe);
    }
  }, [formData]);

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

      {/* Navigation Bar — Pill + Breadcrumb */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {/* Back pill — clear clickable affordance, can't be confused with global nav */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg 
                         bg-gray-800/60 border border-gray-700/50 
                         text-sm text-gray-300 hover:text-white hover:bg-gray-700/60 
                         hover:border-gray-600 transition-all flex-shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>

            {/* Breadcrumb trail — spatial context */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0 overflow-hidden">
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <button
                onClick={handleBack}
                className="hover:text-gray-300 transition-colors flex-shrink-0"
              >
                Recipes
              </button>
              {(formData as Recipe).major_group_name && (
                <>
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  <span className="text-gray-500 flex-shrink-0">
                    {(formData as Recipe).major_group_name}
                  </span>
                </>
              )}
              {(formData as Recipe).sub_category_name && (
                <>
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  <span className="text-gray-500 flex-shrink-0">
                    {(formData as Recipe).sub_category_name}
                  </span>
                </>
              )}
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <span className="text-gray-300 font-medium truncate">
                {formData.name || (isNew ? 'New Recipe' : 'Untitled')}
              </span>
            </div>
          </div>

          {/* Prev/Next navigation */}
          {position && recipeIds.length > 1 && (
            <div className="flex items-center gap-2 flex-shrink-0">
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
          <AllergenControl
            recipe={formData as Recipe}
            onChange={handleChange}
            onConfirmDeclaration={handleConfirmDeclaration}
            allergensDirty={
              originalData
                ? (() => {
                    // Phase 3: Read from boolean columns, not JSONB
                    const currBools = getRecipeAllergenBooleans(formData);
                    const origBools = getRecipeAllergenBooleans(originalData);
                    return JSON.stringify([...currBools.contains].sort()) !==
                      JSON.stringify([...origBools.contains].sort()) ||
                      JSON.stringify([...currBools.mayContain].sort()) !==
                      JSON.stringify([...origBools.mayContain].sort());
                  })()
                : false
            }
          />
        )}
        {activeTab === "media" && (
          <MediaManager recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "training" && (
          <TrainingModule recipe={formData as Recipe} onChange={handleChange} />
        )}
        {activeTab === "versions" && (
          <VersionHistory
            recipe={formData as Recipe}
            onChange={handleChange}
            lastSavedRecipe={versionSnapshot}
            onVersionCreated={handleVersionCreated}
          />
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
