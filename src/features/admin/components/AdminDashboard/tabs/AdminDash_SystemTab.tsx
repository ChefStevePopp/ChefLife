import React from "react";
import {
  Settings,
  RefreshCw,
  Plug,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * =============================================================================
 * NEXUS DASHBOARD - System Tab
 * =============================================================================
 * Technical health monitoring:
 * - Integration status (7shifts, POS, etc.)
 * - Sync job history
 * - System alerts and errors
 * - Background job status
 * 
 * Separate from Organization tab which focuses on business activity.
 * This tab focuses on technical health of the system.
 * =============================================================================
 */

export const AdminDash_SystemTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();

  // Placeholder integration statuses
  const integrations = [
    { 
      name: "7shifts", 
      status: "connected", 
      lastSync: "2 hours ago",
      description: "Labor & scheduling"
    },
    { 
      name: "Temperature Sensors", 
      status: "connected", 
      lastSync: "Live",
      description: "Food safety monitoring"
    },
    { 
      name: "POS System", 
      status: "not_configured", 
      lastSync: null,
      description: "Sales & revenue"
    },
    { 
      name: "Reservations", 
      status: "not_configured", 
      lastSync: null,
      description: "OpenTable / Resy"
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case "syncing":
        return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "connected":
        return { text: "Connected", color: "text-emerald-400 bg-emerald-500/20" };
      case "error":
        return { text: "Error", color: "text-rose-400 bg-rose-500/20" };
      case "syncing":
        return { text: "Syncing", color: "text-amber-400 bg-amber-500/20" };
      default:
        return { text: "Not Configured", color: "text-gray-400 bg-gray-700/50" };
    }
  };

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/tabs/AdminDash_SystemTab.tsx
        </div>
      )}

      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box lime">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">System Health</h3>
              <p className="subheader-subtitle">Integrations, sync status & alerts</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Stat toggles */}
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <Plug className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Integrations</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <RefreshCw className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Sync</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Status */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-badge-primary">
            <Plug />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Integrations</h4>
            <p className="text-xs text-gray-500">Connected systems and data sources</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {integrations.map((integration) => {
            const statusLabel = getStatusLabel(integration.status);
            return (
              <div 
                key={integration.name}
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/30"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(integration.status)}
                  <div>
                    <p className="text-sm font-medium text-white">{integration.name}</p>
                    <p className="text-xs text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {integration.lastSync && (
                    <span className="text-xs text-gray-500">
                      {integration.lastSync}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${statusLabel.color}`}>
                    {statusLabel.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-amber">
              <AlertCircle />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">System Alerts</h4>
              <p className="text-xs text-gray-500">Errors and warnings</p>
            </div>
          </div>
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">All systems operational</p>
            <p className="text-gray-500 text-xs mt-1">No alerts at this time</p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-purple">
              <RefreshCw />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Recent Sync Jobs</h4>
              <p className="text-xs text-gray-500">Background data processing</p>
            </div>
          </div>
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm mb-2">
              Sync history coming soon
            </p>
            <p className="text-gray-500 text-xs">
              View import job logs and status
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDash_SystemTab;
