import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Store, 
  MapPin, 
  Globe, 
  ChevronUp,
  Info,
  Save,
  X,
  Edit3
} from "lucide-react";
import { OrganizationDetails } from "./OrganizationDetails";
import { IndustryDetails } from "./IndustryDetails";
import { LocationDetails } from "./LocationDetails";
import { LocalizationSettings } from "./LocalizationSettings";
import { useOrganizationSettings } from "./useOrganizationSettings";
import { LoadingLogo } from "@/features/shared/components";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { SECURITY_LEVELS } from "@/config/security";
import toast from "react-hot-toast";

type TabId = "organization" | "industry" | "location" | "localization";

// Section header component - L5 design system (from MyProfile)
const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/50">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
    </div>
    {action}
  </div>
);

export const OrganizationSettings: React.FC = () => {
  const navigate = useNavigate();
  const {
    organizationId,
    organization: authOrganization,
    user,
    isLoading: authLoading,
    isDev,
    hasAdminAccess,
    securityLevel,
  } = useAuth();
  const { 
    isLoading, 
    isSaving, 
    handleSave, 
    organization, 
    updateOrganization,
    hasUnsavedChanges,
    resetChanges,
  } = useOrganizationSettings();

  const [activeTab, setActiveTab] = useState<TabId>("organization");
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Redirect if no organization - but allow admin users
  useEffect(() => {
    if (
      !authLoading &&
      !isLoading &&
      !organizationId &&
      !isDev &&
      !hasAdminAccess
    ) {
      console.log(
        "[OrganizationSettings] No organization found and no admin access, redirecting",
      );
      toast.error("No organization found");
      navigate(ROUTES.KITCHEN.DASHBOARD);
    }
  }, [organizationId, authLoading, isLoading, navigate, isDev, hasAdminAccess]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const tabs = [
    {
      id: "organization" as const,
      label: "Organization",
      icon: Building2,
      color: "primary",
    },
    {
      id: "industry" as const,
      label: "Industry",
      icon: Store,
      color: "green",
    },
    {
      id: "location" as const,
      label: "Location",
      icon: MapPin,
      color: "amber",
    },
    {
      id: "localization" as const,
      label: "Localization",
      icon: Globe,
      color: "rose",
    },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading organization settings..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No organization settings found</p>
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/settings/OrganizationSettings/index.tsx
        </div>
      )}

      {/* L5 Header - Matching Team page style */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Organization Settings
            </h1>
            <p className="text-gray-400 text-sm">
              {organization.name} • Profile and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        {/* Expandable Info Section */}
        <div className={`expandable-info-section mb-6 ${isInfoExpanded ? 'expanded' : ''}`}>
          <button
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            className="expandable-info-header"
          >
            <Info className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-primary-300">
                About Organization Settings
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                Click to learn about each configuration section
              </p>
            </div>
            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
          
          <div className="expandable-info-content">
            <div className="px-4 pb-4 pt-2 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-white">Organization</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Business name, legal name, contact information, and tax details
                  </p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-white">Industry</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Business type, cuisine style, and industry-specific settings
                  </p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-white">Location</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Physical address, operating hours, and multi-location settings
                  </p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-white">Localization</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Currency, date/time formats, timezone, and week start
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab ${tab.color} ${activeTab === tab.id ? "active" : ""}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "organization" && (
            <OrganizationDetails
              organization={organization}
              onChange={updateOrganization}
            />
          )}
          {activeTab === "industry" && (
            <IndustryDetails
              organization={organization}
              onChange={updateOrganization}
            />
          )}
          {activeTab === "location" && (
            <LocationDetails
              organization={organization}
              onChange={updateOrganization}
            />
          )}
          {activeTab === "localization" && (
            <LocalizationSettings
              organization={organization}
              onChange={updateOrganization}
            />
          )}
        </div>
      </div>

      {/* Floating Action Bar - Unsaved Changes */}
      {hasUnsavedChanges && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <span className="text-amber-400 text-sm font-medium">
                Unsaved changes
              </span>
              <button
                onClick={resetChanges}
                className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 inline mr-1" />
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 inline mr-1" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
