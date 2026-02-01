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
  ChevronDown,
  Save,
  Loader2,
  Upload,
  Plus,
  Settings,
  ExternalLink,
  PenTool,
  Bell,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";
import { DEFAULT_HR_CONFIG, type HRConfig } from "@/types/modules";

// =============================================================================
// HR SETTINGS - L5 Module Configuration
// =============================================================================
// Configuration hub for HR & Policies module. Manage policy templates,
// job descriptions, onboarding checklists, and compliance tracking.
// =============================================================================

type TabId = "policies" | "job_descriptions" | "onboarding" | "compliance";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
  comingSoon?: boolean;
}

const TABS: Tab[] = [
  {
    id: "policies",
    label: "Policies & Procedures",
    icon: FileText,
    description: "Upload and manage company policies with acknowledgment tracking",
  },
  {
    id: "job_descriptions",
    label: "Job Descriptions",
    icon: Briefcase,
    description: "Define roles, responsibilities, and requirements",
    comingSoon: true,
  },
  {
    id: "onboarding",
    label: "Onboarding",
    icon: ClipboardList,
    description: "New hire checklists and document requirements",
    comingSoon: true,
  },
  {
    id: "compliance",
    label: "Certifications",
    icon: Award,
    description: "Track required certifications and expiry dates",
    comingSoon: true,
  },
];

