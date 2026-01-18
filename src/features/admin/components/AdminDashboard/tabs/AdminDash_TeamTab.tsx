import React from "react";
import {
  Users,
  Calendar,
  AlertTriangle,
  UserCheck,
  Clock,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { TodaysTeamCarousel } from "../TodaysTeamCarousel";

/**
 * =============================================================================
 * NEXUS DASHBOARD - Team Tab
 * =============================================================================
 * Vitals from the TEAM sidebar section:
 * - Today's schedule / who's on
 * - Attendance alerts
 * - Coaching flags
 * - Team performance quick stats
 * =============================================================================
 */

export const AdminDash_TeamTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/tabs/AdminDash_TeamTab.tsx
        </div>
      )}

      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box green">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">Team Vitals</h3>
              <p className="subheader-subtitle">Who's on, attendance & performance</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Stat toggles */}
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Schedule</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">On Now</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Team Carousel */}
      <TodaysTeamCarousel />

      {/* Future: Attendance alerts, Coaching flags, Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-amber">
              <Clock />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Attendance Today</h4>
              <p className="text-xs text-gray-500">No issues reported</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm text-center py-4">
            Attendance tracking integration coming soon
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-rose">
              <AlertTriangle />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Coaching Flags</h4>
              <p className="text-xs text-gray-500">Team members needing attention</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm text-center py-4">
            Links to Team Performance module
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDash_TeamTab;
