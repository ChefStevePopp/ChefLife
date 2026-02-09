/**
 * GapScannerTab - Attendance Gap Audit Tool
 * 
 * Surfaces scheduled shifts with no matching worked shift AND no NEXUS decision.
 * Allows Alpha (excuse/sick day) or Omega (demerit) resolution inline.
 * 
 * L5 Design: Tablet-first, 44px+ touch targets, subheader pattern.
 * Dates via dateUtils.ts, times via date.ts — NEVER raw SQL formatting.
 */

import React, { useState, useMemo } from "react";
import {
  Search as SearchIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Thermometer,
  Shield,
  Clock,
  Calendar,
  Users,
  Filter,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTeamStore } from "@/stores/teamStore";
import { usePerformanceStore } from "@/stores/performanceStore";
import { nexus } from "@/lib/nexus";
import { supabase } from "@/lib/supabase";
import {
  formatDateForDisplay,
  formatDateShort,
  formatDateLong,
  getLocalDateString,
  getRelativeDateLabel,
} from "@/utils/dateUtils";
import { formatTime } from "@/utils/date";
import { useShiftGaps, formatShiftTime, type ResolvedGap, type GapResolution } from "../hooks/useShiftGaps";
import toast from "react-hot-toast";

// =============================================================================
// CONSTANTS
// =============================================================================

const EXCUSE_REASONS = [
  { value: "SICK OK", label: "Sick Day (ESA)", icon: Thermometer, className: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400" },
  { value: "SCHEDULE CHANGE", label: "Schedule Change", icon: Calendar, className: "bg-primary-500/10 hover:bg-primary-500/20 border-primary-500/30 text-primary-400" },
  { value: "EXCUSED ABSENCE", label: "Excused Absence", icon: CheckCircle, className: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400" },
  { value: "SENT HOME", label: "Sent Home Early", icon: Clock, className: "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-400" },
] as const;

const DEMERIT_TYPES = [
  { value: "no_call_no_show", label: "No-Call / No-Show", points: 4, color: "rose" },
  { value: "unexcused_absence", label: "Unexcused Absence", points: 3, color: "orange" },
  { value: "dropped_shift_no_coverage", label: "Dropped Shift (No Coverage)", points: 3, color: "amber" },
] as const;

// =============================================================================
// RESOLUTION STATUS BADGE
// =============================================================================

const ResolutionBadge: React.FC<{ resolution: GapResolution; reason?: string }> = ({
  resolution,
  reason,
}) => {
  switch (resolution) {
    case "excused":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-3.5 h-3.5" />
          {reason || "Excused"}
        </span>
      );
    case "sick_day":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Thermometer className="w-3.5 h-3.5" />
          Sick Day
        </span>
      );
    case "demerit":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3.5 h-3.5" />
          Demerit
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          Unresolved
        </span>
      );
  }
};

// =============================================================================
// GAP CARD — Individual gap with inline decision actions
// =============================================================================

interface GapCardProps {
  gap: ResolvedGap;
  onResolve: (gap: ResolvedGap, decision: 'excuse' | 'demerit', details: Record<string, any>) => Promise<void>;
  isResolving: boolean;
}

