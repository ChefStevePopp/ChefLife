/**
 * TemplatePreview - Full-Page Preview with Send Test
 * 
 * L5 Design: Full preview with real data integration
 * 
 * Features:
 * - Real data from performance store
 * - Historical period selector (This Week, Last Week, etc.)
 * - Date format options
 * - Custom dropdown with Lucide tier indicators
 * 
 * Location: Admin → Modules → Communications → Templates → Preview
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Loader2,
  User,
  Code,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Info,
  Eye,
  RefreshCw,
  TrendingUp,
  Thermometer,
  Calendar,
  Circle,
  Clock,
  Search,
  Check,
  Users,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTeamStore } from "@/stores/teamStore";
import { usePerformanceStore } from "@/stores/performanceStore";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";
import { formatDateForDisplay } from "@/utils/dateUtils";
import { 
  mergeTemplate, 
  getSampleContext,
  sendEmail,
} from '@/lib/communications';
import { nexus } from '@/lib/nexus';
import type { EmailTemplate, MergeContext } from "@/lib/communications/types";
import type { TeamMember } from "@/features/team/types";

// =============================================================================
// HISTORICAL PERIOD DATA FETCHER
// =============================================================================

interface PeriodStats {
  label: string;
  late: number;
  absences: number;
  points: number;
  startDate: string;
  endDate: string;
}

interface PerformanceCycle {
  id: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

/**
 * Format cycle for display (matches Team Performance dropdown)
 */
function formatCycleName(cycle: { start_date: string; end_date: string }): string {
  // Parse as local date by appending time component
  const start = new Date(cycle.start_date + 'T00:00:00');
  const end = new Date(cycle.end_date + 'T00:00:00');
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const year = start.getFullYear();
  return `${startMonth}-${endMonth} ${year}`;
}

/**
 * Count late and absence events from an array of events within date range
 */
function countEventsInPeriod(
  events: any[],
  startDate: string,
  endDate: string
): { late: number; absences: number; points: number } {
  const periodEvents = events.filter(
    (e) => e.event_date >= startDate && e.event_date <= endDate
  );

  const late = periodEvents.filter(
    (e) => e.event_type?.includes('tardiness') || e.event_type?.includes('late')
  ).length;

  const absences = periodEvents.filter(
    (e) =>
      e.event_type?.includes('absence') ||
      e.event_type?.includes('no_show') ||
      e.event_type?.includes('dropped')
  ).length;

  const points = periodEvents.reduce((sum: number, e: any) => sum + (e.points || 0), 0);

  return { late, absences, points };
}

/**
 * Fetch historical period data for a team member
 * Uses REAL cycle dates from performance_cycles table
 * Returns stats for current period and previous 3 periods
 */
