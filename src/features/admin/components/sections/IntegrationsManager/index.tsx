import React, { useState, useMemo, useCallback } from "react";
import { 
  Plug,
  Calendar,
  ThermometerSnowflake,
  CreditCard,
  Calculator,
  Info,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { 
  INTEGRATION_REGISTRY, 
  INTEGRATION_CATEGORIES,
  getIntegrationStatus,
  type IntegrationId,
  type IntegrationCategory,
} from "@/types/integrations";
import { SECURITY_LEVELS } from "@/config/security";
import { LoadingLogo } from "@/features/shared/components";
import { IntegrationCard } from "@/shared/components";
import { SevenShiftsConfigPanel, SchedulingConfigPanel } from "@/features/integrations";

// Category icons - match sidebar where applicable
const CATEGORY_ICONS: Record<IntegrationCategory, React.ElementType> = {
  scheduling: Calendar,
  haccp: ThermometerSnowflake,
  pos: CreditCard,
  accounting: Calculator,
  inventory: Plug,
  communication: Plug,
};

// Category colors - L5 progression: primary, green, amber, rose, purple, cyan
const CATEGORY_COLORS: Record<IntegrationCategory, { bg: string; text: string }> = {
  scheduling: { bg: 'bg-primary-500/20', text: 'text-primary-400' },
  haccp: { bg: 'bg-green-500/20', text: 'text-green-400' },
  pos: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  accounting: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  inventory: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  communication: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
};

// Category info explanations
const CATEGORY_INFO: Record<IntegrationCategory, string> = {
  scheduling: 'Connect your scheduling platform to sync team members, shifts, and time clock data. This enables automatic roster updates and schedule imports.',
  haccp: 'Link temperature monitoring devices for automated food safety compliance. Sensor data flows directly into your HACCP logs and alerts.',
  pos: 'Integrate your point of sale system to pull sales data, menu items, and transaction history for recipe costing and inventory tracking.',
  accounting: 'Connect your accounting software to sync invoices, payroll data, and financial reports. Streamline your bookkeeping workflow.',
  inventory: 'Link inventory and ordering systems for automated stock tracking and purchase order management.',
  communication: 'Connect messaging platforms for team notifications, announcements, and alerts.',
};

export const IntegrationsManager: React.FC = () => {
  const { organizationId, securityLevel, user, isLoading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<IntegrationCategory, boolean>>({
    scheduling: true, // First one open by default
    haccp: false,
    pos: false,
    accounting: false,
    inventory: false,
    communication: false,
  });

  // Config panel states
  const [sevenShiftsConfigOpen, setSevenShiftsConfigOpen] = useState(false);
  const [schedulingConfigOpen, setSchedulingConfigOpen] = useState(false);
  const [schedulingConfigTarget, setSchedulingConfigTarget] = useState<IntegrationId | null>(null);

  // Fetch organization data
  const fetchOrganization = useCallback(async () => {
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
  }, [organizationId]);

  React.useEffect(() => {
    if (!authLoading) {
      fetchOrganization();
    }
  }, [organizationId, authLoading, fetchOrganization]);

  const integrations = organization?.integrations || {};

  // Group integrations by category
  const groupedIntegrations = useMemo(() => {
    const groups: Partial<Record<IntegrationCategory, typeof INTEGRATION_REGISTRY>> = {};
    
    for (const integration of INTEGRATION_REGISTRY) {
      if (!groups[integration.category]) {
        groups[integration.category] = [];
      }
      groups[integration.category]!.push(integration);
    }
    
    return groups;
  }, []);

  // Get categories that have integrations
  const activeCategories = useMemo(() => {
    return (Object.keys(groupedIntegrations) as IntegrationCategory[])
      .filter(cat => groupedIntegrations[cat]?.length);
  }, [groupedIntegrations]);

  // Count connected integrations (total and per category)
  const connectionStats = useMemo(() => {
    const stats: Record<string, { connected: number; total: number }> = {
      total: { connected: 0, total: INTEGRATION_REGISTRY.length },
    };
    
    for (const category of activeCategories) {
      const categoryIntegrations = groupedIntegrations[category] || [];
      const connected = categoryIntegrations.filter(i => {
        const config = integrations[i.id];
        return config && getIntegrationStatus(config) === 'connected';
      }).length;
      
      stats[category] = { connected, total: categoryIntegrations.length };
      stats.total.connected += connected;
    }
    
    return stats;
  }, [integrations, groupedIntegrations, activeCategories]);

  const toggleCategory = (category: IntegrationCategory) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Handle connect - open appropriate config panel
  const handleConnect = (integrationId: IntegrationId) => {
    const def = INTEGRATION_REGISTRY.find(i => i.id === integrationId);
    if (!def) return;

    // Scheduling platforms → SchedulingConfigPanel (handles CSV + mode selection)
    if (def.category === 'scheduling') {
      setSchedulingConfigTarget(integrationId);
      setSchedulingConfigOpen(true);
      return;
    }

    // Non-scheduling platforms
    switch (integrationId) {
      case 'sensorpush':
        toast('SensorPush configuration coming soon', { icon: '🌡️' });
        break;
      default:
        toast(`${def.label} integration coming soon`, { icon: '🔌' });
    }
  };

  // Handle disconnect
  const handleDisconnect = async (integrationId: IntegrationId) => {
    const def = INTEGRATION_REGISTRY.find(i => i.id === integrationId);

    // Scheduling platforms → open their config panel (it has disconnect)
    if (def?.category === 'scheduling') {
      setSchedulingConfigTarget(integrationId);
      setSchedulingConfigOpen(true);
      return;
    }

    if (!organizationId || !user) return;
    
    const integrationDef = INTEGRATION_REGISTRY.find(i => i.id === integrationId);
    
    try {
      const updatedIntegrations = {
        ...integrations,
        [integrationId]: {
          ...integrations[integrationId],
          enabled: false,
          connected: false,
          config: null,
        },
      };

      const { error } = await supabase
        .from('organizations')
        .update({ 
          integrations: updatedIntegrations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (error) throw error;

      setOrganization((prev: any) => ({ ...prev, integrations: updatedIntegrations }));

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          integration_id: integrationId,
          integration_name: integrationDef?.label,
          action: 'disconnected',
        },
      });

      toast.success(`${integrationDef?.label} disconnected`);
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  // Handle configure - open config panel
  const handleConfigure = (integrationId: IntegrationId) => {
    const def = INTEGRATION_REGISTRY.find(i => i.id === integrationId);
    if (!def) return;

    // Scheduling platforms → SchedulingConfigPanel (handles CSV, API, expired, reconnect)
    if (def.category === 'scheduling') {
      setSchedulingConfigTarget(integrationId);
      setSchedulingConfigOpen(true);
      return;
    }

    switch (integrationId) {
      case 'sensorpush':
        toast('SensorPush configuration coming soon', { icon: '🌡️' });
        break;
      default:
        toast(`${def.label} configuration coming soon`, { icon: '⚙️' });
    }
  };

  // Handle connection change from config panels
  const handleConnectionChange = () => {
    // Refresh organization data to get updated integration status
    fetchOrganization();
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading integrations..." />
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/IntegrationsManager/index.tsx
        </div>
      )}

      {/* L5 Header - Amber for add-on module identity */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Plug className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Integrations
              </h1>
              <p className="text-gray-400 text-sm">
                Connect ChefLife to external services
              </p>
            </div>
          </div>
          
          {/* Connected count */}
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{connectionStats.total.connected}</div>
            <div className="text-xs text-gray-400">of {connectionStats.total.total} connected</div>
          </div>
        </div>
      </div>

      {/* Integration Sections by Category - Collapsible */}
      {activeCategories.map((category) => {
        const categoryIntegrations = groupedIntegrations[category] || [];
        const categoryMeta = INTEGRATION_CATEGORIES[category];
        const CategoryIcon = CATEGORY_ICONS[category];
        const categoryColor = CATEGORY_COLORS[category];
        const isExpanded = expandedCategories[category];
        const stats = connectionStats[category];

        return (
          <div key={category} className="bg-[#1a1f2b] rounded-lg shadow-lg overflow-hidden">
            {/* Collapsible Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${categoryColor.bg} flex items-center justify-center flex-shrink-0`}>
                  <CategoryIcon className={`w-5 h-5 ${categoryColor.text}`} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-white">{categoryMeta.label}</h2>
                    {/* Connection count badge */}
                    {stats.connected > 0 ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                        {stats.connected} connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-700/50 text-gray-500 rounded-full">
                        {stats.total} available
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{categoryMeta.description}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expandable Content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {/* Info Section */}
              <div className="px-4 pb-2">
                <div className="flex items-start gap-2 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                  <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400">
                    {CATEGORY_INFO[category]}
                  </p>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="p-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryIntegrations.map((integration) => {
                    const integrationConfig = integrations[integration.id];
                    const status = integrationConfig 
                      ? getIntegrationStatus(integrationConfig)
                      : 'disconnected';

                    return (
                      <IntegrationCard
                        key={integration.id}
                        id={integration.id}
                        label={integration.label}
                        description={integration.description}
                        website={integration.website}
                        status={status}
                        comingSoon={integration.comingSoon}
                        connectionMode={integrationConfig?.connection_mode}
                        onConnect={() => handleConnect(integration.id)}
                        onDisconnect={() => handleDisconnect(integration.id)}
                        onConfigure={['connected', 'expired', 'error'].includes(status) ? () => handleConfigure(integration.id) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <p className="text-xs text-gray-500">
          Credentials are encrypted and stored securely. OAuth connections can be revoked anytime.
          Need an integration you don't see? <a href="/admin/help" className="text-primary-400 hover:text-primary-300">Contact support</a> to request new connections.
        </p>
      </div>

      {/* 7shifts API Config Panel */}
      <SevenShiftsConfigPanel
        isOpen={sevenShiftsConfigOpen}
        onClose={() => setSevenShiftsConfigOpen(false)}
        onConnectionChange={handleConnectionChange}
      />

      {/* Universal Scheduling Config Panel (CSV mode + mode selector) */}
      <SchedulingConfigPanel
        isOpen={schedulingConfigOpen}
        onClose={() => {
          setSchedulingConfigOpen(false);
          setSchedulingConfigTarget(null);
        }}
        integrationId={schedulingConfigTarget}
        onConnectionChange={handleConnectionChange}
      />
    </div>
  );
};
