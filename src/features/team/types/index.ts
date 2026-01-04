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

export interface TeamMemberPerformance {
  team_member_id: string;
  team_member: TeamMember;
  current_points: number;
  tier: PerformanceTier;
  coaching_stage?: CoachingStage;
  active_pip?: PerformanceImprovementPlan;
  events: (PointEvent | PointReduction)[];
  coaching_records: CoachingRecord[];
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
