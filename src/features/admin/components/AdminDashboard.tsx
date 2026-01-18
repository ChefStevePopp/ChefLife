import React, { useState, useEffect } from "react";
import {
  Users,
  Info,
  ChevronUp,
  RefreshCw,
  ChefHat,
  Database,
  Building2,
  BookOpen,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useOrganizationSettings } from "@/features/admin/components/settings/OrganizationSettings/useOrganizationSettings";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useAuth } from "@/hooks/useAuth";
import { PriceWatchTickerInline } from "./AdminDashboard/PriceWatchTickerInline";

// Tab Components
import {
  AdminDash_KitchenTab,
  AdminDash_TeamTab,
  AdminDash_DataTab,
  AdminDash_OrganizationTab,
  AdminDash_CraftPerfectedTab,
} from "./AdminDashboard/tabs";

/**
 * =============================================================================
 * NEXUS DASHBOARD - L5 Tabbed Design
 * =============================================================================
 * Reference: L5-BUILD-STRATEGY.md
 * 
 * The Nexus Dashboard is the "medical chart" of your restaurant - showing
 * vital signs across all organ systems at a glance.
 * 
 * Structure:
 * - Header Card with ghost watermark + Active Staff pill + Price Watch Ticker
 * - L5 Tabs matching sidebar navigation sections
 *   - Kitchen (primary) - temps, tasks, prep
 *   - Team (green) - schedule, attendance, coaching
 *   - Data (amber) - prices, vendors, inventory
 *   - Organization (rose) - activity feed, system events
 *   - Craft Perfected (purple) - future education platform
 * =============================================================================
 */

// ChefBot placeholder - shown when no org logo uploaded
const CHEFBOT_PLACEHOLDER = "https://www.restaurantconsultants.ca/wp-content/uploads/2023/03/cropped-AI-CHEF-BOT.png";

type TabId = "kitchen" | "team" | "data" | "organization" | "craft";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
}

const TABS: TabConfig[] = [
  { id: "kitchen", label: "Kitchen", icon: ChefHat, color: "primary" },
  { id: "team", label: "Team", icon: Users, color: "green" },
  { id: "data", label: "Data", icon: Database, color: "amber" },
  { id: "organization", label: "Organization", icon: Building2, color: "rose" },
  { id: "craft", label: "Craft Perfected", icon: BookOpen, color: "purple" },
];

export function AdminDashboard() {
  const { showDiagnostics } = useDiagnostics();
  const { organization } = useOrganizationSettings();
  const { organization: authOrg } = useAuth();
  const { scheduleShifts, fetchCurrentSchedule, fetchShifts } = useScheduleStore();
  
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("kitchen");

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

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "kitchen":
        return <AdminDash_KitchenTab />;
      case "team":
        return <AdminDash_TeamTab />;
      case "data":
        return <AdminDash_DataTab />;
      case "organization":
        return <AdminDash_OrganizationTab />;
      case "craft":
        return <AdminDash_CraftPerfectedTab />;
      default:
        return <AdminDash_KitchenTab />;
    }
  };

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
                    NEXUS
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
                    About NEXUS Dashboard
                  </span>
                </div>
                <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
              </button>
              <div className="expandable-info-content">
                <div className="p-4 pt-2 space-y-3">
                  <p className="text-sm text-gray-400">
                    NEXUS is your restaurant's vital signs monitor — a real-time view of 
                    every system's health. Like a medical chart, it shows what's working, 
                    what needs attention, and what's critical.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-primary-400">Kitchen</span>
                      <p className="text-xs text-gray-500 mt-1">Temps, tasks & prep</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-green-400">Team</span>
                      <p className="text-xs text-gray-500 mt-1">Schedule & attendance</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-amber-400">Data</span>
                      <p className="text-xs text-gray-500 mt-1">Prices & inventory</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-rose-400">Organization</span>
                      <p className="text-xs text-gray-500 mt-1">Activity & events</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <span className="text-sm font-medium text-purple-400">Craft Perfected</span>
                      <p className="text-xs text-gray-500 mt-1">Coming soon</p>
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

      {/* ========================================================================
       * L5 TABS - Matching sidebar navigation sections
       * Color progression: primary → green → amber → rose → purple
       * ======================================================================== */}
      <div className="card p-4">
        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab ${tab.color} ${activeTab === tab.id ? "active" : ""}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
