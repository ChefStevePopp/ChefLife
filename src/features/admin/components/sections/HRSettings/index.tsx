import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale,
  ArrowLeft,
  FileText,
  Briefcase,
  ClipboardList,
  Award,
  Info,
  ChevronUp,
  Save,
  Loader2,
  Upload,
  Settings,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";
import { DEFAULT_HR_CONFIG, DEFAULT_POLICY_CATEGORIES, type HRConfig, type PolicyTemplate } from "@/types/modules";
import { PolicyCard } from "./components/PolicyCard";
import { PolicyUploadForm } from "./components/PolicyUploadForm";
import { CategoryManager } from "./components/CategoryManager";
import { useDiagnostics } from "@/hooks/useDiagnostics";

// =============================================================================
// HR SETTINGS - L5 Module Configuration
// =============================================================================
// Reference: VendorInvoiceManager.tsx - L5 Design Patterns
// Location: Admin → Modules → HR & Policies
// Tab Identity: indigo (Scale icon)
// =============================================================================

type TabId = "policies" | "job_descriptions" | "onboarding" | "compliance" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
  comingSoon?: boolean;
}

const TABS: Tab[] = [
  {
    id: "policies",
    label: "Policies & Procedures",
    icon: FileText,
    color: "primary",
  },
  {
    id: "job_descriptions",
    label: "Job Descriptions",
    icon: Briefcase,
    color: "amber",
    comingSoon: true,
  },
  {
    id: "onboarding",
    label: "Onboarding",
    icon: ClipboardList,
    color: "green",
    comingSoon: true,
  },
  {
    id: "compliance",
    label: "Certifications",
    icon: Award,
    color: "rose",
    comingSoon: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    color: "purple",
  },
];