async function fetchMemberHistoricalData(
  organizationId: string,
  memberId: string
): Promise<{
  current: PeriodStats;
  prev1: PeriodStats;
  prev2: PeriodStats;
  prev3: PeriodStats;
}> {
  // Fetch all cycles ordered by start_date descending (newest first)
  const { data: cycles, error: cyclesError } = await supabase
    .from('performance_cycles')
    .select('id, start_date, end_date, is_current')
    .eq('organization_id', organizationId)
    .order('start_date', { ascending: false });

  if (cyclesError) {
    console.error('[TemplatePreview] Error fetching cycles:', cyclesError);
  }

  const allCycles = (cycles || []) as PerformanceCycle[];
  
  // Find current cycle (marked as current or most recent by date)
  const currentCycle = allCycles.find(c => c.is_current) || allCycles[0];
  
  // Get previous 3 cycles (skip current, take next 3)
  const currentIndex = allCycles.findIndex(c => c.id === currentCycle?.id);
  const previousCycles = allCycles.slice(currentIndex + 1, currentIndex + 4);

  console.log('[TemplatePreview] Cycles found:', {
    total: allCycles.length,
    current: currentCycle ? formatCycleName(currentCycle) : 'none',
    previous: previousCycles.map(c => formatCycleName(c)),
  });

  // Calculate earliest date we need to query (go back to oldest previous cycle)
  const oldestCycle = previousCycles[previousCycles.length - 1] || currentCycle;
  const earliestDate = oldestCycle?.start_date || new Date().toISOString().split('T')[0];

  // Fetch all events for this member from earliest cycle to now
  const { data: events, error: eventsError } = await supabase
    .from('performance_point_events')
    .select('event_date, event_type, points')
    .eq('organization_id', organizationId)
    .eq('team_member_id', memberId)
    .gte('event_date', earliestDate)
    .order('event_date', { ascending: false });

  if (eventsError) {
    console.error('[TemplatePreview] Error fetching historical events:', eventsError);
  }

  const allEvents = events || [];
  console.log('[TemplatePreview] Events found for member:', allEvents.length);

  // Calculate stats for each period using real cycle boundaries
  const currentStats = currentCycle
    ? countEventsInPeriod(allEvents, currentCycle.start_date, currentCycle.end_date)
    : { late: 0, absences: 0, points: 0 };

  const prev1Stats = previousCycles[0]
    ? countEventsInPeriod(allEvents, previousCycles[0].start_date, previousCycles[0].end_date)
    : { late: 0, absences: 0, points: 0 };

  const prev2Stats = previousCycles[1]
    ? countEventsInPeriod(allEvents, previousCycles[1].start_date, previousCycles[1].end_date)
    : { late: 0, absences: 0, points: 0 };

  const prev3Stats = previousCycles[2]
    ? countEventsInPeriod(allEvents, previousCycles[2].start_date, previousCycles[2].end_date)
    : { late: 0, absences: 0, points: 0 };

  return {
    current: {
      label: currentCycle ? formatCycleName(currentCycle) : 'Current Period',
      startDate: currentCycle?.start_date || '',
      endDate: currentCycle?.end_date || '',
      ...currentStats,
    },
    prev1: {
      label: previousCycles[0] ? formatCycleName(previousCycles[0]) : 'Previous Period',
      startDate: previousCycles[0]?.start_date || '',
      endDate: previousCycles[0]?.end_date || '',
      ...prev1Stats,
    },
    prev2: {
      label: previousCycles[1] ? formatCycleName(previousCycles[1]) : '2 Periods Ago',
      startDate: previousCycles[1]?.start_date || '',
      endDate: previousCycles[1]?.end_date || '',
      ...prev2Stats,
    },
    prev3: {
      label: previousCycles[2] ? formatCycleName(previousCycles[2]) : '3 Periods Ago',
      startDate: previousCycles[2]?.start_date || '',
      endDate: previousCycles[2]?.end_date || '',
      ...prev3Stats,
    },
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TIER_LABELS: Record<number, string> = {
  1: 'Priority',
  2: 'Standard',
  3: 'Probation',
};

const TIER_COLORS: Record<number, string> = {
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-rose-500',
};

const COACHING_STAGE_LABELS: Record<number, string> = {
  1: 'Verbal Warning',
  2: 'Written Warning',
  3: 'Final Warning',
  4: 'Suspension Review',
  5: 'Termination Review',
};

/** Historical period options */
const PERIOD_OPTIONS = [
  { value: 0, label: 'This Week', description: 'Current week data' },
  { value: -1, label: 'Last Week', description: 'Previous week (review emails)' },
  { value: -2, label: '2 Weeks Ago', description: 'Two weeks prior' },
  { value: -3, label: '3 Weeks Ago', description: 'Three weeks prior' },
  { value: -4, label: '4 Weeks Ago', description: 'Four weeks prior' },
];

/** Date format options */
const DATE_FORMATS = [
  { value: 'iso', label: 'ISO', example: '2026-01-05' },
  { value: 'short', label: 'Short', example: 'Jan 5, 2026' },
  { value: 'long', label: 'Long', example: 'January 5, 2026' },
  { value: 'weekday', label: 'With Day', example: 'Mon, Jan 5' },
  { value: 'friendly', label: 'Friendly', example: 'Monday, January 5' },
];

// =============================================================================
// PERIOD UTILITIES
// =============================================================================

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

function getPreviousPeriods(currentPeriod: number, currentYear: number, count: number) {
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
      case 1: label = `Winter/Spring ${year}`; break;
      case 2: label = `Summer ${year}`; break;
      case 3: label = `Fall/Winter ${year}`; break;
      default: label = `Period ${period} ${year}`;
    }
    
    periods.push({ period, year, label });
  }
  
  return periods;
}

/**
 * Get week bounds with offset (0 = this week, -1 = last week, etc.)
 */
function getWeekBounds(weekOffset: number = 0): { monday: Date; sunday: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Calculate this week's Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  
  // Apply week offset
  monday.setDate(monday.getDate() + (weekOffset * 7));
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return { monday, sunday };
}

/**
 * Format a date based on format option
 */
function formatDateByOption(date: Date, format: string): string {
  switch (format) {
    case 'iso':
      return date.toISOString().split('T')[0];
    case 'short':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'long':
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    case 'weekday':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    case 'friendly':
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    default:
      return date.toISOString().split('T')[0];
  }
}

// =============================================================================
// EVENT TYPE LABELS (Human-friendly)
// =============================================================================

const EVENT_TYPE_LABELS: Record<string, string> = {
  // Point events (negative)
  no_call_no_show: 'No Call/No Show',
  dropped_shift_no_coverage: 'Dropped Shift',
  unexcused_absence: 'Absent',
  tardiness_major: 'Late (15+ min)',
  tardiness_minor: 'Late (5-15 min)',
  early_departure: 'Left Early',
  late_notification: 'Late Notice',
  food_safety_violation: 'Food Safety Issue',
  insubordination: 'Insubordination',
  // Point reductions (positive)
  cover_shift_urgent: 'Covered Shift (Urgent)',
  cover_shift_standard: 'Covered Shift',
  stay_late: 'Stayed Late',
  arrive_early: 'Arrived Early',
  training_mentoring: 'Training/Mentoring',
  special_event: 'Special Event',
};

/**
 * Get human-friendly label for an event type
 */
function getEventLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get activity info for a specific day based on events
 * Returns: event summary or "Good" if no events
 */
