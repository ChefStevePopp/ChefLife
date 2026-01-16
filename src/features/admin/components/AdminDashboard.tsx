import React from "react";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";
import { useAdminStore } from "@/stores/adminStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { StatsCard } from "./StatsCard";
import { ActivityFeed } from "./ActivityFeed";
import { AlertsList } from "./AlertsList";
import { PriceWatchTicker } from "./AdminDashboard/PriceWatchTicker";
import { TemperatureWidgetWrapper } from "./AdminDashboard/TemperatureWidgetWrapper";

/**
 * =============================================================================
 * ADMIN DASHBOARD - L5 BUILD PHASES
 * =============================================================================
 * 
 * Phase 1: Foundation                                               ✅ COMPLETE
 * - [x] Route at /admin
 * - [x] L5 Sub-header pattern
 * - [x] Basic stat cards
 * - [x] Activity feed and alerts list
 * 
 * Phase 2: Card Design                                              🔄 IN PROGRESS
 * - [x] L5 Sub-header with icon box
 * - [x] Price Watch Ticker widget
 * - [x] Temperature Monitor stat card (live SensorPush data)
 * - [ ] Remaining stat cards with real data
 * - [ ] Clickable cards → drill-down navigation
 * 
 * Phase 3: Search & Filter                                          ⏳ PENDING
 * - [ ] Activity feed filtering by type
 * - [ ] Alerts filtering by priority
 * - [ ] Date range for activity
 * 
 * Phase 4: Pagination                                               ⏳ PENDING
 * - [ ] Activity feed pagination/infinite scroll
 * - [ ] Alerts pagination
 * 
 * Phase 5: Core Feature                                             🔄 IN PROGRESS
 * - [x] Price Watch Ticker (live data)
 * - [x] Temperature Monitor (live SensorPush data)
 * - [ ] Real-time stat card updates
 * - [ ] Activity log from NEXUS
 * - [ ] System alerts from various modules
 * 
 * Phase 6: Polish                                                   ⏳ PENDING
 * - [ ] Refresh button wired to live data
 * - [ ] Keyboard shortcuts
 * - [ ] Custom widget arrangement
 * - [ ] Dashboard export/print
 * 
 * FUTURE WIDGETS (per ROADMAP-NEXUS.md):
 * - [ ] Cover Forecast (OpenTable integration) - Q2 2026
 * - [ ] Today's Prep (Prep Forecast) - Q3 2026
 * - [ ] Yield Alerts (Variance Tracking) - Q4 2026
 * - [ ] Cost Trends (MIL + Invoice History) - Q2 2026
 * =============================================================================
 */

export function AdminDashboard() {
  const { stats, activities, alerts } = useAdminStore();
  const { showDiagnostics } = useDiagnostics();

  // Remaining static stat cards (Temperature Monitor is now a live component)
  const statsCards = [
    {
      icon: Users,
      label: "Active Staff",
      value: stats.activeStaff,
      change: "+2",
      color: "blue",
    },
    // Temperature Monitor is rendered separately as a live component
    {
      icon: AlertTriangle,
      label: "Pending Tasks",
      value: stats.pendingTasks,
      change: "+5",
      color: "orange",
    },
    {
      icon: TrendingUp,
      label: "Prep Completion",
      value: `${stats.prepCompletion}%`,
      change: "+12%",
      color: "green",
    },
  ];

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard.tsx
        </div>
      )}

      {/* L5 Sub-Header */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box primary">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            <div>
              <h3 className="subheader-title">Admin Dashboard</h3>
              <p className="subheader-subtitle">Your command center</p>
            </div>
          </div>
          <div className="subheader-right">
            {/* Refresh will be wired when dashboard uses live data */}
          </div>
        </div>
      </div>

      {/* Price Watch Ticker */}
      <PriceWatchTicker />

      {/* Stats Cards - Mixed: Static cards + Live Temperature Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Staff */}
        <StatsCard {...statsCards[0]} />
        
        {/* Temperature Monitor - A/B test: Legacy vs New Widget Architecture */}
        <TemperatureWidgetWrapper />
        
        {/* Pending Tasks */}
        <StatsCard {...statsCards[1]} />
        
        {/* Prep Completion */}
        <StatsCard {...statsCards[2]} />
      </div>

      {/* Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed activities={activities} />
        <AlertsList alerts={alerts} />
      </div>
    </div>
  );
}
