import React, { useState, useEffect } from "react";
import {
  ChefHat,
  Thermometer,
  ClipboardList,
  Info,
  ChevronUp,
  ChevronDown,
  FileText,
  CookingPot,
} from "lucide-react";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { TemperatureStatCardCompact } from "../TemperatureStatCardCompact";
import { AnimatedNumber } from "@/shared/components/AnimatedNumber";
import { useAdminStore } from "@/stores/adminStore";

/**
 * =============================================================================
 * NEXUS DASHBOARD - Kitchen Tab
 * =============================================================================
 * Vitals from the KITCHEN sidebar section:
 * - Temperature monitoring (SensorPush HACCP) - in subheader
 * - Recipe activity (creation, modifications)
 * - Task completion status
 * - Prep production status
 * 
 * Layout: Subheader (with compact temp widget) → Accordion Sections (with inline stats)
 * Pattern: VendorAnalytics.tsx
 * =============================================================================
 */

// Section definitions with stat data
const SECTIONS = [
  {
    id: "haccp",
    icon: Thermometer,
    color: "primary",
    label: "HACCP Monitoring",
    subtitle: "Temperature exceptions and food safety compliance alerts",
    statKey: "haccpFlags",
    statSuffix: "flags",
  },
  {
    id: "recipes",
    icon: FileText,
    color: "amber",
    label: "Recipe Activity",
    subtitle: "Creation, modifications, and cost impact tracking",
    statKey: "recipesNew",
    statSuffix: "new",
  },
  {
    id: "tasks",
    icon: ClipboardList,
    color: "emerald",
    label: "Task Management",
    subtitle: "Daily operational checklists and completion tracking",
    statKey: "pendingTasks",
    statSuffix: "pending",
  },
  {
    id: "prep",
    icon: CookingPot,
    color: "purple",
    label: "Prep Production",
    subtitle: "Current prep status and schedule adherence",
    statKey: "prepCompletion",
    statSuffix: "%",
  },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

// localStorage key for persisting expanded sections
const STORAGE_KEY = "cheflife-kitchen-expanded";

// Color classes for section styling
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: "bg-primary-500/20", text: "text-primary-400", border: "border-primary-500/30" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
};

export const AdminDash_KitchenTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  const { stats } = useAdminStore();
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Accordion state - persisted to localStorage
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed as SectionId[]);
      }
    } catch (e) {
      console.error("Error loading kitchen expanded state:", e);
    }
    return new Set();
  });

  // Persist expanded state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedSections)));
  }, [expandedSections]);

  // Toggle section expanded state
  const toggleSection = (id: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Stats data - will be data-driven from stores in future
  const sectionStats: Record<string, number> = {
    haccpFlags: 0,
    recipesNew: 2,
    pendingTasks: stats.pendingTasks || 15,
    prepCompletion: stats.prepCompletion || 85,
  };

  return (
    <div className="space-y-6">
      {/* L5 Diagnostic Path */}
      {showDiagnostics && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/AdminDashboard/tabs/AdminDash_KitchenTab.tsx
        </div>
      )}

      {/* Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box primary">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="subheader-title">Kitchen Vitals</h3>
              <p className="subheader-subtitle">Temperature, tasks & prep status</p>
            </div>
          </div>
          
          {/* Compact Temperature Widget in subheader */}
          <div className="subheader-right">
            <TemperatureStatCardCompact />
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className={`expandable-info-section mt-4 ${isInfoExpanded ? 'expanded' : ''}`}>
          <button
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About Kitchen Vitals</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                Real-time visibility into kitchen operations, food safety compliance, and production status.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const colors = colorClasses[section.color];
                  return (
                    <div key={section.id} className={`subheader-feature-card ${colors.bg.replace('/20', '/5')}`}>
                      <Icon className={colors.text} />
                      <div>
                        <div className={`subheader-feature-title ${colors.text.replace('-400', '-300')}`}>
                          {section.label}
                        </div>
                        <div className="subheader-feature-desc">{section.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Sections - with inline stats */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const colors = colorClasses[section.color];
          const isExpanded = expandedSections.has(section.id);
          const statValue = sectionStats[section.statKey];

          return (
            <div
              key={section.id}
              id={section.id}
              className={`card overflow-hidden transition-all duration-300 ${
                isExpanded ? "bg-gray-800/50" : "bg-gray-800/30"
              }`}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
              >
                {/* Left: Icon + Title */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-medium text-white">{section.label}</h3>
                    <p className="text-xs text-gray-500">{section.subtitle}</p>
                  </div>
                </div>

                {/* Right: Stat Pill + Chevron */}
                <div className="flex items-center gap-3">
                  {/* Stat pill - muted gray badge */}
                  <div className="flex items-baseline gap-1.5 px-3 py-1 bg-gray-700/50 border border-gray-600/50 rounded-lg">
                    <AnimatedNumber
                      value={statValue}
                      decimals={0}
                      duration={1500}
                      className="text-base font-semibold text-gray-300 tabular-nums"
                    />
                    <span className="text-xs text-gray-500">{section.statSuffix}</span>
                  </div>
                  
                  {/* Chevron */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-700/50">
                  {/* Section-specific content - placeholder for now */}
                  {section.id === "haccp" && (
                    <div className="mt-4 text-center py-8 bg-gray-900/30 rounded-lg">
                      <Thermometer className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        HACCP temperature logs and compliance alerts will appear here
                      </p>
                    </div>
                  )}
                  {section.id === "recipes" && (
                    <div className="mt-4 text-center py-8 bg-gray-900/30 rounded-lg">
                      <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        Recent recipe changes and cost impact notifications will appear here
                      </p>
                    </div>
                  )}
                  {section.id === "tasks" && (
                    <div className="mt-4 text-center py-8 bg-gray-900/30 rounded-lg">
                      <ClipboardList className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        Daily task checklists and completion status will appear here
                      </p>
                    </div>
                  )}
                  {section.id === "prep" && (
                    <div className="mt-4 text-center py-8 bg-gray-900/30 rounded-lg">
                      <CookingPot className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        Prep production tracking and schedule adherence will appear here
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDash_KitchenTab;
