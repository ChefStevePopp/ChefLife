import React from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * =============================================================================
 * NEXUS DASHBOARD - FOH Vitals Tab
 * =============================================================================
 * Front-of-House data imports and revenue monitoring:
 * - POS sales imports
 * - Reservation system integration (OpenTable, Resy)
 * - Cover counts and volume tracking
 * - Revenue trends
 * 
 * Data flows IN from: POS systems, reservation platforms
 * =============================================================================
 */

export const AdminDash_FOHVitalsTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/tabs/AdminDash_FOHVitalsTab.tsx
        </div>
      )}

      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box rose">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">FOH Vitals</h3>
              <p className="subheader-subtitle">Revenue imports, sales & customer volume</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Stat toggles */}
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Revenue</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <Users className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Covers</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Mix</span>
            </div>
          </div>
        </div>
      </div>

      {/* POS Integration */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-badge-rose">
            <CreditCard />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">POS Sales Data</h4>
            <p className="text-xs text-gray-500">Daily revenue and item mix from your point of sale</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm mb-2">
            POS integration coming soon
          </p>
          <p className="text-gray-500 text-xs">
            Connect your POS system to import sales data automatically
          </p>
        </div>
      </div>

      {/* Reservations & Volume */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-purple">
              <Calendar />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Reservations</h4>
              <p className="text-xs text-gray-500">OpenTable, Resy, or manual entry</p>
            </div>
          </div>
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm mb-2">
              Reservation integration coming soon
            </p>
            <p className="text-gray-500 text-xs">
              Track covers and forecast volume
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-emerald">
              <TrendingUp />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Revenue Trends</h4>
              <p className="text-xs text-gray-500">Week over week, month over month</p>
            </div>
          </div>
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm mb-2">
              Requires POS data
            </p>
            <p className="text-gray-500 text-xs">
              Charts and trends appear after import setup
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDash_FOHVitalsTab;
