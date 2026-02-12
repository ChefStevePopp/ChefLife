import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Calendar,
  LibraryBig,
  UtensilsCrossed,
  ThermometerSnowflake,
  ClipboardCheck,
  Mail,
  Cog,
  Info,
  ChevronUp,
  ShieldAlert,
  Scale,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import type { ModuleId } from "@/types/modules";
import { 
  SECURITY_LEVELS, 
  canEnableModule,
} from "@/config/security";
import { LoadingLogo } from "@/features/shared/components";
import { FeatureCard } from "@/shared/components";
import { DisableModuleModal } from "./components";
import { getFieldsByModule } from "@/lib/communications/fieldRegistry";

// Core features - always on, just configurable
// Icons MUST match sidebar menuItems.ts for consistency
const CORE_FEATURES = [
  {
    id: 'recipes',
    label: 'Recipe Manager',
    description: 'Recipe documentation, costing, and production notes',
    icon: LibraryBig, // Matches sidebar
    configPath: '/admin/modules/recipes',
  },
  {
    id: 'tasks',
    label: 'Task Manager',
    description: 'Prep lists, checklists, and daily task management',
    icon: UtensilsCrossed, // Matches sidebar
    configPath: '/admin/tasks/settings',
  },
  {
    id: 'scheduling',
    label: 'The Team',
    description: 'Schedule display, roster preferences, and profile settings',
    icon: Users, // Matches sidebar section icon
    configPath: '/admin/modules/team',
  },
  {
    id: 'haccp',
    label: 'HACCP',
    description: 'Temperature monitoring and food safety compliance',
    icon: ThermometerSnowflake, // Matches sidebar
    configPath: '/admin/haccp/settings',
  },
  {
    id: 'allergens',
    label: 'Allergen Manager',
    description: 'Comprehensive allergen tracking and customer disclosure',
    icon: ShieldAlert, // Matches sidebar
    configPath: '/admin/allergens',
  },
];

// Add-on features - can be toggled
// Icons MUST match sidebar menuItems.ts for consistency
const ADDON_FEATURES = [
  {
    id: 'team_performance' as ModuleId,
    label: 'Team Performance',
    description: 'Point-based attendance & conduct tracking with tiers, coaching stages, and PIPs',
    icon: ClipboardCheck, // Matches sidebar
    requiresCompliance: true,
    complianceWarning: 'Point-based attendance systems may not be legal in all jurisdictions. Consult local labor laws before enabling. You are responsible for ensuring compliance.',
    configPath: '/admin/modules/team-performance',
  },
  {
    id: 'communications' as ModuleId,
    label: 'Communications',
    description: 'Email templates, merge fields, scheduled broadcasts, and team notifications',
    icon: Mail,
    requiresCompliance: false,
    configPath: '/admin/modules/communications',
  },
  {
    id: 'hr' as ModuleId,
    label: 'HR & Policies',
    description: 'Policy warehouse, acknowledgments, job descriptions, and compliance tracking',
    icon: Scale,
    requiresCompliance: true,
    complianceWarning: 'HR policies and employment documentation requirements vary by jurisdiction. Ensure your policies comply with local labor laws. You are responsible for legal compliance.',
    configPath: '/admin/modules/hr',
  },
];

