import React from "react";
import { 
  Plug, 
  Calendar, 
  CreditCard, 
  Calculator,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Loader2
} from "lucide-react";
import type { Organization } from "@/types/organization";
import { INTEGRATION_REGISTRY, type IntegrationId, getIntegrationStatus } from "@/types/integrations";

interface IntegrationsSettingsProps {
  organization: Organization;
  onChange: (updates: Partial<Organization>) => void;
}

// Map integration IDs to icons
const INTEGRATION_ICONS: Record<string, React.ElementType> = {
  '7shifts': Calendar,
  'square': CreditCard,
  'toast': CreditCard,
  'quickbooks': Calculator,
};

// Map colors to Tailwind classes
const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  gray: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
};

const STATUS_CONFIG = {
  connected: { 
    icon: Check, 
    text: 'Connected', 
    color: 'text-green-400',
    bg: 'bg-green-500/20'
  },
  disconnected: { 
    icon: X, 
    text: 'Not Connected', 
    color: 'text-gray-400',
    bg: 'bg-gray-500/20'
  },
  error: { 
    icon: AlertCircle, 
    text: 'Error', 
    color: 'text-red-400',
    bg: 'bg-red-500/20'
  },
  syncing: { 
    icon: Loader2, 
    text: 'Syncing', 
    color: 'text-primary-400',
    bg: 'bg-primary-500/20'
  },
};

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({
  organization,
  onChange,
}) => {
  const integrations = organization.integrations || {};

  // Group integrations by category
  const groupedIntegrations = INTEGRATION_REGISTRY.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, typeof INTEGRATION_REGISTRY>);

  const categoryLabels: Record<string, string> = {
    scheduling: 'Scheduling & Labor',
    pos: 'Point of Sale',
    accounting: 'Accounting & Finance',
    inventory: 'Inventory Management',
    communication: 'Communication',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-lime-500/20 flex items-center justify-center">
          <Plug className="w-5 h-5 text-lime-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">Integrations</h2>
          <p className="text-sm text-gray-400">
            Connect ChefLife to external services and platforms
          </p>
        </div>
      </div>

      {/* Integrations by Category */}
      <div className="space-y-6">
        {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              {categoryLabels[category] || category}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryIntegrations.map((integration) => {
                const integrationConfig = integrations[integration.id];
                const status = integrationConfig 
                  ? getIntegrationStatus(integrationConfig)
                  : 'disconnected';
                const statusConfig = STATUS_CONFIG[status];
                const StatusIcon = statusConfig.icon;
                const Icon = INTEGRATION_ICONS[integration.id] || Plug;
                const colors = COLOR_CLASSES[integration.color] || COLOR_CLASSES.gray;

                return (
                  <div
                    key={integration.id}
                    className={`bg-gray-800/30 rounded-lg border transition-all ${
                      status === 'connected' ? 'border-green-500/30' : 'border-gray-700/30'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-white">
                                {integration.label}
                              </h4>
                              {integration.comingSoon && (
                                <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {integration.description}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusConfig.bg}`}>
                          <StatusIcon className={`w-3 h-3 ${statusConfig.color} ${status === 'syncing' ? 'animate-spin' : ''}`} />
                          <span className={`text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.text}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex items-center gap-2">
                        {integration.comingSoon ? (
                          <button
                            disabled
                            className="flex-1 px-3 py-2 text-sm text-gray-500 bg-gray-700/30 rounded-lg cursor-not-allowed"
                          >
                            Coming Soon
                          </button>
                        ) : status === 'connected' ? (
                          <>
                            <button
                              className="flex-1 px-3 py-2 text-sm text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              Configure
                            </button>
                            <button
                              className="px-3 py-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            className="flex-1 px-3 py-2 text-sm text-white bg-primary-500/30 hover:bg-primary-500/50 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            Connect {integration.label}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Website Link */}
                      <div className="mt-3 pt-3 border-t border-gray-700/30">
                        <a
                          href={integration.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
                        >
                          Learn more at {integration.website.replace('https://', '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Security:</strong> Integration credentials are encrypted and stored securely. 
          OAuth connections can be revoked at any time. Only organization owners can manage integrations.
        </p>
      </div>
    </div>
  );
};
