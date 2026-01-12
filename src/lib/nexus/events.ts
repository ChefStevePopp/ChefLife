/**
 * NEXUS Module Events Registry
 * 
 * Defines all events that modules can fire through Nexus.
 * Each event has default configuration that can be overridden
 * per-organization in the Nexus admin UI.
 * 
 * Security levels (lower = more access):
 *   0 = Omega (System)
 *   1 = Alpha (Owner)
 *   2 = Bravo (Manager)
 *   3 = Charlie (Assistant Manager)
 *   4 = Delta (Supervisor)
 *   5 = Echo (Team Member)
 */

import type { SecurityLevel } from '@/config/security';
import type { ModuleId } from '@/types/modules';

// =============================================================================
// TYPES
// =============================================================================

export type BroadcastChannel = 'in_app' | 'email' | 'sms';

export interface ModuleEventDefinition {
  /** Event ID (matches ActivityType) */
  id: string;
  /** Human-readable label */
  label: string;
  /** Description shown in Nexus config */
  description?: string;
  /** Default notification channels */
  defaultChannels: BroadcastChannel[];
  /** Minimum security level to receive (5 = everyone, 0 = system only) */
  defaultAudience: SecurityLevel;
  /** Whether the person affected always gets notified (regardless of audience) */
  notifyAffectedPerson?: boolean;
  /** Severity: info, warning, critical */
  severity?: 'info' | 'warning' | 'critical';
}

export interface ModuleEventCategory {
  /** Module this category belongs to */
  moduleId: ModuleId | 'core';
  /** Category label */
  label: string;
  /** Category description */
  description?: string;
  /** Icon name (Lucide) */
  icon: string;
  /** Color for UI */
  color: string;
  /** Events in this category */
  events: ModuleEventDefinition[];
}

// =============================================================================
// CORE EVENTS (Always available)
// =============================================================================

export const CORE_EVENTS: ModuleEventCategory = {
  moduleId: 'core',
  label: 'Team & Organization',
  description: 'Core team management and organization events',
  icon: 'Users',
  color: 'green',
  events: [
    {
      id: 'team_member_added',
      label: 'Team Member Added',
      description: 'When a new team member joins the roster',
      defaultChannels: ['in_app'],
      defaultAudience: 3, // Charlie+
    },
    {
      id: 'team_member_deactivated',
      label: 'Team Member Deactivated',
      description: 'When a team member is deactivated',
      defaultChannels: ['in_app', 'email'],
      defaultAudience: 2, // Bravo+
      severity: 'warning',
    },
    {
      id: 'team_member_reactivated',
      label: 'Team Member Reactivated',
      description: 'When a team member is reactivated',
      defaultChannels: ['in_app'],
      defaultAudience: 2, // Bravo+
    },
    {
      id: 'security_protocol_changed',
      label: 'Security Protocol Changed',
      description: 'When someone\'s access level changes',
      defaultChannels: ['in_app', 'email'],
      defaultAudience: 2, // Bravo+
      notifyAffectedPerson: true,
      severity: 'warning',
    },
    {
      id: 'bulk_team_import',
      label: 'Bulk Team Import',
      description: 'When team members are imported from CSV',
      defaultChannels: ['in_app'],
      defaultAudience: 2, // Bravo+
    },
    {
      id: 'settings_changed',
      label: 'Organization Settings Changed',
      description: 'When organization settings are updated',
      defaultChannels: ['in_app'],
      defaultAudience: 1, // Alpha+
    },
  ],
};

// =============================================================================
// SCHEDULING MODULE EVENTS
// =============================================================================

export const SCHEDULING_EVENTS: ModuleEventCategory = {
  moduleId: 'scheduling',
  label: 'Scheduling',
  description: 'Schedule and shift management events',
  icon: 'Calendar',
  color: 'primary',
  events: [
    {
      id: 'schedule_uploaded',
      label: 'Schedule Published',
      description: 'When a new schedule is published',
      defaultChannels: ['in_app', 'email'],
      defaultAudience: 5, // Everyone
    },
    {
      id: 'schedule_activated',
      label: 'Schedule Activated',
      description: 'When a schedule becomes the active schedule',
      defaultChannels: ['in_app'],
      defaultAudience: 5, // Everyone
    },
    {
      id: 'schedule_synced_7shifts',
      label: '7shifts Sync Complete',
      description: 'When schedule syncs with 7shifts',
      defaultChannels: ['in_app'],
      defaultAudience: 2, // Bravo+
    },
    {
      id: 'shift_dropped',
      label: 'Shift Dropped',
      description: 'When someone drops a shift',
      defaultChannels: ['in_app', 'sms'],
      defaultAudience: 3, // Charlie+
      severity: 'warning',
    },
    {
      id: 'coverage_needed',
      label: 'Coverage Needed',
      description: 'When a shift needs coverage',
      defaultChannels: ['in_app', 'sms'],
      defaultAudience: 5, // Everyone (so people can pick it up)
      severity: 'warning',
    },
    {
      id: 'shift_swap_requested',
      label: 'Shift Swap Requested',
      description: 'When someone requests to swap shifts',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
      notifyAffectedPerson: true,
    },
    {
      id: 'shift_swap_approved',
      label: 'Shift Swap Approved',
      description: 'When a shift swap is approved',
      defaultChannels: ['in_app'],
      defaultAudience: 5, // Both parties
      notifyAffectedPerson: true,
    },
  ],
};

