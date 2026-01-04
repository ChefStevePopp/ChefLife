/**
 * ChefLife Module System Types
 * 
 * Modules are optional feature packs that organizations can enable/disable.
 * Each module has security protocol-based permissions controlling who can
 * view, enable, configure, and use the module.
 */

import { SecurityLevel } from '@/config/security';

// =============================================================================
// MODULE PERMISSIONS
// =============================================================================

export interface ModulePermissions {
  /** Who can see this module exists (0-5) */
  view: SecurityLevel;
  /** Who can enable/disable this module (0-5) */
  enable: SecurityLevel;
  /** Who can change module settings (0-5) */
  configure: SecurityLevel;
  /** Who can use the module features (0-5) */
  use: SecurityLevel;
}

// =============================================================================
// BASE MODULE CONFIG
// =============================================================================

export interface BaseModuleConfig {
  /** Whether the module is active */
  enabled: boolean;
  /** For legally sensitive modules - user acknowledged compliance */
  compliance_acknowledged?: boolean | null;
  /** When the module was enabled */
  enabled_at?: string | null;
  /** User ID who enabled the module */
  enabled_by?: string | null;
  /** Security protocol permissions */
  permissions: ModulePermissions;
  /** Module-specific configuration */
  config: Record<string, unknown> | null;
}

// =============================================================================
// TEAM PERFORMANCE MODULE
// =============================================================================

export interface PerformanceDemerit {
  id: string;
  label: string;
  points: number;
  enabled: boolean;
}

export interface PerformanceRedemption {
  id: string;
  label: string;
  points: number;  // Negative value
  enabled: boolean;
}

export interface PerformanceTier {
  level: number;
  label: string;
  maxPoints: number | null;  // null = unlimited (highest tier)
  description?: string;
}

export interface TeamPerformanceConfig {
  /** Cycle type: quadmester (Jan-Apr, May-Aug, Sep-Dec) or custom */
  cycleType: 'quadmester' | 'trimester' | 'custom';
  /** Custom cycle boundaries (MM-DD format) if cycleType is 'custom' */
  cycleBoundaries?: string[];
  /** Point events (demerits) */
  demerits: PerformanceDemerit[];
  /** Point reduction opportunities */
  redemptions: PerformanceRedemption[];
  /** Tier definitions */
  tiers: PerformanceTier[];
  /** Detection thresholds */
  thresholds: {
    /** Minutes after shift start before considered late */
    lateGraceMinutes: number;
    /** Minutes before shift end for early departure */
    earlyDepartureMinutes: number;
  };
  /** Maximum point reduction per 30-day period */
  maxRedemptionPer30Days: number;
}

export interface TeamPerformanceModuleConfig extends BaseModuleConfig {
  config: TeamPerformanceConfig | null;
}

// =============================================================================
// SCHEDULING MODULE
// =============================================================================

export interface SchedulingConfig {
  /** Default view: week, 2week, month */
  defaultView: 'week' | '2week' | 'month';
  /** Allow shift swaps between team members */
  allowShiftSwaps: boolean;
  /** Require manager approval for swaps */
  requireSwapApproval: boolean;
  /** Hours before shift for drop deadline */
  shiftDropDeadlineHours: number;
}

export interface SchedulingModuleConfig extends BaseModuleConfig {
  config: SchedulingConfig | null;
}

// =============================================================================
// INVENTORY MODULE
// =============================================================================

