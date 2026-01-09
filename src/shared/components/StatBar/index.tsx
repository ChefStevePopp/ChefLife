import React, { useState } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";

// =============================================================================
// STAT BAR - L5 Design Standard
// =============================================================================
// A horizontal stat bar that provides contextual information without competing
// for visual attention with the main content below.
//
// Design Philosophy:
// - Muted gray palette (color shifts focus - stats inform, don't distract)
// - Responsive: collapses to accordion on mobile
// - Numbers are prominent (white), labels are subtle (gray)
// - Icons are decorative only (gray, not colored)
//
// Usage:
//   <StatBar stats={[
//     { icon: Package, label: "Total", value: 522 },
//     { icon: Layers, label: "Groups", value: 5, subtext: "top-level" },
//   ]} />
// =============================================================================

export interface StatItem {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Short label (e.g., "Total", "Groups") */
  label: string;
  /** The main value to display */
  value: string | number;
  /** Optional subtext below the value */
  subtext?: string;
  /** Optional: show a progress bar (0-100) */
  progress?: number;
}

interface StatBarProps {
  stats: StatItem[];
  /** Optional: which stat index to show as "primary" on mobile collapsed view */
  primaryIndex?: number;
  /** Optional: additional className */
  className?: string;
}

export const StatBar: React.FC<StatBarProps> = ({
  stats,
  primaryIndex = 0,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const primaryStat = stats[primaryIndex];
  const PrimaryIcon = primaryStat.icon;

  return (
    <div className={`bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden ${className}`}>
      {/* =====================================================================
       * MOBILE: Accordion Header (visible < sm breakpoint)
       * Shows primary stat + expand/collapse chevron
       * ===================================================================== */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full sm:hidden flex items-center justify-between p-3 text-left hover:bg-gray-800/20 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="stat-bar-content"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
            <PrimaryIcon className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">{primaryStat.value}</span>
            <span className="text-sm text-gray-500 ml-2">{primaryStat.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-xs">{stats.length} stats</span>
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} 
          />
        </div>
      </button>

      {/* =====================================================================
       * MOBILE: Expanded Content (accordion body)
       * Shows all stats in 2-column grid when expanded
       * ===================================================================== */}
      <div
        id="stat-bar-content-mobile"
        className={`
          sm:hidden
          overflow-hidden transition-all duration-200 ease-in-out
          ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-700/30 border-t border-gray-700/30">
          {stats.map((stat, index) => (
            <StatItemCompact key={index} stat={stat} />
          ))}
        </div>
      </div>

      {/* =====================================================================
       * DESKTOP: Horizontal Stat Bar (visible >= sm breakpoint)
       * Shows all stats in a single row with dividers
       * ===================================================================== */}
      <div
        className="hidden sm:grid divide-x divide-gray-700/30"
        style={{
          gridTemplateColumns: `repeat(${Math.min(stats.length, 6)}, minmax(0, 1fr))`,
        }}
      >
        {stats.map((stat, index) => (
          <StatItemFull key={index} stat={stat} />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// STAT ITEM - Full Version (Desktop)
// =============================================================================

interface StatItemProps {
  stat: StatItem;
}

const StatItemFull: React.FC<StatItemProps> = ({ stat }) => {
  const Icon = stat.icon;

  return (
    <div className="px-4 py-3 first:pl-5 last:pr-5">
      <div className="flex items-center gap-3">
        {/* Icon - Muted gray, not colored */}
        <div className="w-9 h-9 rounded-lg bg-gray-700/40 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium truncate">
            {stat.label}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{stat.value}</span>
            {stat.subtext && (
              <span className="text-xs text-gray-600 truncate">{stat.subtext}</span>
            )}
          </div>

          {/* Progress Bar (optional) */}
          {stat.progress !== undefined && (
            <div className="mt-1.5 h-1 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-500 transition-all duration-500"
                style={{ width: `${Math.min(stat.progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// STAT ITEM - Compact Version (Mobile Accordion)
// =============================================================================

const StatItemCompact: React.FC<StatItemProps> = ({ stat }) => {
  const Icon = stat.icon;

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        {/* Icon - Smaller on mobile */}
        <div className="w-7 h-7 rounded-md bg-gray-700/40 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
        </div>

        {/* Content - Stacked tighter */}
        <div className="flex-1 min-w-0">
          <div className="text-2xs text-gray-500 uppercase tracking-wide font-medium truncate">
            {stat.label}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-white">{stat.value}</span>
            {stat.subtext && (
              <span className="text-2xs text-gray-600 truncate">{stat.subtext}</span>
            )}
          </div>

          {/* Progress Bar (optional) */}
          {stat.progress !== undefined && (
            <div className="mt-1 h-0.5 bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-500"
                style={{ width: `${Math.min(stat.progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatBar;
