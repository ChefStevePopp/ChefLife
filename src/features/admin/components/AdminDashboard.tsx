import React, { useState } from "react";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Info,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useAdminStore } from "@/stores/adminStore";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useOrganizationSettings } from "@/features/admin/components/settings/OrganizationSettings/useOrganizationSettings";
import { StatsCard } from "./StatsCard";
import { ActivityFeed } from "./ActivityFeed";
import { AlertsList } from "./AlertsList";
import { PriceWatchTicker } from "./AdminDashboard/PriceWatchTicker";
import { TemperatureWidgetWrapper } from "./AdminDashboard/TemperatureWidgetWrapper";

/**
 * =============================================================================
 * NEXUS DASHBOARD - L5 Design
 * =============================================================================
 * Reference: L5-BUILD-STRATEGY.md - Simple Header (Variant A)
 * Reference: CHEFLIFE-ANATOMY.md - "Vital Signs" concept
 * 
 * The Nexus Dashboard is the "medical chart" of your restaurant - showing
 * vital signs across all organ systems at a glance.
 * 
 * Design Feature: Ghost Logo Watermark
 * - XXXL monochrome logo behind header zone only
 * - Bleeds off left edge of viewport - "peeking in" effect
 * - Uses grayscale filter + low opacity for ghost effect
 * 
 * Layout:
 * - Price Watch Ticker (top - the EKG pulse)
 * - Header Card with ghost watermark
 * - Stats Cards
 * - Activity & Alerts
 * =============================================================================
 */

// ChefBot placeholder - shown when no org logo uploaded
const CHEFBOT_PLACEHOLDER = "https://www.restaurantconsultants.ca/wp-content/uploads/2023/03/cropped-AI-CHEF-BOT.png";

export function AdminDashboard() {
  const { stats, activities, alerts } = useAdminStore();
  const { showDiagnostics } = useDiagnostics();
  const { organization } = useOrganizationSettings();
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Get org logo or fallback to ChefBot
  const orgLogo = organization?.settings?.branding?.logo_url;
  const orgName = organization?.name || "ChefLife";

  // Remaining static stat cards (Temperature Monitor is now a live component)
  const statsCards = [
    {
      icon: Users,
      label: "Active Staff",
      value: stats.activeStaff,
      change: "+2",
      color: "blue",
    },
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

      {/* ========================================================================
       * PRICE WATCH TICKER - The EKG pulse at the top
       * ======================================================================== */}
      <PriceWatchTicker />

      {/* ========================================================================
       * NEXUS HEADER with Ghost Logo Watermark
       * Ghost bleeds off left edge - "peeking in" from outside viewport
       * ======================================================================== */}
      <div className="relative">
        {/* Ghost Logo - positioned to bleed off left edge */}
        <div 
          className="absolute inset-y-0 -left-4 w-[500px] overflow-visible pointer-events-none"
          aria-hidden="true"
        >
          <img
            src={orgLogo || CHEFBOT_PLACEHOLDER}
            alt=""
            className="absolute -left-64 top-1/2 -translate-y-1/2 w-[400px] h-[400px] object-contain opacity-[0.07] grayscale"
            style={{
              transform: 'translateY(-50%) rotate(15deg)',
            }}
          />
        </div>

        {/* L5 HEADER CARD */}
        <div className="relative bg-[#1a1f2b] rounded-lg shadow-lg p-4">
          <div className="flex flex-col gap-4">
            {/* Top row: Logo/Title + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Logo Box - org logo or ChefBot placeholder */}
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden ring-2 ring-primary-500/30 shadow-lg flex-shrink-0">
                  <img
                    src={orgLogo || CHEFBOT_PLACEHOLDER}
                    alt={`${orgName} logo`}
                    className={`w-full h-full object-contain p-1 ${!orgLogo ? 'opacity-70' : ''}`}
                  />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    Nexus
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {orgName} • Command Center
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="btn-ghost text-gray-400 hover:text-white"
                  title="Refresh dashboard"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Info Section */}
            <div className={`expandable-info-section ${isInfoExpanded ? "expanded" : ""}`}>
              <button
                onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                className="expandable-info-header w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-300">
                    About Nexus Dashboard
                  </span>
                </div>
                <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
              </button>
              <div className="expandable-info-content">
                <div className="p-4 pt-2 space-y-3">
                  <p className="text-sm text-gray-400">
                    Nexus is your restaurant's vital signs monitor — a real-time view of 
                    every system's health. Like a medical chart, it shows what's working, 
                    what needs attention, and what's critical.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-primary-400">Price Watch</span>
                      <p className="text-xs text-gray-500 mt-1">Live cost alerts from VIM</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-cyan-400">Temperature</span>
                      <p className="text-xs text-gray-500 mt-1">SensorPush HACCP monitoring</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-green-400">Activity</span>
                      <p className="text-xs text-gray-500 mt-1">Recent system events</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-amber-400">Alerts</span>
                      <p className="text-xs text-gray-500 mt-1">Items needing attention</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Mixed: Static cards + Live Temperature Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Staff */}
        <StatsCard {...statsCards[0]} />
        
        {/* Temperature Monitor */}
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
