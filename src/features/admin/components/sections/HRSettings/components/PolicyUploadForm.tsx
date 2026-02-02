import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FileText,
  X,
  Info,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  AlertTriangle,
  Calendar,
  CheckCircle,
  RefreshCw,
  Check,
  Save,
  RotateCcw,
  User,
  Building2,
  Briefcase,
  ChefHat,
  ClipboardCheck,
  Users,
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
  PolicyTemplate,
  RecertificationInterval,
  ReviewSchedule,
  PolicyCategoryConfig,
} from "@/types/modules";

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
  editingPolicy?: PolicyTemplate | null;
  onCancel: () => void;
  onSave: () => void;
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
  violet: { bg: "bg-violet-500/20", text: "text-violet-400" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-400" },
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
  const [category, setCategory] = useState(editingPolicy?.category || "general");
  const [version, setVersion] = useState(editingPolicy?.version || "1.0");

  // Policy dates
  const [effectiveDate, setEffectiveDate] = useState(
    editingPolicy?.effectiveDate
      ? new Date(editingPolicy.effectiveDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [preparedDate, setPreparedDate] = useState(
    editingPolicy?.preparedDate
      ? new Date(editingPolicy.preparedDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [lastRevisionDate, setLastRevisionDate] = useState(
    editingPolicy?.lastRevisionDate
      ? new Date(editingPolicy.lastRevisionDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  // Authorship
  const [preparedBy, setPreparedBy] = useState(editingPolicy?.preparedBy || "");
  const [authorTitle, setAuthorTitle] = useState(editingPolicy?.authorTitle || "");

  // Review schedule
  const [reviewSchedule, setReviewSchedule] = useState<ReviewSchedule>(
    editingPolicy?.reviewSchedule || "annual"
  );

  // Acknowledgment
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(
    editingPolicy?.requiresAcknowledgment ?? true
  );
  const [recertificationRequired, setRecertificationRequired] = useState(
    editingPolicy?.recertification.required ?? false
  );
  const [recertificationInterval, setRecertificationInterval] =
    useState<RecertificationInterval>(editingPolicy?.recertification.interval || "none");
  const [customDays, setCustomDays] = useState<number | undefined>(
    editingPolicy?.recertification.customDays
  );

  // Applicability
  const [applicableDepartments, setApplicableDepartments] = useState<string[]>(
    editingPolicy?.applicableDepartments || []
  );
  const [applicableScheduledRoles, setApplicableScheduledRoles] = useState<string[]>(
    editingPolicy?.applicableScheduledRoles || []
  );
  const [applicableKitchenStations, setApplicableKitchenStations] = useState<string[]>(
    editingPolicy?.applicableKitchenStations || []
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

  // ---------------------------------------------------------------------------
  // INITIAL STATE SNAPSHOT (for dirty tracking)
  // ---------------------------------------------------------------------------
  const initialStateRef = useRef({
    file: null as File | null,
    title: editingPolicy?.title || "",
    description: editingPolicy?.description || "",
    category: editingPolicy?.category || "general",
    version: editingPolicy?.version || "1.0",
    effectiveDate: editingPolicy?.effectiveDate
      ? new Date(editingPolicy.effectiveDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    preparedDate: editingPolicy?.preparedDate
      ? new Date(editingPolicy.preparedDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    lastRevisionDate: editingPolicy?.lastRevisionDate
      ? new Date(editingPolicy.lastRevisionDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    preparedBy: editingPolicy?.preparedBy || "",
    authorTitle: editingPolicy?.authorTitle || "",
    reviewSchedule: editingPolicy?.reviewSchedule || "annual",
    requiresAcknowledgment: editingPolicy?.requiresAcknowledgment ?? true,
    recertificationRequired: editingPolicy?.recertification.required ?? false,
    recertificationInterval: editingPolicy?.recertification.interval || "none",
    customDays: editingPolicy?.recertification.customDays,
    applicableDepartments: editingPolicy?.applicableDepartments || [],
    applicableScheduledRoles: editingPolicy?.applicableScheduledRoles || [],
    applicableKitchenStations: editingPolicy?.applicableKitchenStations || [],
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
      // Escape → Cancel
      if (e.key === "Escape" && !isLoading) {
        e.preventDefault();
        onCancel();
      }
      // Cmd/Ctrl + S → Save
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && !isLoading) {
        e.preventDefault();
        handleSubmit();
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

  // Auto-increment version when editing and uploading new PDF
  useEffect(() => {
    if (isEditMode && file && editingPolicy) {
      const [major, minor] = editingPolicy.version.split(".").map(Number);
      const newMinor = minor + 1;
      if (newMinor >= 10) {
        setVersion(`${major + 1}.0`);
      } else {
        setVersion(`${major}.${newMinor}`);
      }
      setLastRevisionDate(new Date().toISOString().split("T")[0]);
    }
  }, [file, isEditMode, editingPolicy]);

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
    if (!version.match(/^\d+\.\d+$/)) return "Version must be in format X.Y (e.g., 1.0)";
    if (!effectiveDate) return "Effective date is required";
    if (!preparedDate) return "Prepared date is required";
    if (!lastRevisionDate) return "Last revision date is required";
    if (!preparedBy.trim()) return "Prepared by is required";
    if (!isEditMode && !file) return "PDF document is required";
    if (recertificationRequired && recertificationInterval === "custom" && !customDays) {
      return "Custom recertification days is required";
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------------------------
  const handleSubmit = async () => {
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

    setIsLoading(true);
    setError(null);

    try {
      let documentUrl = editingPolicy?.documentUrl || null;

      if (file) {
        documentUrl = await policyService.uploadPolicyDocument(file, organizationId);

        if (isEditMode && editingPolicy?.documentUrl) {
          try {
            await policyService.deletePolicyDocument(editingPolicy.documentUrl);
          } catch (error) {
            console.error("Failed to delete old PDF:", error);
          }
        }
      }

      const calculateNextReviewDate = (): string => {
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
            return "";
        }
        return revisionDate.toISOString();
      };

      const now = new Date().toISOString();
      const policyData: PolicyTemplate = {
        id: editingPolicy?.id || crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        category,
        documentUrl,
        version: version.trim(),
        effectiveDate: new Date(effectiveDate).toISOString(),
        preparedDate: new Date(preparedDate).toISOString(),
        lastRevisionDate: new Date(lastRevisionDate).toISOString(),
        preparedBy: preparedBy.trim(),
        authorTitle: authorTitle.trim() || undefined,
        reviewSchedule,
        nextReviewDate: calculateNextReviewDate() || undefined,
        requiresAcknowledgment,
        recertification: {
          required: recertificationRequired,
          interval: recertificationRequired ? recertificationInterval : "none",
          customDays: recertificationInterval === "custom" ? customDays : undefined,
        },
        applicableDepartments,
        applicableScheduledRoles,
        applicableKitchenStations,
        isActive: true,
        createdAt: editingPolicy?.createdAt || now,
        createdBy: editingPolicy?.createdBy || user.id,
        updatedAt: now,
        updatedBy: user.id,
      };

      const { data: org, error: fetchError } = await supabase
        .from("organizations")
        .select("modules, settings")
        .eq("id", organizationId)
        .single();

      if (fetchError) throw fetchError;

      // Check modules first, fall back to settings for backward compatibility
      const currentModules = org?.modules || {};
      const currentSettings = org?.settings || {};
      const currentHrConfig = currentModules.hr?.config || currentSettings.hr?.config || {};
      const currentPolicies = Array.isArray(currentHrConfig.policies)
        ? currentHrConfig.policies
        : [];

      let updatedPolicies: PolicyTemplate[];
      if (isEditMode) {
        updatedPolicies = currentPolicies.map((p: PolicyTemplate) =>
          p.id === policyData.id ? policyData : p
        );
      } else {
        updatedPolicies = [...currentPolicies, policyData];
      }

      const updatedModules = {
        ...currentModules,
        hr: {
          ...currentModules.hr,
          config: {
            ...currentHrConfig,
            policies: updatedPolicies,
          },
        },
      };

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          modules: updatedModules,
          updated_at: now,
        })
        .eq("id", organizationId);

      if (updateError) throw updateError;

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: isEditMode ? "policy_updated" : "policy_uploaded",
        details: {
          policy_id: policyData.id,
          policy_title: policyData.title,
          category: policyData.category,
          version: policyData.version,
          prepared_by: policyData.preparedBy,
          review_schedule: policyData.reviewSchedule,
          file_name: file?.name,
          file_size: file?.size,
          ...(isEditMode && {
            old_version: editingPolicy?.version,
            new_version: policyData.version,
          }),
        },
      });

      toast.success(
        isEditMode
          ? `Policy "${policyData.title}" updated successfully!`
          : `Policy "${policyData.title}" created successfully!`
      );

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

        {/* Card Skeletons */}
        <SkeletonCard lines={1} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
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
          <div className="subheader-right">
            <button
              onClick={onCancel}
              className="btn-ghost px-2"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

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
              <p><strong className="text-gray-300">Tip:</strong> If you're updating an existing policy, upload the new version here — the system will automatically increment the version number.</p>
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

          {isEditMode && !file && editingPolicy?.documentUrl && (
            <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-300">Current Document</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingPolicy.documentUrl.split("/").pop()}
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
            <p className="text-xs text-gray-500">Title, category, and description</p>
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
              <p><strong className="text-gray-300">Version:</strong> Use format like "1.0" for new policies. When you make significant changes, increment to "2.0". Minor updates go to "1.1", "1.2", etc.</p>
              <p><strong className="text-gray-300">Description:</strong> A brief summary of what this policy covers — this appears in the policy library listing.</p>
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
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                className="input w-full"
                disabled={isLoading || (isEditMode && !!file)}
              />
              {isEditMode && file && (
                <p className="text-xs text-amber-400 mt-1">
                  Auto-incremented from v{editingPolicy?.version}
                </p>
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
                rows={2}
                className="input w-full resize-none"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* POLICY DATES CARD */}
      {/* ================================================================== */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
          <div className={`w-8 h-8 rounded-lg ${colorClasses.emerald.bg} flex items-center justify-center`}>
            <Calendar className={`w-4 h-4 ${colorClasses.emerald.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-white">Policy Dates</h3>
            <p className="text-xs text-gray-500">When the policy takes effect and was last updated</p>
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
              <span className="text-sm font-medium text-gray-300">What do these dates mean?</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-2 text-sm text-gray-400">
              <p><strong className="text-gray-300">Effective Date:</strong> When this policy goes into effect. Team members are expected to comply from this date forward.</p>
              <p><strong className="text-gray-300">Prepared Date:</strong> When the policy was originally written. This could be months or years before the effective date.</p>
              <p><strong className="text-gray-300">Last Revision Date:</strong> When the policy content was last updated. This is used to calculate when the next review is due.</p>
              <p className="text-amber-400/80"><strong>Ontario requirement:</strong> The "Disconnecting from Work" policy requires a prepared date on the document itself.</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>
      </div>

      {/* ================================================================== */}
      {/* AUTHORSHIP CARD */}
      {/* ================================================================== */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
          <div className={`w-8 h-8 rounded-lg ${colorClasses.violet.bg} flex items-center justify-center`}>
            <User className={`w-4 h-4 ${colorClasses.violet.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-white">Authorship</h3>
            <p className="text-xs text-gray-500">Who prepared this policy</p>
          </div>
        </div>

        {/* Expandable Guidance */}
        <div className={`expandable-info-section ${expandedGuidance.authorship ? "expanded" : ""}`}>
          <button
            onClick={() => toggleGuidance("authorship")}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">Who should I put here?</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-2 text-sm text-gray-400">
              <p><strong className="text-gray-300">Prepared By:</strong> The person who wrote or is responsible for this policy. This appears on the policy document header.</p>
              <p><strong className="text-gray-300">Author Title:</strong> The role or position of the author (e.g., "Chef/Owner", "HR Manager", "General Manager"). Adds authority to the document.</p>
              <p><strong className="text-gray-300">Note:</strong> This doesn't have to be you — it could be an HR consultant, lawyer, or corporate office that provided the policy.</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4">
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

      {/* ================================================================== */}
      {/* REVIEW & ACKNOWLEDGMENT CARD */}
      {/* ================================================================== */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-700/50">
          <div className={`w-8 h-8 rounded-lg ${colorClasses.amber.bg} flex items-center justify-center`}>
            <ClipboardCheck className={`w-4 h-4 ${colorClasses.amber.text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-medium text-white">Review & Acknowledgment</h3>
            <p className="text-xs text-gray-500">Review schedule and team acknowledgment settings</p>
          </div>
        </div>

        {/* Expandable Guidance */}
        <div className={`expandable-info-section ${expandedGuidance.review ? "expanded" : ""}`}>
          <button
            onClick={() => toggleGuidance("review")}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">What are these settings for?</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-2 text-sm text-gray-400">
              <p><strong className="text-gray-300">Policy Review Schedule:</strong> How often YOU should review this policy to make sure it's still current. "Per Annum" (yearly) is standard for most policies.</p>
              <p><strong className="text-gray-300">Requires Acknowledgment:</strong> If enabled, team members will need to confirm they've read and understood this policy.</p>
              <p><strong className="text-gray-300">Recertification:</strong> If enabled, team members will need to re-acknowledge the policy periodically (e.g., annually). Useful for safety policies.</p>
              <p className="text-amber-400/80"><strong>Tip:</strong> Food safety and workplace safety policies typically require annual recertification.</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Policy Review Schedule</label>
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
            </div>

            <div className="space-y-4">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={requiresAcknowledgment}
                  onChange={(e) => setRequiresAcknowledgment(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="toggle-switch-track" />
                <span className="ml-3 text-sm text-gray-300">Requires Acknowledgment</span>
              </label>

              {requiresAcknowledgment && (
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={recertificationRequired}
                    onChange={(e) => setRecertificationRequired(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch-track" />
                  <span className="ml-3 text-sm text-gray-300">Requires Recertification</span>
                </label>
              )}

              {requiresAcknowledgment && recertificationRequired && (
                <div className="ml-14 space-y-2">
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
                      className="input w-full text-sm"
                      disabled={isLoading}
                    />
                  )}
                </div>
              )}
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
                No departments configured — set up in Operations → Variables
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
                No scheduled roles configured — set up in Operations → Variables
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
                No kitchen stations configured — set up in Operations → Variables
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
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">⌘S</kbd> Save
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
                onClick={handleSubmit}
                className="btn-primary text-sm py-1.5 px-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    {isEditMode ? "Update Policy" : "Save Policy"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STATIC ACTION BUTTONS (only when NOT dirty) */}
      {/* ================================================================== */}
      {!isDirty && (
        <div className="card p-4">
          <div className="flex justify-between">
            <button
              onClick={onCancel}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {isEditMode ? "Update Policy" : "Save Policy"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
