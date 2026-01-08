/**
 * OrganizationSettings - Company Settings Main Component
 * 
 * L5 Design: 
 * - Header icon = amber (matches Organization nav context)
 * - Tabs use CSS color progression (primary, green, amber, rose, lime)
 * - Section icons = gray (structural, not competing)
 * - Focus on content, not chrome
 * 
 * Part of Admin Lifecycle: Step 1 - "Who you are"
 * 
 * Tabs:
 * - Organization: Business identity, contact info, addresses
 * - Industry: Business type, cuisine, revenue centers
 * - Location: Seating capacity, operating hours
 * - Localization: Timezone, currency, date/time formats
 * - Compliance: Health certificates, inspection history
 * 
 * Location: Admin → Organization → Company Settings
 */

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
  ShieldCheck
} from "lucide-react";
import { OrganizationDetails } from "./OrganizationDetails";
import { IndustryDetails } from "./IndustryDetails";
import { LocationDetails } from "./LocationDetails";
import { LocalizationSettings } from "./LocalizationSettings";
import { BoardOfHealth } from "./BoardOfHealth";
import { useOrganizationSettings } from "./useOrganizationSettings";
import { LoadingLogo } from "@/features/shared/components";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { SECURITY_LEVELS } from "@/config/security";
import toast from "react-hot-toast";

type TabId = "organization" | "industry" | "location" | "localization" | "compliance";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

export const OrganizationSettings: React.FC = () => {
  const navigate = useNavigate();
  const {
    organizationId,
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

  // Tab configuration - uses CSS color progression
  const tabs: TabConfig[] = [
    {
      id: "organization",
      label: "Organization",
      icon: Building2,
      color: "primary",
      description: "Business name, contact info, and addresses",
    },
    {
      id: "industry",
      label: "Industry",
      icon: Store,
      color: "green",
      description: "Business type, cuisine, revenue centers",
    },
    {
      id: "location",
      label: "Location",
      icon: MapPin,
      color: "amber",
      description: "Seating capacity and operating hours",
    },
    {
      id: "localization",
      label: "Localization",
      icon: Globe,
      color: "rose",
      description: "Timezone, currency, and date/time formats",
    },
    {
      id: "compliance",
      label: "Compliance",
      icon: ShieldCheck,
      color: "lime",
      description: "Health certificates and inspection history",
    },
  ];

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

      {/* ========================================================================
       * HEADER CARD - Amber = Organization nav context
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Company Settings
                </h1>
                <p className="text-gray-400 text-sm">
                  {organization.name} • Profile, preferences, and compliance
                </p>
              </div>
            </div>
          </div>

          {/* Expandable Info Section */}
          <div className={`expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="expandable-info-header w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-300">
                  About Company Settings
                </span>
              </div>
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
            </button>
            <div className="expandable-info-content">
              <div className="p-4 pt-2 space-y-4">
                <p className="text-sm text-gray-400">
                  Company Settings defines who you are — your business identity, where you're located, 
                  how you operate, and your compliance documentation. This information appears 
                  throughout ChefLife and on printed documents.
                </p>
                
                {/* Tab explanations grid - gray icons (structural) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <div 
                        key={tab.id}
                        className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-300">{tab.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{tab.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
       * TABS + CONTENT CARD
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tab Navigation - CSS color progression */}
        <div className="border-b border-gray-700">
          <div className="flex flex-wrap items-center gap-2 p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab ${tab.color} ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
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
          {activeTab === "compliance" && (
            <BoardOfHealth
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