// =============================================================================
// ATTENDANCE MODULE EVENTS
// =============================================================================

export const ATTENDANCE_EVENTS: ModuleEventCategory = {
  moduleId: 'attendance',
  label: 'Attendance',
  description: 'Attendance tracking and point system events',
  icon: 'Clock',
  color: 'amber',
  events: [
    {
      id: 'attendance_point_added',
      label: 'Attendance Point Added',
      description: 'When attendance points are added',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
      notifyAffectedPerson: true,
    },
    {
      id: 'attendance_point_redeemed',
      label: 'Point Redeemed',
      description: 'When points are reduced through positive action',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
      notifyAffectedPerson: true,
    },
    {
      id: 'attendance_tier_changed',
      label: 'Tier Change',
      description: 'When someone\'s tier changes',
      defaultChannels: ['in_app', 'email'],
      defaultAudience: 3, // Charlie+
      notifyAffectedPerson: true,
      severity: 'warning',
    },
    {
      id: 'attendance_cycle_reset',
      label: 'Attendance Cycle Reset',
      description: 'When attendance points reset for new cycle',
      defaultChannels: ['in_app'],
      defaultAudience: 3, // Charlie+
    },
    {
      id: 'attendance_no_show',
      label: 'No-Show Recorded',
      description: 'When a no-call/no-show is recorded',
      defaultChannels: ['in_app', 'sms'],
      defaultAudience: 3, // Charlie+
      notifyAffectedPerson: true,
      severity: 'critical',
    },
    {
      id: 'attendance_approaching_tier',
      label: 'Approaching Tier Threshold',
      description: 'When someone is 1 point away from tier change',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
      notifyAffectedPerson: true,
      severity: 'warning',
    },
  ],
};

// =============================================================================
// RECIPES MODULE EVENTS
// =============================================================================

export const RECIPES_EVENTS: ModuleEventCategory = {
  moduleId: 'recipes',
  label: 'Recipes',
  description: 'Recipe management events',
  icon: 'ChefHat',
  color: 'green',
  events: [
    {
      id: 'recipe_created',
      label: 'Recipe Created',
      description: 'When a new recipe is added',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
    },
    {
      id: 'recipe_updated',
      label: 'Recipe Updated',
      description: 'When a recipe is modified',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
    },
    {
      id: 'recipe_deleted',
      label: 'Recipe Deleted',
      description: 'When a recipe is removed',
      defaultChannels: ['in_app'],
      defaultAudience: 3, // Charlie+
      severity: 'warning',
    },
    {
      id: 'recipe_status_changed',
      label: 'Recipe Status Changed',
      description: 'When recipe status changes (draft, active, archived)',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
    },
  ],
};

// =============================================================================
// INVENTORY MODULE EVENTS
// =============================================================================

export const INVENTORY_EVENTS: ModuleEventCategory = {
  moduleId: 'inventory',
  label: 'Inventory',
  description: 'Inventory tracking and alerts',
  icon: 'Package',
  color: 'rose',
  events: [
    {
      id: 'inventory_counted',
      label: 'Inventory Count Saved',
      description: 'When an inventory count is completed',
      defaultChannels: ['in_app'],
      defaultAudience: 3, // Charlie+
    },
    {
      id: 'inventory_imported',
      label: 'Inventory Imported',
      description: 'When inventory data is imported',
      defaultChannels: ['in_app'],
      defaultAudience: 2, // Bravo+
    },
    {
      id: 'inventory_low_stock',
      label: 'Low Stock Warning',
      description: 'When item falls below par level',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
      severity: 'warning',
    },
    {
      id: 'inventory_critical_low',
      label: 'Critical Stock Level',
      description: 'When item is critically low',
      defaultChannels: ['in_app', 'sms'],
      defaultAudience: 3, // Charlie+
      severity: 'critical',
    },
    {
      id: 'invoice_imported',
      label: 'Invoice Imported',
      description: 'When a vendor invoice is imported',
      defaultChannels: ['in_app'],
      defaultAudience: 2, // Bravo+
    },
    {
      id: 'invoice_superseded',
      label: 'Invoice Version Superseded',
      description: 'When a duplicate invoice is imported, creating a new version',
      defaultChannels: ['in_app', 'email'],
      defaultAudience: 1, // Alpha+ (Owner/Admin - this affects audit trail)
      severity: 'warning',
    },
    {
      id: 'price_change_detected',
      label: 'Price Change Detected',
      description: 'When vendor price changes are detected',
      defaultChannels: ['in_app', 'email'],
      defaultAudience: 2, // Bravo+
      severity: 'warning',
    },
    {
      id: 'invoice_discrepancy_recorded',
      label: 'Delivery Discrepancy Recorded',
      description: 'When shorts, damages, or other delivery issues are documented',
      defaultChannels: ['in_app'],
      defaultAudience: 2, // Bravo+
      severity: 'warning',
    },
    {
      id: 'system_override_initiated',
      label: 'System Override Initiated',
      description: 'When someone unlocks a price field to bypass invoice audit trail',
      defaultChannels: ['in_app'],
      defaultAudience: 2, // Bravo+
      severity: 'warning',
    },
    {
      id: 'system_override_price',
      label: 'Price System Override',
      description: 'When price is manually changed outside the invoice audit trail - REQUIRES ACKNOWLEDGEMENT',
      defaultChannels: ['in_app', 'email'],
      defaultAudience: 1, // Alpha+ (Owner/Admin only)
      severity: 'critical',
    },
  ],
};

