/**
 * NEXUS - ChefLife Central Notification System
 * 
 * The single source of truth for all activity logging, notifications,
 * and communication throughout the platform.
 * 
 * "Hey Team Guy - this crap happened when you weren't here"
 */

import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import React from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export type ActivityCategory = 
  | 'recipes'
  | 'inventory'
  | 'team'
  | 'organization'
  | 'financial'
  | 'security'
  | 'system'
  | 'alerts';

export type ActivitySeverity = 'info' | 'warning' | 'critical';

export type ActivityType =
  // Team activities
  | "team_member_added"
  | "team_member_updated"
  | "team_member_removed"
  | "team_member_deactivated"
  | "team_member_reactivated"
  | "role_assigned"
  | "role_removed"
  | "bulk_team_import"
  | "bulk_team_deactivated"
  | "bulk_team_reactivated"
  | "bulk_team_removed"
  // Recipe activities
  | "recipe_created"
  | "recipe_updated"
  | "recipe_deleted"
  | "recipe_status_changed"
  // Schedule activities
  | "schedule_uploaded"
  | "schedule_activated"
  | "schedule_deleted"
  | "schedule_synced_7shifts"
  // Inventory activities
  | "inventory_updated"
  | "inventory_counted"
  | "inventory_adjusted"
  | "inventory_imported"
  | "inventory_low_stock"
  | "inventory_critical_low"
  // Vendor/Purchasing activities
  | "invoice_imported"
  | "price_change_detected"
  | "vendor_added"
  // Settings activities
  | "settings_changed"
  | "permissions_changed"
  | "notification_preferences_updated"
  // Task activities
  | "task_completed"
  | "task_created"
  | "task_assigned"
  // Security activities
  | "login"
  | "logout"
  | "password_changed"
  | "security_protocol_changed"
  | "security_protocol_promoted"
  | "security_protocol_demoted"
  // System activities
  | "maintenance_due"
  | "system_error"
  // Performance activities
  | "performance_point_added"
  | "performance_reduction_added"
  | "performance_coaching_triggered"
  | "performance_coaching_completed"
  | "performance_pip_created"
  | "performance_pip_updated"
  | "performance_pip_completed"
  | "performance_tier_changed";

export interface NexusEvent {
  organization_id: string;
  user_id: string;
  activity_type: ActivityType;
  details: Record<string, any>;
  metadata?: Record<string, any>;
  
  // Optional overrides (auto-derived if not provided)
  severity?: ActivitySeverity;
  message?: string;
  requires_acknowledgment?: boolean;
}

// =============================================================================
// CATEGORY MAPPING
// =============================================================================

const ACTIVITY_TYPE_TO_CATEGORY: Record<ActivityType, ActivityCategory> = {
  // Team
  team_member_added: 'team',
  team_member_updated: 'team',
  team_member_removed: 'team',
  team_member_deactivated: 'team',
  team_member_reactivated: 'team',
  role_assigned: 'team',
  role_removed: 'team',
  bulk_team_import: 'team',
  bulk_team_deactivated: 'team',
  bulk_team_reactivated: 'team',
  bulk_team_removed: 'team',
  schedule_uploaded: 'team',
  schedule_activated: 'team',
  schedule_deleted: 'team',
  schedule_synced_7shifts: 'team',
  
  // Recipes
  recipe_created: 'recipes',
  recipe_updated: 'recipes',
  recipe_deleted: 'recipes',
  recipe_status_changed: 'recipes',
  
  // Inventory
  inventory_updated: 'inventory',
  inventory_counted: 'inventory',
  inventory_adjusted: 'inventory',
  inventory_imported: 'inventory',
  inventory_low_stock: 'inventory',
  inventory_critical_low: 'inventory',
  
  // Financial
  invoice_imported: 'financial',
  price_change_detected: 'financial',
  vendor_added: 'financial',
  
  // System
  settings_changed: 'system',
  permissions_changed: 'system',
  notification_preferences_updated: 'system',
  task_completed: 'system',
  task_created: 'system',
  task_assigned: 'system',
  maintenance_due: 'system',
  system_error: 'system',
  
  // Security
  login: 'security',
  logout: 'security',
  password_changed: 'security',
  security_protocol_changed: 'security',
  security_protocol_promoted: 'security',
  security_protocol_demoted: 'security',
  
  // Performance
  performance_point_added: 'team',
  performance_reduction_added: 'team',
  performance_coaching_triggered: 'team',
  performance_coaching_completed: 'team',
  performance_pip_created: 'team',
  performance_pip_updated: 'team',
  performance_pip_completed: 'team',
  performance_tier_changed: 'team',
};

