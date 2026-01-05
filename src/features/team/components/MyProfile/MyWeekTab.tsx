/**
 * MyWeekTab - Personal Weekly Digest for Team Members
 * 
 * Shows the team member their weekly performance digest:
 * - Points this week / cycle total
 * - Current tier status
 * - Attendance percentages
 * - MVP contributions
 * - Point history ledger (expandable)
 * 
 * This is the Echo (ε) level experience - what every team member sees.
 */

import React, { useMemo, useEffect, useState } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  Sparkles,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  History,
  Filter,
  Plus,
  Minus,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

type HistoryFilter = 'all' | 'this_week' | 'this_month' | 'demerits' | 'reductions';

interface PointEvent {
  id: string;
  date: string;
  type: 'demerit' | 'reduction';
  label: string;
  points: number;
  notes?: string;
  runningBalance: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getWeekDates = (): { start: Date; end: Date; weekOf: string } => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday - 7); // Last Monday
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Last Sunday
  
  const weekOf = start.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: '2-digit',
  });
  
  return { start, end, weekOf };
};

const getTierColor = (tier: 1 | 2 | 3) => {
  switch (tier) {
    case 1: return { bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-400" };
    case 2: return { bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400" };
    case 3: return { bg: "bg-rose-500/20", border: "border-rose-500/30", text: "text-rose-400" };
  }
};

const getTierLabel = (tier: 1 | 2 | 3) => {
  switch (tier) {
    case 1: return "Excellence";
    case 2: return "Strong";
    case 3: return "Focus";
  }
};

const getTierDescription = (tier: 1 | 2 | 3) => {
  switch (tier) {
    case 1: return "Outstanding attendance and professional conduct";
    case 2: return "Maintaining solid professional standards";
    case 3: return "Working with structured support to improve";
  }
};

const getEventTypeLabel = (eventType: string): string => {
  const labels: Record<string, string> = {
    'no_call_no_show': 'No-Call / No-Show',
    'dropped_shift_no_coverage': 'Dropped Shift',
    'dropped_shift_partial': 'Dropped Shift (partial)',
    'tardiness_major': 'Late (15+ min)',
    'tardiness_minor': 'Late (5-15 min)',
    'early_departure': 'Early Departure',
    'unscheduled_absence': 'Unscheduled Absence',
    'cover_shift_urgent': 'Covered Shift (urgent)',
    'cover_shift_advance': 'Covered Shift',
    'stay_late': 'Stayed Late',
    'arrive_early': 'Arrived Early',
    'training': 'Training/Mentoring',
    'special_event': 'Special Event',
  };
  return labels[eventType] || eventType.replace(/_/g, ' ');
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

const isThisWeek = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return date >= weekAgo && date <= now;
};

const isThisMonth = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

// =============================================================================
// POINT HISTORY COMPONENT
// =============================================================================

interface PointHistoryProps {
  events: PointEvent[];
}

const PointHistory: React.FC<PointHistoryProps> = ({ events }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  // Apply filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filter === 'this_week' && !isThisWeek(event.date)) return false;
      if (filter === 'this_month' && !isThisMonth(event.date)) return false;
      if (filter === 'demerits' && event.type !== 'demerit') return false;
      if (filter === 'reductions' && event.type !== 'reduction') return false;
      return true;
    });
  }, [events, filter]);

  const filters: { id: HistoryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'demerits', label: 'Points Added' },
    { id: 'reductions', label: 'Points Reduced' },
  ];

  if (events.length === 0) {
    return (
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-300">Point History</span>
        </div>
        <p className="text-sm text-gray-500">
          No point events recorded this cycle. Keep up the great work!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-medium text-gray-300">Point History</span>
          <span className="px-2 py-0.5 rounded-full bg-gray-700 text-xs text-gray-400">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700/30">
          {/* Filters */}
          <div className="p-3 border-b border-gray-700/30 bg-gray-800/20">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    filter === f.id
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:border-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">No events match this filter</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700/30">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-3 hover:bg-gray-800/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          event.type === 'reduction' 
                            ? 'bg-emerald-500/20' 
                            : 'bg-rose-500/20'
                        }`}>
                          {event.type === 'reduction' ? (
                            <Minus className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Plus className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                        
                        {/* Details */}
                        <div>
                          <p className="text-sm font-medium text-white">
                            {event.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(event.date)}
                            {event.notes && ` • ${event.notes}`}
                          </p>
                        </div>
                      </div>
                      
                      {/* Points */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${
                          event.type === 'reduction' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {event.type === 'reduction' ? '' : '+'}{event.points}
                        </p>
                        <p className="text-xs text-gray-500">
                          Balance: {event.runningBalance}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-700/30 bg-gray-800/20">
            <p className="text-xs text-gray-500 text-center">
              Point events are tracked for the current 4-month cycle. Points reset at the start of each new cycle.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MyWeekTab: React.FC = () => {
  const { user, organizationId } = useAuth();
  const { 
    teamPerformance, 
    currentCycle, 
    config, 
    isLoading,
    fetchCurrentCycle,
    fetchTeamPerformance,
    fetchConfig,
  } = usePerformanceStore();
  
  const { weekOf } = getWeekDates();

  // Fetch performance data on mount if not already loaded
  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;
      if (teamPerformance.size === 0) {
        await fetchConfig();
        await fetchCurrentCycle();
        await fetchTeamPerformance();
      }
    };
    loadData();
  }, [organizationId, teamPerformance.size, fetchConfig, fetchCurrentCycle, fetchTeamPerformance]);

  // =============================================================================
  // LOADING STATE
  // =============================================================================

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mb-4" />
        <p className="text-gray-400 text-sm">Loading your performance data...</p>
      </div>
    );
  }
  
  // Find current user's performance data
  const performanceArray = Array.from(teamPerformance.values());
  const memberPerf = useMemo(() => {
    return performanceArray.find(p => p.team_member.email === user?.email);
  }, [performanceArray, user?.email]);

  // Calculate cycle progress
  const cycleProgress = useMemo(() => {
    if (!currentCycle) return null;
    
    const start = new Date(currentCycle.start_date);
    const end = new Date(currentCycle.end_date);
    const now = new Date();
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const percentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    
    return { 
      totalDays, 
      daysElapsed, 
      daysRemaining, 
      percentage,
      startDate: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      endDate: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  }, [currentCycle]);

  // Build point history from performance data
  const pointHistory: PointEvent[] = useMemo(() => {
    if (!memberPerf) return [];
    
    // Combine events and reductions, sort by date descending
    const events: PointEvent[] = [];
    let runningBalance = 0;
    
    // Get all point events (positive points)
    const pointEvents = memberPerf.point_events || [];
    const reductions = memberPerf.point_reductions || [];
    
    // Combine and sort by date ascending to calculate running balance
    const allEvents = [
      ...pointEvents.map((e: any) => ({ ...e, type: 'demerit' as const })),
      ...reductions.map((e: any) => ({ ...e, type: 'reduction' as const })),
    ].sort((a, b) => new Date(a.event_date || a.created_at).getTime() - new Date(b.event_date || b.created_at).getTime());
    
    // Calculate running balance and build history
    allEvents.forEach((event: any) => {
      const points = event.type === 'reduction' ? -Math.abs(event.points) : Math.abs(event.points);
      runningBalance += points;
      
      events.push({
        id: event.id,
        date: event.event_date || event.created_at,
        type: event.type,
        label: getEventTypeLabel(event.event_type || event.reduction_type),
        points: event.points,
        notes: event.notes,
        runningBalance: Math.max(0, runningBalance),
      });
    });
    
    // Return newest first
    return events.reverse();
  }, [memberPerf]);

  // =============================================================================
  // NO DATA STATE
  // =============================================================================

  if (!memberPerf) {
    return (
      <div className="space-y-6">
        {/* Info Section */}
        <div className="expandable-info-section expanded">
          <button
            onClick={(e) => {
              const section = e.currentTarget.closest('.expandable-info-section');
              section?.classList.toggle('expanded');
            }}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About My Week</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2">
              <p className="text-sm text-gray-400">
                Your weekly digest shows your attendance, points, and tier status. 
                Check back after your first tracked week to see your performance summary.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
            <Calendar className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Data Yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Your weekly performance digest will appear here once tracking begins. 
            This typically updates every Monday with the previous week's summary.
          </p>
        </div>
      </div>
    );
  }

  // =============================================================================
  // MAIN CONTENT
  // =============================================================================

  const tierColors = getTierColor(memberPerf.tier);
  const tierLabel = getTierLabel(memberPerf.tier);
  const tierDescription = getTierDescription(memberPerf.tier);
  const firstName = memberPerf.team_member.first_name || 'there';

  // Count MVP contributions (reductions in this cycle)
  const mvpContributions = memberPerf.point_reductions?.length || 0;

  // Points this week
  const pointsThisWeek = pointHistory
    .filter(e => isThisWeek(e.date) && e.type === 'demerit')
    .reduce((sum, e) => sum + e.points, 0);

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="bg-gradient-to-r from-primary-500/10 to-transparent rounded-lg border border-primary-500/20 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-700/50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {memberPerf.team_member.avatar_url ? (
              <img 
                src={memberPerf.team_member.avatar_url} 
                alt="" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-gray-400">
                {firstName[0]}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Hi {firstName}!
            </h2>
            <p className="text-gray-400 text-sm">
              This is what last week looked like for you at work.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Week of {weekOf}
            </p>
          </div>
        </div>
      </div>

      {/* Points & Tier Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Points This Week */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">This Week</span>
          </div>
          <p className="text-3xl font-bold text-white">{pointsThisWeek}</p>
          <p className="text-xs text-gray-500">points</p>
        </div>

        {/* Cycle Total */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Cycle Total</span>
          </div>
          <p className="text-3xl font-bold text-white">{memberPerf.current_points}</p>
          <p className="text-xs text-gray-500">points</p>
        </div>

        {/* Current Tier */}
        <div className={`rounded-lg border p-4 ${tierColors.bg} ${tierColors.border}`}>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Your Tier</span>
          </div>
          <p className={`text-3xl font-bold ${tierColors.text}`}>Tier {memberPerf.tier}</p>
          <p className={`text-xs ${tierColors.text}`}>{tierLabel}</p>
        </div>
      </div>

      {/* Tier Explanation */}
      <div className={`rounded-lg border p-4 ${tierColors.bg} ${tierColors.border}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            memberPerf.tier === 1 ? 'bg-emerald-500/20' :
            memberPerf.tier === 2 ? 'bg-amber-500/20' : 'bg-rose-500/20'
          }`}>
            <span className={`text-lg font-bold ${tierColors.text}`}>T{memberPerf.tier}</span>
          </div>
          <div>
            <h3 className={`text-sm font-medium ${tierColors.text}`}>
              Tier {memberPerf.tier}: {tierLabel}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{tierDescription}</p>
            {memberPerf.tier === 1 && (
              <p className="text-xs text-gray-500 mt-2">
                Benefits: Priority scheduling • Enhanced benefits • $25 meal comp
              </p>
            )}
            {memberPerf.tier === 2 && (
              <p className="text-xs text-gray-500 mt-2">
                Benefits: Standard scheduling • 50% meal discount
              </p>
            )}
            {memberPerf.tier === 3 && (
              <p className="text-xs text-gray-500 mt-2">
                Support: Coaching available • Path back to Tier 2
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cycle Progress */}
      {cycleProgress && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-300">Current Cycle</span>
            </div>
            <span className="text-xs text-gray-500">
              {cycleProgress.daysRemaining} days until reset
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-500"
                style={{ width: `${cycleProgress.percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {cycleProgress.startDate} — {cycleProgress.endDate}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Points reset to zero at the start of each 4-month cycle. Fresh start coming soon!
          </p>
        </div>
      )}

      {/* MVP Contributions */}
      <div className="bg-lime-500/10 rounded-lg border border-lime-500/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-lime-400" />
          <span className="text-sm font-medium text-lime-300">Team MVP Contributions</span>
        </div>
        {mvpContributions > 0 ? (
          <p className="text-sm text-gray-300">
            🤝 Thanks for helping the team out <strong className="text-white">{mvpContributions} time{mvpContributions !== 1 ? 's' : ''}</strong> this cycle!
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            Cover a shift, stay late, or arrive early to earn point reductions and help your team.
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Team assists can reduce your points by 1-2 each (max {config.max_reduction_per_30_days || 3} per 30 days).
        </p>
      </div>

      {/* Coaching Status (if applicable) */}
      {memberPerf.coaching_stage && memberPerf.coaching_stage >= 1 && (
        <div className="bg-amber-500/10 rounded-lg border border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Coaching in Progress</span>
          </div>
          <p className="text-sm text-gray-300">
            You're currently at Stage {memberPerf.coaching_stage} coaching. Your supervisor will schedule 
            a supportive conversation to discuss how we can help you succeed.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            This is about support, not punishment. We want you to succeed here.
          </p>
        </div>
      )}

      {/* Point History Ledger */}
      <PointHistory events={pointHistory} />

      {/* Being Present Section */}
      <div className="bg-gray-800/20 rounded-lg border border-gray-700/30 p-5">
        <h3 className="text-base font-semibold text-white mb-3">Being Present Matters</h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Every shift you show up with intention is an investment in your story. 
          When you're here — truly here, mind and heart engaged — you're not just filling 
          a position, you're investing in your craft, building your connections, and 
          contributing to a story worth sharing.
        </p>
        <p className="text-sm text-gray-500 mt-3 italic">
          Be present. Be purposeful. Be brilliant, never bland.
        </p>
      </div>

      {/* Quick Reminder */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4">
        <h4 className="text-sm font-medium text-white mb-2">Questions About Your Attendance?</h4>
        <p className="text-xs text-gray-400">
          If anything seems unclear — your points, your tier status, how the reset cycle works, 
          or how to reduce points — check the 7Shifts announcements or ask your supervisor. 
          We want you to understand the system so you can succeed within it.
        </p>
      </div>
    </div>
  );
};

export default MyWeekTab;
