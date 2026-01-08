/**
 * Context Builder - Build MergeContext from Real Data
 * 
 * Creates merge contexts from actual database records for:
 * - Live preview in template editor
 * - Email generation at send time
 * 
 * Data Sources:
 * - Recipient: organization_team_members
 * - Performance: usePerformanceStore data
 * - Time Off: Calculated from activity logs
 * - Organization: organizations table
 * - Period History: Aggregated from point events
 */

import { supabase } from '@/lib/supabase';
import { formatDateForDisplay, getLocalDateString, getLocalYear } from '@/utils/dateUtils';
import type { 
  MergeContext, 
  RecipientContext, 
  OrganizationContext,
  PerformanceContext,
  TimeOffContext,
  PeriodContext,
  RollingPeriodsContext,
  PeriodStats,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  hire_date?: string;
  position?: string;
  department?: string;
  avatar_url?: string;
}

interface TeamMemberPerformance {
  current_points: number;
  tier: number;
  coaching_stage?: number | null;
  events: Array<{
    event_type?: string;
    reduction_type?: string;
    points: number;
    event_date: string;
    notes?: string;
  }>;
  time_off?: {
    sick_days_used: number;
    sick_days_available: number;
    vacation_hours_used?: number;
    vacation_hours_available?: number;
  };
}

interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  timezone?: string;
}

interface BuildContextOptions {
  /** Pre-loaded performance data (from usePerformanceStore) */
  performanceData?: TeamMemberPerformance;
  /** Pre-loaded organization data */
  organizationData?: Organization;
  /** Custom overrides to merge in */
  customData?: Record<string, unknown>;
  /** Week start date override (defaults to current week) */
  weekStartDate?: string;
}

// =============================================================================
// TIER LABELS
// =============================================================================

const TIER_LABELS: Record<number, string> = {
  1: 'Priority',
  2: 'Standard',
  3: 'Probation',
};

const COACHING_STAGE_LABELS: Record<number, string> = {
  1: 'Verbal Warning',
  2: 'Written Warning',
  3: 'Final Warning',
  4: 'Suspension Review',
  5: 'Termination Review',
};

// =============================================================================
// PERIOD UTILITIES
// =============================================================================

/**
 * Get period info from a date
 * Periods: Jan-Apr (Winter/Spring), May-Aug (Summer), Sep-Dec (Fall/Winter)
 */
function getPeriodFromDate(date: Date): { period: number; year: number; label: string } {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  let period: number;
  let label: string;
  
  if (month >= 1 && month <= 4) {
    period = 1;
    label = `Winter/Spring ${year}`;
  } else if (month >= 5 && month <= 8) {
    period = 2;
    label = `Summer ${year}`;
  } else {
    period = 3;
    label = `Fall/Winter ${year}`;
  }
  
  return { period, year, label };
}

/**
 * Get date range for a period
 */
