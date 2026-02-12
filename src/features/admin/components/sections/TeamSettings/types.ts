/**
 * Team Module — Shared Types & Config
 * 
 * Extracted from TeamSettings to avoid breaking Vite Fast Refresh.
 * Component files must export ONLY React components for HMR to work.
 *
 * @diagnostics src/features/admin/components/sections/TeamSettings/types.ts
 */

// =============================================================================
// TYPES
// =============================================================================

/** Schedule shift card display toggles */
export interface CardDisplayConfig {
  show_shift_hours: boolean;
  show_weekly_hours: boolean;
  show_department: boolean;
  show_tier: boolean;
  show_break_duration: boolean;
  show_notes: boolean;
}

/** Roster display preferences */
export interface RosterDisplayConfig {
  layout: 'grid' | 'list';
  sort_by: 'name' | 'role' | 'department' | 'hire_date';
  sort_direction: 'asc' | 'desc';
  group_by: 'none' | 'department' | 'role';
  show_email: boolean;
  show_phone: boolean;
  show_hire_date: boolean;
  show_role: boolean;
  show_department: boolean;
  show_status: boolean;
}

/** Full Team module config (stored in organizations.modules.scheduling.config) */
export interface TeamModuleConfig {
  card_display: CardDisplayConfig;
  roster_display: RosterDisplayConfig;
  // Future: profile_settings, etc.
}

// =============================================================================
// DEFAULTS
// =============================================================================

/** Sensible defaults */
export const DEFAULT_TEAM_CONFIG: TeamModuleConfig = {
  card_display: {
    show_shift_hours: true,
    show_weekly_hours: true,
    show_department: true,
    show_tier: true,       // Auto-disabled in UI when Team Performance module is off
    show_break_duration: true,
    show_notes: true,
  },
  roster_display: {
    layout: 'grid',
    sort_by: 'name',
    sort_direction: 'asc',
    group_by: 'none',
    show_email: true,
    show_phone: true,
    show_hire_date: true,
    show_role: true,
    show_department: true,
    show_status: true,
  },
};