// =============================================================================
// HACCP MODULE EVENTS
// =============================================================================

export const HACCP_EVENTS: ModuleEventCategory = {
  moduleId: 'haccp',
  label: 'HACCP & Food Safety',
  description: 'Food safety and compliance events',
  icon: 'Thermometer',
  color: 'red',
  events: [
    {
      id: 'temperature_out_of_range',
      label: 'Temperature Out of Range',
      description: 'When equipment temperature exceeds safe limits',
      defaultChannels: ['in_app', 'sms'],
      defaultAudience: 4, // Delta+
      severity: 'critical',
    },
    {
      id: 'haccp_check_overdue',
      label: 'HACCP Check Overdue',
      description: 'When a scheduled check is missed',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
      severity: 'warning',
    },
    {
      id: 'corrective_action_required',
      label: 'Corrective Action Required',
      description: 'When a food safety issue needs correction',
      defaultChannels: ['in_app', 'email'],
      defaultAudience: 3, // Charlie+
      severity: 'critical',
    },
    {
      id: 'equipment_maintenance_due',
      label: 'Equipment Maintenance Due',
      description: 'When equipment needs scheduled maintenance',
      defaultChannels: ['in_app'],
      defaultAudience: 3, // Charlie+
      severity: 'warning',
    },
  ],
};

// =============================================================================
// TASKS MODULE EVENTS
// =============================================================================

export const TASKS_EVENTS: ModuleEventCategory = {
  moduleId: 'tasks',
  label: 'Tasks & Prep',
  description: 'Task management and prep list events',
  icon: 'ClipboardList',
  color: 'purple',
  events: [
    {
      id: 'task_assigned',
      label: 'Task Assigned',
      description: 'When a task is assigned to someone',
      defaultChannels: ['in_app'],
      defaultAudience: 5, // Everyone (assignee needs to know)
      notifyAffectedPerson: true,
    },
    {
      id: 'task_completed',
      label: 'Task Completed',
      description: 'When a task is marked complete',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
    },
    {
      id: 'prep_list_created',
      label: 'Prep List Created',
      description: 'When a new prep list is generated',
      defaultChannels: ['in_app'],
      defaultAudience: 5, // Everyone
    },
    {
      id: 'task_overdue',
      label: 'Task Overdue',
      description: 'When a task passes its due time',
      defaultChannels: ['in_app'],
      defaultAudience: 4, // Delta+
      notifyAffectedPerson: true,
      severity: 'warning',
    },
  ],
};

// =============================================================================
// ALL EVENTS REGISTRY
// =============================================================================

export const MODULE_EVENT_CATEGORIES: ModuleEventCategory[] = [
  CORE_EVENTS,
  SCHEDULING_EVENTS,
  ATTENDANCE_EVENTS,
  RECIPES_EVENTS,
  INVENTORY_EVENTS,
  HACCP_EVENTS,
  TASKS_EVENTS,
];

/**
 * Get all events for a specific module
 */
export function getModuleEvents(moduleId: ModuleId | 'core'): ModuleEventDefinition[] {
  const category = MODULE_EVENT_CATEGORIES.find(c => c.moduleId === moduleId);
  return category?.events || [];
}

/**
 * Get event definition by ID
 */
export function getEventDefinition(eventId: string): ModuleEventDefinition | undefined {
  for (const category of MODULE_EVENT_CATEGORIES) {
    const event = category.events.find(e => e.id === eventId);
    if (event) return event;
  }
  return undefined;
}

/**
 * Get all event IDs
 */
export function getAllEventIds(): string[] {
  return MODULE_EVENT_CATEGORIES.flatMap(c => c.events.map(e => e.id));
}

/**
 * Build default broadcast config for an organization
 * Used when initializing Nexus settings
 */
export function buildDefaultBroadcastConfig(): Record<string, {
  enabled: boolean;
  channels: BroadcastChannel[];
  minSecurityLevel: SecurityLevel;
}> {
  const config: Record<string, any> = {};
  
  for (const category of MODULE_EVENT_CATEGORIES) {
    for (const event of category.events) {
      config[event.id] = {
        enabled: true,
        channels: event.defaultChannels,
        minSecurityLevel: event.defaultAudience,
      };
    }
  }
  
  return config;
}