export interface InventoryConfig {
  /** Track by: unit, case, both */
  trackingMode: 'unit' | 'case' | 'both';
  /** Enable par levels */
  parLevelsEnabled: boolean;
  /** Enable waste tracking */
  wasteTrackingEnabled: boolean;
  /** Count frequency: daily, weekly, monthly */
  defaultCountFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface InventoryModuleConfig extends BaseModuleConfig {
  config: InventoryConfig | null;
}

// =============================================================================
// RECIPES MODULE
// =============================================================================

export interface RecipesConfig {
  /** Require photos for new recipes */
  requirePhotos: boolean;
  /** Enable cost calculation */
  costCalculationEnabled: boolean;
  /** Enable allergen tracking */
  allergenTrackingEnabled: boolean;
  /** Enable nutrition info */
  nutritionEnabled: boolean;
}

export interface RecipesModuleConfig extends BaseModuleConfig {
  config: RecipesConfig | null;
}

// =============================================================================
// HACCP MODULE
// =============================================================================

export interface HACCPConfig {
  /** Temperature unit: C or F */
  temperatureUnit: 'C' | 'F';
  /** Enable equipment monitoring */
  equipmentMonitoringEnabled: boolean;
  /** Enable corrective action logging */
  correctiveActionsEnabled: boolean;
  /** SensorPush integration enabled */
  sensorPushEnabled: boolean;
}

export interface HACCPModuleConfig extends BaseModuleConfig {
  config: HACCPConfig | null;
}

// =============================================================================
// TASKS MODULE
// =============================================================================

export interface TasksConfig {
  /** Enable recurring tasks */
  recurringTasksEnabled: boolean;
  /** Enable prep list templates */
  prepListTemplatesEnabled: boolean;
  /** Default task priority */
  defaultPriority: 'low' | 'medium' | 'high';
}

export interface TasksModuleConfig extends BaseModuleConfig {
  config: TasksConfig | null;
}

// =============================================================================
// ALL MODULES MAP
// =============================================================================

export interface OrganizationModules {
  team_performance: TeamPerformanceModuleConfig;
  scheduling: SchedulingModuleConfig;
  inventory: InventoryModuleConfig;
  recipes: RecipesModuleConfig;
  haccp: HACCPModuleConfig;
  tasks: TasksModuleConfig;
}

export type ModuleId = keyof OrganizationModules;

// =============================================================================
// MODULE REGISTRY (for UI)
// =============================================================================

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  description: string;
  icon: string;  // Lucide icon name
  color: string; // Tailwind color
  requiresCompliance: boolean;
  complianceWarning?: string;
  defaultEnabled: boolean;
  comingSoon?: boolean;
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: 'scheduling',
    label: 'Schedule Manager',
    description: 'Team scheduling with shift management and availability tracking',
    icon: 'Calendar',
    color: 'primary',
    requiresCompliance: false,
    defaultEnabled: true,
  },
  {
    id: 'team_performance',
    label: 'Team Performance',
    description: 'Point-based attendance & conduct tracking with tiers, coaching, and PIPs',
    icon: 'ClipboardCheck',
    color: 'amber',
    requiresCompliance: true,
    complianceWarning: 'Point-based attendance systems may not be legal in all jurisdictions. Consult local labor laws before enabling. You are responsible for ensuring compliance with applicable regulations.',
    defaultEnabled: false,
  },
  {
    id: 'recipes',
    label: 'Recipe Manager',
    description: 'Recipe documentation with costing, allergens, and production notes',
    icon: 'ChefHat',
    color: 'green',
    requiresCompliance: false,
    defaultEnabled: true,
  },
  {
    id: 'tasks',
    label: 'Task Manager',
    description: 'Prep lists, checklists, and daily task management',
    icon: 'ClipboardList',
    color: 'purple',
    requiresCompliance: false,
    defaultEnabled: true,
  },
  {
    id: 'inventory',
    label: 'Inventory Control',
    description: 'Stock tracking, par levels, and waste management',
    icon: 'Package',
    color: 'rose',
    requiresCompliance: false,
    defaultEnabled: false,
  },
  {
    id: 'haccp',
    label: 'HACCP & Food Safety',
    description: 'Temperature monitoring, equipment logs, and compliance tracking',
    icon: 'Thermometer',
    color: 'red',
    requiresCompliance: false,
    defaultEnabled: false,
  },
];

// =============================================================================
// DEFAULT CONFIGS
// =============================================================================

export const DEFAULT_TEAM_PERFORMANCE_CONFIG: TeamPerformanceConfig = {
  cycleType: 'quadmester',
  demerits: [
    { id: 'no_show', label: 'No-Show', points: 6, enabled: true },
    { id: 'drop_shift', label: 'Drop Shift (no coverage)', points: 4, enabled: true },
    { id: 'absent', label: 'Unexcused Absence', points: 2, enabled: true },
    { id: 'late_15', label: 'Late (15+ min)', points: 2, enabled: true },
    { id: 'late_5', label: 'Late (5-15 min)', points: 1, enabled: true },
    { id: 'early_departure', label: 'Early Departure (unauthorized)', points: 2, enabled: true },
    { id: 'late_notification', label: 'Late Notification (<4 hrs)', points: 1, enabled: true },
  ],
  redemptions: [
    { id: 'cover_24', label: 'Cover Shift (>24hrs notice)', points: -2, enabled: true },
    { id: 'cover_48', label: 'Cover Shift (24-48hrs notice)', points: -1, enabled: true },
    { id: 'stay_late', label: 'Stay 2+ hours past shift', points: -1, enabled: true },
    { id: 'arrive_early', label: 'Arrive 2+ hours early', points: -1, enabled: true },
    { id: 'training', label: 'Training/mentoring', points: -1, enabled: true },
    { id: 'special_event', label: 'Special events/catering', points: -1, enabled: true },
  ],
  tiers: [
    { level: 1, label: 'Priority', maxPoints: 2, description: 'First priority shifts, premium benefits' },
    { level: 2, label: 'Standard', maxPoints: 5, description: 'Second priority, standard benefits' },
    { level: 3, label: 'Improvement', maxPoints: null, description: 'Assigned shifts, improvement focus' },
  ],
  thresholds: {
    lateGraceMinutes: 5,
    earlyDepartureMinutes: 15,
  },
  maxRedemptionPer30Days: 3,
};

export const DEFAULT_MODULE_PERMISSIONS: Record<ModuleId, ModulePermissions> = {
  team_performance: { view: 5, enable: 1, configure: 2, use: 4 },
  scheduling: { view: 5, enable: 1, configure: 2, use: 3 },
  inventory: { view: 5, enable: 1, configure: 2, use: 3 },
  recipes: { view: 5, enable: 1, configure: 3, use: 4 },
  haccp: { view: 5, enable: 1, configure: 2, use: 5 },
  tasks: { view: 5, enable: 1, configure: 3, use: 5 },
};
