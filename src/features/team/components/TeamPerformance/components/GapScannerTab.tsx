/**
 * GapScannerTab - Absence Ledger (Alpha-Only)
 * 
 * The Owner's quiet repair shop — same tools as TeamTab, sequestered space.
 * Detects scheduled shifts with no matching worked shift, then uses the
 * SAME decision workflow as TeamTab: approve / reclassify / excuse / reject.
 * 
 * Architecture: Same truth pipeline, different access point.
 * - Batch save pattern (queue locally → floating action bar → Save All)
 * - Full demerit options (9 types, matching TeamTab exactly)
 * - Full excuse options (8 types, matching TeamTab exactly)
 * - Undo capability per decision
 * - Writes to performance_point_events / performance_point_reductions
 * - Cycle management via ensureCycleExists
 * - NEXUS audit trail (batch + individual logs)
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
  CalendarCheck,
  Users,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  Eye,
  Check,
  X,
  Pencil,
  Save,
  Undo2,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTeamStore } from "@/stores/teamStore";
import { usePerformanceStore } from "@/stores/performanceStore";
import { nexus } from "@/lib/nexus";
import { supabase } from "@/lib/supabase";
import {
  formatDateForDisplay,
  formatDateLong,
  getRelativeDateLabel,
} from "@/utils/dateUtils";
import { useShiftGaps, formatShiftTime, type ResolvedGap } from "../hooks/useShiftGaps";
import { ActionLegend } from "./ActionLegend";
import { TwoStageButton } from "@/components/ui/TwoStageButton";
import toast from "react-hot-toast";

// =============================================================================
// TYPES — Mirrors TeamTab's PendingAction pattern
// =============================================================================

interface GapPendingAction {
  gapId: string; // scheduled_shift_id
  type: 'approve' | 'approve_modified' | 'reject' | 'excuse';
  gap: ResolvedGap;
  modification?: { event_type: string; points: number };
  excuseReason?: string;
  label: string;
}

interface CycleInfo {
  id: string;
  start_date: string;
  end_date: string;
}

// =============================================================================
// CONSTANTS — Same options as TeamTab (single source of truth)
// =============================================================================

const DEMERIT_OPTIONS = [
  { id: 'no_call_no_show', label: 'No-Call / No-Show', points: 6 },
  { id: 'dropped_shift_no_coverage', label: 'Dropped Shift (no coverage)', points: 4 },
  { id: 'unexcused_absence', label: 'Unexcused Absence', points: 2 },
  { id: 'tardiness_major', label: 'Late (15+ min)', points: 2 },
  { id: 'tardiness_minor', label: 'Late (5-15 min)', points: 1 },
  { id: 'early_departure', label: 'Early Departure', points: 2 },
  { id: 'late_notification', label: 'Late Notification (<4 hrs)', points: 1 },
  { id: 'food_safety_violation', label: 'Food Safety Violation', points: 3 },
  { id: 'insubordination', label: 'Insubordination', points: 3 },
];

const EXCUSE_OPTIONS = [
  { id: 'SICK OK', label: 'Sick (ESA Protected)' },
  { id: 'LATE OK', label: 'Approved Late Arrival' },
  { id: 'EARLY DEPART OK', label: 'Approved Early Departure' },
  { id: 'ABSENT OK', label: 'Approved Absence' },
  { id: 'BEREAVEMENT', label: 'Bereavement Leave' },
  { id: 'JURY DUTY', label: 'Jury Duty' },
  { id: 'EMERGENCY', label: 'Family Emergency' },
  { id: 'OTHER', label: 'Other' },
];

// Default suggestion for gaps: unexcused_absence at 2 pts
const DEFAULT_GAP_SUGGESTION = {
  event_type: 'unexcused_absence',
  points: 2,
};

// =============================================================================
// CYCLE HELPERS — Same as TeamTab
// =============================================================================

const calculateCycleBoundaries = (
  eventDate: string,
  cycleType: 'quadmester' | 'trimester' | 'custom' = 'quadmester'
): { start: string; end: string; name: string } => {
  const date = new Date(eventDate);
  const year = date.getFullYear();
  const month = date.getMonth();

  if (cycleType === 'quadmester') {
    if (month <= 3) {
      return { start: `${year}-01-01`, end: `${year}-04-30`, name: `Q1 ${year} (Jan-Apr)` };
    } else if (month <= 7) {
      return { start: `${year}-05-01`, end: `${year}-08-31`, name: `Q2 ${year} (May-Aug)` };
    } else {
      return { start: `${year}-09-01`, end: `${year}-12-31`, name: `Q3 ${year} (Sep-Dec)` };
    }
  } else if (cycleType === 'trimester') {
    if (month <= 2) {
      return { start: `${year}-01-01`, end: `${year}-03-31`, name: `T1 ${year} (Jan-Mar)` };
    } else if (month <= 5) {
      return { start: `${year}-04-01`, end: `${year}-06-30`, name: `T2 ${year} (Apr-Jun)` };
    } else if (month <= 8) {
      return { start: `${year}-07-01`, end: `${year}-09-30`, name: `T3 ${year} (Jul-Sep)` };
    } else {
      return { start: `${year}-10-01`, end: `${year}-12-31`, name: `T4 ${year} (Oct-Dec)` };
    }
  }

  return calculateCycleBoundaries(eventDate, 'quadmester');
};

const ensureCycleExists = async (
  organizationId: string,
  eventDate: string
): Promise<{ cycle: CycleInfo; name: string } | null> => {
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('modules')
      .eq('id', organizationId)
      .single();

    const cycleType = org?.modules?.team_performance?.config?.cycleType || 'quadmester';
    const { start, end, name } = calculateCycleBoundaries(eventDate, cycleType);

    const { data: existing } = await supabase
      .from('performance_cycles')
      .select('id, start_date, end_date')
      .eq('organization_id', organizationId)
      .eq('start_date', start)
      .eq('end_date', end)
      .single();

    if (existing) {
      return { cycle: existing as CycleInfo, name };
    }

    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const isCurrent = now >= startDate && now <= endDate;

    if (isCurrent) {
      await supabase
        .from('performance_cycles')
        .update({ is_current: false })
        .eq('organization_id', organizationId)
        .eq('is_current', true);
    }

    const { data: newCycle, error } = await supabase
      .from('performance_cycles')
      .insert({
        organization_id: organizationId,
        start_date: start,
        end_date: end,
        is_current: isCurrent,
      })
      .select('id, start_date, end_date')
      .single();

    if (error) {
      console.error('Error creating cycle:', error);
      return null;
    }

    return { cycle: newCycle as CycleInfo, name };
  } catch (err) {
    console.error('Error in ensureCycleExists:', err);
    return null;
  }
};

// =============================================================================
// GAP EVENT ROW — Mirrors TeamTab's StagedEventRow exactly
// =============================================================================

const GapEventRow: React.FC<{
  gap: ResolvedGap;
  decidedAction?: GapPendingAction;
  onApprove: (modification?: { event_type: string; points: number }) => void;
  onReject: () => void;
  onExcuse: (reason: string) => void;
  onUndo?: () => void;
}> = ({ gap, decidedAction, onApprove, onReject, onExcuse, onUndo }) => {
  const [mode, setMode] = useState<'default' | 'modify' | 'excuse'>('default');
  const [selectedEventType, setSelectedEventType] = useState(DEFAULT_GAP_SUGGESTION.event_type);
  const [selectedPoints, setSelectedPoints] = useState(DEFAULT_GAP_SUGGESTION.points);
  const [excuseReason, setExcuseReason] = useState('');

  const timeIn = formatShiftTime(gap.scheduled_time_in);
  const timeOut = formatShiftTime(gap.scheduled_time_out);
  const dateDisplay = formatDateForDisplay(gap.shift_date);
  const relativeLabel = getRelativeDateLabel(gap.shift_date);

  const handleEventTypeChange = (eventType: string) => {
    const option = DEMERIT_OPTIONS.find(o => o.id === eventType);
    if (option) {
      setSelectedEventType(eventType);
      setSelectedPoints(option.points);
    }
  };

  const resetToDefault = () => {
    setMode('default');
    setSelectedEventType(DEFAULT_GAP_SUGGESTION.event_type);
    setSelectedPoints(DEFAULT_GAP_SUGGESTION.points);
    setExcuseReason('');
  };

  const isModifyReady = selectedEventType !== DEFAULT_GAP_SUGGESTION.event_type;
  const isExcuseReady = excuseReason !== '';

  // ---- DECIDED STATE: show decision summary + undo ----
  if (decidedAction) {
    const decisionColors: Record<string, string> = {
      approve: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      approve_modified: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      reject: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      excuse: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    };
    const decisionIcons: Record<string, React.ReactNode> = {
      approve: <Check className="w-4 h-4 text-emerald-400" />,
      approve_modified: <Pencil className="w-4 h-4 text-emerald-400" />,
      reject: <X className="w-4 h-4 text-rose-400" />,
      excuse: <Shield className="w-4 h-4 text-amber-400" />,
    };
    const colorClass = decisionColors[decidedAction.type] || 'text-gray-400 bg-gray-700/20 border-gray-700/30';

    return (
      <div className={`flex items-center justify-between p-2 rounded-lg border ${colorClass} opacity-75`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {decisionIcons[decidedAction.type]}
          <div className="min-w-0">
            <p className="text-sm truncate">
              {relativeLabel || dateDisplay} · {timeIn}–{timeOut} · {gap.scheduled_hours}h
              {gap.role && <span className="text-gray-500"> · {gap.role}</span>}
            </p>
            <p className="text-xs opacity-60 mt-0.5">
              {decidedAction.type === 'approve' && `Approved: unexcused absence (+${DEFAULT_GAP_SUGGESTION.points} pts)`}
              {decidedAction.type === 'approve_modified' && `Reclassified: ${decidedAction.modification?.event_type.replace(/_/g, ' ')} (${(decidedAction.modification?.points ?? 0) > 0 ? '+' : ''}${decidedAction.modification?.points} pts)`}
              {decidedAction.type === 'reject' && 'Dismissed — data error, no action taken'}
              {decidedAction.type === 'excuse' && `Excused: ${decidedAction.excuseReason}`}
            </p>
          </div>
        </div>
        {onUndo && (
          <button
            onClick={(e) => { e.stopPropagation(); onUndo(); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
            title="Undo this decision"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        )}
      </div>
    );
  }

  // ---- DEFAULT STATE: full action buttons ----
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/20">
      {/* Gap Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TrendingUp className="w-4 h-4 text-orange-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-gray-300 truncate">
            {relativeLabel || dateDisplay} · {timeIn}–{timeOut} · {gap.scheduled_hours}h
          </p>
          <p className="text-xs text-gray-500">
            {gap.role || 'No role'} · Scheduled, no matching worked record
          </p>
        </div>
      </div>

      {/* Actions Area */}
      <div className="flex items-center gap-2 ml-3">

        {/* DEFAULT MODE */}
        {mode === 'default' && (
          <>
            <span className="px-2 py-0.5 rounded text-sm font-medium text-amber-400">
              +{DEFAULT_GAP_SUGGESTION.points} pts
            </span>

            <button
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-emerald-400 transition-colors"
              title={`Accept as unexcused absence (+${DEFAULT_GAP_SUGGESTION.points} pts)`}
            >
              <Check className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setMode('modify'); }}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-primary-400 transition-colors"
              title="Reclassify — change event type"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setMode('excuse'); }}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-amber-400 transition-colors"
              title="Excuse — no points"
            >
              <Shield className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-rose-400 transition-colors"
              title="Dismiss — data error"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        {/* MODIFY MODE */}
        {mode === 'modify' && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <select
              value={selectedEventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="input text-xs py-1 min-w-[200px]"
              autoFocus
            >
              <option value={DEFAULT_GAP_SUGGESTION.event_type} disabled>Select new type...</option>
              {DEMERIT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label} ({opt.points} pts)</option>
              ))}
            </select>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isModifyReady) onApprove({ event_type: selectedEventType, points: selectedPoints });
              }}
              disabled={!isModifyReady}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                isModifyReady ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-500'
              }`}
              title={isModifyReady ? `Confirm: ${selectedEventType.replace(/_/g, ' ')} (+${selectedPoints} pts)` : 'Select an event type'}
            >
              <Check className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); resetToDefault(); }}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* EXCUSE MODE */}
        {mode === 'excuse' && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <select
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              className="input text-xs py-1 min-w-[180px]"
              autoFocus
            >
              <option value="" disabled>Select reason...</option>
              {EXCUSE_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isExcuseReady) { onExcuse(excuseReason); resetToDefault(); }
              }}
              disabled={!isExcuseReady}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                isExcuseReady ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-500'
              }`}
              title={isExcuseReady ? `Excuse: ${excuseReason}` : 'Select a reason'}
            >
              <Check className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); resetToDefault(); }}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// GAP SCANNER TAB — Alpha-Only, Same Tools as TeamTab