// =============================================================================
// CATEGORY COLORS (for toasts)
// =============================================================================

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  recipes: '#f59e0b',      // amber-500
  inventory: '#3b82f6',    // blue-500
  team: '#22c55e',         // green-500
  organization: '#a855f7', // purple-500
  financial: '#10b981',    // emerald-500
  security: '#f43f5e',     // rose-500
  system: '#6b7280',       // gray-500
  alerts: '#eab308',       // yellow-500
};

// =============================================================================
// TOAST CONFIGURATION
// =============================================================================

interface ToastConfig {
  message: string | ((details: Record<string, any>) => string);
  severity?: ActivitySeverity;
  silent?: boolean; // No toast at all
}

const ACTIVITY_TOAST_CONFIG: Partial<Record<ActivityType, ToastConfig | null>> = {
  // Team - Success messages
  team_member_added: { 
    message: (d) => `${d.name || 'Team member'} added to the roster` 
  },
  team_member_updated: { 
    message: (d) => `${d.name || 'Team member'} updated` 
  },
  team_member_removed: { 
    message: (d) => `${d.name || 'Team member'} removed from roster` 
  },
  team_member_deactivated: { 
    message: (d) => `${d.name || 'Team member'} deactivated`,
    severity: 'warning'
  },
  team_member_reactivated: { 
    message: (d) => `${d.name || 'Team member'} reactivated` 
  },
  bulk_team_import: { 
    message: (d) => `${d.imported || 0} team members imported` 
  },
  bulk_team_deactivated: { 
    message: (d) => `${d.count || 0} team members deactivated`,
    severity: 'warning'
  },
  bulk_team_reactivated: { 
    message: (d) => `${d.count || 0} team members reactivated` 
  },
  bulk_team_removed: { 
    message: (d) => `${d.count || 0} team members removed`,
    severity: 'warning'
  },
  
  // Schedule
  schedule_uploaded: { 
    message: 'Schedule uploaded successfully' 
  },
  schedule_activated: { 
    message: (d) => `Schedule "${d.name || 'Untitled'}" is now active` 
  },
  schedule_synced_7shifts: { 
    message: 'Schedule synced with 7shifts' 
  },
  
  // Recipes
  recipe_created: { 
    message: (d) => `Recipe "${d.name || 'Untitled'}" created` 
  },
  recipe_updated: { 
    message: (d) => `Recipe "${d.name || 'Untitled'}" updated` 
  },
  recipe_deleted: { 
    message: (d) => `Recipe "${d.name || 'Untitled'}" deleted`,
    severity: 'warning'
  },
  
  // Inventory
  inventory_updated: { 
    message: 'Inventory updated' 
  },
  inventory_counted: { 
    message: 'Inventory count saved' 
  },
  inventory_imported: { 
    message: (d) => `${d.count || 0} inventory items imported` 
  },
  inventory_low_stock: { 
    message: (d) => `Low stock: ${d.item || 'Unknown item'}`,
    severity: 'warning'
  },
  inventory_critical_low: { 
    message: (d) => `Critical: ${d.item || 'Unknown item'} needs restocking`,
    severity: 'critical'
  },
  
  // Financial
  invoice_imported: { 
    message: (d) => `Invoice from ${d.vendor || 'vendor'} imported` 
  },
  price_change_detected: { 
    message: (d) => `Price change detected: ${d.item || 'item'}`,
    severity: 'warning'
  },
  
  // System - mostly silent
  settings_changed: { 
    message: 'Settings updated' 
  },
  task_completed: { 
    message: (d) => `Task "${d.name || 'Untitled'}" completed` 
  },
  maintenance_due: { 
    message: (d) => `Maintenance due: ${d.equipment || 'Equipment'}`,
    severity: 'warning'
  },
  
  // Security
  login: null, // silent
  logout: null, // silent
  password_changed: { 
    message: 'Password updated successfully' 
  },
  security_protocol_changed: {
    message: (d) => `${d.member_name || 'Team member'} assigned to ${d.new_protocol || 'new protocol'}`,
  },
  security_protocol_promoted: {
    message: (d) => `${d.member_name || 'Team member'} promoted to ${d.new_protocol || 'new protocol'}`,
    severity: 'warning', // Important change, should be noticed
  },
  security_protocol_demoted: {
    message: (d) => `${d.member_name || 'Team member'} demoted to ${d.new_protocol || 'new protocol'}`,
    severity: 'warning',
  },
  
  // Performance
  performance_point_added: {
    message: (d) => `${d.name || 'Team member'}: +${d.points} points (${d.event_type || 'event'})`,
    severity: 'warning',
  },
  performance_reduction_added: {
    message: (d) => `${d.name || 'Team member'}: ${d.points} point reduction`,
  },
  performance_coaching_triggered: {
    message: (d) => `${d.name || 'Team member'} reached Stage ${d.stage} coaching`,
    severity: 'warning',
  },
  performance_coaching_completed: {
    message: (d) => `Coaching completed for ${d.name || 'team member'}`,
  },
  performance_pip_created: {
    message: (d) => `PIP created for ${d.name || 'team member'}`,
    severity: 'warning',
  },
  performance_pip_updated: {
    message: (d) => `PIP updated for ${d.name || 'team member'}`,
  },
  performance_pip_completed: {
    message: (d) => `PIP ${d.outcome || 'completed'} for ${d.name || 'team member'}`,
  },
  performance_tier_changed: {
    message: (d) => `${d.name || 'Team member'} moved to Tier ${d.new_tier}`,
    severity: d => d.new_tier === 3 ? 'warning' : 'info',
  },
};

