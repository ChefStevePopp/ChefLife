/**
 * Communications Module - Type Definitions
 * 
 * Types for email templates, merge operations, and delivery.
 */

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export interface EmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  subject_template: string;
  html_template: string;
  recipient_type: RecipientType;
  send_mode: SendMode;
  schedule_cron?: string;
  trigger_event?: TriggerEvent;
  trigger_conditions?: Record<string, unknown>;
  is_active: boolean;
  is_archived?: boolean;
  is_system: boolean;
  send_count?: number;
  last_sent_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type TemplateCategory = 
  | 'performance' 
  | 'hr' 
  | 'operations' 
  | 'scheduling'
  | 'general';

export type RecipientType = 
  | 'individual'    // Single team member
  | 'managers'      // All managers (security level 0-3)
  | 'all_team'      // Everyone
  | 'custom';       // Custom selection

export type SendMode = 
  | 'manual'        // Send on demand
  | 'scheduled'     // Cron-based schedule
  | 'triggered';    // Event-based trigger

export type TriggerEvent =
  | 'coaching_stage_reached'
  | 'pip_created'
  | 'pip_completed'
  | 'tier_changed'
  | 'birthday'
  | 'work_anniversary'
  | 'shift_reminder'
  | 'schedule_published'
  | 'temp_out_of_range'
  | 'price_change_detected';

// =============================================================================
// FIELD MAPPING TYPES
// =============================================================================

export interface TemplateField {
  id: string;
  template_id: string;
  field_tag: string;           // «First_Name» or {{first_name}}
  data_source: DataSource;
  data_path: string;           // Path within source: 'first_name'
  transform?: FieldTransform;
  format_options?: Record<string, unknown>;
  default_value?: string;
}

export type DataSource =
  | 'recipient'      // Team member receiving email
  | 'organization'   // Org settings
  | 'performance'    // Team performance data
  | 'time_off'       // Sick days, vacation
  | 'period'         // Reporting period dates
  | 'schedule'       // Shift/schedule data
  | 'history'        // Historical trimester stats (legacy)
  | 'periods'        // Rolling period stats (current, prev1, prev2, prev3)
  | 'custom';        // Custom context passed at send time

export type FieldTransform =
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'date_short'      // Jan 6
  | 'date_long'       // Monday, January 6, 2026
  | 'date_iso'        // 2026-01-06
  | 'time_12h'        // 3:30 PM
  | 'time_24h'        // 15:30
  | 'percentage'      // 94.5%
  | 'currency'        // $1,234.56
  | 'number';         // 1,234

// =============================================================================
// MERGE CONTEXT TYPES
// =============================================================================

export interface RecipientContext {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  hire_date?: string;
  position?: string;
  department?: string;
}

export interface PerformanceContext {
  current_points: number;
  tier: number;
  tier_label: string;
  coaching_stage?: number;
  coaching_stage_label?: string;
  points_this_week: number;
  points_this_period: number;
  events_this_week: Array<{
    date: string;
    event_type: string;
    points: number;
    notes?: string;
  }>;
  attendance_period_pct: number;
  attendance_ytd_pct: number;
}

export interface TimeOffContext {
  sick_days_available: number;
  sick_days_used: number;
  sick_days_remaining: number;
  vacation_hours_benefit: number;
  vacation_hours_used: number;
  vacation_hours_remaining: number;
  seniority_status?: string;
}

export interface PeriodContext {
  start_date: string;
  end_date: string;
  week_label: string;        // "Week of January 6, 2026"
  period_label: string;      // "Q1 2026" or "Winter/Spring 2026"
  days: Array<{
    date: string;
    day_name: string;
    info: string;
  }>;
}

export interface OrganizationContext {
  name: string;
  logo_url?: string;
  timezone: string;
}

export interface HistoryContext {
  // Trimester 1 (Jan-Apr) - Winter/Spring
  t1_2025_late?: number;
  t1_2025_attendance?: number;
  t1_2026_late?: number;
  t1_2026_attendance?: number;
  // Trimester 2 (May-Aug) - Spring/Summer
  t2_2025_late?: number;
  t2_2025_attendance?: number;
  t2_2026_late?: number;
  t2_2026_attendance?: number;
  // Trimester 3 (Sep-Dec) - Fall/Winter
  t3_2025_late?: number;
  t3_2025_attendance?: number;
  t3_2026_late?: number;
  t3_2026_attendance?: number;
  // Allow any other historical fields
  [key: string]: number | undefined;
}

export interface PeriodStats {
  label: string;       // "Fall/Winter 2025"
  late: number;        // Late arrival count
  absences: number;    // Absence count
  points: number;      // Total points for period
}

export interface RollingPeriodsContext {
  current: PeriodStats;   // Active period
  prev1: PeriodStats;     // Most recent completed
  prev2: PeriodStats;     // Two cycles ago
  prev3: PeriodStats;     // Three cycles ago
}

export interface MergeContext {
  recipient: RecipientContext;
  organization: OrganizationContext;
  performance?: PerformanceContext;
  time_off?: TimeOffContext;
  period?: PeriodContext;
  history?: HistoryContext;
  periods?: RollingPeriodsContext;
  custom?: Record<string, unknown>;
}

// =============================================================================
// SEND TYPES
// =============================================================================

export interface SendEmailRequest {
  template_id?: string;
  template_name?: string;
  recipient_id?: string;
  recipient_email?: string;
  recipient_name?: string;
  context: Partial<MergeContext>;
  triggered_by?: 'manual' | 'schedule' | string;
}

export interface SendEmailResult {
  success: boolean;
  message_id?: string;
  error?: string;
  log_id?: string;
}

export interface EmailSendLog {
  id: string;
  organization_id: string;
  template_id?: string;
  recipient_email: string;
  recipient_name?: string;
  recipient_id?: string;
  template_name: string;
  subject: string;
  status: SendStatus;
  provider_message_id?: string;
  queued_at: string;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  retry_count: number;
  merge_context?: MergeContext;
  triggered_by?: string;
  triggered_by_user?: string;
  created_at: string;
}

export type SendStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

// =============================================================================
// QUEUE TYPES
// =============================================================================

export interface EmailQueueItem {
  id: string;
  organization_id: string;
  template_id: string;
  recipient_email: string;
  recipient_name?: string;
  recipient_id?: string;
  merge_context: MergeContext;
  scheduled_for: string;
  priority: number;
  status: QueueStatus;
  attempts: number;
  last_attempt_at?: string;
  error_message?: string;
  created_at: string;
  created_by?: string;
}

export type QueueStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed';
