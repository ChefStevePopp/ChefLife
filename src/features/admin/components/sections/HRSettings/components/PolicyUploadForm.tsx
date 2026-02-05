import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FileText,
  X,
  Info,
  ChevronUp,
  ArrowLeft,
  AlertTriangle,
  Calendar,
  CheckCircle,
  RefreshCw,
  Check,
  RotateCcw,
  User,
  Building2,
  Briefcase,
  ChefHat,
  ClipboardCheck,
  Wrench,
  Users,
  FilePenLine,
  Send,
  Archive,
  CopyPlus,
} from "lucide-react";
import { FileDropzone } from "@/shared/components/FileDropzone";
import { DocumentPreview } from "@/features/admin/components/sections/VendorInvoice/components/DocumentPreview";
import { policyService } from "@/lib/policy-service";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useOperationsStore } from "@/stores/operationsStore";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import type {
  RecertificationInterval,
  ReviewSchedule,
  PolicyCategoryConfig,
} from "@/types/modules";
import { bumpVersion, VERSION_BUMP_LABELS, type Policy, type VersionBumpType } from "@/types/policies";
import { createPolicy, updatePolicy } from "@/lib/policy-data-service";

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================
const SkeletonLine: React.FC<{ width?: string; className?: string }> = ({ 
  width = "w-full", 
  className = "" 
}) => (
  <div className={`h-4 bg-gray-700/50 rounded animate-pulse ${width} ${className}`} />
);

const SkeletonInput: React.FC = () => (
  <div className="h-10 bg-gray-700/30 border border-gray-700/50 rounded-lg animate-pulse" />
);

const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="card overflow-hidden">
    <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
      <div className="w-8 h-8 rounded-lg bg-gray-700/50 animate-pulse" />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="w-32" />
        <SkeletonLine width="w-48" className="h-3" />
      </div>
    </div>
    <div className="p-4 space-y-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLine width="w-24" className="h-3" />
          <SkeletonInput />
        </div>
      ))}
    </div>
  </div>
);

// =============================================================================
// POLICY UPLOAD FORM - L5 Vitals Page Pattern
// =============================================================================
// Uses stacked card accordions with expandable-info-section guidance.
// Standard CSS classes from index.css.
// =============================================================================

interface PolicyUploadFormProps {
  editingPolicy?: Policy | null;
  onCancel: () => void;
  onSave: () => void;
  /** Lifecycle callbacks  -- called from status banner, parent handles data + state */
  onPublish?: (policy: Policy) => void;
  onArchive?: (policy: Policy) => void;
  onMajorRevision?: (policy: Policy) => void;
}

// Review schedule options
const REVIEW_SCHEDULE_OPTIONS: { value: ReviewSchedule; label: string }[] = [
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual (6 months)" },
  { value: "annual", label: "Per Annum" },
  { value: "biennial", label: "Biennial (2 years)" },
  { value: "as_needed", label: "As Needed" },
];

// Recertification interval options
const RECERTIFICATION_OPTIONS: { value: RecertificationInterval; label: string }[] = [
  { value: "none", label: "One-time only" },
  { value: "30_days", label: "Every 30 days" },
  { value: "90_days", label: "Every 90 days" },
  { value: "180_days", label: "Every 6 months" },
  { value: "annual", label: "Annual" },
  { value: "biennial", label: "Biennial" },
  { value: "custom", label: "Custom" },
];

// Color classes for icon boxes
const colorClasses: Record<string, { bg: string; text: string }> = {
  indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
};

