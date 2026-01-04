import React, { useState } from "react";
import { 
  Package, 
  Calendar, 
  Clock, 
  ChefHat, 
  ClipboardList, 
  Thermometer,
  AlertTriangle,
  Check,
  X,
  Settings,
  Shield
} from "lucide-react";
import type { Organization } from "@/types/organization";
import { MODULE_REGISTRY, type ModuleId } from "@/types/modules";
import { useAuth } from "@/hooks/useAuth";
import { 
  SECURITY_LEVELS, 
  getProtocolCode, 
  getSecurityConfig,
  canEnableModule,
  canConfigureModule,
} from "@/config/security";

interface ModulesSettingsProps {
  organization: Organization;
  onChange: (updates: Partial<Organization>) => void;
}

// Map module IDs to icons
const MODULE_ICONS: Record<string, React.ElementType> = {
  scheduling: Calendar,
  attendance: Clock,
  recipes: ChefHat,
  tasks: ClipboardList,
  inventory: Package,
  haccp: Thermometer,
};

// Map colors to Tailwind classes
const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary-500/20', text: 'text-primary-400', border: 'border-primary-500/30' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

export const ModulesSettings: React.FC<ModulesSettingsProps> = ({
  organization,
  onChange,
}) => {
  const { securityLevel } = useAuth();
  const [expandedModule, setExpandedModule] = useState<ModuleId | null>(null);

  const modules = organization.modules || {};

  const toggleModule = (moduleId: ModuleId) => {
    const currentModule = modules[moduleId];
    if (!currentModule) return;

    // Check if user can enable/disable
    if (!canEnableModule(securityLevel, currentModule)) {
      return;
    }

    const newEnabled = !currentModule.enabled;

    onChange({
      modules: {
        ...modules,
        [moduleId]: {
          ...currentModule,
          enabled: newEnabled,
          enabled_at: newEnabled ? new Date().toISOString() : currentModule.enabled_at,
        },
      },
    });
  };

  const handleComplianceAcknowledge = (moduleId: ModuleId, acknowledged: boolean) => {
    const currentModule = modules[moduleId];
    if (!currentModule) return;

    onChange({
      modules: {
        ...modules,
        [moduleId]: {
          ...currentModule,
          compliance_acknowledged: acknowledged,
        },
      },
    });
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Package className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">Feature Modules</h2>
          <p className="text-sm text-gray-400">
            Enable or disable ChefLife feature packs for your organization
          </p>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULE_REGISTRY.map((moduleDef) => {
          const moduleConfig = modules[moduleDef.id];
          const isEnabled = moduleConfig?.enabled ?? moduleDef.defaultEnabled;
          const Icon = MODULE_ICONS[moduleDef.id] || Package;
          const colors = COLOR_CLASSES[moduleDef.color] || COLOR_CLASSES.primary;
          const canEnable = canEnableModule(securityLevel, moduleConfig);
          const canConfigure = canConfigureModule(securityLevel, moduleConfig);
          const needsCompliance = moduleDef.requiresCompliance && !moduleConfig?.compliance_acknowledged;
          const isExpanded = expandedModule === moduleDef.id;

          return (
            <div
              key={moduleDef.id}
              className={`bg-gray-800/30 rounded-lg border transition-all ${
                isEnabled ? colors.border : 'border-gray-700/30'
              }`}
            >
              {/* Module Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white">
                          {moduleDef.label}
                        </h3>
                        {moduleDef.comingSoon && (
                          <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {moduleDef.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle */}
                  {!moduleDef.comingSoon && (
                    <button
                      onClick={() => toggleModule(moduleDef.id)}
                      disabled={!canEnable || (needsCompliance && !isEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        isEnabled
                          ? 'bg-green-500'
                          : 'bg-gray-700'
                      } ${!canEnable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={!canEnable ? 'You do not have permission to change this' : ''}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          isEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Compliance Warning */}
                {moduleDef.requiresCompliance && !moduleConfig?.compliance_acknowledged && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-300">
                          {moduleDef.complianceWarning}
                        </p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moduleConfig?.compliance_acknowledged || false}
                            onChange={(e) => handleComplianceAcknowledge(moduleDef.id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500/50"
                          />
                          <span className="text-xs text-gray-300">
                            I acknowledge compliance responsibility
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Permissions Summary */}
                {moduleConfig?.permissions && isEnabled && (
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Use: {getProtocolCode(moduleConfig.permissions.use)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="w-3 h-3" />
                      <span>Configure: {getProtocolCode(moduleConfig.permissions.configure)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Configure Button */}
              {isEnabled && canConfigure && !moduleDef.comingSoon && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setExpandedModule(isExpanded ? null : moduleDef.id)}
                    className="w-full px-3 py-2 text-sm text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    {isExpanded ? 'Hide Configuration' : 'Configure Module'}
                  </button>
                </div>
              )}

              {/* Expanded Configuration (placeholder for now) */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-700/50 pt-4">
                  <p className="text-sm text-gray-400 text-center py-4">
                    Module configuration coming in next phase
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Note:</strong> Disabling a module hides it from navigation but preserves all data. 
          Module permissions are controlled by security protocols — only users at the required level can enable, configure, or use each module.
        </p>
      </div>
    </div>
  );
};
