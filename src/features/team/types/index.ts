import type { SecurityLevel } from "@/config/security";

// =============================================================================
// TEAM PERFORMANCE TYPES
// =============================================================================

export type PointEventType =
  | 'no_call_no_show'
  | 'dropped_shift_no_coverage'
  | 'unexcused_absence'
  | 'tardiness_major'       // >15 min
  | 'tardiness_minor'       // 5-15 min
  | 'early_departure'
  | 'late_notification'     // modifier, adds to another event
  | 'food_safety_violation'
  | 'insubordination';

export type PointReductionType =
  | 'cover_shift_urgent'    // <24hr notice
  | 'cover_shift_standard'  // 24-48hr notice
  | 'stay_late'             // 2+ hours
  | 'arrive_early'          // 2+ hours
  | 'training_mentoring'
  | 'special_event';

export type CoachingStage = 1 | 2 | 3 | 4 | 5;

export type PerformanceTier = 1 | 2 | 3;

export interface PointEvent {
  id: string;
  team_member_id: string;
  organization_id: string;
  event_type: PointEventType;
  points: number;
  event_date: string;
  cycle_id: string;
  notes?: string;
  related_shift_id?: string;
  created_by: string;
  created_at: string;
  // Computed
  running_balance?: number;
}

export interface PointReduction {
  id: string;
  team_member_id: string;
  organization_id: string;
  reduction_type: PointReductionType;
  points: number; // Negative value
  event_date: string;
  cycle_id: string;
  notes?: string;
  created_by: string;
  created_at: string;
  // Computed
  running_balance?: number;
}