export const HRSettings: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, securityLevel, user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("policies");
  const [organization, setOrganization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // HR config state
  const [hrConfig, setHrConfig] = useState<HRConfig>(DEFAULT_HR_CONFIG);

  // Fetch organization data
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", organizationId)
          .single();

        if (error) throw error;
        setOrganization(data);

        // Load HR config from modules
        const modules = data?.modules || {};
        if (modules.hr?.config) {
          setHrConfig(modules.hr.config);
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
  const handleSave = async () => {
    if (!organizationId || !user) return;

    setIsSaving(true);
    try {
      const modules = organization?.modules || {};
      const updatedModules = {
        ...modules,
        hr: {
          ...modules.hr,
          config: hrConfig,
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

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/HRSettings/index.tsx
        </div>
      )}

      {/* ========================================================================
       * L5 HEADER CARD - Configuration Screen Pattern
       * Reference: VendorInvoiceManager.tsx
       * Tab Identity: indigo
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
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Scale className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  HR & Policies Configuration
                </h1>
                <p className="text-gray-400 text-sm">
                  Module settings for policies, job descriptions, and compliance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Link to Compliance Dashboard */}
              <button
                onClick={() => navigate("/admin/policies")}
                className="btn-ghost text-indigo-400 hover:text-indigo-300 border border-indigo-500/30"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Compliance
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  hasChanges
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
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
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  About HR Module Configuration
                </span>
              </div>
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-3">
                <p className="text-sm text-gray-400">
                  Configure <span className="font-semibold">default settings</span> for your HR & Policies module.
                  These settings apply organization-wide and affect how policies are managed,
                  acknowledged, and tracked.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400/80" />
                      <span className="text-sm font-medium text-gray-300">Policies</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Acknowledgment & recertification defaults</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-400/80" />
                      <span className="text-sm font-medium text-gray-300">Job Descriptions</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Role templates & requirements</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-indigo-400/80" />
                      <span className="text-sm font-medium text-gray-300">Onboarding</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">New hire checklists & workflows</p>
                  </div>
                  <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-400/80" />
                      <span className="text-sm font-medium text-gray-300">Certifications</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Expiry tracking & compliance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        <div className="border-b border-gray-700/50">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.comingSoon && setActiveTab(tab.id)}
                disabled={tab.comingSoon}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  tab.comingSoon
                    ? "text-gray-600 cursor-not-allowed border-transparent"
                    : activeTab === tab.id
                    ? "text-indigo-400 border-indigo-400"
                    : "text-gray-400 hover:text-white border-transparent hover:border-gray-600"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.comingSoon && (
                  <span className="text-[10px] text-amber-500/70 font-medium uppercase tracking-wide px-1.5 py-0.5 bg-amber-500/10 rounded">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "policies" && (
            <PoliciesTabContent
              config={hrConfig}
              onConfigChange={(updates) => {
                setHrConfig((prev) => ({ ...prev, ...updates }));
                setHasChanges(true);
              }}
            />
          )}

          {activeTab === "job_descriptions" && (
            <ComingSoonContent
              title="Job Descriptions"
              description="Define roles and responsibilities for your team positions."
            />
          )}

          {activeTab === "onboarding" && (
            <ComingSoonContent
              title="Onboarding Checklists"
              description="Create standardized onboarding workflows for new team members."
            />
          )}

          {activeTab === "compliance" && (
            <ComingSoonContent
              title="Certification Tracking"
              description="Track required certifications like Food Handler, First Aid, and Smart Serve."
            />
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// POLICIES TAB CONTENT
// =============================================================================

interface PoliciesTabContentProps {
  config: HRConfig;
  onConfigChange: (updates: Partial<HRConfig>) => void;
}

const PoliciesTabContent: React.FC<PoliciesTabContentProps> = ({
  config,
  onConfigChange,
}) => {
  const navigate = useNavigate();
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Policy Library</h3>
          <p className="text-sm text-gray-400">
            Upload and manage company policy documents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary bg-indigo-600 hover:bg-indigo-500"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Policy
          </button>
        </div>
      </div>

      {/* Policy List Placeholder */}
      <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-300 mb-1">
          No Policies Yet
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload your first policy document to get started with acknowledgment tracking.
        </p>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Your First Policy
        </button>
      </div>

      {/* Compliance Dashboard Link */}
      <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-indigo-300">
            Track Team Compliance
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            View acknowledgment status, overdue recertifications, and team compliance metrics in the{" "}
            <button
              onClick={() => navigate("/admin/policies")}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Compliance Dashboard
            </button>.
          </p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="border border-gray-700/50 rounded-lg">
        <button
          onClick={() => setSettingsExpanded(!settingsExpanded)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="text-sm font-medium text-white">Policy Settings</h3>
              <p className="text-xs text-gray-500">
                Configure defaults for acknowledgments and reminders
              </p>
            </div>
          </div>
          {settingsExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {settingsExpanded && (
          <div className="p-4 pt-0 space-y-4 border-t border-gray-700/50">
            {/* Default Recertification Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Recertification Interval
              </label>
              <select
                value={config.policies.defaultRecertificationInterval}
                onChange={(e) =>
                  onConfigChange({
                    policies: {
                      ...config.policies,
                      defaultRecertificationInterval: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="none">One-time (no recertification)</option>
                <option value="30_days">Every 30 days</option>
                <option value="90_days">Every 90 days</option>
                <option value="180_days">Every 6 months</option>
                <option value="annual">Annual</option>
                <option value="biennial">Every 2 years</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                New policies will use this interval by default. Can be overridden per policy.
              </p>
            </div>

            {/* Digital Signatures Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Digital Signatures
                </label>
                <p className="text-xs text-gray-500">
                  Require signature capture when acknowledging policies
                </p>
              </div>
              <button
                onClick={() =>
                  onConfigChange({
                    policies: {
                      ...config.policies,
                      digitalSignaturesEnabled: !config.policies.digitalSignaturesEnabled,
                    },
                  })
                }
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.policies.digitalSignaturesEnabled
                    ? "bg-indigo-600"
                    : "bg-gray-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    config.policies.digitalSignaturesEnabled
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Reminder Days */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reminder Schedule (days before due)
              </label>
              <div className="flex flex-wrap gap-2">
                {[30, 14, 7, 3, 1].map((day) => {
                  const isSelected = config.policies.reminderDaysBefore.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const newDays = isSelected
                          ? config.policies.reminderDaysBefore.filter((d) => d !== day)
                          : [...config.policies.reminderDaysBefore, day].sort((a, b) => b - a);
                        onConfigChange({
                          policies: {
                            ...config.policies,
                            reminderDaysBefore: newDays,
                          },
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {day} {day === 1 ? "day" : "days"}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Team members will receive reminders at these intervals before acknowledgment is due.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadPolicyModal onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  );
};

// =============================================================================
// UPLOAD POLICY MODAL (Placeholder)
// =============================================================================

interface UploadPolicyModalProps {
  onClose: () => void;
}

const UploadPolicyModal: React.FC<UploadPolicyModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/60" onClick={onClose} />
    <div className="relative bg-[#1a1f2b] rounded-xl shadow-2xl w-full max-w-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Upload Policy</h2>
      <p className="text-gray-400 mb-6">
        Policy upload functionality coming next. This will include:
      </p>
      <ul className="text-sm text-gray-500 space-y-2 mb-6">
        <li className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          PDF upload with drag & drop
        </li>
        <li className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          Title, description, category selection
        </li>
        <li className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          Acknowledgment requirements
        </li>
        <li className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          Recertification schedule
        </li>
        <li className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          Role-based applicability
        </li>
      </ul>
      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
      >
        Close
      </button>
    </div>
  </div>
);

// =============================================================================
// COMING SOON PLACEHOLDER
// =============================================================================

interface ComingSoonContentProps {
  title: string;
  description: string;
}

const ComingSoonContent: React.FC<ComingSoonContentProps> = ({
  title,
  description,
}) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
      <Settings className="w-8 h-8 text-gray-600" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-gray-400 max-w-md mx-auto">{description}</p>
    <p className="text-amber-500/70 text-sm mt-4">Coming Soon</p>
  </div>
);