// =============================================================================
// BROADCAST CONFIG
// =============================================================================

type BroadcastChannel = 'in_app' | 'email' | 'sms';

interface BroadcastRule {
  enabled: boolean;
  channels: BroadcastChannel[];
  minSecurityLevel: number; // Who receives this broadcast (this level and above)
}

interface BroadcastConfig {
  [eventType: string]: BroadcastRule;
}

// Cache broadcast config per organization (refreshes every 5 minutes)
const broadcastConfigCache: Map<string, { config: BroadcastConfig; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch broadcast config for an organization
 * Uses cache to avoid hitting DB on every event
 */
const getBroadcastConfig = async (organizationId: string): Promise<BroadcastConfig | null> => {
  const cached = broadcastConfigCache.get(organizationId);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.config;
  }

  try {
    const { data, error } = await supabase
      .from('organization_communications')
      .select('broadcast_config')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data?.broadcast_config) {
      return null; // No config = use defaults (allow all)
    }

    const config = data.broadcast_config as BroadcastConfig;
    broadcastConfigCache.set(organizationId, { config, timestamp: now });
    return config;
  } catch (err) {
    console.error('Nexus: Error fetching broadcast config:', err);
    return null;
  }
};

/**
 * Clear broadcast config cache (call after saving config in Nexus UI)
 */
export const clearBroadcastConfigCache = (organizationId?: string) => {
  if (organizationId) {
    broadcastConfigCache.delete(organizationId);
  } else {
    broadcastConfigCache.clear();
  }
};

// =============================================================================
// NEXUS CORE
// =============================================================================

/**
 * Log an activity through Nexus
 * This is the SINGLE entry point for all activity logging in ChefLife
 */
