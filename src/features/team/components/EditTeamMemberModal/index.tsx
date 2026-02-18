import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  User,
  Shield,
  Award,
  Bell,
  UserCircle,
  Briefcase,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useTeamStore } from "@/stores/teamStore";
import { useAuth } from "@/hooks/useAuth";
import { BasicInfoTab } from "./tabs/BasicInfoTab";
import { RolesTab } from "./tabs/RolesTab";
import { CertificationsTab } from "./tabs/CertificationsTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { AvatarTab } from "./tabs/AvatarTab";
import { PermissionsTab } from "./tabs/PermissionsTab";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { SECURITY_LEVELS, getSecurityConfig, getProtocolCode, type SecurityLevel } from "@/config/security";
import type { TeamMember } from "../../types";

interface EditTeamMemberModalProps {
  member: TeamMember;
  isOpen?: boolean;
  onClose?: () => void;
  /** Is this the user editing their own profile? Hides admin-only tabs */
  isSelfEdit?: boolean;
  /** Initial tab to open */
  initialTab?: TabId;
}

type TabId =
  | "basic"
  | "roles"
  | "permissions"
  | "certifications"
  | "notifications"
  | "avatar";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
  adminOnly?: boolean;  // Hidden when user is editing themselves
}

const ALL_TABS: TabConfig[] = [
  { id: "basic", label: "Basic Info", icon: User, color: "primary" },
  { id: "roles", label: "Roles", icon: Briefcase, color: "green", adminOnly: true },
  { id: "permissions", label: "Permissions", icon: Shield, color: "amber", adminOnly: true },
  { id: "certifications", label: "Certifications", icon: Award, color: "rose" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "purple" },
  { id: "avatar", label: "Avatar", icon: UserCircle, color: "lime" },
];

// Validation
interface ValidationErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: string | undefined;
}

const validateForm = (data: TeamMember): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.first_name?.trim()) {
    errors.first_name = "First name is required";
  }

  if (!data.last_name?.trim()) {
    errors.last_name = "Last name is required";
  }

  if (!data.email?.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  return errors;
};

// Check if form data has changed
const hasChanges = (original: TeamMember, current: TeamMember): boolean => {
  const fieldsToCompare: (keyof TeamMember)[] = [
    'first_name', 'last_name', 'display_name', 'email', 'phone', 'punch_id',
    'avatar_url', 'kitchen_role', 'roles', 'departments', 'locations',
    'kitchen_stations', 'notification_preferences', 'security_level', 'certifications',
    'hire_date', 'wages'
  ];

  for (const field of fieldsToCompare) {
    const origVal = original[field];
    const currVal = current[field];

    // Handle arrays
    if (Array.isArray(origVal) && Array.isArray(currVal)) {
      if (JSON.stringify(origVal) !== JSON.stringify(currVal)) return true;
    }
    // Handle objects
    else if (typeof origVal === 'object' && typeof currVal === 'object') {
      if (JSON.stringify(origVal) !== JSON.stringify(currVal)) return true;
    }
    // Handle primitives
    else if (origVal !== currVal) {
      return true;
    }
  }

  return false;
};