function getPeriodDateRange(period: number, year: number): { start: string; end: string } {
  switch (period) {
    case 1:
      return { start: `${year}-01-01`, end: `${year}-04-30` };
    case 2:
      return { start: `${year}-05-01`, end: `${year}-08-31` };
    case 3:
      return { start: `${year}-09-01`, end: `${year}-12-31` };
    default:
      return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
}

/**
 * Get the previous N periods from a given period
 */
function getPreviousPeriods(currentPeriod: number, currentYear: number, count: number): Array<{ period: number; year: number; label: string }> {
  const periods: Array<{ period: number; year: number; label: string }> = [];
  let period = currentPeriod;
  let year = currentYear;
  
  for (let i = 0; i < count; i++) {
    period--;
    if (period < 1) {
      period = 3;
      year--;
    }
    
    let label: string;
    switch (period) {
      case 1:
        label = `Winter/Spring ${year}`;
        break;
      case 2:
        label = `Summer ${year}`;
        break;
      case 3:
        label = `Fall/Winter ${year}`;
        break;
      default:
        label = `Period ${period} ${year}`;
    }
    
    periods.push({ period, year, label });
  }
  
  return periods;
}

/**
 * Calculate week bounds for a date
 */
function getWeekBounds(dateStr?: string): { start: Date; end: Date; monday: Date } {
  const date = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return { start: monday, end: sunday, monday };
}

// =============================================================================
// MAIN CONTEXT BUILDER
// =============================================================================

/**
 * Build a complete MergeContext for a team member
 * 
 * @param teamMemberId - The team member's UUID
 * @param organizationId - The organization's UUID
 * @param options - Optional pre-loaded data and overrides
 */
export async function buildMergeContext(
  teamMemberId: string,
  organizationId: string,
  options: BuildContextOptions = {}
): Promise<MergeContext> {
  const {
    performanceData,
    organizationData,
    customData,
    weekStartDate,
  } = options;

  // Fetch team member if needed
  let teamMember: TeamMember | null = null;
  const { data: memberData, error: memberError } = await supabase
    .from('organization_team_members')
    .select('id, first_name, last_name, email, hire_date, position, department, avatar_url')
    .eq('id', teamMemberId)
    .single();
  
  if (memberError) {
    console.error('Error fetching team member:', memberError);
  } else {
    teamMember = memberData;
  }

  // Fetch organization if not provided
  let organization: Organization | null = organizationData || null;
  if (!organization) {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, logo_url, timezone')
      .eq('id', organizationId)
      .single();
    
    if (orgError) {
      console.error('Error fetching organization:', orgError);
    } else {
      organization = orgData;
    }
  }

  // Build recipient context
  const recipient: RecipientContext = {
    id: teamMember?.id || teamMemberId,
    first_name: teamMember?.first_name || 'Team',
    last_name: teamMember?.last_name || 'Member',
    email: teamMember?.email || '',
    avatar_url: teamMember?.avatar_url,
    hire_date: teamMember?.hire_date ? formatDateForDisplay(teamMember.hire_date) : undefined,
    position: teamMember?.position,
    department: teamMember?.department,
  };

  // Build organization context
  const organizationContext: OrganizationContext = {
    name: organization?.name || 'Organization',
    logo_url: organization?.logo_url,
    timezone: organization?.timezone || 'America/Toronto',
  };

  // Build performance context
  const performance: PerformanceContext = buildPerformanceContext(performanceData);

  // Build time-off context
  const time_off: TimeOffContext = buildTimeOffContext(performanceData);

  // Build period context
  const period: PeriodContext = buildPeriodContext(weekStartDate);

  // Build rolling periods context
  const periods: RollingPeriodsContext = await buildRollingPeriodsContext(
    teamMemberId,
    organizationId,
    performanceData
  );

  return {
    recipient,
    organization: organizationContext,
    performance,
    time_off,
    period,
    periods,
    custom: customData,
  };
}

// =============================================================================
// CONTEXT BUILDERS
// =============================================================================

function buildPerformanceContext(performanceData?: TeamMemberPerformance): PerformanceContext {
  const currentPoints = performanceData?.current_points ?? 0;
  const tier = performanceData?.tier ?? 1;
  const coachingStage = performanceData?.coaching_stage;
  
  // Calculate points this week from events
  const weekStart = getWeekBounds().start;
  const weekStartStr = weekStart.toISOString().split('T')[0];
  
  const eventsThisWeek = performanceData?.events?.filter(e => e.event_date >= weekStartStr) || [];
  const pointsThisWeek = eventsThisWeek.reduce((sum, e) => sum + Math.max(0, e.points), 0);
  const reductionsThisWeek = eventsThisWeek.reduce((sum, e) => sum + Math.min(0, e.points), 0);
  
  return {
    current_points: currentPoints,
    tier,
    tier_label: TIER_LABELS[tier] || `Tier ${tier}`,
    coaching_stage: coachingStage ?? undefined,
    coaching_stage_label: coachingStage ? COACHING_STAGE_LABELS[coachingStage] : undefined,
    points_this_week: pointsThisWeek,
    points_this_period: currentPoints, // For now, assume period = cycle
    events_this_week: eventsThisWeek.map(e => ({
      date: e.event_date,
      event_type: e.event_type || e.reduction_type || 'unknown',
      points: e.points,
      notes: e.notes,
    })),
    attendance_period_pct: 100 - (currentPoints * 0.5), // Rough estimate
    attendance_ytd_pct: 100 - (currentPoints * 0.3), // Rough estimate
  };
}

function buildTimeOffContext(performanceData?: TeamMemberPerformance): TimeOffContext {
  const timeOff = performanceData?.time_off;
  
  return {
    sick_days_available: timeOff?.sick_days_available ?? 3,
    sick_days_used: timeOff?.sick_days_used ?? 0,
    sick_days_remaining: (timeOff?.sick_days_available ?? 3) - (timeOff?.sick_days_used ?? 0),
    vacation_hours_benefit: timeOff?.vacation_hours_available ?? 80,
    vacation_hours_used: timeOff?.vacation_hours_used ?? 0,
    vacation_hours_remaining: (timeOff?.vacation_hours_available ?? 80) - (timeOff?.vacation_hours_used ?? 0),
    seniority_status: 'Standard', // Could be calculated from hire date
  };
}

function buildPeriodContext(weekStartDate?: string): PeriodContext {
  const { start: monday, end: sunday } = getWeekBounds(weekStartDate);
  const currentPeriod = getPeriodFromDate(monday);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatWeekLabel = (d: Date) => `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  const formatDayShort = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  
  // Generate day info (placeholder - would come from schedule data)
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push({
      date: formatDayShort(day),
      day_name: day.toLocaleDateString('en-US', { weekday: 'long' }),
      info: i === 2 || i === 6 ? 'Off' : 'Scheduled', // Placeholder
    });
  }
  
  return {
    start_date: formatDate(monday),
    end_date: formatDate(sunday),
    week_label: formatWeekLabel(monday),
    period_label: currentPeriod.label,
    days,
  };
}

async function buildRollingPeriodsContext(
  teamMemberId: string,
  organizationId: string,
  performanceData?: TeamMemberPerformance
): Promise<RollingPeriodsContext> {
  const now = new Date();
  const currentPeriod = getPeriodFromDate(now);
  const previousPeriods = getPreviousPeriods(currentPeriod.period, currentPeriod.year, 3);
  
  // Calculate current period stats from performance data
  const currentRange = getPeriodDateRange(currentPeriod.period, currentPeriod.year);
  const events = performanceData?.events || [];
  
  const currentEvents = events.filter(e => 
    e.event_date >= currentRange.start && e.event_date <= currentRange.end
  );
  
  const current: PeriodStats = {
    label: currentPeriod.label,
    late: currentEvents.filter(e => 
      e.event_type?.includes('tardiness') || e.event_type?.includes('late')
    ).length,
    absences: currentEvents.filter(e => 
      e.event_type?.includes('absence') || e.event_type?.includes('no_show') || e.event_type?.includes('dropped')
    ).length,
    points: currentEvents.reduce((sum, e) => sum + Math.max(0, e.points), 0),
  };
  
  // For previous periods, we'd need to query historical data
  // For now, return zeros - this will be enhanced when historical queries are added
  const prev1: PeriodStats = {
    label: previousPeriods[0]?.label || 'Previous Period',
    late: 0,
    absences: 0,
    points: 0,
  };
  
  const prev2: PeriodStats = {
    label: previousPeriods[1]?.label || '2 Periods Ago',
    late: 0,
    absences: 0,
    points: 0,
  };
  
  const prev3: PeriodStats = {
    label: previousPeriods[2]?.label || '3 Periods Ago',
    late: 0,
    absences: 0,
    points: 0,
  };
  
  return { current, prev1, prev2, prev3 };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Build a minimal context for quick preview (no database calls)
 * Uses provided data only
 */
export function buildQuickContext(
  teamMember: TeamMember,
  performanceData: TeamMemberPerformance,
  organizationName: string = 'Memphis Fire BBQ'
): MergeContext {
  const recipient: RecipientContext = {
    id: teamMember.id,
    first_name: teamMember.first_name,
    last_name: teamMember.last_name,
    email: teamMember.email,
    avatar_url: teamMember.avatar_url,
    hire_date: teamMember.hire_date ? formatDateForDisplay(teamMember.hire_date) : undefined,
    position: teamMember.position,
    department: teamMember.department,
  };
  
  return {
    recipient,
    organization: {
      name: organizationName,
      timezone: 'America/Toronto',
    },
    performance: buildPerformanceContext(performanceData),
    time_off: buildTimeOffContext(performanceData),
    period: buildPeriodContext(),
  };
}

/**
 * Get available team members for recipient selector
 */
export async function getAvailableRecipients(organizationId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('organization_team_members')
    .select('id, first_name, last_name, email, hire_date, position, department, avatar_url')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('first_name');
  
  if (error) {
    console.error('Error fetching recipients:', error);
    return [];
  }
  
  return data || [];
}