function getDayActivityInfo(dayDate: string, events: any[]): string {
  // Find events for this specific day
  const dayEvents = events.filter((e: any) => e.event_date === dayDate);
  
  if (dayEvents.length === 0) {
    return 'Good'; // No events = good day
  }
  
  // Build summary of events
  const summaries = dayEvents.map((e: any) => {
    const label = getEventLabel(e.event_type || e.reduction_type || 'unknown');
    const points = e.points;
    // Show points: +1 for reductions (negative stored as negative), -2 for events
    const pointStr = points < 0 ? `${points}` : `+${points}`;
    return `${label} (${pointStr})`;
  });
  
  // Return single event or combine multiple
  if (summaries.length === 1) {
    return summaries[0];
  }
  return summaries.join(', ');
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

function buildRealContext(
  member: TeamMember,
  performanceData: any,
  weekOffset: number = 0,
  dateFormat: string = 'iso',
  organizationName: string = 'Memphis Fire BBQ',
  historicalData?: {
    current: PeriodStats;
    prev1: PeriodStats;
    prev2: PeriodStats;
    prev3: PeriodStats;
  }
): MergeContext {
  const { monday, sunday } = getWeekBounds(weekOffset);
  const currentPeriod = getPeriodFromDate(monday);
  const previousPeriods = getPreviousPeriods(currentPeriod.period, currentPeriod.year, 3);
  
  // Format helpers using selected format
  const formatDate = (d: Date) => formatDateByOption(d, dateFormat);
  const formatWeekLabel = (d: Date) => `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  const formatDayShort = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  
  // Extract performance data first (needed for days calculation)
  const currentPoints = performanceData?.current_points ?? 0;
  const tier = performanceData?.tier ?? 1;
  const coachingStage = performanceData?.coaching_stage;
  const events = performanceData?.events || [];
  const timeOff = performanceData?.time_off;
  
  // Generate week days with activity info from events
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dayDateStr = day.toISOString().split('T')[0]; // ISO format for matching
    
    days.push({
      date: formatDayShort(day),
      day_name: day.toLocaleDateString('en-US', { weekday: 'long' }),
      info: getDayActivityInfo(dayDateStr, events),
    });
  }
  
  // Calculate week stats based on the selected week
  const weekStartStr = monday.toISOString().split('T')[0];
  const weekEndStr = sunday.toISOString().split('T')[0];
  const eventsThisWeek = events.filter((e: any) => 
    e.event_date >= weekStartStr && e.event_date <= weekEndStr
  );
  
  // Calculate points gained (positive) and lost (negative/reductions)
  const pointsGainedThisWeek = eventsThisWeek
    .filter((e: any) => e.points > 0)
    .reduce((sum: number, e: any) => sum + e.points, 0);
  const pointsLostThisWeek = eventsThisWeek
    .filter((e: any) => e.points < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(e.points), 0);
  const pointsNetThisWeek = pointsGainedThisWeek - pointsLostThisWeek;
  
  // Calculate period stats from events
  const periodStart = `${currentPeriod.year}-${currentPeriod.period === 1 ? '01' : currentPeriod.period === 2 ? '05' : '09'}-01`;
  const currentPeriodEvents = events.filter((e: any) => e.event_date >= periodStart);
  const currentPeriodLate = currentPeriodEvents.filter((e: any) => 
    e.event_type?.includes('tardiness') || e.event_type?.includes('late')
  ).length;
  const currentPeriodAbsences = currentPeriodEvents.filter((e: any) => 
    e.event_type?.includes('absence') || e.event_type?.includes('no_show') || e.event_type?.includes('dropped')
  ).length;
  
  return {
    recipient: {
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email || '',
      avatar_url: member.avatar_url,
      hire_date: member.hire_date ? formatDateForDisplay(member.hire_date) : undefined,
      position: member.kitchen_role || undefined,
      department: member.departments?.[0] || undefined,
    },
    organization: {
      name: organizationName,
      timezone: 'America/Toronto',
    },
    performance: {
      current_points: currentPoints,
      tier,
      tier_label: TIER_LABELS[tier] || `Tier ${tier}`,
      coaching_stage: coachingStage ?? undefined,
      coaching_stage_label: coachingStage ? COACHING_STAGE_LABELS[coachingStage] : undefined,
      points_this_week: pointsNetThisWeek,
      points_gained_this_week: pointsGainedThisWeek,
      points_lost_this_week: pointsLostThisWeek,
      points_this_period: currentPoints,
      events_this_week: eventsThisWeek.map((e: any) => ({
        date: e.event_date,
        event_type: e.event_type || e.reduction_type || 'unknown',
        points: e.points,
        notes: e.notes,
      })),
      attendance_period_pct: Math.max(0, 100 - (currentPoints * 0.5)),
      attendance_ytd_pct: Math.max(0, 100 - (currentPoints * 0.3)),
    },
    time_off: {
      sick_days_available: timeOff?.sick_days_available ?? 3,
      sick_days_used: timeOff?.sick_days_used ?? 0,
      sick_days_remaining: (timeOff?.sick_days_available ?? 3) - (timeOff?.sick_days_used ?? 0),
      vacation_hours_benefit: timeOff?.vacation_hours_available ?? 80,
      vacation_hours_used: timeOff?.vacation_hours_used ?? 0,
      vacation_hours_remaining: (timeOff?.vacation_hours_available ?? 80) - (timeOff?.vacation_hours_used ?? 0),
      seniority_status: 'Standard',
    },
    period: {
      start_date: formatDate(monday),
      end_date: formatDate(sunday),
      week_label: formatWeekLabel(monday),
      period_label: currentPeriod.label,
      days,
    },
    periods: {
      current: {
        label: historicalData?.current?.label || currentPeriod.label,
        late: historicalData?.current?.late ?? currentPeriodLate,
        absences: historicalData?.current?.absences ?? currentPeriodAbsences,
        points: historicalData?.current?.points ?? currentPoints,
      },
      prev1: {
        label: historicalData?.prev1?.label || previousPeriods[0]?.label || 'Previous Period',
        late: historicalData?.prev1?.late ?? 0,
        absences: historicalData?.prev1?.absences ?? 0,
        points: historicalData?.prev1?.points ?? 0,
      },
      prev2: {
        label: historicalData?.prev2?.label || previousPeriods[1]?.label || '2 Periods Ago',
        late: historicalData?.prev2?.late ?? 0,
        absences: historicalData?.prev2?.absences ?? 0,
        points: historicalData?.prev2?.points ?? 0,
      },
      prev3: {
        label: historicalData?.prev3?.label || previousPeriods[2]?.label || '3 Periods Ago',
        late: historicalData?.prev3?.late ?? 0,
        absences: historicalData?.prev3?.absences ?? 0,
        points: historicalData?.prev3?.points ?? 0,
      },
    },
  };
}

// =============================================================================
// CUSTOM DROPDOWN COMPONENT
// =============================================================================

interface RecipientOption {
  id: string;
  name: string;
  position?: string;
  tier?: number;
  isSample?: boolean;
}

interface RecipientDropdownProps {
  value: string;
  options: RecipientOption[];
  onChange: (id: string) => void;
}

const RecipientDropdown: React.FC<RecipientDropdownProps> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selected = options.find(o => o.id === value);
  
  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(o => 
      o.name.toLowerCase().includes(lower) ||
      o.position?.toLowerCase().includes(lower)
    );
  }, [options, search]);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const getTierDot = (tier?: number) => {
    if (!tier) return null;
    const color = tier === 1 ? 'bg-emerald-500/40' : tier === 2 ? 'bg-amber-500/40' : 'bg-rose-500/40';
    return <span className={`w-1.5 h-1.5 rounded-full ${color}`} />;
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white hover:border-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors min-w-[240px]"
      >
        {selected?.isSample ? (
          <User className="w-4 h-4 text-gray-400" />
        ) : (
          getTierDot(selected?.tier)
        )}
        <span className="flex-1 text-left truncate">
          {selected?.name || 'Select recipient...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team members..."
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                autoFocus
              />
            </div>
          </div>
          
          {/* Options */}
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.map((option, idx) => (
              <React.Fragment key={option.id}>
                {/* Separator before team members */}
                {idx === 1 && !option.isSample && filtered[0]?.isSample && (
                  <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-900/30">
                    Team Members
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700/50 transition-colors ${
                    value === option.id ? 'bg-primary-500/10' : ''
                  }`}
                >
                  {option.isSample ? (
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <span className="flex-shrink-0">{getTierDot(option.tier)}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{option.name}</div>
                    {option.position && (
                      <div className="text-xs text-gray-500 truncate">{option.position}</div>
                    )}
                  </div>
                  {value === option.id && (
                    <Check className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  )}
                </button>
              </React.Fragment>
            ))}
            
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No team members found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// DATA SUMMARY COMPONENT
// =============================================================================