export interface PerformanceCycle {
  id: string;
  organization_id: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface CoachingRecord {
  id: string;
  team_member_id: string;
  organization_id: string;
  stage: CoachingStage;
  triggered_at: string;
  triggered_points: number;
  status: 'pending' | 'in_progress' | 'completed';
  // Checklist items
  conversation_scheduled: boolean;
  conversation_date?: string;
  barriers_discussed: boolean;
  resources_identified: boolean;
  strategy_developed: boolean;
  // Documentation
  notes?: string;
  letter_generated: boolean;
  letter_url?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
}

export interface PerformanceImprovementPlan {
  id: string;
  team_member_id: string;
  organization_id: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  start_date: string;
  end_date: string;
  goals: PIPGoal[];
  milestones: PIPMilestone[];
  notes?: string;
  created_by: string;
  created_at: string;
  completed_at?: string;
  outcome?: 'success' | 'failure' | 'extended';
}

export interface PIPGoal {
  id: string;
  description: string;
  target_value?: number;
  current_value?: number;
  is_met: boolean;
}

export interface PIPMilestone {
  id: string;
  description: string;
  due_date: string;
  completed: boolean;
  completed_at?: string;
  notes?: string;
}

// Time-off usage tracking
export interface TimeOffUsage {
  sick_days_used: number;
  sick_days_available: number;
  sick_period_start: string;  // ISO date
  sick_day_dates?: string[];  // Individual sick day dates (YYYY-MM-DD) for ledger display
  vacation_hours_used?: number;
  vacation_hours_available?: number;
}

export interface TeamMemberPerformance {
  team_member_id: string;
  team_member: TeamMember;
  current_points: number;
  tier: PerformanceTier;
  coaching_stage?: CoachingStage;
  active_pip?: PerformanceImprovementPlan;
  events: (PointEvent | PointReduction)[];
  coaching_records: CoachingRecord[];
  time_off?: TimeOffUsage;
}

// Default point values (configurable per org)
export interface PerformanceConfig {
  point_values: {
    no_call_no_show: number;
    dropped_shift_no_coverage: number;
    unexcused_absence: number;
    tardiness_major: number;
    tardiness_minor: number;
    early_departure: number;
    late_notification: number;
    food_safety_violation: number;
    insubordination: number;
  };
  reduction_values: {
    cover_shift_urgent: number;
    cover_shift_standard: number;
    stay_late: number;
    arrive_early: number;
    training_mentoring: number;
    special_event: number;
  };
  // Detection thresholds (in minutes) - when events trigger
  detection_thresholds: {
    tardiness_minor_min: number;    // Start of minor tardiness (default 5)
    tardiness_major_min: number;    // Start of major tardiness (default 15)
    early_departure_min: number;    // Left X+ min early (default 30)
    arrived_early_min: number;      // Arrived X+ min early for reduction (default 30)
    stayed_late_min: number;        // Stayed X+ min late for reduction (default 60)
  };
  // Tracking rules - who gets tracked
  tracking_rules: {
    exempt_security_levels: number[];  // Security levels exempt from tracking (e.g., [0, 1] for Owner, Exec Chef)
    track_unscheduled_shifts: boolean; // Whether to flag people who work without being scheduled
    unscheduled_exempt_levels: number[]; // Levels where unscheduled work is expected (e.g., owners)
  };
  tier_thresholds: {
    tier1_max: number;  // 0 to this = Tier 1
    tier2_max: number;  // tier1_max+1 to this = Tier 2
    // tier2_max+1 and above = Tier 3
  };
  coaching_thresholds: {
    stage1: number;
    stage2: number;
    stage3: number;
    stage4: number;
    stage5: number;
  };
  cycle_length_months: number;
  max_reduction_per_30_days: number;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  point_values: {
    no_call_no_show: 6,
    dropped_shift_no_coverage: 4,
    unexcused_absence: 2,
    tardiness_major: 2,
    tardiness_minor: 1,
    early_departure: 2,
    late_notification: 1,
    food_safety_violation: 3,
    insubordination: 3,
  },
  reduction_values: {
    cover_shift_urgent: -2,
    cover_shift_standard: -1,
    stay_late: -1,
    arrive_early: -1,
    training_mentoring: -1,
    special_event: -1,
  },
  detection_thresholds: {
    tardiness_minor_min: 5,     // 5-14 min = minor
    tardiness_major_min: 15,    // 15+ min = major
    early_departure_min: 30,    // left 30+ min early
    arrived_early_min: 30,      // arrived 30+ min early (reduction)
    stayed_late_min: 60,        // stayed 60+ min late (reduction)
  },
  tracking_rules: {
    exempt_security_levels: [0, 1],  // Owner (0) and Executive Chef (1) exempt from attendance tracking
    track_unscheduled_shifts: true,  // Flag unscheduled work for review
    unscheduled_exempt_levels: [0, 1, 2], // Owner, Exec Chef, Sous Chef can work unscheduled without flag
  },
  tier_thresholds: {
    tier1_max: 2,
    tier2_max: 5,
  },
  coaching_thresholds: {
    stage1: 6,
    stage2: 8,
    stage3: 10,
    stage4: 12,
    stage5: 15,
  },
  cycle_length_months: 4,
  max_reduction_per_30_days: 3,
};

// =============================================================================
// CERTIFICATIONS
// =============================================================================

export interface Certification {
  id: string;
  name: string;
  issued_date?: string | null;
  expiry_date?: string | null;
  certificate_number?: string | null;
  issuing_body?: string | null;
  status?: 'valid' | 'expiring_soon' | 'expired';
}

export interface TeamMember {
  id: string;
  created_at?: string;
  updated_at?: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  display_name?: string | null;
  email: string | null;
  phone?: string;
  punch_id?: string;
  avatar_url?: string;
  roles?: string[];
  departments?: string[];
  locations?: string[];
  notification_preferences?: Record<string, any>;
  kitchen_role?: string;        // Human-friendly label (display only)
  kitchen_stations?: string[];
  is_active?: boolean;
  
  // Security
  security_level?: SecurityLevel;  // The actual permission gatekeeper
  
  // Certifications
  certifications?: Certification[];
  
  // Employment
  hire_date?: string | null;  // ISO date string
  
  // Compensation
  pay_type?: 'hourly' | 'salary';  // Default 'hourly'. Maps to 7shifts wage_type.
  wages?: number[];  // Parallel to roles[] — roles[i] earns wages[i] per hour

  // Import tracking
  import_source?: 'manual' | 'csv' | '7shifts' | null;
  import_file_url?: string | null;
  imported_at?: string | null;
}

export interface ImportSummary {
  newMembers: any[];
  existingToUpdate: { id: string; data: any }[];
  updateCount: number;
  notInCSV: TeamMember[];
  needsConfirmation: boolean;
}

export interface TeamStore {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
  fetchTeamMembers: () => Promise<void>;
  createTeamMember: (member: Omit<TeamMember, "id">) => Promise<void>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  importTeamMembers: (csvData: any[]) => Promise<ImportSummary>;
  executeTeamImport: (
    newMembers: any[], 
    handleMissingAction: 'keep' | 'inactive' | 'delete', 
    missingMemberIds: string[],
    file?: File,
    existingToUpdate?: { id: string; data: any }[]
  ) => Promise<number>;
}
