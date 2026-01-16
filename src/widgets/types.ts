/**
 * =============================================================================
 * WIDGET SYSTEM TYPES
 * =============================================================================
 * 
 * Core type definitions for the ChefLife widget architecture.
 * 
 * Three Dimensions of Context:
 * - SecurityLevel → Information density (what detail)
 * - Scope → Data breadth (how much)
 * - Surface → Interaction style (how it works)
 * 
 * Three Layers:
 * - Launcher (5%) → Status badge, glance
 * - Review Space (80%) → Workspace, actions, complete tasks
 * - Full Feature (15%) → Configuration, admin, reports
 * 
 * =============================================================================
 */

import { LucideIcon } from "lucide-react";

// =============================================================================
// SECURITY LEVELS
// =============================================================================

/**
 * Security levels control information density.
 * LOWER number = HIGHER clearance (more access).
 * HIGHER number = LOWER clearance (less access).
 * 
 * 0 = Omega (Developer) - God mode, full diagnostics, all data
 * 1 = Alpha (Owner) - Full control, cost impact, compliance
 * 2 = Bravo (Manager) - Thresholds, fleet view, settings
 * 3 = Charlie (Supervisor) - Trends, history access
 * 4 = Delta (Shift Lead) - Labels, basic actions, logging
 * 5 = Echo (Team Member) - Status only, most restricted
 */
export type SecurityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const SECURITY_LEVEL_NAMES: Record<SecurityLevel, string> = {
  0: "Omega",     // Developer - highest clearance
  1: "Alpha",     // Owner
  2: "Bravo",     // Manager
  3: "Charlie",   // Supervisor
  4: "Delta",     // Shift Lead
  5: "Echo",      // Team Member - lowest clearance
};

export const SECURITY_LEVEL_ROLES: Record<SecurityLevel, string> = {
  0: "Developer",
  1: "Owner",
  2: "Manager",
  3: "Supervisor",
  4: "Shift Lead",
  5: "Team Member",
};

// =============================================================================
// SCOPE
// =============================================================================

/**
 * Scope controls data breadth.
 * - location: Single property data
 * - region: Rollup across locations in a region
 * - organization: Full enterprise view
 */
export type Scope = "location" | "region" | "organization";

// =============================================================================
// SURFACE
// =============================================================================

/**
 * Surface controls interaction style.
 * - admin: Desktop, full interactions, hover states
 * - kitchen: Touch-optimized, glanceable, quick actions
 * - mobile: Thumb-friendly, swipe gestures
 */
export type Surface = "admin" | "kitchen" | "mobile";

// =============================================================================
// WIDGET CONTEXT
// =============================================================================

/**
 * Context passed to every widget.
 * Determines what to show, how much, and how to interact.
 */
export interface WidgetContext {
  // WHO is viewing → drives info density
  securityLevel: SecurityLevel;
  userId: string;

  // WHAT they're viewing → drives data breadth
  scope: Scope;
  organizationId: string;
  regionId?: string;
  locationId?: string;

  // WHERE they're viewing → drives interaction style
  surface: Surface;
}

// =============================================================================
// WIDGET LAYERS
// =============================================================================

/**
 * Layer 1: Launcher
 * Status at a glance. The badge. "Are we OK?"
 */
export interface LauncherConfig {
  icon: LucideIcon;
  iconColorClass?: string;
  label: string;
}

/**
 * Layer 2: Review Space
 * The workspace. Review data, take action, complete tasks.
 * This is where 80% of work happens.
 */
export interface ReviewSpaceConfig {
  title: string;
  actions: ReviewAction[];
  launchTarget?: string;
  launchLabel?: string;
}

export interface ReviewAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  minSecurityLevel: SecurityLevel;  // User must have this level OR LOWER to see
  variant?: "primary" | "secondary" | "ghost";
}

/**
 * Layer 3: Full Feature
 * Configuration, reports, compliance, admin.
 * Behind the admin wall.
 */
export interface FullFeatureConfig {
  route: string;
  minSecurityLevel: SecurityLevel;  // User must have this level OR LOWER to access
  label: string;
}

// =============================================================================
// WIDGET DEFINITION
// =============================================================================

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;

  // Layer configs
  launcher: LauncherConfig;
  reviewSpace: ReviewSpaceConfig;
  fullFeature?: FullFeatureConfig;

  // Component
  component: React.FC<{ context: WidgetContext }>;

  // Data dependencies (for prefetching)
  dataSources?: string[];
}

// =============================================================================
// WIDGET STATUS
// =============================================================================

export type WidgetStatus = "ok" | "warning" | "critical" | "offline" | "unknown";

export interface WidgetStatusColors {
  text: string;
  bg: string;
  icon: string;
}

export const STATUS_COLORS: Record<WidgetStatus, WidgetStatusColors> = {
  ok: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/20",
    icon: "text-emerald-400",
  },
  warning: {
    text: "text-amber-400",
    bg: "bg-amber-500/20",
    icon: "text-amber-400",
  },
  critical: {
    text: "text-red-400",
    bg: "bg-red-500/20",
    icon: "text-red-400",
  },
  offline: {
    text: "text-gray-400",
    bg: "bg-gray-500/20",
    icon: "text-gray-400",
  },
  unknown: {
    text: "text-gray-500",
    bg: "bg-gray-500/20",
    icon: "text-gray-500",
  },
};
