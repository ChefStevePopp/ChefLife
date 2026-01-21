/**
 * =============================================================================
 * PRICE HISTORY CHART CONFIG
 * =============================================================================
 * Colors, constants, and configuration for price history charts.
 * =============================================================================
 */

// Color palette for comparison lines
export const VENDOR_COLORS = [
  "#2dd4bf", // teal (primary - selected item)
  "#f59e0b", // amber
  "#a78bfa", // purple
  "#fb7185", // rose
  "#38bdf8", // sky
  "#4ade80", // green
  "#f472b6", // pink
  "#facc15", // yellow
];

export const CATEGORY_COLOR = "#6b7280"; // gray for category average

// Lookback period options
export const LOOKBACK_OPTIONS = [
  { value: 30, label: "30d" },
  { value: 60, label: "60d" },
  { value: 90, label: "90d" },
  { value: 180, label: "180d" },
  { value: 365, label: "1yr" },
  { value: 730, label: "2yr" },
];

// Default lookback period in days
export const DEFAULT_LOOKBACK_DAYS = 180;

// Chart styling
export const CHART_CONFIG = {
  grid: {
    strokeDasharray: "3 3",
    stroke: "#374151",
    opacity: 0.3,
  },
  axis: {
    fontSize: 10,
    fill: "#6b7280",
  },
  selectedLine: {
    strokeWidth: 2.5,
    activeDot: {
      fill: "#5eead4",
      strokeWidth: 0,
      r: 7,
    },
  },
  comparisonLine: {
    strokeWidth: 2,
    strokeDasharray: "5 5",
    activeDot: {
      strokeWidth: 0,
      r: 4,
    },
  },
  categoryLine: {
    strokeWidth: 1,
    strokeDasharray: "2 2",
    opacity: 0.6,
  },
  changeDot: {
    r: 5,
    fill: "#2dd4bf",
    stroke: "#134e4a",
    strokeWidth: 1,
  },
  stableDot: {
    r: 3,
    fill: "transparent",
    stroke: "#4b5563",
    strokeWidth: 1.5,
    strokeDasharray: "2 1",
  },
};