const GapCard: React.FC<GapCardProps> = ({ gap, onResolve, isResolving }) => {
  const [expanded, setExpanded] = useState(false);
  const [actionMode, setActionMode] = useState<'none' | 'excuse' | 'demerit'>('none');
  const [notes, setNotes] = useState('');

  const fullName = `${gap.employee_first_name} ${gap.employee_last_name}`;
  const isResolved = gap.resolution !== 'unresolved';

  // Format times using date.ts (handles timezone correctly)
  const timeIn = formatShiftTime(gap.scheduled_time_in);
  const timeOut = formatShiftTime(gap.scheduled_time_out);

  // Format date using dateUtils (safe from UTC shift)
  const dateDisplay = formatDateForDisplay(gap.shift_date);
  const dateLong = formatDateLong(gap.shift_date);
  const relativeLabel = getRelativeDateLabel(gap.shift_date);

  const handleExcuse = async (reason: string) => {
    await onResolve(gap, 'excuse', { reason, notes });
    setActionMode('none');
    setNotes('');
  };

  const handleDemerit = async (eventType: string, points: number) => {
    await onResolve(gap, 'demerit', { event_type: eventType, points, notes });
    setActionMode('none');
    setNotes('');
  };

  return (
    <div className={`rounded-lg border transition-all duration-200 ${
      isResolved
        ? 'bg-gray-800/30 border-gray-700/30 opacity-75'
        : 'bg-gray-800/50 border-orange-500/30 hover:border-orange-500/50'
    }`}>
      {/* Main row — always visible */}
      <div 
        className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer min-h-[56px]"
        onClick={() => !isResolving && setExpanded(!expanded)}
      >
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isResolved ? 'bg-gray-600' : 'bg-orange-400 animate-pulse'
        }`} />

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white text-sm sm:text-base truncate">
              {fullName}
            </span>
            {gap.role && (
              <span className="px-2 py-0.5 rounded text-2xs font-medium uppercase tracking-wide bg-gray-700/50 text-gray-400 border border-gray-600/30">
                {gap.role}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <span>{relativeLabel || dateDisplay}</span>
            <span className="text-gray-600">·</span>
            <span>{timeIn} – {timeOut}</span>
            <span className="text-gray-600">·</span>
            <span>{gap.scheduled_hours}h</span>
          </div>
        </div>

        {/* Resolution badge */}
        <ResolutionBadge
          resolution={gap.resolution}
          reason={gap.resolution_details?.reason}
        />

        {/* Expand chevron */}
        {!isResolved && (
          <div className="flex-shrink-0 text-gray-500">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* Expanded action panel */}
      {expanded && !isResolved && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-700/30 pt-3 space-y-3">
          {/* Context bar */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{dateLong}</span>
            {gap.scheduled_pay && (
              <>
                <span className="text-gray-600">·</span>
                <span>${Number(gap.scheduled_pay).toFixed(2)} scheduled</span>
              </>
            )}
          </div>

          {/* Action mode selector */}
          {actionMode === 'none' && (
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setActionMode('excuse'); }}
                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg
                           bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30
                           text-emerald-400 text-sm font-medium transition-colors"
                disabled={isResolving}
              >
                <Shield className="w-4 h-4" />
                Alpha (Excuse)
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActionMode('demerit'); }}
                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg
                           bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30
                           text-rose-400 text-sm font-medium transition-colors"
                disabled={isResolving}
              >
                <AlertTriangle className="w-4 h-4" />
                Omega (Demerit)
              </button>
            </div>
          )}

          {/* Excuse options */}
          {actionMode === 'excuse' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Select Reason</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setActionMode('none'); }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Back
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EXCUSE_REASONS.map(reason => {
                  const Icon = reason.icon;
                  return (
                    <button
                      key={reason.value}
                      onClick={(e) => { e.stopPropagation(); handleExcuse(reason.value); }}
                      disabled={isResolving}
                      className={`flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-lg text-sm
                                 border transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 ${reason.className}`}
                    >
                      {isResolving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span className="text-left">{reason.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Demerit options */}
          {actionMode === 'demerit' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-400 uppercase tracking-wide">Select Infraction</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setActionMode('none'); }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Back
                </button>
              </div>
              <div className="space-y-2">
                {DEMERIT_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={(e) => { e.stopPropagation(); handleDemerit(type.value, type.points); }}
                    disabled={isResolving}
                    className="w-full flex items-center justify-between min-h-[44px] px-3 py-2 rounded-lg text-sm
                               bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 
                               text-rose-400 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-left">{type.label}</span>
                    <span className="text-xs font-medium bg-rose-500/20 px-2 py-0.5 rounded">
                      +{type.points} pts
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes (shown when in action mode) */}
          {actionMode !== 'none' && (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Optional notes..."
                rows={2}
                className="input w-full resize-none text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// GAP SCANNER TAB
// =============================================================================

export const GapScannerTab: React.FC = () => {
  const { organizationId, user } = useAuth();
  const { members } = useTeamStore();
  const { fetchTeamPerformance } = usePerformanceStore();

  const [filterView, setFilterView] = useState<'unresolved' | 'all'>('unresolved');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const { gaps, stats, isLoading, error, refetch } = useShiftGaps();

  // Filter gaps based on view
  const displayGaps = useMemo(() => {
    if (filterView === 'unresolved') {
      return gaps.filter(g => g.resolution === 'unresolved');
    }
    return gaps;
  }, [gaps, filterView]);

  // Group by team member for cleaner display
  const groupedGaps = useMemo(() => {
    const groups = new Map<string, ResolvedGap[]>();
    for (const gap of displayGaps) {
      const key = gap.team_member_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(gap);
    }
    return groups;
  }, [displayGaps]);

  // Handle resolution
  const handleResolve = async (
    gap: ResolvedGap,
    decision: 'excuse' | 'demerit',
    details: Record<string, any>
  ) => {
    if (!organizationId || !user) return;

    setResolvingId(gap.scheduled_shift_id);

    try {
      const fullName = `${gap.employee_first_name} ${gap.employee_last_name}`;

      if (decision === 'excuse') {
        // Log via NEXUS as excused event
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: details.reason === 'SICK OK' 
            ? 'performance_event_excused' 
            : 'performance_event_excused',
          details: {
            team_member_id: gap.team_member_id,
            name: fullName,
            event_type: details.reason === 'SICK OK' ? 'sick_day_manual' : 'excused_absence',
            reason: details.reason,
            event_date: gap.shift_date,
            notes: details.notes || undefined,
            source: 'gap_scanner',
            shift_role: gap.role,
            scheduled_hours: gap.scheduled_hours,
          },
        });

        toast.success(`${gap.employee_first_name}: ${details.reason}`);
      } else {
        // Log via NEXUS as approved demerit
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'performance_event_approved',
          details: {
            team_member_id: gap.team_member_id,
            name: fullName,
            event_type: details.event_type,
            points: details.points,
            event_date: gap.shift_date,
            notes: details.notes || undefined,
            source: 'gap_scanner',
            shift_role: gap.role,
            scheduled_hours: gap.scheduled_hours,
          },
        });

        // Also insert the actual point event for the performance system
        const { error: pointError } = await supabase
          .from('point_events')
          .insert({
            organization_id: organizationId,
            team_member_id: gap.team_member_id,
            event_type: details.event_type,
            points: details.points,
            event_date: gap.shift_date,
            notes: details.notes || `Gap Scanner: ${fullName} - ${gap.shift_date} (${gap.role})`,
          });

        if (pointError) {
          console.error('Error inserting point event:', pointError);
          // Don't throw — NEXUS already logged it
        }

        toast.success(`${gap.employee_first_name}: +${details.points} points (${details.event_type.replace(/_/g, ' ')})`);
      }

      // Refresh gaps and performance data
      await Promise.all([
        refetch(),
        fetchTeamPerformance(),
      ]);
    } catch (err) {
      console.error('Error resolving gap:', err);
      toast.error('Failed to resolve gap');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-header */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon">
              <SearchIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="subheader-title">Gap Scanner</h3>
              <p className="subheader-subtitle">
                Scheduled shifts with no matching worked record
              </p>
            </div>
          </div>

          <div className="subheader-right">
            {/* Filter toggle */}
            <button
              onClick={() => setFilterView(filterView === 'unresolved' ? 'all' : 'unresolved')}
              className={`subheader-toggle ${filterView === 'all' ? 'active primary' : ''}`}
            >
              <div className="subheader-toggle-icon">
                <Eye className="w-4 h-4" />
              </div>
              <span className="subheader-toggle-label">
                {filterView === 'all' ? 'All' : 'Open'}
              </span>
            </button>

            {/* Stats */}
            <div className="subheader-stat">
              <span className="subheader-stat-label">Open</span>
              <span className={`subheader-stat-value ${
                stats.unresolved > 0 ? 'text-orange-400' : 'text-emerald-400'
              }`}>
                {stats.unresolved}
              </span>
            </div>
            <div className="subheader-stat">
              <span className="subheader-stat-label">Total</span>
              <span className="subheader-stat-value">{stats.total}</span>
            </div>

            {/* Refresh */}
            <button
              onClick={refetch}
              disabled={isLoading}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Info section */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          {showInfo ? 'Hide' : 'How it works'}
        </button>
        {showInfo && (
          <div className="mx-3 mb-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg text-xs text-primary-300 space-y-1">
            <p>The Gap Scanner compares <strong>scheduled shifts</strong> against <strong>worked shifts</strong> from 7shifts data.</p>
            <p>When someone was scheduled but has no matching worked record, it surfaces here as a gap.</p>
            <p><strong>Alpha (Excuse):</strong> Sick day, schedule change, or excused absence — no points.</p>
            <p><strong>Omega (Demerit):</strong> No-call/no-show, unexcused absence — adds points to their record.</p>
            <p>Decisions are logged to NEXUS with a complete audit trail.</p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && gaps.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Scanning for attendance gaps...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-sm text-rose-400">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && displayGaps.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {filterView === 'unresolved' 
              ? 'All attendance gaps have been resolved.' 
              : 'No attendance gaps found in the current data.'}
          </p>
          {filterView === 'unresolved' && stats.total > 0 && (
            <button
              onClick={() => setFilterView('all')}
              className="mt-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              View all {stats.total} gaps →
            </button>
          )}
        </div>
      )}

      {/* Gap list — grouped by member */}
      {!isLoading && displayGaps.length > 0 && (
        <div className="space-y-4">
          {Array.from(groupedGaps.entries()).map(([memberId, memberGaps]) => {
            const first = memberGaps[0];
            const memberUnresolved = memberGaps.filter(g => g.resolution === 'unresolved').length;

            return (
              <div key={memberId} className="space-y-2">
                {/* Member header (only if multiple people) */}
                {groupedGaps.size > 1 && (
                  <div className="flex items-center gap-2 px-1">
                    <Users className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {first.employee_first_name} {first.employee_last_name}
                    </span>
                    {memberUnresolved > 0 && (
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        {memberUnresolved} open
                      </span>
                    )}
                  </div>
                )}

                {/* Gap cards */}
                {memberGaps.map(gap => (
                  <GapCard
                    key={gap.scheduled_shift_id}
                    gap={gap}
                    onResolve={handleResolve}
                    isResolving={resolvingId === gap.scheduled_shift_id}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary bar (when there are unresolved gaps) */}
      {stats.unresolved > 0 && (
        <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg flex items-center justify-between text-xs text-gray-500">
          <span>
            {stats.unresolved} unresolved gap{stats.unresolved !== 1 ? 's' : ''} · {stats.unresolvedHours.toFixed(1)} hours
            {stats.unresolvedPay > 0 && ` · $${stats.unresolvedPay.toFixed(2)}`}
          </span>
          <span>
            {stats.excused} excused · {stats.demerits} demerit{stats.demerits !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default GapScannerTab;
