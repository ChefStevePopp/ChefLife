import React from "react";
import { CHART_CONFIG } from "../config";

/**
 * =============================================================================
 * CUSTOM DOT
 * =============================================================================
 * Custom dot component for Recharts that shows price changes prominently
 * and stable prices subtly.
 * =============================================================================
 */

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: {
    hasChange?: boolean;
  };
  dataKey?: string;
}

export const CustomDot: React.FC<CustomDotProps> = ({ cx, cy, payload, dataKey }) => {
  if (!cx || !cy || dataKey !== "selected") return null;

  const hasChange = payload?.hasChange;

  if (hasChange) {
    // Price changed - prominent solid dot
    return (
      <circle
        cx={cx}
        cy={cy}
        r={CHART_CONFIG.changeDot.r}
        fill={CHART_CONFIG.changeDot.fill}
        stroke={CHART_CONFIG.changeDot.stroke}
        strokeWidth={CHART_CONFIG.changeDot.strokeWidth}
      />
    );
  } else {
    // Same price as before - subtle ring marker
    return (
      <circle
        cx={cx}
        cy={cy}
        r={CHART_CONFIG.stableDot.r}
        fill={CHART_CONFIG.stableDot.fill}
        stroke={CHART_CONFIG.stableDot.stroke}
        strokeWidth={CHART_CONFIG.stableDot.strokeWidth}
        strokeDasharray={CHART_CONFIG.stableDot.strokeDasharray}
      />
    );
  }
};
