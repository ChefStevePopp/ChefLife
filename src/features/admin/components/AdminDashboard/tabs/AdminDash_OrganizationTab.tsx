import React from "react";
import {
  Building2,
  Activity,
  Bell,
  Shield,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { ActivityFeedV2 } from "../../ActivityFeedV2";

/**
 * =============================================================================
 * NEXUS DASHBOARD - Organization Tab
 * =============================================================================
 * Business activity and who did what:
 * - Full Activity Feed (V2 triage inbox)
 * - Business events and changes
 * - Security alerts (future)
 * 
 * Note: Technical/system events moved to System tab.
 * This tab focuses on business activity.
 * =============================================================================
 */

export const AdminDash_OrganizationTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/tabs/AdminDash_OrganizationTab.tsx
        </div>
      )}

      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box purple">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">Organization Activity</h3>
              <p className="subheader-subtitle">Who did what & business events</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Stat toggles */}
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <Activity className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Activity</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <Bell className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Alerts</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <Shield className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed V2 - The main content */}
      <ActivityFeedV2 defaultDaysLimit={14} maxItems={50} />
    </div>
  );
};

export default AdminDash_OrganizationTab;
