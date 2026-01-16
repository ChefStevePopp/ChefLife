import React, { useState, useEffect } from "react";
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
import { useScheduleStore } from "@/stores/scheduleStore";
import { useAuth } from "@/hooks/useAuth";
import { StatsCard } from "./StatsCard";
import { ActivityFeed } from "./ActivityFeed";
import { AlertsList } from "./AlertsList";
import { PriceWatchTickerInline } from "./AdminDashboard/PriceWatchTickerInline";
import { TemperatureWidgetWrapper } from "./AdminDashboard/TemperatureWidgetWrapper";
import { TodaysTeamCarousel } from "./AdminDashboard/TodaysTeamCarousel";

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
 * Layout:
 * - Header Card with ghost watermark + Active Staff pill + Price Watch Ticker
 * - Stats Cards (3 cards: Temp, Tasks, Prep)
 * - Today's Team Carousel (swipeable team cards)
 * - Activity & Alerts (2-column)
 * =============================================================================
 */

// ChefBot placeholder - shown when no org logo uploaded
const CHEFBOT_PLACEHOLDER = "https://www.restaurantconsultants.ca/wp-content/uploads/2023/03/cropped-AI-CHEF-BOT.png";

export function AdminDashboard() {
  const { stats, activities, alerts } = useAdminStore();
  const { showDiagnostics } = useDiagnostics();
  const { organization } = useOrganizationSettings();
  const { organization: authOrg } = useAuth();
  const { scheduleShifts, fetchCurrentSchedule, fetchShifts } = useScheduleStore();
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [activeStaffCount, setActiveStaffCount] = useState(0);

  // Get org logo or fallback to ChefBot
  const orgLogo = organization?.settings?.branding?.logo_url;
  const orgName = organization?.name || "ChefLife";

  // Load schedule for active staff count
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const schedule = await fetchCurrentSchedule();
        if (schedule?.id) {
          await fetchShifts(schedule.id);
        }
      } catch (error) {
        console.error("Error loading schedule:", error);
      }
    };
    loadSchedule();
  }, [fetchCurrentSchedule, fetchShifts]);

  // Calculate active staff for today
  useEffect(() => {
    const orgTimezone =
      authOrg?.settings?.default_timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    const today = new Date();
    let todayStr;
    try {
      todayStr = today
        .toLocaleDateString("en-CA", {
          timeZone: orgTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "-");
    } catch (e) {
      todayStr = today.toISOString().split("T")[0];
    }

    const shiftsForToday = scheduleShifts.filter(
      (shift) => shift.shift_date === todayStr
    );

    // Deduplicate by employee
    const uniqueEmployees = new Set(
      shiftsForToday.map((s) => s.employee_id || s.employee_name)
    );
    setActiveStaffCount(uniqueEmployees.size);
  }, [scheduleShifts, authOrg?.settings?.default_timezone]);

  // Stat cards
  const statsCards = [
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
       * NEXUS HEADER with Ghost Logo Watermark + Embedded Price Watch Ticker
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
            {/* Top row: Logo/Title + Active Staff Pill + Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Logo Box */}
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

              {/* Right side: Active Staff Pill + Refresh */}
              <div className="flex items-center gap-3">
                {/* Active Staff Pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">
                    {activeStaffCount}
                  </span>
                  <span className="text-xs text-blue-400/70 hidden sm:inline">
                    Active
                  </span>
                </div>

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

            {/* Price Watch Ticker - Embedded in header */}
            <PriceWatchTickerInline />
          </div>
        </div>
      </div>

      {/* Stats Cards - 3 cards: Temperature + Tasks + Prep */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Temperature Monitor */}
        <TemperatureWidgetWrapper />
        
        {/* Pending Tasks */}
        <StatsCard {...statsCards[0]} />
        
        {/* Prep Completion */}
        <StatsCard {...statsCards[1]} />
      </div>

      {/* Today's Team Carousel - Full width swipeable cards */}
      <TodaysTeamCarousel />

      {/* Activity & Alerts - 2 column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed activities={activities} />
        <AlertsList alerts={alerts} />
      </div>
    </div>
  );
}
