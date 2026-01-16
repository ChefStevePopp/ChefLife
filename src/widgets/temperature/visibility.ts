/**
 * =============================================================================
 * TEMPERATURE WIDGET - VISIBILITY CONFIG
 * =============================================================================
 * 
 * Defines what each security level sees in the Temperature widget.
 * This is the "information density" dial.
 * 
 * SECURITY HIERARCHY (lower number = higher clearance):
 * Omega (0) = Developer      ← Sees EVERYTHING
 * Alpha (1) = Owner
 * Bravo (2) = Manager
 * Charlie (3) = Supervisor
 * Delta (4) = Shift Lead
 * Echo (5) = Team Member     ← Sees LEAST
 * 
 * The same widget renders for everyone - security level controls density.
 * Use level <= X checks (lower number = more access).
 * 
 * =============================================================================
 */

import { SecurityLevel } from "../types";

/**
 * Visibility configuration for Temperature widget.
 * Each property is a boolean gated by security level.
 */
export interface TemperatureVisibility {
  // Launcher (Badge) visibility
  showStatusIndicator: boolean;    // 🟢/🟡/🔴 - always visible
  showTemperature: boolean;        // "38°F"
  showEquipmentName: boolean;      // "Walk-in #2"
  showConnectionStatus: boolean;   // Wifi icon
  
  // Review Space visibility
  showAllEquipment: boolean;       // Full list vs single item
  showTrend: boolean;              // "↓2° today"
  showLastLogged: boolean;         // "Last: 2hr ago"
  showThresholds: boolean;         // "Range: 33-40°F"
  showFleetStatus: boolean;        // "6/6 OK"
  showCostImpact: boolean;         // "$0 risk"
  showComplianceStatus: boolean;   // "Calibrated 14d ago"
  
  // Actions
  canLog: boolean;                 // [Log] button
  canViewHistory: boolean;         // [History] button
  canViewTrends: boolean;          // [Trends] button
  canLaunchFull: boolean;          // [Open HACCP Manager →]
}

/**
 * Get visibility configuration for a given security level.
 * 
 * Remember: LOWER number = MORE access
 * 
 * Omega (0): Developer - Sees everything, full diagnostics
 * Alpha (1): Owner - Cost impact, compliance, full control
 * Bravo (2): Manager - Thresholds, fleet view, settings
 * Charlie (3): Supervisor - Trends, history access
 * Delta (4): Shift Lead - Equipment names, can log temps
 * Echo (5): Team Member - Status indicator and temp value only
 */
export function getTemperatureVisibility(level: SecurityLevel): TemperatureVisibility {
  return {
    // Always visible (everyone, including Echo)
    showStatusIndicator: true,
    showTemperature: true,          // Even Echo can see the temp value

    // Delta+ (Shift Lead and above, level <= 4)
    showEquipmentName: level <= 4,
    showConnectionStatus: level <= 4,
    showAllEquipment: level <= 4,
    canLog: level <= 4,
    
    // Charlie+ (Supervisor and above, level <= 3)
    showTrend: level <= 3,
    showLastLogged: level <= 3,
    canViewHistory: level <= 3,
    canViewTrends: level <= 3,
    
    // Bravo+ (Manager and above, level <= 2)
    showThresholds: level <= 2,
    showFleetStatus: level <= 2,
    canLaunchFull: level <= 2,

    // Alpha+ (Owner and above, level <= 1)
    showCostImpact: level <= 1,
    showComplianceStatus: level <= 1,
  };
}

/**
 * Summary of what each level sees in the Launcher (badge)
 */
export const LAUNCHER_SUMMARY: Record<SecurityLevel, string> = {
  0: "Walk-in: 38°F 🟢 | 6/6 OK | $0 risk | Calibrated ✓",  // Omega - Developer
  1: "Walk-in: 38°F 🟢 | 6/6 OK | $0 risk",                 // Alpha - Owner
  2: "Walk-in: 38°F 🟢 | 6/6 OK",                           // Bravo - Manager
  3: "Walk-in: 38°F 🟢 ↓2°",                                // Charlie - Supervisor
  4: "Walk-in: 38°F 🟢",                                    // Delta - Shift Lead
  5: "🟢 38°F",                                             // Echo - Team Member
};

/**
 * Summary of what each level sees in the Review Space
 */
export const REVIEW_SPACE_SUMMARY: Record<SecurityLevel, string[]> = {
  0: ["Full diagnostics", "Cost impact", "Compliance", "All actions"],   // Omega
  1: ["Cost impact", "Compliance status", "Full control"],               // Alpha
  2: ["Threshold ranges", "Fleet summary", "[Open HACCP Manager]"],      // Bravo
  3: ["Trend indicators", "Last logged time", "[History] [Trends]"],     // Charlie
  4: ["Equipment names", "Connection status", "[Log] action"],           // Delta
  5: ["Temperature values", "Status indicators"],                        // Echo
};