export const EditTeamMemberModal: React.FC<EditTeamMemberModalProps> = ({
  member,
  isOpen = false,
  onClose,
  isSelfEdit = false,
  initialTab,
}) => {
  const { updateTeamMember } = useTeamStore();
  const { securityLevel: editorSecurityLevel } = useAuth();
  const [formData, setFormData] = useState<TeamMember>(member);
  const [originalData] = useState<TeamMember>(member);
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Filter tabs based on context
  const visibleTabs = isSelfEdit 
    ? ALL_TABS.filter(tab => !tab.adminOnly)
    : ALL_TABS;

  // Reset form when member changes or modal opens
  useEffect(() => {
    setFormData(member);
    setErrors({});
    // Use initialTab if provided and valid for current context
    const validTabs = isSelfEdit ? visibleTabs.map(t => t.id) : ALL_TABS.map(t => t.id);
    if (initialTab && validTabs.includes(initialTab)) {
      setActiveTab(initialTab);
    } else {
      setActiveTab("basic");
    }
  }, [member, initialTab, isOpen]);

  // Check for unsaved changes
  const isDirty = hasChanges(originalData, formData);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose?.();
    }
  }, [isDirty, onClose]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Switch to basic tab if there are basic info errors
      if (validationErrors.first_name || validationErrors.last_name || validationErrors.email) {
        setActiveTab("basic");
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // Build updates based on what's editable
      const updates: Partial<TeamMember> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        display_name: formData.display_name,
        email: formData.email,
        phone: formData.phone || null,
        avatar_url: formData.avatar_url,
        notification_preferences: formData.notification_preferences,
        certifications: formData.certifications || [],
      };

      // Only include admin-editable fields if not self-edit
      if (!isSelfEdit) {
        updates.punch_id = formData.punch_id || null;
        updates.hire_date = formData.hire_date || null;
        updates.roles = formData.roles || [];
        updates.departments = formData.departments || [];
        updates.locations = formData.locations || [];
        updates.kitchen_role = formData.kitchen_role;
        updates.kitchen_stations = formData.kitchen_stations || [];
        updates.security_level = formData.security_level;
        updates.wages = formData.wages || [];
      }

      await updateTeamMember(member.id, updates);
      onClose?.();
    } catch (error) {
      console.error("Error updating team member:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Get current tab error count (for basic info tab badge)
  const basicErrorCount = [errors.first_name, errors.last_name, errors.email].filter(Boolean).length;

  // Modal title based on context
  const modalTitle = isSelfEdit ? "My Profile" : `${formData.first_name} ${formData.last_name}`;

  // Get protocol info for display
  const memberSecurityLevel = (formData.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
  const securityConfig = getSecurityConfig(memberSecurityLevel);

  // Can editor modify certifications? (Omega, Alpha, Bravo only)
  const canEditCertifications = editorSecurityLevel <= SECURITY_LEVELS.BRAVO;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-[#1a1f2b] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-700/50">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-700/50 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-600 bg-gray-700">
                    {formData.avatar_url ? (
                      <img
                        src={formData.avatar_url}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.email}`}
                        alt={formData.first_name}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  {/* Active indicator */}
                  {member.is_active !== false && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1a1f2b]" />
                  )}
                </div>

                {/* Name & Role */}
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {modalTitle}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                      {memberSecurityLevel <= 3 && (
                        <span className="font-mono font-bold">{getProtocolCode(memberSecurityLevel)}</span>
                      )}
                      {securityConfig.name}
                    </span>
                    {isDirty && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-700/50 bg-gray-800/20 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab ${tab.color} ${activeTab === tab.id ? "active" : ""} relative`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {/* Error badge for basic tab */}
                  {tab.id === 'basic' && basicErrorCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                      {basicErrorCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <form id="edit-member-form" onSubmit={handleSubmit}>
              {activeTab === "basic" && (
                <BasicInfoTab 
                  formData={formData} 
                  setFormData={setFormData}
                  errors={errors}
                  isSelfEdit={isSelfEdit}
                />
              )}
              {activeTab === "roles" && !isSelfEdit && (
                <RolesTab formData={formData} setFormData={setFormData} editorSecurityLevel={editorSecurityLevel} />
              )}
              {activeTab === "permissions" && !isSelfEdit && (
                <PermissionsTab 
                  formData={formData} 
                  setFormData={setFormData} 
                  editorSecurityLevel={editorSecurityLevel}
                />
              )}
              {activeTab === "certifications" && (
                <CertificationsTab 
                  formData={formData} 
                  setFormData={setFormData} 
                  canEdit={canEditCertifications}
                />
              )}
              {activeTab === "notifications" && (
                <NotificationsTab formData={formData} setFormData={setFormData} />
              )}
              {activeTab === "avatar" && (
                <AvatarTab formData={formData} setFormData={setFormData} />
              )}
            </form>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-gray-700/50 bg-gray-800/30">
            <div className="flex items-center justify-between">
              {/* Left: Status info */}
              <div className="text-sm text-gray-500">
                {isDirty ? (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    You have unsaved changes
                  </span>
                ) : (
                  <span>No changes</span>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-ghost text-sm px-6"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-member-form"
                  className="btn-primary text-sm px-6 min-w-[120px]"
                  disabled={isSubmitting || !isDirty}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      <ConfirmDialog
        isOpen={showUnsavedWarning}
        onClose={() => setShowUnsavedWarning(false)}
        onConfirm={() => {
          setShowUnsavedWarning(false);
          onClose?.();
        }}
        title="Unsaved Changes"
        message="You have unsaved changes that will be lost if you close this window. Are you sure you want to discard them?"
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        variant="warning"
      />
    </>
  );
};