// =============================================================================
// PILL BUTTON COMPONENT
// =============================================================================
interface PillButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const PillButton: React.FC<PillButtonProps> = ({ label, isSelected, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`
      relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
      transition-all duration-150 border
      ${isSelected
        ? "bg-primary-500/20 border-primary-500/50 text-white"
        : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
      }
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    `}
  >
    <span>{label}</span>
    {isSelected && <Check className="w-4 h-4 text-primary-400" />}
  </button>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const PolicyUploadForm: React.FC<PolicyUploadFormProps> = ({
  editingPolicy,
  onCancel,
  onSave,
  onPublish,
  onArchive,
  onMajorRevision,
}) => {
  const { user, organizationId } = useAuth();
  const { showDiagnostics } = useDiagnostics();
  const { settings: operationsSettings, fetchSettings } = useOperationsStore();
  const isEditMode = !!editingPolicy;

  // Fetch operations settings on mount
  useEffect(() => {
    if (!operationsSettings) {
      fetchSettings();
    }
  }, [operationsSettings, fetchSettings]);

  // ---------------------------------------------------------------------------
  // STATE - Form Fields
  // ---------------------------------------------------------------------------
  const [file, setFile] = useState<File | null>(null);

  // Basic info
  const [title, setTitle] = useState(editingPolicy?.title || "");
  const [description, setDescription] = useState(editingPolicy?.description || "");
  const [category, setCategory] = useState(editingPolicy?.category_id || "general");
  const [version, setVersion] = useState(editingPolicy?.version || "1.0.0");
  const [versionBumpType, setVersionBumpType] = useState<VersionBumpType>('patch');
  const isEditingPublished = isEditMode && editingPolicy?.status === 'published';

  // Policy dates
  const [effectiveDate, setEffectiveDate] = useState(
    editingPolicy?.effective_date
      ? new Date(editingPolicy.effective_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [preparedDate, setPreparedDate] = useState(
    editingPolicy?.prepared_date
      ? new Date(editingPolicy.prepared_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [lastRevisionDate, setLastRevisionDate] = useState(
    editingPolicy?.last_revision_date
      ? new Date(editingPolicy.last_revision_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  // Authorship
  const [preparedBy, setPreparedBy] = useState(editingPolicy?.prepared_by || "");
  const [authorTitle, setAuthorTitle] = useState(editingPolicy?.author_title || "");

  // Review schedule
  const [reviewSchedule, setReviewSchedule] = useState<ReviewSchedule>(
    (editingPolicy?.review_schedule as ReviewSchedule) || "annual"
  );

  // Acknowledgment
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(
    editingPolicy?.requires_acknowledgment ?? true
  );
  const [recertificationRequired, setRecertificationRequired] = useState(
    editingPolicy?.recertification_required ?? false
  );
  const [recertificationInterval, setRecertificationInterval] =
    useState<RecertificationInterval>((editingPolicy?.recertification_interval as RecertificationInterval) || "none");
  const [customDays, setCustomDays] = useState<number | undefined>(
    editingPolicy?.recertification_custom_days ?? undefined
  );

  // Applicability
  const [applicableDepartments, setApplicableDepartments] = useState<string[]>(
    editingPolicy?.applicable_departments || []
  );
  const [applicableScheduledRoles, setApplicableScheduledRoles] = useState<string[]>(
    editingPolicy?.applicable_scheduled_roles || []
  );
  const [applicableKitchenStations, setApplicableKitchenStations] = useState<string[]>(
    editingPolicy?.applicable_kitchen_stations || []
  );

  // ---------------------------------------------------------------------------
  // STATE - UI
  // ---------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyCategories, setPolicyCategories] = useState<PolicyCategoryConfig[]>([]);

  // Expanded guidance sections (within cards)
  const [expandedGuidance, setExpandedGuidance] = useState<Record<string, boolean>>({});

  // Track if categories are loading
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  // Safety net: if the policy's category doesn't exist in available options,
  // fall back to "general" so the user can re-categorize and save.
  // Futureproofing  -- users don't have DB access to fix orphaned category IDs.
  useEffect(() => {
    if (!isCategoriesLoading && policyCategories.length > 0) {
      const categoryExists = policyCategories.some((c) => c.id === category);
      if (!categoryExists) {
        setCategory("general");
      }
    }
  }, [isCategoriesLoading, policyCategories, category]);

  // ---------------------------------------------------------------------------
  // INITIAL STATE SNAPSHOT (for dirty tracking)
  // ---------------------------------------------------------------------------
  const initialStateRef = useRef({
    file: null as File | null,
    title: editingPolicy?.title || "",
    description: editingPolicy?.description || "",
    category: editingPolicy?.category_id || "general",
    version: editingPolicy?.version || "1.0.0",
    effectiveDate: editingPolicy?.effective_date
      ? new Date(editingPolicy.effective_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    preparedDate: editingPolicy?.prepared_date
      ? new Date(editingPolicy.prepared_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    lastRevisionDate: editingPolicy?.last_revision_date
      ? new Date(editingPolicy.last_revision_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    preparedBy: editingPolicy?.prepared_by || "",
    authorTitle: editingPolicy?.author_title || "",
    reviewSchedule: editingPolicy?.review_schedule || "annual",
    requiresAcknowledgment: editingPolicy?.requires_acknowledgment ?? true,
    recertificationRequired: editingPolicy?.recertification_required ?? false,
    recertificationInterval: editingPolicy?.recertification_interval || "none",
    customDays: editingPolicy?.recertification_custom_days ?? undefined,
    applicableDepartments: editingPolicy?.applicable_departments || [],
    applicableScheduledRoles: editingPolicy?.applicable_scheduled_roles || [],
    applicableKitchenStations: editingPolicy?.applicable_kitchen_stations || [],
  });

  const toggleGuidance = (section: string) => {
    setExpandedGuidance((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ---------------------------------------------------------------------------
  // DIRTY STATE DETECTION
  // ---------------------------------------------------------------------------
  const isDirty = useMemo(() => {
    const initial = initialStateRef.current;
    return (
      file !== initial.file ||
      title !== initial.title ||
      description !== initial.description ||
      category !== initial.category ||
      version !== initial.version ||
      effectiveDate !== initial.effectiveDate ||
      preparedDate !== initial.preparedDate ||
      lastRevisionDate !== initial.lastRevisionDate ||
      preparedBy !== initial.preparedBy ||
      authorTitle !== initial.authorTitle ||
      reviewSchedule !== initial.reviewSchedule ||
      requiresAcknowledgment !== initial.requiresAcknowledgment ||
      recertificationRequired !== initial.recertificationRequired ||
      recertificationInterval !== initial.recertificationInterval ||
      customDays !== initial.customDays ||
      JSON.stringify(applicableDepartments) !== JSON.stringify(initial.applicableDepartments) ||
      JSON.stringify(applicableScheduledRoles) !== JSON.stringify(initial.applicableScheduledRoles) ||
      JSON.stringify(applicableKitchenStations) !== JSON.stringify(initial.applicableKitchenStations)
    );
  }, [
    file, title, description, category, version, effectiveDate, preparedDate,
    lastRevisionDate, preparedBy, authorTitle, reviewSchedule, requiresAcknowledgment,
    recertificationRequired, recertificationInterval, customDays,
    applicableDepartments, applicableScheduledRoles, applicableKitchenStations,
  ]);

  // Reset form to initial state
  const handleReset = useCallback(() => {
    const initial = initialStateRef.current;
    setFile(initial.file);
    setTitle(initial.title);
    setDescription(initial.description);
    setCategory(initial.category);
    setVersion(initial.version);
    setEffectiveDate(initial.effectiveDate);
    setPreparedDate(initial.preparedDate);
    setLastRevisionDate(initial.lastRevisionDate);
    setPreparedBy(initial.preparedBy);
    setAuthorTitle(initial.authorTitle);
    setReviewSchedule(initial.reviewSchedule as ReviewSchedule);
    setRequiresAcknowledgment(initial.requiresAcknowledgment);
    setRecertificationRequired(initial.recertificationRequired);
    setRecertificationInterval(initial.recertificationInterval as RecertificationInterval);
    setCustomDays(initial.customDays);
    setApplicableDepartments(initial.applicableDepartments);
    setApplicableScheduledRoles(initial.applicableScheduledRoles);
    setApplicableKitchenStations(initial.applicableKitchenStations);
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape  -> Cancel
      if (e.key === "Escape" && !isLoading) {
        e.preventDefault();
        onCancel();
      }
      // Cmd/Ctrl + S  -> Save as draft (safe action; publish requires explicit click)
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && !isLoading) {
        e.preventDefault();
        handleSubmit('draft');
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, onCancel]);

  // ---------------------------------------------------------------------------
  // BROWSER NAVIGATION WARNING
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isLoading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isLoading]);

  // ---------------------------------------------------------------------------
  // LOAD POLICY CATEGORIES FROM ORG CONFIG
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadCategories = async () => {
      if (!organizationId) return;

      setIsCategoriesLoading(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("modules")
          .eq("id", organizationId)
          .single();

        if (error) throw error;

        const hrConfig = data?.modules?.hr?.config;
        const categories = hrConfig?.policies?.policyCategories;

        if (categories && categories.length > 0) {
          setPolicyCategories(categories);
        } else {
          const { DEFAULT_POLICY_CATEGORIES } = await import("@/types/modules");
          setPolicyCategories(DEFAULT_POLICY_CATEGORIES);
        }
      } catch (error) {
        console.error("Error loading policy categories:", error);
        const { DEFAULT_POLICY_CATEGORIES } = await import("@/types/modules");
        setPolicyCategories(DEFAULT_POLICY_CATEGORIES);
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [organizationId]);

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------
  const departments = useMemo(() => {
    return operationsSettings?.departments || [];
  }, [operationsSettings]);

  const scheduledRoles = useMemo(() => {
    return operationsSettings?.scheduled_roles || [];
  }, [operationsSettings]);

  const kitchenStations = useMemo(() => {
    return operationsSettings?.kitchen_stations || [];
  }, [operationsSettings]);

  // Auto-compute version from bump type when editing a published policy
  useEffect(() => {
    if (isEditingPublished && editingPolicy) {
      const newVersion = bumpVersion(editingPolicy.version || '1.0.0', versionBumpType);
      setVersion(newVersion);
      setLastRevisionDate(new Date().toISOString().split("T")[0]);
    }
  }, [versionBumpType, isEditingPublished, editingPolicy]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  };

  const toggleDepartment = (dept: string) => {
    setApplicableDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const toggleScheduledRole = (role: string) => {
    setApplicableScheduledRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleKitchenStation = (station: string) => {
    setApplicableKitchenStations((prev) =>
      prev.includes(station) ? prev.filter((s) => s !== station) : [...prev, station]
    );
  };

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------
  const validateForm = (): string | null => {
    if (!title.trim()) return "Title is required";
    if (!description.trim()) return "Description is required";
    if (!category) return "Category is required";
    if (!version.trim()) return "Version is required";
    if (!version.match(/^\d+\.\d+(\.\d+)?$/)) return "Version must be in format X.Y.Z (e.g., 1.0.0)";
    if (!effectiveDate) return "Effective date is required";
    if (!preparedDate) return "Prepared date is required";
    if (!lastRevisionDate) return "Last revision date is required";
    if (!preparedBy.trim()) return "Prepared by is required";
    // PDF required for publishing, optional for drafts
    // (targetStatus check happens in handleSubmit, not here)
    // This validation runs before we know the target status,
    // so we skip it here and check in handleSubmit instead.
    // if (!isEditMode && !file) return "PDF document is required";
    if (recertificationRequired && recertificationInterval === "custom" && !customDays) {
      return "Custom recertification days is required";
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------------------------
  const handleSubmit = async (targetStatus: 'draft' | 'published' = 'published') => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    if (!user || !organizationId) {
      toast.error("Missing user or organization information");
      return;
    }

    // PDF is required when publishing (not for drafts)
    if (targetStatus === 'published' && !isEditMode && !file) {
      const msg = "PDF document is required to publish. Save as draft instead?";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ---------------------------------------------------------------
      // 1. Handle PDF upload/replacement (unchanged  -- storage layer)
      // ---------------------------------------------------------------
      let documentUrl = editingPolicy?.document_url || null;

      if (file) {
        documentUrl = await policyService.uploadPolicyDocument(file, organizationId);

        if (isEditMode && editingPolicy?.document_url) {
          try {
            await policyService.deletePolicyDocument(editingPolicy.document_url);
          } catch (error) {
            console.error("Failed to delete old PDF:", error);
          }
        }
      }

      // ---------------------------------------------------------------
      // 2. Calculate next review date
      // ---------------------------------------------------------------
      const calculateNextReviewDate = (): string | null => {
        const revisionDate = new Date(lastRevisionDate);
        switch (reviewSchedule) {
          case "quarterly":
            revisionDate.setMonth(revisionDate.getMonth() + 3);
            break;
          case "semi_annual":
            revisionDate.setMonth(revisionDate.getMonth() + 6);
            break;
          case "annual":
            revisionDate.setFullYear(revisionDate.getFullYear() + 1);
            break;
          case "biennial":
            revisionDate.setFullYear(revisionDate.getFullYear() + 2);
            break;
          case "as_needed":
          default:
            return null;
        }
        return revisionDate.toISOString();
      };

      // ---------------------------------------------------------------
      // 3. Phase 1 Relational: INSERT or UPDATE `policies` table
      //    No more JSONB read/write/merge  -- clean table operations.
      // ---------------------------------------------------------------
      const policyTitle = title.trim();

      // Determine status:
      // - New policies: use targetStatus from button clicked
      // - Edits: use targetStatus (allows promoting draft  -> published)
      const resolvedStatus = targetStatus;
      const isPublishing = resolvedStatus === 'published';

      if (isEditMode && editingPolicy) {
        // UPDATE existing policy row
        await updatePolicy(editingPolicy.id, {
          title: policyTitle,
          description: description.trim() || null,
          category_id: category,
          document_url: documentUrl,
          version: version.trim(),
          status: resolvedStatus,
          ...(isPublishing && !editingPolicy.published_at
            ? { published_at: new Date().toISOString(), published_by: user.id }
            : {}),
          effective_date: new Date(effectiveDate).toISOString(),
          prepared_date: new Date(preparedDate).toISOString(),
          last_revision_date: new Date(lastRevisionDate).toISOString(),
          prepared_by: preparedBy.trim() || null,
          author_title: authorTitle.trim() || null,
          review_schedule: reviewSchedule as any,
          next_review_date: calculateNextReviewDate(),
          requires_acknowledgment: requiresAcknowledgment,
          recertification_required: recertificationRequired,
          recertification_interval: (recertificationRequired ? recertificationInterval : "none") as any,
          recertification_custom_days: recertificationInterval === "custom" ? (customDays ?? null) : null,
          applicable_departments: applicableDepartments,
          applicable_scheduled_roles: applicableScheduledRoles,
          applicable_kitchen_stations: applicableKitchenStations,
          updated_by: user.id,
        });
      } else {
        // INSERT new policy row
        await createPolicy({
          organization_id: organizationId,
          title: policyTitle,
          description: description.trim() || null,
          category_id: category,
          document_url: documentUrl,
          version: version.trim(),
          status: resolvedStatus,
          is_active: true,
          effective_date: new Date(effectiveDate).toISOString(),
          prepared_date: new Date(preparedDate).toISOString(),
          last_revision_date: new Date(lastRevisionDate).toISOString(),
          prepared_by: preparedBy.trim() || null,
          author_title: authorTitle.trim() || null,
          review_schedule: reviewSchedule as any,
          next_review_date: calculateNextReviewDate(),
          requires_acknowledgment: requiresAcknowledgment,
          recertification_required: recertificationRequired,
          recertification_interval: (recertificationRequired ? recertificationInterval : "none") as any,
          recertification_custom_days: recertificationInterval === "custom" ? (customDays ?? null) : null,
          applicable_departments: applicableDepartments,
          applicable_scheduled_roles: applicableScheduledRoles,
          applicable_kitchen_stations: applicableKitchenStations,
          created_by: user.id,
          updated_by: user.id,
        });
      }

      // ---------------------------------------------------------------
      // 4. NEXUS audit logging
      // ---------------------------------------------------------------
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: isEditMode ? "policy_updated" : "policy_uploaded",
        details: {
          policy_id: editingPolicy?.id || "new",
          policy_title: policyTitle,
          category,
          version: version.trim(),
          prepared_by: preparedBy.trim(),
          review_schedule: reviewSchedule,
          file_name: file?.name,
          file_size: file?.size,
          ...(isEditMode && {
            old_version: editingPolicy?.version,
            new_version: version.trim(),
          }),
        },
      });

      const statusLabel = resolvedStatus === 'draft' ? 'saved as draft' : isEditMode ? 'updated' : 'published';
      toast.success(`Policy "${policyTitle}" ${statusLabel} successfully!`);

      onSave();
    } catch (error: any) {
      console.error("Error saving policy:", error);
      setError(error.message || "Failed to save policy");
      toast.error(`Failed to save policy: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LOADING STATE CHECK
  // ---------------------------------------------------------------------------
  const isDataLoading = isCategoriesLoading || !operationsSettings;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  
  // Show skeleton while loading
  if (isDataLoading) {
    return (
      <div className="space-y-4">
        {/* L5 Diagnostic Path */}
        {showDiagnostics && (
          <div className="text-xs text-gray-500 font-mono">
            src/features/admin/components/sections/HRSettings/components/PolicyUploadForm.tsx (loading)
          </div>
        )}

        {/* Header Skeleton */}
        <div className="subheader">
          <div className="subheader-row">
            <div className="subheader-left">
              <div className="w-10 h-10 rounded-lg bg-gray-700/50 animate-pulse" />
              <div className="space-y-2">
                <SkeletonLine width="w-48" />
                <SkeletonLine width="w-64" className="h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Card Skeletons (4 cards: upload, basic info, dates & compliance, applicability) */}
        <SkeletonCard lines={1} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/HRSettings/components/PolicyUploadForm.tsx
        </div>
      )}

      {/* ================================================================== */}
      {/* HEADER SUBHEADER */}
      {/* ================================================================== */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <button
              onClick={onCancel}
              className="w-10 h-10 rounded-lg bg-gray-700/50 hover:bg-gray-700 flex items-center justify-center transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h2 className="subheader-title">
                {isEditMode ? "Edit Policy Document" : "Upload Policy Document"}
              </h2>
              <p className="subheader-subtitle">
                {isEditMode ? "Update an existing policy" : "Add a new policy to the library"}
              </p>
            </div>
          </div>
          {/* subheader-right: lifecycle status pill (edit mode) */}
          {isEditMode && editingPolicy && (
            <div className="subheader-right">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                ${editingPolicy.status === 'published'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : editingPolicy.status === 'archived'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                }`}
              >
                {editingPolicy.status === 'published' && <CheckCircle className="w-3 h-3" />}
                {editingPolicy.status === 'archived' && <Archive className="w-3 h-3" />}
                {editingPolicy.status === 'draft' && <FilePenLine className="w-3 h-3" />}
                {editingPolicy.status.charAt(0).toUpperCase() + editingPolicy.status.slice(1)} &middot; v{editingPolicy.version}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* LIFECYCLE ACTIONS  -- Phase 2                                        */}
      {/* Contextual: draft can publish, published can create new ver/archive */}
      {/* Disabled when dirty  -- save first to avoid publishing stale data     */}
      {/* ================================================================== */}
      {isEditMode && editingPolicy && (editingPolicy.status === 'draft' || editingPolicy.status === 'published') && (
        <div className={`rounded-lg border px-4 py-2.5 flex items-center justify-between gap-4
          ${isDirty ? 'bg-gray-800/30 border-gray-700/30' : 'bg-gray-800/50 border-gray-700/40'}`}
        >
          <span className="text-xs text-gray-500">
            {isDirty ? 'Save changes before using lifecycle actions' : 'Lifecycle'}
          </span>
          <div className="flex items-center gap-2">
            {/* Draft  -> Publish */}
            {editingPolicy.status === 'draft' && onPublish && (
              <button
                type="button"
                onClick={() => onPublish(editingPolicy)}
                disabled={isDirty}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           transition-colors border
                           ${isDirty
                             ? 'bg-gray-800/50 border-gray-700/30 text-gray-600 cursor-not-allowed'
                             : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400'
                           }`}
              >
                <Send className="w-3.5 h-3.5" />
                Publish
              </button>
            )}
            {/* Published  -> New Version */}
            {editingPolicy.status === 'published' && onMajorRevision && (
              <button
                type="button"
                onClick={() => onMajorRevision(editingPolicy)}
                disabled={isDirty}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           transition-colors border
                           ${isDirty
                             ? 'bg-gray-800/50 border-gray-700/30 text-gray-600 cursor-not-allowed'
                             : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/25 text-blue-400'
                           }`}
              >
                <CopyPlus className="w-3.5 h-3.5" />
                New Version
              </button>
            )}
            {/* Published  -> Archive */}
            {editingPolicy.status === 'published' && onArchive && (
              <button
                type="button"
                onClick={() => onArchive(editingPolicy)}
                disabled={isDirty}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           transition-colors border
                           ${isDirty
                             ? 'bg-gray-800/50 border-gray-700/30 text-gray-600 cursor-not-allowed'
                             : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400/80'
                           }`}
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DOCUMENT UPLOAD CARD */}
      {/* ================================================================== */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
          <div className={`w-8 h-8 rounded-lg ${colorClasses.indigo.bg} flex items-center justify-center`}>
            <FileText className={`w-4 h-4 ${colorClasses.indigo.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-white">
              Policy Document {!isEditMode && <span className="text-rose-400">*</span>}
            </h3>
            <p className="text-xs text-gray-500">Upload the PDF version of your policy</p>
          </div>
        </div>

        {/* Expandable Guidance */}
        <div className={`expandable-info-section ${expandedGuidance.document ? "expanded" : ""}`}>
          <button
            onClick={() => toggleGuidance("document")}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">What should I upload?</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-2 text-sm text-gray-400">
              <p><strong className="text-gray-300">What to upload:</strong> A PDF version of your policy document. This is what team members will read and acknowledge.</p>
              <p><strong className="text-gray-300">Best practices:</strong> Use clear formatting, include page numbers, and make sure the document is the final approved version. Maximum file size is 10MB.</p>
              <p><strong className="text-gray-300">Tip:</strong> If you're updating an existing policy, upload the new version here  -- use the version bump selector to indicate what kind of change this is.</p>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="p-4">
          <FileDropzone
            accept=".pdf"
            onFile={handleFileSelected}
            isLoading={isLoading}
            loadingMessage="Uploading PDF..."
            variant="primary"
            label={
              isEditMode
                ? file
                  ? `New PDF: ${file.name}`
                  : "Upload new version (optional)"
                : "Drop your PDF policy document here"
            }
            hint="PDF format only, maximum 10MB"
          />

          {file && (
            <div className="mt-4 space-y-3">
              <DocumentPreview file={file} fileType="pdf" className="max-h-[400px]" />
              <div className="flex justify-end">
                <button
                  onClick={() => setFile(null)}
                  className="btn-ghost-red text-sm"
                >
                  <X className="w-4 h-4" />
                  Remove Document
                </button>
              </div>
            </div>
          )}

          {isEditMode && !file && editingPolicy?.document_url && (
            <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-300">Current Document</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingPolicy.document_url.split("/").pop()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* BASIC INFORMATION CARD */}
      {/* ================================================================== */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
          <div className={`w-8 h-8 rounded-lg ${colorClasses.blue.bg} flex items-center justify-center`}>
            <Info className={`w-4 h-4 ${colorClasses.blue.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-white">Basic Information</h3>
            <p className="text-xs text-gray-500">Title, category, version, description, and authorship</p>
          </div>
        </div>

        {/* Expandable Guidance */}
        <div className={`expandable-info-section ${expandedGuidance.basicInfo ? "expanded" : ""}`}>
          <button
            onClick={() => toggleGuidance("basicInfo")}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">How do I fill this out?</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-2 text-sm text-gray-400">
              <p><strong className="text-gray-300">Title:</strong> The official name of this policy (e.g., "Disconnecting from Work Policy", "Food Safety Standards").</p>
              <p><strong className="text-gray-300">Category:</strong> Helps organize your policies and makes them easier to find. You can customize categories in HR Settings.</p>
              <p><strong className="text-gray-300">Version:</strong> Uses MAJOR.MINOR.PATCH format (e.g., 1.0.0). Patch = typo fix (no review needed). Minor = worth a read. Major = everyone re-reads and re-signs.</p>
              <p><strong className="text-gray-300">Prepared By:</strong> The person who wrote or is responsible for this policy. This appears on the policy document header.</p>
              <p><strong className="text-gray-300">Author Title:</strong> The role or position of the author (e.g., "Chef/Owner", "HR Manager"). This doesn't have to be you &mdash; it could be an HR consultant or corporate office.</p>
              <p><strong className="text-gray-300">Description:</strong> A brief summary of what this policy covers  -- this appears in the policy library listing.</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm text-gray-400 mb-1.5">
                Policy Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Disconnecting from Work Policy"
                className="input w-full"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input w-full"
                disabled={isLoading}
              >
                {policyCategories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Version <span className="text-rose-400">*</span>
              </label>

              {isEditingPublished ? (
                /* Published policy: compact version + bump pills */
                <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center h-10 px-3 rounded-lg bg-gray-800/80 border border-gray-700/50 text-gray-200 font-mono text-sm">
                    {version}
                  </span>
                  <span className="text-xs text-gray-500">from v{editingPolicy?.version || '1.0.0'}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    {(['patch', 'minor'] as VersionBumpType[]).map((type) => {
                      const isActive = versionBumpType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setVersionBumpType(type)}
                          title={VERSION_BUMP_LABELS[type].description}
                          className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full
                                     text-xs font-medium transition-all border
                                     ${isActive
                                       ? type === 'minor'
                                         ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                                         : 'bg-gray-600/30 border-gray-500/50 text-gray-200'
                                       : 'bg-gray-800/50 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                                     }`}
                        >
                          {type === 'patch' ? <Wrench className="w-3 h-3" /> : <ClipboardCheck className="w-3 h-3" />}
                          {VERSION_BUMP_LABELS[type].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug mt-1.5">
                  <span className="text-gray-400 font-medium">Patch</span> = small fix (typo, formatting) -- nobody needs to re-read.{' '}
                  <span className="text-gray-400 font-medium">Minor</span> = worth a look (new section, updated info) -- ChefLife flags it for your team.
                </p>
                </>
              ) : (
                /* Draft or new policy: manual version entry */
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g., 1.0.0 — or match your existing document"
                    className="input w-full"
                    disabled={isLoading}
                  />
                  {!isEditMode && (
                    <p className="text-[11px] text-gray-500 leading-snug">
                      If this document already has a version number, enter it here.
                      ChefLife tracks changes from this point forward using <span className="text-gray-400 font-medium">Major</span>.<span className="text-gray-400 font-medium">Minor</span>.<span className="text-gray-400 font-medium">Patch</span>{' '}
                      — Major = re-sign required, Minor = worth a read, Patch = typo fix.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm text-gray-400 mb-1.5">
                Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this policy covers..."
                rows={3}
                className="input w-full resize-y"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Authorship  -- folded into Basic Info (only 2 fields) */}
          <div className="pt-4 mt-2 border-t border-gray-700/30">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium text-gray-300">Authorship</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Prepared By <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  placeholder="e.g., Steve Popp"
                  className="input w-full"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Author Title / Role</label>
                <input
                  type="text"
                  value={authorTitle}
                  onChange={(e) => setAuthorTitle(e.target.value)}
                  placeholder="e.g., Chef/Owner, HR Manager"
                  className="input w-full"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* DATES & COMPLIANCE CARD (merged: dates + review/ack)              */}
      {/* ================================================================== */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
          <div className={`w-8 h-8 rounded-lg ${colorClasses.emerald.bg} flex items-center justify-center`}>
            <Calendar className={`w-4 h-4 ${colorClasses.emerald.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-white">Dates & Compliance</h3>
            <p className="text-xs text-gray-500">Effective dates, review schedule, and acknowledgment settings</p>
          </div>
        </div>

        {/* Expandable Guidance */}
        <div className={`expandable-info-section ${expandedGuidance.dates ? "expanded" : ""}`}>
          <button
            onClick={() => toggleGuidance("dates")}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">What do these fields mean?</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-2 text-sm text-gray-400">
              <p><strong className="text-gray-300">Effective Date:</strong> When this policy goes into effect. Team members are expected to comply from this date forward.</p>
              <p><strong className="text-gray-300">Prepared Date:</strong> When the policy was originally written. This could be months or years before the effective date.</p>
              <p><strong className="text-gray-300">Last Revision Date:</strong> When the policy content was last updated. Used to calculate when the next review is due.</p>
              <p><strong className="text-gray-300">Review Schedule:</strong> How often YOU should review this policy. "Per Annum" (yearly) is standard for most.</p>
              <p><strong className="text-gray-300">Acknowledgment:</strong> If enabled, team members confirm they've read and understood. Recertification re-asks periodically.</p>
              <p className="text-amber-400/80"><strong>Ontario requirement:</strong> The "Disconnecting from Work" policy requires a prepared date on the document itself.</p>
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Dates left, Review/Ack right */}
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT: Policy Dates */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-gray-300">Policy Dates</span>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Effective Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="input w-full"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Prepared Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={preparedDate}
                  onChange={(e) => setPreparedDate(e.target.value)}
                  className="input w-full"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Last Revision Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={lastRevisionDate}
                  onChange={(e) => setLastRevisionDate(e.target.value)}
                  className="input w-full"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* RIGHT: Review Schedule & Acknowledgment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-gray-300">Review & Acknowledgment</span>
              </div>

              {/* Review Schedule */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Review Schedule</label>
                <select
                  value={reviewSchedule}
                  onChange={(e) => setReviewSchedule(e.target.value as ReviewSchedule)}
                  className="input w-full"
                  disabled={isLoading}
                >
                  {REVIEW_SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  This is a reminder for <span className="text-gray-400">you</span> to review the policy, not your team. Yearly works for most.
                </p>
              </div>

              {/* Acknowledgment toggles -- soft variant, with plain-English hints */}
              <div className="rounded-lg bg-gray-800/30 border border-gray-700/30 p-3 space-y-3">
                <div>
                  <label className="toggle-switch soft">
                    <input
                      type="checkbox"
                      checked={requiresAcknowledgment}
                      onChange={(e) => setRequiresAcknowledgment(e.target.checked)}
                      disabled={isLoading}
                    />
                    <span className="toggle-switch-track" />
                    <span className="ml-3 text-sm text-gray-300">Requires Acknowledgment</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mt-1 ml-[3.25rem] leading-snug">
                    Your team confirms they've read this. Good for anything safety-related or legally required.
                  </p>
                </div>

                {requiresAcknowledgment && (
                  <>
                    <div className="pl-2">
                      <label className="toggle-switch soft">
                        <input
                          type="checkbox"
                          checked={recertificationRequired}
                          onChange={(e) => setRecertificationRequired(e.target.checked)}
                          disabled={isLoading}
                        />
                        <span className="toggle-switch-track" />
                        <span className="ml-3 text-sm text-gray-300">Requires Recertification</span>
                      </label>
                      <p className="text-[11px] text-gray-500 mt-1 ml-[3.25rem] leading-snug">
                        Re-asks periodically. Turn this on for food safety, WHMIS, or anything your team should review more than once.
                      </p>
                    </div>

                    {recertificationRequired && (
                      <div className="pl-2 pt-0.5">
                        <select
                          value={recertificationInterval}
                          onChange={(e) =>
                            setRecertificationInterval(e.target.value as RecertificationInterval)
                          }
                          className="input w-full text-sm"
                          disabled={isLoading}
                        >
                          {RECERTIFICATION_OPTIONS.filter((o) => o.value !== "none").map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        {recertificationInterval === "custom" && (
                          <input
                            type="number"
                            value={customDays || ""}
                            onChange={(e) => setCustomDays(Number(e.target.value) || undefined)}
                            placeholder="Number of days"
                            min="1"
                            className="input w-full text-sm mt-2"
                            disabled={isLoading}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* APPLICABILITY CARD */}
      {/* ================================================================== */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
          <div className={`w-8 h-8 rounded-lg ${colorClasses.cyan.bg} flex items-center justify-center`}>
            <Users className={`w-4 h-4 ${colorClasses.cyan.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-white">Applicability</h3>
            <p className="text-xs text-gray-500">Who needs to acknowledge this policy</p>
          </div>
        </div>

        {/* Expandable Guidance */}
        <div className={`expandable-info-section ${expandedGuidance.applicability ? "expanded" : ""}`}>
          <button
            onClick={() => toggleGuidance("applicability")}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">How does this work?</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-2 text-sm text-gray-400">
              <p><strong className="text-gray-300">Who needs to acknowledge?</strong> You can target specific groups, or leave all sections empty to require acknowledgment from everyone.</p>
              <p><strong className="text-gray-300">Departments:</strong> High-level team groupings (e.g., "Back of House", "Front of House").</p>
              <p><strong className="text-gray-300">Scheduled Roles:</strong> Job titles used for scheduling (e.g., "Dish", "Line Cook", "Server").</p>
              <p><strong className="text-gray-300">Kitchen Stations:</strong> Specific workstations (e.g., "Grill", "Fryer", "Cold Prep"). Useful for station-specific SOPs.</p>
              <p className="text-cyan-400/80"><strong>Example:</strong> A "Chemical Safety" policy might only apply to "Dish" station. A "Food Allergen" policy applies to everyone.</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4 space-y-6">
          <p className="text-sm text-gray-500">
            Leave all sections empty to apply this policy to all team members.
          </p>

          {/* Departments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-gray-300">Departments</span>
              {applicableDepartments.length > 0 && (
                <span className="text-xs text-amber-400">
                  ({applicableDepartments.length} selected)
                </span>
              )}
            </div>
            {departments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {departments.map((dept: string) => (
                  <PillButton
                    key={dept}
                    label={dept}
                    isSelected={applicableDepartments.includes(dept)}
                    onClick={() => toggleDepartment(dept)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No departments configured - set up in Operations &gt; Variables
              </p>
            )}
          </div>

          {/* Scheduled Roles */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Scheduled Roles</span>
              {applicableScheduledRoles.length > 0 && (
                <span className="text-xs text-blue-400">
                  ({applicableScheduledRoles.length} selected)
                </span>
              )}
            </div>
            {scheduledRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {scheduledRoles.map((role: string) => (
                  <PillButton
                    key={role}
                    label={role}
                    isSelected={applicableScheduledRoles.includes(role)}
                    onClick={() => toggleScheduledRole(role)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No scheduled roles configured - set up in Operations &gt; Variables
              </p>
            )}
          </div>

          {/* Kitchen Stations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ChefHat className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-gray-300">Kitchen Stations</span>
              {applicableKitchenStations.length > 0 && (
                <span className="text-xs text-emerald-400">
                  ({applicableKitchenStations.length} selected)
                </span>
              )}
            </div>
            {kitchenStations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {kitchenStations.map((station: string) => (
                  <PillButton
                    key={station}
                    label={station}
                    isSelected={applicableKitchenStations.includes(station)}
                    onClick={() => toggleKitchenStation(station)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No kitchen stations configured - set up in Operations &gt; Variables
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ERROR DISPLAY */}
      {/* ================================================================== */}
      {error && (
        <div className="card p-4 border-rose-500/30 bg-rose-500/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* KEYBOARD SHORTCUTS HINT */}
      {/* ================================================================== */}
      <div className="text-center text-xs text-gray-500">
        <span className="inline-flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">Esc</kbd> Cancel
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">Ctrl+S</kbd> Save Draft
          </span>
        </span>
      </div>

      {/* Spacer for floating action bar */}
      {isDirty && <div className="h-20" />}

      {/* ================================================================== */}
      {/* FLOATING ACTION BAR (replaces static buttons when dirty) */}
      {/* ================================================================== */}
      {isDirty && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <span className="flex items-center gap-1.5 text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                Unsaved changes
              </span>
              <div className="w-px h-6 bg-gray-700" />
              <button
                onClick={handleReset}
                className="btn-ghost text-sm py-1.5 px-4"
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </button>
              <button
                onClick={onCancel}
                className="btn-ghost text-sm py-1.5 px-4"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit('draft')}
                className="btn-ghost text-sm py-1.5 px-4 border border-gray-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <FilePenLine className="w-4 h-4 mr-1" />
                )}
                Save Draft
              </button>
              <button
                onClick={() => handleSubmit('published')}
                className="btn-primary text-sm py-1.5 px-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Send className="w-4 h-4 mr-1" />
                )}
                {isEditMode ? "Update & Publish" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STATIC ACTION BUTTONS (only when NOT dirty)                       */}
      {/* Edit mode: nothing changed — just show back button.                */}
      {/* New mode: show full action bar as initial call-to-action.          */}
      {/* ================================================================== */}
      {!isDirty && isEditMode && (
        <div className="card p-4">
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="btn-ghost text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Policies
            </button>
          </div>
        </div>
      )}
      {!isDirty && !isEditMode && (
        <div className="card p-4">
          <div className="flex justify-between">
            <button
              onClick={onCancel}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit('draft')}
                className="btn-ghost border border-gray-600"
                disabled={isLoading}
              >
                <FilePenLine className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => handleSubmit('published')}
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