interface DataSummaryProps {
  context: MergeContext;
  isRealData: boolean;
  weekOffset: number;
}

const DataSummary: React.FC<DataSummaryProps> = ({ context, isRealData, weekOffset }) => {
  const periodLabel = weekOffset === 0 ? 'This Week' : 
                      weekOffset === -1 ? 'Last Week' : 
                      `${Math.abs(weekOffset)} Weeks Ago`;
  
  const categories = [
    {
      id: 'recipient',
      label: 'Recipient',
      icon: User,
      color: 'text-sky-400',
      items: [
        { label: 'Name', value: `${context.recipient.first_name} ${context.recipient.last_name}` },
        { label: 'Position', value: context.recipient.position || '—' },
        { label: 'Email', value: context.recipient.email || '—' },
      ],
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: TrendingUp,
      color: 'text-amber-400',
      items: [
        { label: 'Points', value: context.performance?.current_points ?? 0 },
        { label: 'Tier', value: `${context.performance?.tier ?? 1} (${context.performance?.tier_label || 'Priority'})` },
        { 
          label: periodLabel, 
          value: `+${context.performance?.points_gained_this_week ?? 0} / -${context.performance?.points_lost_this_week ?? 0}` 
        },
      ],
    },
    {
      id: 'time_off',
      label: 'Time Off',
      icon: Thermometer,
      color: 'text-rose-400',
      items: [
        { label: 'Sick Used', value: `${context.time_off?.sick_days_used ?? 0} / ${context.time_off?.sick_days_available ?? 3}` },
        { label: 'Remaining', value: `${context.time_off?.sick_days_remaining ?? 3} days` },
        { label: 'Vacation', value: `${context.time_off?.vacation_hours_remaining ?? 0} hrs` },
      ],
    },
    {
      id: 'period',
      label: 'Period',
      icon: Calendar,
      color: 'text-purple-400',
      items: [
        { label: 'Week', value: context.period?.start_date || '—' },
        { label: 'Cycle', value: context.periods?.current?.label || context.period?.period_label || '—' },
        { label: 'Late/Abs', value: `${context.periods?.current?.late ?? 0} / ${context.periods?.current?.absences ?? 0}` },
      ],
    },
  ];

  // Historical periods (only show if data exists)
  const showHistory = context.periods?.prev1 || context.periods?.prev2 || context.periods?.prev3;
  const historyItems = showHistory ? [
    { 
      period: context.periods?.prev1?.label || 'Prev 1',
      late: context.periods?.prev1?.late ?? 0,
      absences: context.periods?.prev1?.absences ?? 0,
    },
    { 
      period: context.periods?.prev2?.label || 'Prev 2',
      late: context.periods?.prev2?.late ?? 0,
      absences: context.periods?.prev2?.absences ?? 0,
    },
    { 
      period: context.periods?.prev3?.label || 'Prev 3',
      late: context.periods?.prev3?.late ?? 0,
      absences: context.periods?.prev3?.absences ?? 0,
    },
  ] : [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <div 
              key={cat.id}
              className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${cat.color}`} />
                <span className="text-xs font-medium text-gray-400">{cat.label}</span>
                {isRealData && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" title="Real data" />
                )}
              </div>
              <div className="space-y-1">
                {cat.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="text-gray-300 font-medium truncate ml-2">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Historical Period Data - Shows real data from previous cycles */}
      {showHistory && isRealData && (
        <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-medium text-gray-400">Previous 3 Cycles</span>
            <span className="text-[10px] text-gray-500">(from performance_cycles)</span>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" title="Real data" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {historyItems.map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="text-xs text-gray-400 mb-1 truncate" title={item.period}>
                  {item.period}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <span className="text-amber-400 font-medium">{item.late}</span>
                    <span className="text-[10px] text-gray-500 ml-1">late</span>
                  </div>
                  <div>
                    <span className="text-rose-400 font-medium">{item.absences}</span>
                    <span className="text-[10px] text-gray-500 ml-1">abs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TemplatePreview: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { organizationId, securityLevel, user, isLoading: authLoading } = useAuth();
  const { members, fetchTeamMembers } = useTeamStore();
  const { teamPerformance, fetchTeamPerformance, isLoading: perfLoading } = usePerformanceStore();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('sample');
  const [weekOffset, setWeekOffset] = useState<number>(-1); // Default to Last Week for review emails
  const [dateFormat, setDateFormat] = useState<string>('short');
  const [showContext, setShowContext] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [historicalData, setHistoricalData] = useState<{
    current: PeriodStats;
    prev1: PeriodStats;
    prev2: PeriodStats;
    prev3: PeriodStats;
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Batch send state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 });
  const [batchResults, setBatchResults] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState<'all' | 'selected'>('all');
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const recipientSelectorRef = useRef<HTMLDivElement>(null);

  // Close recipient selector on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (recipientSelectorRef.current && !recipientSelectorRef.current.contains(e.target as Node)) {
        setShowRecipientSelector(false);
      }
    };
    if (showRecipientSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRecipientSelector]);

  // Load team members and performance data
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  useEffect(() => {
    if (organizationId && teamPerformance.size === 0) {
      fetchTeamPerformance();
    }
  }, [organizationId, teamPerformance.size, fetchTeamPerformance]);

  // Fetch historical period data when member changes
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (selectedMemberId === 'sample' || !organizationId) {
        setHistoricalData(null);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const data = await fetchMemberHistoricalData(organizationId, selectedMemberId);
        setHistoricalData(data);
        console.log('[TemplatePreview] Historical data loaded:', data);
      } catch (error) {
        console.error('[TemplatePreview] Failed to fetch historical data:', error);
        setHistoricalData(null);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistoricalData();
  }, [selectedMemberId, organizationId]);

  // Active team members sorted by name
  const activeMembers = useMemo(() => 
    members
      .filter(m => m.is_active !== false)
      .sort((a, b) => a.first_name.localeCompare(b.first_name)),
    [members]
  );

  // Build recipient options for dropdown
  const recipientOptions = useMemo((): RecipientOption[] => {
    const options: RecipientOption[] = [
      { id: 'sample', name: 'Sample Data (Marcus Chen)', position: 'Grill Lead', isSample: true },
    ];
    
    activeMembers.forEach(member => {
      const perf = teamPerformance.get(member.id);
      options.push({
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        position: member.kitchen_role || undefined,
        tier: perf?.tier,
      });
    });
    
    return options;
  }, [activeMembers, teamPerformance]);

  // Build context based on selection
  const context = useMemo((): MergeContext => {
    if (selectedMemberId === 'sample') {
      // Get sample context but adjust dates for weekOffset
      const sample = getSampleContext();
      const { monday, sunday } = getWeekBounds(weekOffset);
      const formatDate = (d: Date) => formatDateByOption(d, dateFormat);
      
      return {
        ...sample,
        period: {
          ...sample.period,
          start_date: formatDate(monday),
          end_date: formatDate(sunday),
          week_label: `Week of ${monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        },
      };
    }
    
    const member = activeMembers.find(m => m.id === selectedMemberId);
    if (!member) return getSampleContext();

    const perfData = teamPerformance.get(member.id);
    
    return buildRealContext(member, perfData, weekOffset, dateFormat, 'Memphis Fire BBQ', historicalData || undefined);
  }, [selectedMemberId, activeMembers, teamPerformance, weekOffset, dateFormat, historicalData]);

  // Is this real data or sample?
  const isRealData = selectedMemberId !== 'sample' && teamPerformance.has(selectedMemberId);

  // Rendered preview
  const previewHtml = useMemo(() => {
    if (!template?.html_template) return '';
    try {
      return mergeTemplate(template.html_template, context, {
        syntax: 'guillemets',
        missingFieldBehavior: 'preserve',
      });
    } catch {
      return template.html_template;
    }
  }, [template?.html_template, context]);

  const previewSubject = useMemo(() => {
    if (!template?.subject_template) return '';
    try {
      return mergeTemplate(template.subject_template, context, {
        syntax: 'guillemets',
        missingFieldBehavior: 'preserve',
      });
    } catch {
      return template.subject_template;
    }
  }, [template?.subject_template, context]);

  // ---------------------------------------------------------------------------
  // LOAD TEMPLATE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadTemplate = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) {
          toast.error('Template not found');
          navigate('/admin/modules/communications/templates');
          return;
        }

        setTemplate(data);
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error('Failed to load template');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadTemplate();
    }
  }, [id, authLoading, navigate]);

  // ---------------------------------------------------------------------------
  // REFRESH DATA
  // ---------------------------------------------------------------------------
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetchTeamPerformance();
      // Also refresh historical data if a member is selected
      if (selectedMemberId !== 'sample' && organizationId) {
        setIsLoadingHistory(true);
        const data = await fetchMemberHistoricalData(organizationId, selectedMemberId);
        setHistoricalData(data);
        console.log('[TemplatePreview] Historical data refreshed:', data);
        setIsLoadingHistory(false);
      }
      toast.success('Data refreshed');
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SEND TEST
  // ---------------------------------------------------------------------------
  const handleSendTest = async () => {
    if (!template || !user?.email || !organizationId) {
      toast.error('Unable to send test email');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendEmail({
        organizationId,
        templateId: template.id,
        recipientEmail: user.email,
        recipientName: user.user_metadata?.full_name || 'Test User',
        context,
        triggeredBy: 'manual_test',
      });

      if (result.success) {
        toast.success(`Test email sent to ${user.email}`);
      } else {
        toast.error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Send test error:', error);
      toast.error('Failed to send test email');
    } finally {
      setIsSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SEND TO ALL - Batch send to all active team members
  // ---------------------------------------------------------------------------
  const membersWithEmail = useMemo(() => 
    activeMembers.filter(m => m.email && m.email.trim() !== ''),
    [activeMembers]
  );

  // Selected members for batch send
  const selectedMembers = useMemo(() => 
    membersWithEmail.filter(m => selectedRecipientIds.has(m.id)),
    [membersWithEmail, selectedRecipientIds]
  );

  // Toggle recipient selection
  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select/deselect all
  const toggleAllRecipients = () => {
    if (selectedRecipientIds.size === membersWithEmail.length) {
      setSelectedRecipientIds(new Set());
    } else {
      setSelectedRecipientIds(new Set(membersWithEmail.map(m => m.id)));
    }
  };

  const handleBatchSend = async () => {
    if (!template || !organizationId || !user) {
      toast.error('Unable to send emails');
      return;
    }

    // Use selected or all based on batchMode
    const recipients = batchMode === 'selected' ? selectedMembers : membersWithEmail;

    if (recipients.length === 0) {
      toast.error('No recipients selected');
      return;
    }

    setIsBatchSending(true);
    setBatchProgress({ current: 0, total: recipients.length, sent: 0, failed: 0 });
    setBatchResults(null);

    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const member = recipients[i];
      
      try {
        // Fetch historical data for this member
        const memberHistorical = await fetchMemberHistoricalData(organizationId, member.id);
        
        // Get performance data
        const perfData = teamPerformance.get(member.id);
        
        // Build personalized context
        const memberContext = buildRealContext(
          member,
          perfData,
          weekOffset,
          dateFormat,
          'Memphis Fire BBQ',
          memberHistorical
        );
        
        // Send email
        const result = await sendEmail({
          organizationId,
          templateId: template.id,
          recipientEmail: member.email!,
          recipientName: `${member.first_name} ${member.last_name}`,
          recipientId: member.id,
          context: memberContext,
          triggeredBy: 'manual_batch',
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push(`${member.first_name} ${member.last_name}: ${result.error || 'Unknown error'}`);
        }
      } catch (err) {
        failed++;
        errors.push(`${member.first_name} ${member.last_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Update progress
      setBatchProgress({ current: i + 1, total: recipients.length, sent, failed });
      
      // Rate limiting delay (100ms between sends)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Log to NEXUS
    await nexus({
      organization_id: organizationId,
      user_id: user.id,
      activity_type: 'email_batch_sent',
      details: {
        template_id: template.id,
        template_name: template.name,
        total_recipients: recipients.length,
        batch_mode: batchMode,
        sent,
        failed,
        week_offset: weekOffset,
        period: PERIOD_OPTIONS.find(p => p.value === weekOffset)?.label,
      },
    });

    setBatchResults({ sent, failed, errors });
    setIsBatchSending(false);
    setShowBatchModal(false);

    if (failed === 0) {
      toast.success(`✅ Sent ${sent} emails successfully!`);
    } else if (sent === 0) {
      toast.error(`Failed to send all ${failed} emails`);
    } else {
      toast(`Sent ${sent} emails, ${failed} failed`, { icon: '⚠️' });
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading preview..." />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Template not found</p>
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;
  const selectedMember = activeMembers.find(m => m.id === selectedMemberId);

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/Communications/TemplatePreview.tsx
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/modules/communications/templates/${id}`)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Preview: {template.name}</h1>
              <p className="text-gray-400 text-sm">
                See how your email will appear to recipients
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSendTest}
            disabled={isSending}
            className="btn-ghost"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Test to Me
          </button>
          
          {/* Multi-Select Dropdown for Selected Recipients */}
          <div className="relative" ref={recipientSelectorRef}>
            <button
              onClick={() => setShowRecipientSelector(!showRecipientSelector)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedRecipientIds.size > 0
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Users className="w-4 h-4" />
              {selectedRecipientIds.size > 0 
                ? `${selectedRecipientIds.size} Selected` 
                : 'Select Recipients'}
              <ChevronDown className={`w-3 h-3 transition-transform ${showRecipientSelector ? 'rotate-180' : ''}`} />
            </button>
            
            {showRecipientSelector && (
              <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {/* Header with Select All */}
                <div className="p-2 border-b border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Select recipients</span>
                  <button
                    onClick={toggleAllRecipients}
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    {selectedRecipientIds.size === membersWithEmail.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                {/* Recipient List */}
                <div className="max-h-[280px] overflow-y-auto">
                  {membersWithEmail.map(member => {
                    const perf = teamPerformance.get(member.id);
                    const isSelected = selectedRecipientIds.has(member.id);
                    const tierColor = perf?.tier === 1 ? 'bg-emerald-500' : perf?.tier === 2 ? 'bg-amber-500' : 'bg-rose-500';
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => toggleRecipient(member.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700/50 transition-colors ${
                          isSelected ? 'bg-primary-500/10' : ''
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected 
                            ? 'bg-primary-500 border-primary-500' 
                            : 'border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full ${tierColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {member.kitchen_role || 'Team Member'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Footer */}
                <div className="p-2 border-t border-gray-700 bg-gray-800/50">
                  <button
                    onClick={() => setShowRecipientSelector(false)}
                    className="w-full text-xs text-gray-400 hover:text-white py-1"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Send to Selected Button - Only shows when recipients selected */}
          {selectedRecipientIds.size > 0 && (
            <button
              onClick={() => {
                setBatchMode('selected');
                setShowBatchModal(true);
              }}
              className="btn-ghost border border-primary-500/30"
            >
              <Send className="w-4 h-4" />
              Send to Selected ({selectedRecipientIds.size})
            </button>
          )}
          
          <button
            onClick={() => {
              setBatchMode('all');
              setShowBatchModal(true);
            }}
            disabled={membersWithEmail.length === 0}
            className="btn-primary"
          >
            <Users className="w-4 h-4" />
            Send to All ({membersWithEmail.length})
          </button>
        </div>

        {/* Expandable Info Section */}
        <div className="expandable-info-section mt-4">
          <button
            onClick={(e) => {
              const section = e.currentTarget.closest('.expandable-info-section');
              section?.classList.toggle('expanded');
            }}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About preview mode</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-3">
              <p className="text-sm text-gray-400">
                This preview shows how your email will render with <span className="text-emerald-400 font-medium">real data</span> from your team. Select a team member to see their actual points, tier, sick days, and other metrics merged into the template.
              </p>
              <p className="text-sm text-gray-400">
                For <span className="text-amber-400 font-medium">review emails</span>, use the Period selector to show data from previous weeks.
              </p>
              <p className="text-sm text-gray-400">
                Use <span className="text-primary-400">"Send Test to Me"</span> to receive a copy at your email address.
              </p>
              {isRealData && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">Live Data Active</span>
                  <span className="text-xs text-gray-500">— Showing real performance data for {context.recipient.first_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Recipient Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Recipient:</label>
            <RecipientDropdown
              value={selectedMemberId}
              options={recipientOptions}
              onChange={setSelectedMemberId}
            />
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <label className="text-sm text-gray-400">Period:</label>
            <select
              value={weekOffset}
              onChange={(e) => setWeekOffset(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Format Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <label className="text-sm text-gray-400">Dates:</label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            >
              {DATE_FORMATS.map(fmt => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label} ({fmt.example})
                </option>
              ))}
            </select>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {selectedMemberId !== 'sample' && (
              <>
                {isLoadingHistory && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading history...
                  </span>
                )}
                <button
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Refresh performance data"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </>
            )}
            
            <button
              onClick={() => setShowContext(!showContext)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Code className="w-4 h-4" />
              {showContext ? 'Hide' : 'Show'} JSON
            </button>
          </div>
        </div>

        {/* Data Summary Cards */}
        <DataSummary context={context} isRealData={isRealData} weekOffset={weekOffset} />

        {/* Event Data Info */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/5 border border-sky-500/20">
          <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <p className="text-xs text-sky-400/80">
            <span className="font-medium">Day_X_Info fields:</span> Shows attendance events from the Point Audit Ledger. "Good" = no events that day.
          </p>
        </div>

        {/* Merge Context JSON */}
        {showContext && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-auto max-h-[300px]">
            <pre className="text-xs text-gray-300 font-mono">
              {JSON.stringify(context, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Email Preview */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        {/* Email Headers */}
        <div className="mb-4 space-y-2 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">Subject:</span>
            <span className="text-white font-medium">{previewSubject}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">To:</span>
            <span className="text-gray-300">{context.recipient.email}</span>
            {selectedMember && (
              <span className="text-xs text-gray-500">
                ({selectedMember.kitchen_role || 'Team Member'})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-16">Period:</span>
            <span className="text-gray-400 text-sm">
              {context.period?.week_label} • {PERIOD_OPTIONS.find(p => p.value === weekOffset)?.label}
            </span>
          </div>
        </div>

        {/* Email Body */}
        <div className="bg-white rounded-lg overflow-hidden">
          <iframe
            srcDoc={previewHtml}
            className="w-full border-0"
            style={{ minHeight: '600px' }}
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEND TO ALL CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isBatchSending && setShowBatchModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-[#1a1f2b] rounded-xl shadow-2xl border border-gray-700 w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {batchMode === 'selected' ? 'Send to Selected' : 'Send to All Team Members'}
                  </h2>
                  <p className="text-sm text-gray-400">{template?.name}</p>
                </div>
              </div>
              {!isBatchSending && (
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              {!isBatchSending && !batchResults ? (
                <>
                  {/* Warning */}
                  <div className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-200 font-medium">Ready to send?</p>
                      <p className="text-sm text-amber-200/70 mt-1">
                        This will send personalized emails to <span className="font-bold text-amber-200">
                          {batchMode === 'selected' ? selectedMembers.length : membersWithEmail.length}
                        </span> team member{(batchMode === 'selected' ? selectedMembers.length : membersWithEmail.length) !== 1 ? 's' : ''} with their individual performance data.
                      </p>
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Period:</span>
                      <span className="text-white font-medium">
                        {context.period?.week_label} ({PERIOD_OPTIONS.find(p => p.value === weekOffset)?.label})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Recipients:</span>
                      <span className="text-white font-medium">
                        {batchMode === 'selected' ? selectedMembers.length : membersWithEmail.length} team member{(batchMode === 'selected' ? selectedMembers.length : membersWithEmail.length) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date Format:</span>
                      <span className="text-white font-medium">
                        {DATE_FORMATS.find(f => f.value === dateFormat)?.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Recipient List Preview */}
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Recipients:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                      {(batchMode === 'selected' ? selectedMembers : membersWithEmail).slice(0, 20).map(m => (
                        <span 
                          key={m.id}
                          className="px-2 py-0.5 rounded bg-gray-700/50 text-xs text-gray-300"
                        >
                          {m.first_name}
                        </span>
                      ))}
                      {(batchMode === 'selected' ? selectedMembers : membersWithEmail).length > 20 && (
                        <span className="px-2 py-0.5 rounded bg-gray-700/50 text-xs text-gray-400">
                          +{(batchMode === 'selected' ? selectedMembers : membersWithEmail).length - 20} more
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : isBatchSending ? (
                /* Progress */
                <div className="space-y-4">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-white font-medium">Sending emails...</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {batchProgress.current} of {batchProgress.total} processed
                    </p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  {/* Live Stats */}
                  <div className="flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">{batchProgress.sent} sent</span>
                    </div>
                    {batchProgress.failed > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-400">{batchProgress.failed} failed</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : batchResults ? (
                /* Results */
                <div className="space-y-4">
                  <div className="text-center">
                    {batchResults.failed === 0 ? (
                      <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    ) : batchResults.sent === 0 ? (
                      <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
                    ) : (
                      <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    )}
                    <p className="text-white font-medium text-lg">
                      {batchResults.failed === 0 
                        ? 'All emails sent!' 
                        : batchResults.sent === 0 
                        ? 'All emails failed' 
                        : 'Partially completed'}
                    </p>
                  </div>
                  
                  <div className="flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">{batchResults.sent} sent</span>
                    </div>
                    {batchResults.failed > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-400">{batchResults.failed} failed</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Error List */}
                  {batchResults.errors.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 max-h-[120px] overflow-y-auto">
                      <p className="text-xs text-rose-400 font-medium mb-2">Errors:</p>
                      {batchResults.errors.map((err, i) => (
                        <p key={i} className="text-xs text-rose-300/80">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/30">
              {!isBatchSending && !batchResults ? (
                <>
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBatchSend}
                    className="btn-primary"
                  >
                    <Send className="w-4 h-4" />
                    Send {batchMode === 'selected' ? selectedMembers.length : membersWithEmail.length} Email{(batchMode === 'selected' ? selectedMembers.length : membersWithEmail.length) !== 1 ? 's' : ''}
                  </button>
                </>
              ) : batchResults ? (
                <button
                  onClick={() => {
                    setShowBatchModal(false);
                    setBatchResults(null);
                  }}
                  className="btn-primary"
                >
                  Done
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;
