import React from "react";
import {
  Truck,
  TrendingUp,
  TrendingDown,
  Package,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";

/**
 * =============================================================================
 * NEXUS DASHBOARD - BOH Vitals Tab
 * =============================================================================
 * Back-of-House data imports and cost monitoring:
 * - Price alerts (expanded from ticker)
 * - Vendor analytics insights
 * - Inventory warnings
 * - Cost trend indicators
 * 
 * Data flows IN from: Vendor Invoice Management (VIM)
 * =============================================================================
 */

export const AdminDash_BOHVitalsTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/tabs/AdminDash_BOHVitalsTab.tsx
        </div>
      )}

      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box amber">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">BOH Vitals</h3>
              <p className="subheader-subtitle">Vendor imports, pricing & inventory health</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Stat toggles */}
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Increases</span>
            </div>
            <div className="subheader-toggle">
              <div className="subheader-toggle-icon">
                <TrendingDown className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">Decreases</span>
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

      {/* Price Alerts - Expanded View */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-badge-emerald">
            <CircleDollarSign />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Recent Price Changes</h4>
            <p className="text-xs text-gray-500">From vendor invoices in the last 30 days</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm text-center py-8">
          Price change details will appear here — expanded view of the Price Watch Ticker
        </p>
      </div>

      {/* Vendor Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-amber">
              <TrendingUp />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Vendor Creep Alerts</h4>
              <p className="text-xs text-gray-500">Vendors with trending price increases</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm text-center py-4">
            Run Analysis in VIM → Analytics to generate insights
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge-primary">
              <Package />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Inventory Status</h4>
              <p className="text-xs text-gray-500">Low stock and reorder alerts</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm text-center py-4">
            Inventory module polish coming soon
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDash_BOHVitalsTab;