export const HRSettings: React.FC = () => {
  const navigate = useNavigate();
  const { showDiagnostics } = useDiagnostics();
  const { organizationId, securityLevel, user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("policies");
  const [organization, setOrganization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // HR config state
  const [hrConfig, setHrConfig] = useState<HRConfig>(DEFAULT_HR_CONFIG);
  const [originalHrConfig, setOriginalHrConfig] = useState<HRConfig>(DEFAULT_HR_CONFIG);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch organization data
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("id, modules, settings")
          .eq("id", organizationId)
          .single();

        if (error) throw error;
        setOrganization(data);

        // Load HR config from modules (with fallback to settings for backward compatibility)
        const modules = (data as any)?.modules || {};
        const settings = (data as any)?.settings || {};
        const hrConfigData = modules.hr?.config || settings.hr?.config;

        if (hrConfigData) {
          setHrConfig(hrConfigData);
          setOriginalHrConfig(hrConfigData);
        }
      } catch (error) {
        console.error("Error fetching organization:", error);
        toast.error("Failed to load organization data");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchOrganization();
    }
  }, [organizationId, authLoading]);

  // Save configuration
  // IMPORTANT: Re-fetch from DB before saving to avoid stomping on policyList
  // that PolicyUploadForm may have written since this component mounted.
  const handleSave = async () => {
    if (!organizationId || !user) return;

    setIsSaving(true);
    try {
      // Fresh read — PolicyUploadForm saves policyList directly to DB,
      // so our local `organization` state may be stale.
      const { data: freshOrg, error: fetchError } = await supabase
        .from("organizations")
        .select("modules")
        .eq("id", organizationId)
        .single();

      if (fetchError) throw fetchError;

      const freshModules = freshOrg?.modules || {};
      const freshHrConfig = freshModules.hr?.config || {};

      // Merge: overlay our settings state, but ALWAYS preserve policyList
      // from fresh DB read (PolicyUploadForm writes policyList directly to DB,
      // so our local hrConfig copy may be stale).
      const mergedConfig = {
        ...freshHrConfig,  // Base: everything currently in DB
        ...hrConfig,       // Overlay: local settings changes (policies obj, jobDescriptions, etc.)
        policyList: freshHrConfig.policyList ?? hrConfig.policyList,  // Fresh wins
      };

      const updatedModules = {
        ...freshModules,
        hr: {
          ...freshModules.hr,
          config: mergedConfig,
        },
      };

      const { error } = await supabase
        .from("organizations")
        .update({
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (error) throw error;

      // Update local state
      setOrganization((prev: any) => ({ ...prev, modules: updatedModules }));
      setHasChanges(false);
      setHasUnsavedChanges(false);
      setOriginalHrConfig(hrConfig);

      // Log to NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: "settings_changed",
        details: {
          module: "hr",
          section: activeTab,
          action: "configuration_updated",
        },
      });

      toast.success("HR settings saved");
    } catch (error) {
      console.error("Error saving HR config:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading HR settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/HRSettings/index.tsx
        </div>
      )}

      {/* ========================================================================
       * L5 HEADER CARD
       * Reference: VendorInvoiceManager.tsx
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Back + Icon/Title + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/modules")}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Scale className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  HR & Policies
                </h1>
                <p className="text-gray-400 text-sm">
                  Manage policies, job descriptions, and compliance tracking
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/admin/policies")}
                className="btn-ghost text-purple-400 hover:text-purple-300 border border-purple-500/30"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Compliance Dashboard
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`btn ${
                  hasChanges
                    ? "btn-primary"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 slide-in-from-left-2" />
                )}
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Expandable Info Section */}
          <div className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  About HR & Policies Module
                </span>
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-3">
                <p className="text-sm text-gray-400">
                  Centralize your HR documentation with policy acknowledgment tracking,
                  job descriptions, onboarding checklists, and certification compliance.
                  Every acknowledgment is timestamped and audit-ready.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-primary-400">Policies</span>
                    <p className="text-xs text-gray-500 mt-1">Upload & track acknowledgments</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-amber-400">Job Descriptions</span>
                    <p className="text-xs text-gray-500 mt-1">Define roles & responsibilities</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-green-400">Onboarding</span>
                    <p className="text-xs text-gray-500 mt-1">New hire checklists</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-rose-400">Certifications</span>
                    <p className="text-xs text-gray-500 mt-1">Track expiry & renewals</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
       * L5 TABS + CONTENT CARD
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex flex-wrap items-center gap-2 p-4">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.comingSoon && setActiveTab(tab.id)}
                  disabled={tab.comingSoon}
                  className={`tab ${tab.color} ${isActive ? "active" : ""} ${
                    tab.comingSoon ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.comingSoon && (
                    <span className="ml-1 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "policies" && <PoliciesTabContent />}

          {activeTab === "job_descriptions" && (
            <ComingSoonContent
              icon={Briefcase}
              title="Job Descriptions"
              description="Define roles, responsibilities, and requirements for each position. Link to team members for clarity."
              color="amber"
            />
          )}

          {activeTab === "onboarding" && (
            <ComingSoonContent
              icon={ClipboardList}
              title="Onboarding Checklists"
              description="Create standardized onboarding workflows with document requirements, training tasks, and orientation steps."
              color="green"
            />
          )}

          {activeTab === "compliance" && (
            <ComingSoonContent
              icon={Award}
              title="Certification Tracking"
              description="Track Food Handler, First Aid, Smart Serve, and other required certifications with automatic expiry alerts."
              color="rose"
            />
          )}

          {activeTab === "settings" && (
            <SettingsTabContent
              config={hrConfig}
              onConfigChange={(updates) => {
                setHrConfig((prev) => ({ ...prev, ...updates }));
                setHasChanges(true);
                setHasUnsavedChanges(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Floating Action Bar - Unsaved Changes */}
      {hasUnsavedChanges && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-gray-300">
                You have unsaved changes
              </span>
              <div className="w-px h-6 bg-gray-700" />
              <button
                onClick={() => {
                  setHrConfig(originalHrConfig);
                  setHasChanges(false);
                  setHasUnsavedChanges(false);
                }}
                className="btn-ghost text-sm py-1.5 px-4"
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  await handleSave();
                  setHasUnsavedChanges(false);
                  setOriginalHrConfig(hrConfig);
                }}
                disabled={isSaving}
                className="btn-primary text-sm py-1.5 px-4"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 slide-in-from-left-2" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// POLICIES TAB CONTENT
// =============================================================================

const PoliciesTabContent: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, securityLevel, user } = useAuth();
  const [viewMode, setViewMode] = useState<"list" | "upload" | "edit">("list");
  const [editingPolicy, setEditingPolicy] = useState<PolicyTemplate | null>(null);
  const [policies, setPolicies] = useState<PolicyTemplate[]>([]);
  const [policyCategories, setPolicyCategories] = useState<import("@/types/modules").PolicyCategoryConfig[]>(DEFAULT_POLICY_CATEGORIES);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Permission check
  const canManagePolicies =
    securityLevel !== undefined && securityLevel <= SECURITY_LEVELS.BRAVO;

  // Fetch policies on mount
  useEffect(() => {
    const fetchPolicies = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("modules, settings")
          .eq("id", organizationId)
          .single();

        if (error) throw error;

        // Check modules first, fall back to settings for backward compatibility
        const modules = (data as any)?.modules || {};
        const settings = (data as any)?.settings || {};
        const hrConfig = modules.hr?.config || settings.hr?.config || {};

        // Load dynamic categories for PolicyCard display
        const cats = hrConfig.policies?.policyCategories;
        if (cats && Array.isArray(cats) && cats.length > 0) {
          setPolicyCategories(cats);
        }

        // ---------------------------------------------------------------
        // READ POLICIES from policyList (correct location).
        // Migration: if policyList is empty, rescue data from the old
        // "policies" key where PolicyUploadForm used to save them.
        // That key is supposed to be the settings object, but older
        // saves put the array there, and category edits mangled it
        // into {0: {policy}, policyCategories: [...]}.
        // ---------------------------------------------------------------
        let policyArray: PolicyTemplate[] = [];

        const policyListExists = Array.isArray(hrConfig.policyList) && hrConfig.policyList.length > 0;

        if (policyListExists) {
          // New canonical location
          policyArray = hrConfig.policyList;
        } else {
          // Migration: check the old "policies" key
          const legacy = hrConfig.policies;
          if (Array.isArray(legacy)) {
            policyArray = legacy;
          } else if (legacy && typeof legacy === "object") {
            // Mangled object — extract anything that looks like a policy
            policyArray = Object.values(legacy).filter(
              (p: any) => p && typeof p === "object" && p.id && p.title
            ) as PolicyTemplate[];
          }

          // NOTE: If reading from legacy location, run SQL migration
          // 20260203_migrate_policies_to_policylist.sql to fix permanently.
          // This read fallback keeps the UI working until that migration runs.
          if (policyArray.length > 0) {
            console.warn(
              `[HR] Read ${policyArray.length} policy(ies) from legacy location. ` +
              `Run SQL migration 20260203_migrate_policies_to_policylist.sql to fix permanently.`
            );
          }
        }

        // Validate shape & deduplicate by id
        const seen = new Set<string>();
        setPolicies(
          policyArray.filter((p: any) => {
            if (!p || typeof p !== "object" || !p.id || !p.title) return false;
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          })
        );
      } catch (error) {
        console.error("Error fetching policies:", error);
        toast.error("Failed to load policies");
      }
    };

    fetchPolicies();
  }, [organizationId, viewMode]);

  // Handle viewing PDF
  const handleViewPDF = (policy: PolicyTemplate) => {
    if (policy.documentUrl) {
      window.open(policy.documentUrl, "_blank");
    } else {
      toast.error("No PDF document available");
    }
  };

  // Handle edit
  const handleEdit = (policy: PolicyTemplate) => {
    setEditingPolicy(policy);
    setViewMode("edit");
  };

  // Handle delete
  const handleDelete = async (policy: PolicyTemplate) => {
    if (!organizationId) return;

    // Two-stage confirmation
    if (confirmDelete !== policy.id) {
      setConfirmDelete(policy.id);
      setTimeout(() => setConfirmDelete(null), 5000);
      return;
    }

    setIsDeleting(policy.id);

    try {
      // Fetch current organization data
      const { data: org, error: fetchError } = await supabase
        .from("organizations")
        .select("modules")
        .eq("id", organizationId)
        .single();

      if (fetchError) throw fetchError;

      // Remove policy from policyList (canonical location)
      const currentModules = org?.modules || {};
      const currentHrConfig = currentModules.hr?.config || {};

      // Read from policyList, with migration fallback from old "policies" key
      let currentPolicies: PolicyTemplate[] = [];
      if (Array.isArray(currentHrConfig.policyList)) {
        currentPolicies = currentHrConfig.policyList;
      } else if (Array.isArray(currentHrConfig.policies)) {
        currentPolicies = currentHrConfig.policies;
      } else if (currentHrConfig.policies && typeof currentHrConfig.policies === "object") {
        currentPolicies = Object.values(currentHrConfig.policies).filter(
          (p: any) => p && typeof p === "object" && p.id && p.title
        ) as PolicyTemplate[];
      }

      const updatedPolicies = currentPolicies.filter(
        (p: PolicyTemplate) => p.id !== policy.id
      );

      // Build updated modules — save to policyList, leave policies (settings) untouched
      const updatedModules = {
        ...currentModules,
        hr: {
          ...currentModules.hr,
          config: {
            ...currentHrConfig,
            policyList: updatedPolicies,
          },
        },
      };

      // Save to database
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (updateError) throw updateError;

      // NEXUS audit logging
      if (user) {
        await nexus({
          organization_id: organizationId!,
          user_id: user.id,
          activity_type: "policy_deleted",
          details: {
            policy_id: policy.id,
            policy_title: policy.title,
            version: policy.version,
          },
        });
      }

      toast.success(`Policy "${policy.title}" deleted`);
      setPolicies(updatedPolicies);
      setConfirmDelete(null);
    } catch (error: any) {
      console.error("Error deleting policy:", error);
      toast.error(`Failed to delete policy: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle save callback
  const handleSaveComplete = () => {
    setViewMode("list");
    setEditingPolicy(null);
  };

  // Handle cancel callback
  const handleCancel = () => {
    setViewMode("list");
    setEditingPolicy(null);
  };

  return (
    <div className="space-y-6">
      {viewMode === "list" ? (
        <>
          {/* Subheader */}
          <div className="subheader">
            <div className="subheader-row">
              <div className="subheader-left">
                <div className="subheader-icon-box primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="subheader-title">Policy Library</h3>
                  <p className="subheader-subtitle">
                    Upload and manage company policy documents
                  </p>
                </div>
              </div>
              {canManagePolicies && (
                <div className="subheader-right">
                  <span className="subheader-pill">
                    <span className="subheader-pill-value">{policies.length}</span>
                    <span className="subheader-pill-label">
                      {policies.length === 1 ? "Policy" : "Policies"}
                    </span>
                  </span>
                  <div className="subheader-divider" />
                  <button
                    onClick={() => setViewMode("upload")}
                    className="btn-primary"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Policy</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Policy Grid or Empty State */}
          {!Array.isArray(policies) || policies.length === 0 ? (
            <div className="card p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-xl bg-gray-700/50 flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  No Policies Yet
                </h3>
                <p className="text-gray-400 text-sm max-w-md mb-6">
                  Upload your first policy document to begin tracking team
                  acknowledgments and compliance.
                </p>
                {canManagePolicies && (
                  <button
                    onClick={() => setViewMode("upload")}
                    className="btn-primary"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Your First Policy</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map((policy) => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  categories={policyCategories}
                  onView={() => handleViewPDF(policy)}
                  onEdit={() => handleEdit(policy)}
                  onDelete={() => handleDelete(policy)}
                  isDeleting={isDeleting === policy.id}
                  confirmDelete={confirmDelete === policy.id}
                />
              ))}
            </div>
          )}

          {/* Compliance Dashboard Link */}
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-purple-300">
                  Track Team Compliance
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  View acknowledgment status, overdue recertifications, and team
                  compliance metrics in the{" "}
                  <button
                    onClick={() => navigate("/admin/policies")}
                    className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
                  >
                    Compliance Dashboard
                  </button>
                  .
                </p>
              </div>
            </div>
          </div>
        </>
      ) : viewMode === "upload" ? (
        <PolicyUploadForm onCancel={handleCancel} onSave={handleSaveComplete} />
      ) : viewMode === "edit" && editingPolicy ? (
        <PolicyUploadForm
          editingPolicy={editingPolicy}
          onCancel={handleCancel}
          onSave={handleSaveComplete}
        />
      ) : null}
    </div>
  );
};

// =============================================================================
// SETTINGS TAB CONTENT
// =============================================================================

interface SettingsTabContentProps {
  config: HRConfig;
  onConfigChange: (updates: Partial<HRConfig>) => void;
}

const SettingsTabContent: React.FC<SettingsTabContentProps> = ({
  config,
  onConfigChange,
}) => {
  // Category state — seed with sensible defaults if user hasn't customized yet.
  // L6: Ship smart, let them make it theirs.
  const currentCategories =
    config.policies?.policyCategories && config.policies.policyCategories.length > 0
      ? config.policies.policyCategories
      : DEFAULT_POLICY_CATEGORIES;

  const handleCategoriesChange = (updated: import("@/types/modules").PolicyCategoryConfig[]) => {
    onConfigChange({
      policies: {
        ...config.policies,
        policyCategories: updated,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box purple">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="subheader-title">Policy Settings</h3>
              <p className="subheader-subtitle">
                Configure defaults for acknowledgments and reminders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* CATEGORY MANAGEMENT                                           */}
      {/* ============================================================= */}
      <CategoryManager
        categories={currentCategories}
        onCategoriesChange={handleCategoriesChange}
      />

      {/* Settings Card */}
      <div className="card">
        <div className="p-6 space-y-6">
          {/* Default Recertification Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Recertification Interval
            </label>
            <select
              value={config.policies?.defaultRecertificationInterval || 'none'}
              onChange={(e) =>
                onConfigChange({
                  policies: {
                    ...config.policies,
                    defaultRecertificationInterval: e.target.value as any,
                  },
                })
              }
              className="input w-full max-w-xs"
            >
              <option value="none">One-time (no recertification)</option>
              <option value="30_days">Every 30 days</option>
              <option value="90_days">Every 90 days</option>
              <option value="180_days">Every 6 months</option>
              <option value="annual">Annual</option>
              <option value="biennial">Every 2 years</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              New policies will use this interval by default.
            </p>
          </div>

          {/* Digital Signatures Toggle */}
          <div className="flex items-center justify-between max-w-xs">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Digital Signatures
              </label>
              <p className="text-xs text-gray-500">
                Require signature when acknowledging
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.policies?.digitalSignaturesEnabled || false}
                onChange={(e) =>
                  onConfigChange({
                    policies: {
                      ...config.policies,
                      digitalSignaturesEnabled: e.target.checked,
                    },
                  })
                }
              />
              <span className="toggle-switch-track" />
            </label>
          </div>

          {/* Reminder Days */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reminder Schedule (days before due)
            </label>
            <div className="flex flex-wrap gap-2">
              {[30, 14, 7, 3, 1].map((day) => {
                const isSelected =
                  (config.policies?.reminderDaysBefore || []).includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => {
                      const newDays = isSelected
                        ? (config.policies?.reminderDaysBefore || []).filter(
                            (d) => d !== day
                          )
                        : [...(config.policies?.reminderDaysBefore || []), day].sort(
                            (a, b) => b - a
                          );
                      onConfigChange({
                        policies: {
                          ...config.policies,
                          reminderDaysBefore: newDays,
                        },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-primary-500/30 text-primary-300 border border-primary-500/50"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent"
                    }`}
                  >
                    {day} {day === 1 ? "day" : "days"}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Team members receive reminders at these intervals before
              acknowledgment is due.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMING SOON PLACEHOLDER
// =============================================================================

interface ComingSoonContentProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: "amber" | "green" | "rose" | "purple";
}

const ComingSoonContent: React.FC<ComingSoonContentProps> = ({
  icon: Icon,
  title,
  description,
  color,
}) => {
  const colorClasses = {
    amber: "bg-amber-500/20 text-amber-400",
    green: "bg-green-500/20 text-green-400",
    rose: "bg-rose-500/20 text-rose-400",
    purple: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="card p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}
        >
          <Icon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 max-w-md mb-4">{description}</p>
        <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide bg-amber-500/20 text-amber-400">
          Coming Soon
        </span>
      </div>
    </div>
  );
};
