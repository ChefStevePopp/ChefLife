/**
 * Points Tab — Shared Constants & Types
 * 
 * Single source of truth for event labels, demerit/excuse options,
 * and type definitions used across all Points sub-views.
 * 
 * @diagnostics src/features/team/components/TeamPerformance/components/PointsTab/pointsConstants.ts
 */

// =============================================================================
// EVENT TYPE LABELS
// =============================================================================

export const EVENT_TYPE_LABELS: Record<string, string> = {
  no_call_no_show: "No-call/No-show",
  dropped_shift_no_coverage: "Dropped Shift (No Coverage)",
  unexcused_absence: "Unexcused Absence",
  tardiness_major: "Tardiness (>15 min)",
  tardiness_minor: "Tardiness (5-15 min)",
  early_departure: "Early Departure",
  late_notification: "Late Notification",
  food_safety_violation: "Food Safety Violation",
  insubordination: "Insubordination",
};

export const REDUCTION_TYPE_LABELS: Record<string, string> = {
  cover_shift_urgent: "Covered Shift (<24hr)",
  cover_shift_standard: "Covered Shift (24-48hr)",
  stay_late: "Stayed 2+ Hours Late",
  arrive_early: "Arrived 2+ Hours Early",
  training_mentoring: "Training/Mentoring",
  special_event: "Special Event/Catering",
};

export const ALL_EVENT_LABELS: Record<string, string> = {
  ...EVENT_TYPE_LABELS,
  ...REDUCTION_TYPE_LABELS,
};

// =============================================================================
// DEMERIT & EXCUSE OPTIONS
// =============================================================================

export const DEMERIT_OPTIONS = [
  { id: 'no_call_no_show', label: 'No-Call / No-Show', points: 6 },
  { id: 'dropped_shift_no_coverage', label: 'Dropped Shift (no coverage)', points: 4 },
  { id: 'unexcused_absence', label: 'Unexcused Absence', points: 2 },
  { id: 'tardiness_major', label: 'Late (15+ min)', points: 2 },
  { id: 'tardiness_minor', label: 'Late (5-15 min)', points: 1 },
  { id: 'early_departure', label: 'Early Departure', points: 2 },
  { id: 'late_notification', label: 'Late Notification (<4 hrs)', points: 1 },
  { id: 'food_safety_violation', label: 'Food Safety Violation', points: 3 },
  { id: 'insubordination', label: 'Insubordination', points: 3 },
] as const;

export const EXCUSE_OPTIONS = [
  { id: 'SICK OK', label: 'Sick (ESA Protected)' },
  { id: 'LATE OK', label: 'Approved Late Arrival' },
  { id: 'EARLY DEPART OK', label: 'Approved Early Departure' },
  { id: 'ABSENT OK', label: 'Approved Absence' },
  { id: 'BEREAVEMENT', label: 'Bereavement Leave' },
  { id: 'JURY DUTY', label: 'Jury Duty' },
  { id: 'EMERGENCY', label: 'Family Emergency' },
  { id: 'CHALLENGE ACCEPTED', label: 'Challenge Accepted (Ombudsman)' },
  { id: 'DATA ERROR', label: 'Data Entry Error' },
  { id: 'OTHER', label: 'Other' },
] as const;

// =============================================================================
// SECURITY & CONFIG
// =============================================================================

export const MANAGER_SECURITY_LEVELS = [0, 1, 2, 3];

export const ABSENCE_EVENT_TYPES = ['no_call_no_show', 'dropped_shift_no_coverage', 'unexcused_absence'];

export const ITEMS_PER_PAGE = 12;
export const LEDGER_ITEMS_PER_PAGE = 25;

// =============================================================================
// TYPES
// =============================================================================

export type ViewMode = 'by_member' | 'team_ledger' | 'absences';

export type SortOption = 'name_asc' | 'name_desc' | 'points_asc' | 'points_desc' | 'tier_asc' | 'tier_desc';