// =============================================================================

export const GapScannerTab: React.FC = () => {
  const { organizationId, user } = useAuth();
  const { members } = useTeamStore();
  const { fetchTeamPerformance } = usePerformanceStore();

  const [filterView, setFilterView] = useState<'unresolved' | 'all'>('unresolved');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Batch action state (dirty state pattern — mirrors TeamTab)
  const [pendingActions, setPendingActions] = useState<GapPendingAction[]>([]);
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  const { gaps, stats, isLoading, error, refetch } = useShiftGaps();

  // Build member lookup for avatars
  const memberLookup = useMemo(() => {
    const map = new Map<string, typeof members[0]>();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members]);

  // Filter gaps based on view
  const displayGaps = useMemo(() => {
    if (filterView === 'unresolved') {
      return gaps.filter(g => g.resolution === 'unresolved');
    }
    return gaps;
  }, [gaps, filterView]);

  // Group by team member
  const groupedGaps = useMemo(() => {
    const groups = new Map<string, ResolvedGap[]>();
    for (const gap of displayGaps) {
      const key = gap.team_member_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(gap);
    }
    return groups;
  }, [displayGaps]);

  // =============================================================================
  // QUEUE ACTIONS (local state — no DB writes until Save)
  // =============================================================================

  const getGapName = (gap: ResolvedGap) => `${gap.employee_first_name} ${gap.employee_last_name}`;

  const queueApproval = (gap: ResolvedGap, modification?: { event_type: string; points: number }) => {
    const points = modification?.points ?? DEFAULT_GAP_SUGGESTION.points;
    const eventType = modification?.event_type || DEFAULT_GAP_SUGGESTION.event_type;
    const isModified = modification !== undefined;
    const name = getGapName(gap);

    setPendingActions(prev => [
      ...prev.filter(a => a.gapId !== gap.scheduled_shift_id),
      {
        gapId: gap.scheduled_shift_id,
        type: isModified ? 'approve_modified' : 'approve',
        gap,
        modification,
        label: `${name}: ${eventType.replace(/_/g, ' ')} (+${points} pts)${isModified ? ' ✎' : ''}`,
      },
    ]);
  };

  const queueRejection = (gap: ResolvedGap) => {
    const name = getGapName(gap);
    setPendingActions(prev => [
      ...prev.filter(a => a.gapId !== gap.scheduled_shift_id),
      {
        gapId: gap.scheduled_shift_id,
        type: 'reject',
        gap,
        label: `${name}: dismissed (data error)`,
      },
    ]);
  };

  const queueExcuse = (gap: ResolvedGap, reason: string) => {
    const name = getGapName(gap);
    setPendingActions(prev => [
      ...prev.filter(a => a.gapId !== gap.scheduled_shift_id),
      {
        gapId: gap.scheduled_shift_id,
        type: 'excuse',
        gap,
        excuseReason: reason,
        label: `${name}: excused (${reason})`,
      },
    ]);
  };

  const undoAction = (gapId: string) => {
    setPendingActions(prev => prev.filter(a => a.gapId !== gapId));
  };

  const discardAllActions = () => {
    setPendingActions([]);
  };

  // Pending action lookup
  const pendingActionMap = useMemo(() => {
    const map = new Map<string, GapPendingAction>();
    pendingActions.forEach(a => map.set(a.gapId, a));
    return map;
  }, [pendingActions]);

  // Progress tracking
  const unresolvedGaps = useMemo(() => gaps.filter(g => g.resolution === 'unresolved'), [gaps]);
  const totalUnresolved = unresolvedGaps.length;
  const reviewedCount = pendingActions.length;
  const allReviewed = totalUnresolved > 0 && reviewedCount === totalUnresolved;
  const hasAnyReviewed = reviewedCount > 0;
  const unreviewedCount = totalUnresolved - reviewedCount;

  // =============================================================================
  // BATCH SAVE — Commits all queued actions to database
  // Same pattern as TeamTab: cycle management + performance tables + NEXUS
  // =============================================================================

  const commitSingleAction = async (action: GapPendingAction): Promise<{ success: boolean; error?: string }> => {
    if (!organizationId || !user) return { success: false, error: 'No auth context' };

    const { gap } = action;
    const fullName = getGapName(gap);

    try {
      // ----- REJECT: just log to NEXUS as dismissed -----
      if (action.type === 'reject') {
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'performance_event_rejected',
          details: {
            team_member_id: gap.team_member_id,
            name: fullName,
            event_type: 'attendance_gap',
            event_date: gap.shift_date,
            reason: 'DATA_ERROR',
            source: 'absence_ledger',
            shift_role: gap.role,
            scheduled_hours: gap.scheduled_hours,
          },
        });
        return { success: true };
      }

      // ----- EXCUSE: log to NEXUS -----
      if (action.type === 'excuse') {
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'performance_event_excused',
          details: {
            team_member_id: gap.team_member_id,
            name: fullName,
            event_type: action.excuseReason?.includes('SICK') ? 'sick_day_manual' : 'excused_absence',
            reason: action.excuseReason,
            event_date: gap.shift_date,
            source: 'absence_ledger',
            shift_role: gap.role,
            scheduled_hours: gap.scheduled_hours,
          },
        });
        return { success: true };
      }

      // ----- APPROVE / APPROVE_MODIFIED: find cycle → insert → NEXUS -----
      const eventType = action.modification?.event_type || DEFAULT_GAP_SUGGESTION.event_type;
      const points = action.modification?.points ?? DEFAULT_GAP_SUGGESTION.points;

      // Find or create the appropriate cycle
      let { data: existingCycle, error: cycleError } = await supabase
        .from('performance_cycles')
        .select('id, start_date, end_date')
        .eq('organization_id', organizationId)
        .lte('start_date', gap.shift_date)
        .gte('end_date', gap.shift_date)
        .single();

      let cycle: CycleInfo;

      if (cycleError || !existingCycle) {
        const result = await ensureCycleExists(organizationId, gap.shift_date);
        if (!result) return { success: false, error: `No cycle for ${gap.shift_date}` };
        cycle = result.cycle;
      } else {
        cycle = existingCycle as CycleInfo;
      }

      // Insert into performance_point_events (same table as TeamTab)
      const { error: insertError } = await supabase
        .from('performance_point_events')
        .insert({
          organization_id: organizationId,
          team_member_id: gap.team_member_id,
          cycle_id: cycle.id,
          event_type: eventType,
          points,
          event_date: gap.shift_date,
          notes: `Absence Ledger: ${fullName} — ${gap.shift_date} (${gap.role || 'No role'}) ${gap.scheduled_hours}h`,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      // NEXUS log
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_approved',
        details: {
          team_member_id: gap.team_member_id,
          name: fullName,
          event_type: eventType,
          points,
          event_date: gap.shift_date,
          source: 'absence_ledger',
          shift_role: gap.role,
          scheduled_hours: gap.scheduled_hours,
          reclassified: action.type === 'approve_modified',
        },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unknown error' };
    }
  };

  const saveActions = async (actionsToSave: GapPendingAction[]) => {
    if (!organizationId || !user || actionsToSave.length === 0) return;

    setIsBatchSaving(true);
    let successCount = 0;
    let failCount = 0;
    const failures: string[] = [];

    try {
      for (const action of actionsToSave) {
        const result = await commitSingleAction(action);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          failures.push(`${getGapName(action.gap)}: ${result.error}`);
        }
      }

      // Batch NEXUS log (mirrors TeamTab pattern)
      const approved = actionsToSave.filter(a => a.type === 'approve' || a.type === 'approve_modified');
      const rejected = actionsToSave.filter(a => a.type === 'reject');
      const excused = actionsToSave.filter(a => a.type === 'excuse');

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'absence_ledger_batch_review',
        details: {
          total: actionsToSave.length,
          approved: approved.length,
          rejected: rejected.length,
          excused: excused.length,
          success: successCount,
          failed: failCount,
          excuseReasons: excused.map(a => a.excuseReason),
        },
      });

      // Refresh data
      await Promise.all([
        refetch(),
        fetchTeamPerformance(),
      ]);

      // Remove saved actions from pending
      const savedIds = new Set(actionsToSave.map(a => a.gapId));
      setPendingActions(prev => prev.filter(a => !savedIds.has(a.gapId)));

      // Toast
      if (failCount > 0) {
        toast.error(`${successCount} saved, ${failCount} failed`);
        console.error('Batch save failures:', failures);
      } else {
        toast.success(`${successCount} absence${successCount !== 1 ? 's' : ''} resolved`);
      }
    } catch (err: any) {
      console.error('Batch save error:', err);
      toast.error('Batch save failed — no changes were lost, try again');
    } finally {
      setIsBatchSaving(false);
    }
  };

  const saveAllActions = () => saveActions(pendingActions);
  const savePartialActions = () => saveActions(pendingActions);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-4">
      {/* Sub-header — L5 Pill Pattern */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box amber">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="subheader-title">Absence Ledger</h3>
              <p className="subheader-subtitle">
                Every missed shift and how it was handled
              </p>
            </div>
          </div>

          <div className="subheader-right">
            {/* Stat pills */}
            <span className={`subheader-pill ${stats.unresolved > 0 ? 'amber' : 'emerald'}`}>
              <span className="subheader-pill-value">{stats.unresolved}</span>
              <span className="subheader-pill-label">Open</span>
            </span>
            <span className="subheader-pill">
              <span className="subheader-pill-value">{stats.excused}</span>
              <span className="subheader-pill-label">Excused</span>
            </span>
            <span className="subheader-pill">
              <span className="subheader-pill-value">{stats.demerits}</span>
              <span className="subheader-pill-label">Demerits</span>
            </span>
            <span className="subheader-pill">
              <span className="subheader-pill-value">{stats.total}</span>
              <span className="subheader-pill-label">Total</span>
            </span>

            <div className="subheader-divider" />

            {/* Filter toggle */}
            <button
              onClick={() => setFilterView(filterView === 'unresolved' ? 'all' : 'unresolved')}
              className={`subheader-toggle ${filterView === 'all' ? 'active primary' : ''}`}
              title={filterView === 'all' ? 'Showing all' : 'Showing open only'}
            >
              <div className="subheader-toggle-icon">
                <Eye className="w-4 h-4" />
              </div>
            </button>

            {/* Refresh */}
            <button
              onClick={refetch}
              disabled={isLoading}
              className="subheader-toggle"
              title="Refresh"
            >
              <div className="subheader-toggle-icon">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </div>
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
            <p>The Absence Ledger compares <strong>scheduled shifts</strong> against <strong>worked shifts</strong> from 7shifts data.</p>
            <p>Every shift where someone was scheduled but never clocked in appears here — the complete record of missed shifts.</p>
            <p>Unresolved entries default to <strong>Unexcused Absence (+{DEFAULT_GAP_SUGGESTION.points} pts)</strong> — reclassify, excuse, or dismiss as needed.</p>
            <p>Uses the same decision tools as the Team tab: approve, reclassify, excuse, dismiss — with batch save and full undo.</p>
            <p>All decisions write to the same performance tables and NEXUS audit trail.</p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && gaps.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading absence records...
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
          <h3 className="text-lg font-medium text-white mb-2">No Unresolved Absences</h3>
          <p className="text-gray-400 text-sm">
            {filterView === 'unresolved'
              ? 'Every missed shift has been accounted for.'
              : 'No missed shifts found in the current data.'}
          </p>
          {filterView === 'unresolved' && stats.total > 0 && (
            <button
              onClick={() => setFilterView('all')}
              className="mt-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              View full absence history ({stats.total} entries) →
            </button>
          )}
        </div>
      )}

      {/* Gap list — grouped by member, expandable rows with TeamTab-style decisions */}
      {!isLoading && displayGaps.length > 0 && (
        <div className="space-y-2">
          {Array.from(groupedGaps.entries()).map(([memberId, memberGaps]) => {
            const first = memberGaps[0];
            const fullName = `${first.employee_first_name} ${first.employee_last_name}`;
            const isExpanded = expandedMember === memberId;
            const memberUnresolved = memberGaps.filter(g => g.resolution === 'unresolved');
            const hasUnresolved = memberUnresolved.length > 0;
            const decidedForMember = memberUnresolved.filter(g => pendingActionMap.has(g.scheduled_shift_id)).length;
            const allDecidedForMember = hasUnresolved && decidedForMember === memberUnresolved.length;

            return (
              <div
                key={memberId}
                className="bg-gray-800/40 rounded-lg border border-gray-700/30 overflow-hidden"
              >
                {/* Member Row */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                  onClick={() => setExpandedMember(isExpanded ? null : memberId)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}

                    {/* Avatar — cross-reference teamStore for avatar_url */}
                    {(() => {
                      const memberRecord = memberLookup.get(memberId);
                      return (
                        <div className="w-10 h-10 rounded-full bg-gray-700/50 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {memberRecord?.avatar_url ? (
                            <img src={memberRecord.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <img
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${memberRecord?.email || memberId}`}
                              alt=""
                              className="w-full h-full"
                            />
                          )}
                        </div>
                      );
                    })()}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{fullName}</span>
                        {hasUnresolved && (
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                            allDecidedForMember
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : decidedForMember > 0
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {allDecidedForMember
                              ? `${memberUnresolved.length} ✓ ready`
                              : decidedForMember > 0
                                ? `${decidedForMember}/${memberUnresolved.length} reviewed`
                                : `${memberUnresolved.length} unresolved`
                            }
                          </span>
                        )}
                        {!hasUnresolved && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-gray-700/30 text-gray-500">
                            {memberGaps.length} resolved
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{memberGaps.length} absence{memberGaps.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{memberGaps.reduce((sum, g) => sum + g.scheduled_hours, 0).toFixed(1)}h total</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded gap events — uses GapEventRow (same UX as StagedEventRow) */}
                {isExpanded && (
                  <div className="border-t border-gray-700/30 p-3 pl-12 space-y-2 bg-gray-800/20">
                    {memberGaps.map(gap => {
                      const isResolved = gap.resolution !== 'unresolved';
                      const decidedAction = pendingActionMap.get(gap.scheduled_shift_id);

                      // Already resolved — show compact summary
                      if (isResolved) {
                        return (
                          <div key={gap.scheduled_shift_id} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/10 opacity-60">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <CheckCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-400 truncate">
                                  {formatDateForDisplay(gap.shift_date)} · {formatShiftTime(gap.scheduled_time_in)}–{formatShiftTime(gap.scheduled_time_out)} · {gap.scheduled_hours}h
                                </p>
                                <p className="text-xs text-gray-600">
                                  {gap.resolution === 'excused' && `Excused: ${gap.resolution_details?.reason || 'No reason'}`}
                                  {gap.resolution === 'sick_day' && 'Sick Day (ESA)'}
                                  {gap.resolution === 'demerit' && 'Demerit applied'}
                                  {gap.resolution === 'dismissed' && 'Dismissed — data error'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Unresolved — full decision row
                      return (
                        <GapEventRow
                          key={gap.scheduled_shift_id}
                          gap={gap}
                          decidedAction={decidedAction}
                          onApprove={(modification) => queueApproval(gap, modification)}
                          onReject={() => queueRejection(gap)}
                          onExcuse={(reason) => queueExcuse(gap, reason)}
                          onUndo={() => undoAction(gap.scheduled_shift_id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary bar */}
      {stats.total > 0 && (
        <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg flex items-center justify-between text-xs text-gray-500">
          <span>
            {stats.unresolved} unresolved · {stats.unresolvedHours.toFixed(1)}h
            {stats.unresolvedPay > 0 && ` · $${stats.unresolvedPay.toFixed(2)}`}
          </span>
          <span>
            {stats.excused} excused · {stats.demerits} demerit{stats.demerits !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* =================================================================== */}
      {/* FLOATING ACTION BAR — Batch save controls (mirrors TeamTab)        */}
      {/* =================================================================== */}
      {hasAnyReviewed && (
        <div className={`floating-action-bar ${allReviewed ? 'success' : 'warning'}`}>
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              {/* Left: Progress */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {reviewedCount} of {totalUnresolved} reviewed
                  </span>
                  <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        allReviewed ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${(reviewedCount / totalUnresolved) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="w-px h-6 bg-gray-700" />

              {/* Center: Summary */}
              <div className="text-xs text-gray-400 whitespace-nowrap">
                {(() => {
                  const approved = pendingActions.filter(a => a.type === 'approve' || a.type === 'approve_modified').length;
                  const excused = pendingActions.filter(a => a.type === 'excuse').length;
                  const rejected = pendingActions.filter(a => a.type === 'reject').length;
                  const parts: string[] = [];
                  if (approved) parts.push(`${approved} assigned`);
                  if (excused) parts.push(`${excused} excused`);
                  if (rejected) parts.push(`${rejected} dismissed`);
                  return parts.join(', ') || 'No decisions yet';
                })()}
              </div>

              <div className="w-px h-6 bg-gray-700" />

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {/* Discard */}
                <TwoStageButton
                  onConfirm={discardAllActions}
                  icon={X}
                  confirmText="Discard all?"
                  variant="danger"
                  size="sm"
                  disabled={isBatchSaving}
                />

                {/* Save Progress (only when NOT all reviewed) */}
                {!allReviewed && (
                  <TwoStageButton
                    onConfirm={savePartialActions}
                    icon={Save}
                    confirmText={`Leave ${unreviewedCount} unresolved?`}
                    variant="warning"
                    size="sm"
                    timeout={3000}
                    disabled={isBatchSaving}
                  />
                )}

                {/* Save All (primary — enabled only when all reviewed) */}
                <button
                  onClick={saveAllActions}
                  disabled={!allReviewed || isBatchSaving}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${allReviewed
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }
                    ${isBatchSaving ? 'opacity-50 cursor-wait' : ''}
                  `}
                >
                  {isBatchSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GapScannerTab;