export const ModulesManager: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, securityLevel, user, isLoading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingModule, setUpdatingModule] = useState<ModuleId | null>(null);
  const [coreInfoExpanded, setCoreInfoExpanded] = useState(false);
  const [addonInfoExpanded, setAddonInfoExpanded] = useState(false);
  
  // Disable confirmation modal state
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [moduleToDisable, setModuleToDisable] = useState<{
    id: ModuleId;
    label: string;
  } | null>(null);

  // Fetch organization data
  React.useEffect(() => {
    const fetchOrganization = async () => {
      if (!organizationId) return;
      
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single();
        
        if (error) throw error;
        setOrganization(data);
      } catch (error) {
        console.error('Error fetching organization:', error);
        toast.error('Failed to load organization data');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchOrganization();
    }
  }, [organizationId, authLoading]);

  const modules = organization?.modules || {};

  // Handle module toggle request
  const handleToggleRequest = (moduleId: ModuleId) => {
    if (!organizationId || !user) return;
    
    const moduleDef = ADDON_FEATURES.find(m => m.id === moduleId);
    let currentModule = modules[moduleId];
    
    // If module doesn't exist yet, initialize it
    if (!currentModule) {
      currentModule = {
        enabled: false,
        compliance_acknowledged: false,
        enabled_at: null,
        enabled_by: null,
        permissions: {
          view: 3,
          enable: 1,
          configure: 2,
          use: 3,
        },
        config: null,
      };
    }

    // Check permissions
    if (!canEnableModule(securityLevel, currentModule)) {
      toast.error("You don't have permission to change this module");
      return;
    }

    // If currently enabled, show confirmation modal
    if (currentModule.enabled) {
      setModuleToDisable({
        id: moduleId,
        label: moduleDef?.label || moduleId,
      });
      setDisableModalOpen(true);
      return;
    }

    // Check compliance acknowledgment for modules that require it
    if (moduleDef?.requiresCompliance && !currentModule.compliance_acknowledged) {
      toast.error("You must acknowledge compliance requirements first");
      return;
    }

    // Enable module directly (no confirmation needed)
    executeToggle(moduleId, true);
  };

  // Execute the actual toggle
  const executeToggle = async (moduleId: ModuleId, newEnabled: boolean) => {
    if (!organizationId || !user) return;
    
    const moduleDef = ADDON_FEATURES.find(m => m.id === moduleId);
    let currentModule = modules[moduleId];
    
    // If module doesn't exist yet, initialize it
    if (!currentModule) {
      currentModule = {
        enabled: false,
        compliance_acknowledged: false,
        enabled_at: null,
        enabled_by: null,
        permissions: {
          view: 3,
          enable: 1,
          configure: 2,
          use: 3,
        },
        config: null,
      };
    }

    setUpdatingModule(moduleId);

    try {
      const updatedModules = {
        ...modules,
        [moduleId]: {
          ...currentModule,
          enabled: newEnabled,
          enabled_at: newEnabled ? new Date().toISOString() : currentModule.enabled_at,
          enabled_by: newEnabled ? user.id : currentModule.enabled_by,
          disabled_at: !newEnabled ? new Date().toISOString() : null,
          disabled_by: !newEnabled ? user.id : null,
        },
      };

      const { error } = await supabase
        .from('organizations')
        .update({ 
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (error) throw error;

      // Update local state
      setOrganization((prev: any) => ({ ...prev, modules: updatedModules }));

      // Get field count for this module (for logging)
      const moduleFields = getFieldsByModule(moduleId as any);

      // Log to NEXUS with full context
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          module_id: moduleId,
          module_name: moduleDef?.label,
          action: newEnabled ? 'enabled' : 'disabled',
          fields_affected: moduleFields.length,
          confirmation_required: !newEnabled, // Disabling required confirmation
        },
      });

      toast.success(`${moduleDef?.label} ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
    } finally {
      setUpdatingModule(null);
    }
  };

  // Handle confirmed disable from modal
  const handleConfirmDisable = () => {
    if (!moduleToDisable) return;
    
    executeToggle(moduleToDisable.id, false);
    setDisableModalOpen(false);
    setModuleToDisable(null);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setDisableModalOpen(false);
    setModuleToDisable(null);
  };

  // Handle compliance acknowledgment
  const handleComplianceAcknowledge = async (moduleId: ModuleId, acknowledged: boolean) => {
    if (!organizationId || !user) return;
    
    let currentModule = modules[moduleId];
    
    // If module doesn't exist yet, initialize it
    if (!currentModule) {
      currentModule = {
        enabled: false,
        compliance_acknowledged: false,
        enabled_at: null,
        enabled_by: null,
        permissions: {
          view: 3,
          enable: 1,
          configure: 2,
          use: 3,
        },
        config: null,
      };
    }

    try {
      const updatedModules = {
        ...modules,
        [moduleId]: {
          ...currentModule,
          compliance_acknowledged: acknowledged,
        },
      };

      const { error } = await supabase
        .from('organizations')
        .update({ 
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (error) throw error;

      setOrganization((prev: any) => ({ ...prev, modules: updatedModules }));
    } catch (error) {
      console.error('Error updating compliance:', error);
      toast.error('Failed to save acknowledgment');
    }
  };

  const handleConfigure = (configPath: string) => {
    navigate(configPath);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading modules..." />
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/ModulesManager/index.tsx
        </div>
      )}

      {/* L5 Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Feature Modules
            </h1>
            <p className="text-gray-400 text-sm">
              Configure core features and enable add-ons
            </p>
          </div>
        </div>
      </div>

      {/* CORE FEATURES SECTION */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <Cog className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Core Features</h2>
            <p className="text-sm text-gray-400">Always active — configure how they work</p>
          </div>
        </div>

        {/* Expandable Info - Gray, just description */}
        <div className={`expandable-info-section mb-4 ${coreInfoExpanded ? 'expanded' : ''}`}>
          <button
            onClick={() => setCoreInfoExpanded(!coreInfoExpanded)}
            className="expandable-info-header"
          >
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">What are core features?</span>
            <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
          </button>
          <div className="expandable-info-content">
            <div className="px-4 pb-4 pt-2">
              <p className="text-sm text-gray-400">
                Core features are the backbone of ChefLife and cannot be disabled. 
                They're always available to your team. Use the <strong className="text-gray-300">Configure</strong> option 
                on each card to customize settings like default values, display preferences, and workflow options.
              </p>
            </div>
          </div>
        </div>

        {/* Cards Grid - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CORE_FEATURES.map((feature) => (
            <FeatureCard
              key={feature.id}
              id={feature.id}
              label={feature.label}
              description={feature.description}
              icon={feature.icon}
              variant="core"
              onConfigure={() => handleConfigure(feature.configPath)}
              configureLabel="Configure"
            />
          ))}
        </div>
      </div>

      {/* ADD-ON FEATURES SECTION */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Add-On Features</h2>
            <p className="text-sm text-gray-400">Optional features you can enable</p>
          </div>
        </div>

        {/* Expandable Info - Gray, just description */}
        <div className={`expandable-info-section mb-4 ${addonInfoExpanded ? 'expanded' : ''}`}>
          <button
            onClick={() => setAddonInfoExpanded(!addonInfoExpanded)}
            className="expandable-info-header"
          >
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">How do add-ons work?</span>
            <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
          </button>
          <div className="expandable-info-content">
            <div className="px-4 pb-4 pt-2">
              <p className="text-sm text-gray-400">
                Add-on features extend ChefLife with optional functionality. 
                <strong className="text-gray-300"> Click a card</strong> to enable or disable it. 
                Some add-ons require compliance acknowledgment before activation due to legal considerations. 
                Disabling an add-on hides it from navigation but preserves all your data.
              </p>
            </div>
          </div>
        </div>

        {/* Cards Grid - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ADDON_FEATURES.map((feature) => {
            const moduleConfig = modules[feature.id];
            const isEnabled = moduleConfig?.enabled ?? false;
            
            // For modules that don't exist yet, create a default config for permission check
            const configForPermissionCheck = moduleConfig || {
              enabled: false,
              permissions: { view: 3, enable: 1, configure: 2, use: 3 },
              config: null,
            };
            const canToggle = canEnableModule(securityLevel, configForPermissionCheck);
            
            return (
              <FeatureCard
                key={feature.id}
                id={feature.id}
                label={feature.label}
                description={feature.description}
                icon={feature.icon}
                variant="addon"
                isEnabled={isEnabled}
                onToggle={(id) => handleToggleRequest(id as ModuleId)}
                canToggle={canToggle}
                isUpdating={updatingModule === feature.id}
                complianceWarning={feature.requiresCompliance ? feature.complianceWarning : undefined}
                complianceAcknowledged={moduleConfig?.compliance_acknowledged ?? false}
                onComplianceChange={(acknowledged) => handleComplianceAcknowledge(feature.id, acknowledged)}
                onConfigure={isEnabled ? () => handleConfigure(feature.configPath) : undefined}
                configureLabel="Configure"
              />
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-4 border-t border-gray-700/30">
          <p className="text-xs text-gray-500">
            Need a feature you don't see? <a href="/admin/help" className="text-primary-400 hover:text-primary-300">Contact support</a> to request new add-ons.
          </p>
        </div>
      </div>

      {/* Disable Confirmation Modal */}
      {organizationId && moduleToDisable && (
        <DisableModuleModal
          isOpen={disableModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleConfirmDisable}
          moduleId={moduleToDisable.id as any}
          moduleLabel={moduleToDisable.label}
          organizationId={organizationId}
          isProcessing={updatingModule === moduleToDisable.id}
        />
      )}
    </div>
  );
};