export const nexus = async (event: NexusEvent): Promise<void> => {
  const { 
    organization_id, 
    user_id, 
    activity_type, 
    details, 
    metadata = {},
    severity: overrideSeverity,
    message: overrideMessage,
    requires_acknowledgment: overrideAck,
  } = event;

  try {
    // 1. Derive category and config
    const category = ACTIVITY_TYPE_TO_CATEGORY[activity_type] || 'system';
    const toastConfig = ACTIVITY_TOAST_CONFIG[activity_type];
    
    // 2. Determine severity
    const severity = overrideSeverity || toastConfig?.severity || 'info';
    
    // 3. Determine if acknowledgment required (critical/warning by default)
    const requires_acknowledgment = overrideAck ?? (severity === 'critical' || severity === 'warning');

    // 4. Build the message
    let message = overrideMessage;
    if (!message && toastConfig?.message) {
      message = typeof toastConfig.message === 'function' 
        ? toastConfig.message(details) 
        : toastConfig.message;
    }
    if (!message) {
      // Fallback: humanize the activity type
      message = activity_type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // 5. Get user name for logging
    let userName = details.user_name;
    if (!userName) {
      const { data: userData } = await supabase
        .from("organization_team_members")
        .select("first_name, last_name")
        .eq("user_id", user_id)
        .single();

      if (userData) {
        userName = `${userData.first_name} ${userData.last_name}`;
      }
    }

    // 6. Insert activity log
    const { data: logData, error } = await supabase
      .from("activity_logs")
      .insert([{
        organization_id,
        user_id,
        activity_type,
        category,
        severity,
        message,
        requires_acknowledgment,
        details: { ...details, user_name: userName },
        metadata,
      }])
      .select("id")
      .single();

    if (error) {
      console.error("Nexus: Error inserting activity log:", error);
      throw error;
    }

    // 7. Handle diffs if present
    if (metadata.diffs && logData?.id) {
      const { table_name, record_id, old_values, new_values, diff } = metadata.diffs;

      if (table_name && record_id) {
        await supabase
          .from("activity_stream_diffs")
          .insert([{
            activity_log_id: logData.id,
            organization_id,
            table_name,
            record_id,
            old_values: old_values || {},
            new_values: new_values || {},
            diff: diff || {},
          }]);
      }
    }

    // 8. Check broadcast config before firing notifications
    const broadcastConfig = await getBroadcastConfig(organization_id);
    const eventRule = broadcastConfig?.[activity_type];
    
    // If no config exists, or event is enabled for broadcast
    const shouldBroadcast = !broadcastConfig || (eventRule?.enabled !== false);
    const enabledChannels = eventRule?.channels || ['in_app']; // Default to in-app only

    // 9. Fire toast (if not silent AND broadcast is enabled AND in_app channel is enabled)
    if (toastConfig !== null && shouldBroadcast && enabledChannels.includes('in_app')) {
      const color = CATEGORY_COLORS[category];
      
      if (severity === 'critical') {
        toast.error(message, {
          icon: React.createElement(XCircle, { className: 'w-5 h-5 text-rose-500' }),
          style: { borderLeftColor: color },
          duration: 7000, // Longer for critical
        });
      } else if (severity === 'warning') {
        toast(message, {
          icon: React.createElement(AlertTriangle, { className: 'w-5 h-5 text-amber-500' }),
          style: { borderLeftColor: color },
          duration: 6000,
        });
      } else {
        toast.success(message, {
          icon: React.createElement(CheckCircle, { className: 'w-5 h-5 text-green-500' }),
          style: { borderLeftColor: color },
        });
      }
    }

    // 10. Future: Email and SMS routing based on enabledChannels
    // if (shouldBroadcast && enabledChannels.includes('email')) {
    //   await sendEmailNotification(event, eventRule?.audience);
    // }
    // if (shouldBroadcast && enabledChannels.includes('sms')) {
    //   await sendSmsNotification(event, eventRule?.audience);
    // }

  } catch (err) {
    console.error("Nexus: Error processing event:", err);
    // Don't throw - we don't want to break the main flow if logging fails
  }
};

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export { ACTIVITY_TYPE_TO_CATEGORY, CATEGORY_COLORS, ACTIVITY_TOAST_CONFIG };

// Legacy compatibility - wraps the old logActivity calls
export const logActivity = nexus;
