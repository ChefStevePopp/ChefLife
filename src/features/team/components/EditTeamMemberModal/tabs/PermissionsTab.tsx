import React from "react";
import { Shield, Check, X, Info, Lock } from "lucide-react";
import type { TeamMember } from "../../../types";
import { 
  SecurityLevel, 
  SECURITY_LEVELS, 
  getSecurityConfig,
  getProtocolCode,
} from "@/config/security";

interface PermissionsTabProps {
  formData: TeamMember;
  setFormData: (data: TeamMember) => void;
}

// Section header component - consistent with L5 design system
const SectionHeader: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
}> = ({ icon: Icon, iconColor, bgColor, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
    <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div className="flex-1">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
  </div>
);

export const PermissionsTab: React.FC<PermissionsTabProps> = ({
  formData,
}) => {
  const currentLevel = (formData.security_level ?? SECURITY_LEVELS.ECHO) as SecurityLevel;
  const securityConfig = getSecurityConfig(currentLevel);
  
  // Is this member protected?
  const isProtected = currentLevel <= SECURITY_LEVELS.ALPHA;

  return (
    <div className="space-y-8">
      {/* Section: Security Protocol */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={Shield}
          iconColor="text-amber-400"
          bgColor="bg-amber-500/20"
          title="Security Protocol"
          subtitle="Assigned access level"
        />
        
        <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/30">
          <div className="flex items-center gap-4">
            {/* Protocol Badge */}
            <div className="w-14 h-14 rounded-lg border border-gray-600 bg-gray-800 flex items-center justify-center">
              <span className="text-2xl font-mono font-bold text-white">
                {getProtocolCode(currentLevel)}
              </span>
            </div>
            
            {/* Protocol Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white">{securityConfig.protocol}</span>
                {isProtected && <Lock className="w-4 h-4 text-gray-500" />}
              </div>
              <p className="text-sm text-gray-400">{securityConfig.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{securityConfig.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Capabilities */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <SectionHeader
          icon={Check}
          iconColor="text-green-400"
          bgColor="bg-green-500/20"
          title="Access & Capabilities"
          subtitle={`What ${formData.first_name || 'this user'} can do in the system`}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { key: 'canViewTeam', label: 'View Team Roster' },
            { key: 'canEditTeamMembers', label: 'Edit Team Members' },
            { key: 'canEditPermissions', label: 'Change Security Protocols' },
            { key: 'canEditImportedData', label: 'Override Imported Data' },
            { key: 'canDeactivateMembers', label: 'Deactivate Members' },
            { key: 'canDeleteMembers', label: 'Delete Members' },
            { key: 'canManageSchedules', label: 'Manage Schedules' },
            { key: 'canManageRecipes', label: 'Manage Recipes' },
            { key: 'canManageInventory', label: 'Manage Inventory' },
            { key: 'canViewReports', label: 'View Reports' },
            { key: 'canManageSettings', label: 'Organization Settings' },
          ].map(({ key, label }) => {
            const hasAccess = securityConfig.capabilities[key as keyof typeof securityConfig.capabilities];
            return (
              <div 
                key={key}
                className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm border ${
                  hasAccess 
                    ? 'bg-gray-800/40 border-gray-700/30 text-gray-300' 
                    : 'border-transparent text-gray-600'
                }`}
              >
                {hasAccess ? (
                  <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-gray-700 flex-shrink-0" />
                )}
                <span className="truncate">{label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-gray-800/30 rounded-xl p-5 border border-gray-700/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300">About Access Levels</h4>
            <p className="text-sm text-gray-500 mt-1">
              Access levels are assigned by organization administrators through 
              the App Access page. Contact your manager if you need different permissions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
