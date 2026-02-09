/**
 * TeamTab - Chef's Operational Command Center
 * 
 * Shows team members with pending staged events for review.
 * Uses batch-save pattern: decisions queue locally → action bar → Save All.
 * Auto-filters to affected members when staged events exist.
 * 
 * Flow: Review events → Queue decisions (with undo) → Save All / Save Progress
 * Save All: enabled when all events reviewed (primary green button)
 * Save Progress: TwoStageButton escape hatch — "Leave N unresolved?"
 * 
 * L5 Design: Floating action bar, clean search/sort/filter controls
 */

import React, { useState, useMemo, useEffect } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useTeamStore } from "@/stores/teamStore";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { 
  Users, 
  Search,
  Star,
  TrendingDown,
  Clock,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  RefreshCw,
  Pencil,
  Shield,
  ArrowUpDown,
  SlidersHorizontal,
  Thermometer,
  Palmtree,
  Plus,
  Minus,
  Save,
  Undo2,
} from "lucide-react";
import { AddPointEventModal } from "./AddPointEventModal";
import { AddPointReductionModal } from "./AddPointReductionModal";
import { AddSickDayModal } from "./AddSickDayModal";
import { AddVacationModal } from "./AddVacationModal";
import { ActionLegend } from "./ActionLegend";
import { TwoStageButton } from "@/components/ui/TwoStageButton";

// =============================================================================
// TYPES
// =============================================================================

type SortOption = 'name_asc' | 'name_desc' | 'points_asc' | 'points_desc' | 'tier_asc' | 'tier_desc' | 'pending_desc';
type FilterOption = 'all' | 'pending' | 'tier1' | 'tier2' | 'tier3' | 'coaching';

interface StagedEvent {
  id: string;
  organization_id: string;
  team_member_id: string;
  event_type: string;
  suggested_points: number;
  description: string;
  event_date: string;
  role?: string;
  scheduled_in?: string;
  scheduled_out?: string;
  worked_in?: string;
  worked_out?: string;
  start_variance?: number;
  end_variance?: number;
  source: string;
  import_batch_id?: string;
  external_employee_id?: string;
  created_at: string;
  created_by?: string;
}

interface CycleInfo {
  id: string;
  start_date: string;
  end_date: string;
}

interface PendingAction {
  eventId: string;
  type: 'approve' | 'approve_modified' | 'reject' | 'excuse';
  event: StagedEvent;
  modification?: { event_type: string; points: number };
  excuseReason?: string;
  label: string; // Human-readable summary for action bar
}

// =============================================================================
// CYCLE HELPERS
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
    
    console.log('Auto-created cycle:', name, newCycle);
    return { cycle: newCycle as CycleInfo, name };
  } catch (err) {
    console.error('Error in ensureCycleExists:', err);
    return null;
  }
};

// =============================================================================
// MAIN COMPONENT  
// =============================================================================

export const TeamTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  const { organizationId, user } = useAuth();
  const { teamPerformance, fetchTeamPerformance } = usePerformanceStore();
  const { members } = useTeamStore();
  const performanceArray = Array.from(teamPerformance.values());

  // Staged events state
  const [stagedEvents, setStagedEvents] = useState<StagedEvent[]>([]);
  const [isLoadingStaged, setIsLoadingStaged] = useState(false);

  // Search, Sort, Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  
  // Modal state
  const [eventModalMember, setEventModalMember] = useState<string | null>(null);
  const [reductionModalMember, setReductionModalMember] = useState<string | null>(null);
  const [sickDayModalMember, setSickDayModalMember] = useState<string | null>(null);
  const [vacationModalMember, setVacationModalMember] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const ITEMS_PER_PAGE = 12;

  // Batch action state (dirty state pattern)
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [showFullTeam, setShowFullTeam] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // =============================================================================
  // FETCH STAGED EVENTS
  // =============================================================================

  const fetchStagedEvents = async () => {
    if (!organizationId) return;
    
    setIsLoadingStaged(true);
    try {
      const { data, error } = await supabase
        .from('staged_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setStagedEvents(data || []);
    } catch (err) {
      console.error('Error fetching staged events:', err);
    } finally {
      setIsLoadingStaged(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchStagedEvents();
    }
  }, [organizationId]);

  // Group staged events by team member
  const stagedByMember = useMemo(() => {
    const map = new Map<string, StagedEvent[]>();
    stagedEvents.forEach(event => {
      const existing = map.get(event.team_member_id) || [];
      existing.push(event);
      map.set(event.team_member_id, existing);
    });
    return map;
  }, [stagedEvents]);

  // =============================================================================
  // COMBINED MEMBER LIST
  // =============================================================================

  const combinedMembers = useMemo(() => {
    if (performanceArray.length > 0) {
      return performanceArray;
    }
    
    return members
      .filter(m => m.is_active)
      .map(m => ({
        team_member_id: m.id,
        team_member: m,
        current_points: 0,
        tier: 1 as const,
        coaching_stage: undefined,
        events: [],
        coaching_records: [],
      }));
  }, [performanceArray, members]);

  // =============================================================================
  // QUEUE ACTIONS (local state — no DB writes until Save)
  // =============================================================================

  const getMemberName = (event: StagedEvent) => {
    const member = combinedMembers.find(m => m.team_member_id === event.team_member_id);
    return member?.team_member
      ? `${member.team_member.first_name} ${member.team_member.last_name}`
      : 'Team member';
  };

  const queueApproval = (event: StagedEvent, modification?: { event_type: string; points: number }) => {
    const points = modification?.points ?? event.suggested_points;
    const eventType = modification?.event_type || event.event_type;
    const isModified = modification !== undefined;
    const name = getMemberName(event);
    
    setPendingActions(prev => [
      ...prev.filter(a => a.eventId !== event.id),
      {
        eventId: event.id,
        type: isModified ? 'approve_modified' : 'approve',
        event,
        modification,
        label: `${name}: ${eventType.replace(/_/g, ' ')} (${points > 0 ? '+' : ''}${points} pts)${isModified ? ' ✎' : ''}`,
      },
    ]);
  };

  const queueRejection = (event: StagedEvent) => {
    const name = getMemberName(event);
    setPendingActions(prev => [
      ...prev.filter(a => a.eventId !== event.id),
      {
        eventId: event.id,
        type: 'reject',
        event,
        label: `${name}: rejected (${event.event_type.replace(/_/g, ' ')})`,
      },
    ]);
  };

  const queueExcuse = (event: StagedEvent, reason: string) => {
    const name = getMemberName(event);
    setPendingActions(prev => [
      ...prev.filter(a => a.eventId !== event.id),
      {
        eventId: event.id,
        type: 'excuse',
        event,
        excuseReason: reason,
        label: `${name}: excused (${reason})`,
      },
    ]);
  };

  const undoAction = (eventId: string) => {
    setPendingActions(prev => prev.filter(a => a.eventId !== eventId));
  };

  const discardAllActions = () => {
    setPendingActions([]);
  };

  // Pending action lookup
  const pendingActionMap = useMemo(() => {
    const map = new Map<string, PendingAction>();
    pendingActions.forEach(a => map.set(a.eventId, a));
    return map;
  }, [pendingActions]);

  // Progress tracking
  const totalStagedEvents = stagedEvents.length;
  const reviewedCount = pendingActions.length;
  const allReviewed = totalStagedEvents > 0 && reviewedCount === totalStagedEvents;
  const hasAnyReviewed = reviewedCount > 0;
  const unreviewedCount = totalStagedEvents - reviewedCount;

  // =============================================================================
  // BATCH SAVE — Commits all queued actions to database
  // =============================================================================

  const reductionTypeMap: Record<string, string> = {
    'stayed_late': 'stay_late',
    'arrived_early': 'arrive_early',
  };

  const commitSingleAction = async (action: PendingAction): Promise<{ success: boolean; error?: string }> => {
    if (!organizationId || !user) return { success: false, error: 'No auth context' };

    const { event } = action;

    try {
      // ----- REJECT: just delete staged event -----
      if (action.type === 'reject') {
        const { error } = await supabase.from('staged_events').delete().eq('id', event.id);
        if (error) throw error;
        return { success: true };
      }

      // ----- EXCUSE: delete staged event + NEXUS log -----
      if (action.type === 'excuse') {
        const { error } = await supabase.from('staged_events').delete().eq('id', event.id);
        if (error) throw error;
        return { success: true };
      }

      // ----- APPROVE / APPROVE_MODIFIED: find cycle → insert → delete staged -----
      const eventType = action.modification?.event_type || event.event_type;
      const points = action.modification?.points ?? event.suggested_points;

      // Find or create the appropriate cycle
      let { data: existingCycle, error: cycleError } = await supabase
        .from('performance_cycles')
        .select('id, start_date, end_date')
        .eq('organization_id', organizationId)
        .lte('start_date', event.event_date)
        .gte('end_date', event.event_date)
        .single();

      let cycle: CycleInfo;

      if (cycleError || !existingCycle) {
        const result = await ensureCycleExists(organizationId, event.event_date);
        if (!result) return { success: false, error: `No cycle for ${event.event_date}` };
        cycle = result.cycle;
      } else {
        cycle = existingCycle as CycleInfo;
      }

      const isReduction = points < 0;
      const isInformational = eventType === 'unscheduled_worked';

      if (!isInformational) {
        if (isReduction) {
          const { error: insertError } = await supabase
            .from('performance_point_reductions')
            .insert({
              organization_id: organizationId,
              team_member_id: event.team_member_id,
              cycle_id: cycle.id,
              reduction_type: reductionTypeMap[eventType] || eventType,
              points,
              event_date: event.event_date,
              notes: event.description,
              created_by: user.id,
            });
          if (insertError) throw insertError;
        } else {
          const { error: insertError } = await supabase
            .from('performance_point_events')
            .insert({
              organization_id: organizationId,
              team_member_id: event.team_member_id,
              cycle_id: cycle.id,
              event_type: eventType,
              points,
              event_date: event.event_date,
              notes: event.description,
              created_by: user.id,
            });
          if (insertError) throw insertError;
        }
      }

      // Delete from staged_events
      const { error: deleteError } = await supabase.from('staged_events').delete().eq('id', event.id);
      if (deleteError) console.warn('Staged event cleanup failed:', deleteError);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unknown error' };
    }
  };

  const saveActions = async (actionsToSave: PendingAction[]) => {
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
          failures.push(`${getMemberName(action.event)}: ${result.error}`);
        }
      }

      // Summarize for NEXUS batch log
      const approved = actionsToSave.filter(a => a.type === 'approve' || a.type === 'approve_modified');
      const rejected = actionsToSave.filter(a => a.type === 'reject');
      const excused = actionsToSave.filter(a => a.type === 'excuse');

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_batch_review',
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

      // NEXUS individual excuse logs (for sick day tracking)
      for (const action of excused) {
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'performance_event_excused',
          details: {
            team_member_id: action.event.team_member_id,
            name: getMemberName(action.event),
            event_type: action.event.event_type,
            reason: action.excuseReason,
            event_date: action.event.event_date,
          },
        });
      }

      // Refresh data once
      await fetchStagedEvents();
      await fetchTeamPerformance();

      // Remove saved actions from pending (keep any that weren't in this batch)
      const savedIds = new Set(actionsToSave.map(a => a.eventId));
      setPendingActions(prev => prev.filter(a => !savedIds.has(a.eventId)));

      // Reset auto-filter if everything is cleared
      if (unreviewedCount === 0 && failCount === 0) {
        setShowFullTeam(false);
      }

      // Toast
      if (failCount > 0) {
        toast.error(`${successCount} saved, ${failCount} failed`);
        console.error('Batch save failures:', failures);
      } else {
        toast.success(`${successCount} event${successCount !== 1 ? 's' : ''} saved`);
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
  // FILTERING & SORTING
  // =============================================================================

  // Auto-filter: when staged events exist, show only affected members unless user chose "Show All"
  const isAutoFiltered = stagedEvents.length > 0 && !showFullTeam && filterOption === 'all';

  const filteredAndSortedMembers = useMemo(() => {
    let list = [...combinedMembers];

    // Auto-filter to affected members when staged events exist
    if (isAutoFiltered) {
      list = list.filter(m => stagedByMember.has(m.team_member_id));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.team_member?.display_name?.toLowerCase().includes(query) ||
        m.team_member?.first_name?.toLowerCase().includes(query) ||
        m.team_member?.last_name?.toLowerCase().includes(query)
      );
    }

    // Apply status filter (only when not auto-filtered)
    if (!isAutoFiltered) {
      switch (filterOption) {
        case 'pending':
          list = list.filter(m => stagedByMember.has(m.team_member_id));
          break;
        case 'tier1':
          list = list.filter(m => m.tier === 1);
          break;
        case 'tier2':
          list = list.filter(m => m.tier === 2);
          break;
        case 'tier3':
          list = list.filter(m => m.tier === 3);
          break;
        case 'coaching':
          list = list.filter(m => m.coaching_stage && m.coaching_stage >= 1);
          break;
      }
    }

    // Apply sort
    list.sort((a, b) => {
      const aName = `${a.team_member?.first_name || ''} ${a.team_member?.last_name || ''}`.trim().toLowerCase();
      const bName = `${b.team_member?.first_name || ''} ${b.team_member?.last_name || ''}`.trim().toLowerCase();
      const aPending = stagedByMember.get(a.team_member_id)?.length || 0;
      const bPending = stagedByMember.get(b.team_member_id)?.length || 0;

      switch (sortOption) {
        case 'name_asc':
          return aName.localeCompare(bName);
        case 'name_desc':
          return bName.localeCompare(aName);
        case 'points_asc':
          return a.current_points - b.current_points;
        case 'points_desc':
          return b.current_points - a.current_points;
        case 'tier_asc':
          return a.tier - b.tier;
        case 'tier_desc':
          return b.tier - a.tier;
        case 'pending_desc':
          if (aPending !== bPending) return bPending - aPending;
          return aName.localeCompare(bName);
        default:
          return aName.localeCompare(bName);
      }
    });

    return list;
  }, [combinedMembers, searchQuery, filterOption, sortOption, stagedByMember, isAutoFiltered]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterOption, sortOption]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = showAll 
    ? filteredAndSortedMembers 
    : filteredAndSortedMembers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      );

  // Count stats
  const stats = useMemo(() => {
    const total = combinedMembers.length;
    const pending = stagedByMember.size;
    const pendingEvents = stagedEvents.length;
    const tier1 = combinedMembers.filter(m => m.tier === 1).length;
    const tier2 = combinedMembers.filter(m => m.tier === 2).length;
    const tier3 = combinedMembers.filter(m => m.tier === 3).length;
    const coaching = combinedMembers.filter(m => m.coaching_stage && m.coaching_stage >= 1).length;
    
    return { total, pending, pendingEvents, tier1, tier2, tier3, coaching };
  }, [combinedMembers, stagedByMember, stagedEvents]);

  // Sort options for dropdown
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name_asc', label: 'Name (A → Z)' },
    { value: 'name_desc', label: 'Name (Z → A)' },
    { value: 'points_asc', label: 'Points (Low → High)' },
    { value: 'points_desc', label: 'Points (High → Low)' },
    { value: 'tier_asc', label: 'Tier (1 → 3)' },
    { value: 'tier_desc', label: 'Tier (3 → 1)' },
    { value: 'pending_desc', label: 'Pending Events' },
  ];

  // Filter options for dropdown
  const filterOptions: { value: FilterOption; label: string; count: number }[] = [
    { value: 'all', label: 'All Team', count: stats.total },
    { value: 'pending', label: 'Pending Review', count: stats.pending },
    { value: 'tier1', label: 'Tier 1 — Excellence', count: stats.tier1 },
    { value: 'tier2', label: 'Tier 2 — Strong', count: stats.tier2 },
    { value: 'tier3', label: 'Tier 3 — Focus', count: stats.tier3 },
    { value: 'coaching', label: 'In Coaching', count: stats.coaching },
  ];

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-4">
      {showDiagnostics && <div className="text-xs text-gray-500 font-mono">src/features/team/components/TeamPerformance/components/TeamTab.tsx</div>}
      {/* Help Legend */}
      <ActionLegend context="team" />

      {/* Stats Summary Row */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-gray-400">{stats.total} team</span>
        </div>
        {stats.pendingEvents > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-medium">{stats.pendingEvents} pending events</span>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Tier 1: {stats.tier1}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Tier 2: {stats.tier2}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Tier 3: {stats.tier3}
          </span>
        </div>
      </div>

      {/* Search / Sort / Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team members..."
            className="input w-full pl-10 bg-gray-800/50 border-gray-700/50 focus:border-primary-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="input bg-gray-800/50 border-gray-700/50 text-sm pr-8"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value as FilterOption)}
            className="input bg-gray-800/50 border-gray-700/50 text-sm pr-8"
          >
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={fetchStagedEvents}
          disabled={isLoadingStaged}
          className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors"
          title="Refresh pending events"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoadingStaged ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Auto-Filter Banner */}
      {isAutoFiltered && (
        <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-200">
              Showing <strong>{stagedByMember.size}</strong> member{stagedByMember.size !== 1 ? 's' : ''} with pending events
            </span>
          </div>
          <button
            onClick={() => setShowFullTeam(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Show All Team
          </button>
        </div>
      )}

      {/* Show All Team active indicator */}
      {showFullTeam && stagedEvents.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
          <span className="text-sm text-gray-400">
            Showing full team ({stats.total} members)
          </span>
          <button
            onClick={() => setShowFullTeam(false)}
            className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            Focus on pending
          </button>
        </div>
      )}

      {/* Results Count */}
      {(searchQuery || filterOption !== 'all') && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Showing {filteredAndSortedMembers.length} of {stats.total} team members
          </span>
          {(searchQuery || filterOption !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterOption('all');
              }}
              className="text-primary-400 hover:text-primary-300 text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Team Member List */}
      {filteredAndSortedMembers.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/30 mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery || filterOption !== 'all' ? 'No matches found' : 'No Team Members'}
          </h3>
          <p className="text-gray-500 text-sm">
            {searchQuery || filterOption !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add team members to The Roster to get started.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedMembers.map((member) => {
            const pendingEvents = stagedByMember.get(member.team_member_id) || [];
            const isExpanded = expandedMember === member.team_member_id;
            const hasPending = pendingEvents.length > 0;
            const decidedForMember = pendingEvents.filter(e => pendingActionMap.has(e.id)).length;
            const allDecidedForMember = hasPending && decidedForMember === pendingEvents.length;

            return (
              <div 
                key={member.team_member_id}
                className="bg-gray-800/40 rounded-lg border border-gray-700/30 overflow-hidden"
              >
                {/* Member Row */}
                <div 
                  className={`
                    flex items-center justify-between p-3 
                    ${hasPending ? 'cursor-pointer hover:bg-gray-700/30' : ''}
                    transition-colors
                  `}
                  onClick={() => hasPending && setExpandedMember(isExpanded ? null : member.team_member_id)}
                >
                  <div className="flex items-center gap-3">
                    {hasPending ? (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )
                    ) : (
                      <div className="w-4 h-4" />
                    )}

                    <AvatarWithFallback
                      src={member.team_member?.avatar_url}
                      firstName={member.team_member?.first_name}
                      lastName={member.team_member?.last_name}
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {member.team_member?.display_name || 
                           `${member.team_member?.first_name} ${member.team_member?.last_name}`}
                        </span>
                        {hasPending && (
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                            allDecidedForMember 
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : decidedForMember > 0
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {allDecidedForMember
                              ? `${pendingEvents.length} ✓ ready`
                              : decidedForMember > 0
                                ? `${decidedForMember}/${pendingEvents.length} reviewed`
                                : `${pendingEvents.length} pending`
                            }
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={
                          member.tier === 1 ? 'text-emerald-400' :
                          member.tier === 2 ? 'text-amber-400' :
                          'text-rose-400'
                        }>
                          Tier {member.tier}
                        </span>
                        <span>•</span>
                        <span>{member.current_points} pts</span>
                        {member.coaching_stage && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400">Stage {member.coaching_stage}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* L5 Action Pills */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Sick Day Pill */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSickDayModalMember(member.team_member_id);
                      }}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                        border transition-all duration-200
                        ${member.time_off && member.time_off.sick_days_used >= member.time_off.sick_days_available
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          : member.time_off && member.time_off.sick_days_used > 0
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-gray-700/30 border-gray-600/30 text-gray-400 hover:bg-gray-700/50 hover:text-amber-400'
                        }
                      `}
                      title={`Sick Days: ${member.time_off?.sick_days_used ?? 0}/${member.time_off?.sick_days_available ?? 3} used (click to log)`}
                    >
                      <Thermometer className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">
                        {member.time_off?.sick_days_used ?? 0}/{member.time_off?.sick_days_available ?? 3}
                      </span>
                    </button>

                    {/* Vacation Pill */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVacationModalMember(member.team_member_id);
                      }}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                        border transition-all duration-200
                        ${member.time_off && (member.time_off.vacation_hours_used || 0) >= (member.time_off.vacation_hours_available || 1)
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                          : member.time_off && (member.time_off.vacation_hours_used || 0) > 0
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
                            : 'bg-gray-700/30 border-gray-600/30 text-gray-400 hover:bg-gray-700/50 hover:text-sky-400'
                        }
                      `}
                      title={`Vacation: ${member.time_off?.vacation_hours_used ?? 0}h used (click to log)`}
                    >
                      <Palmtree className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">
                        {member.time_off?.vacation_hours_used ?? 0}h
                      </span>
                    </button>

                    {/* Add Event Pill */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventModalMember(member.team_member_id);
                      }}
                      className="
                        flex items-center justify-center w-8 h-8 rounded-full
                        bg-gray-700/30 border border-gray-600/30
                        text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30
                        transition-all duration-200
                      "
                      title="Add point event (demerit)"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Point Reduction Pill */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReductionModalMember(member.team_member_id);
                      }}
                      className="
                        flex items-center justify-center w-8 h-8 rounded-full
                        bg-gray-700/30 border border-gray-600/30
                        text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30
                        transition-all duration-200
                      "
                      title="Add point reduction (merit)"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Pending Events */}
                {isExpanded && hasPending && (
                  <div className="border-t border-gray-700/30 p-3 pl-12 space-y-2 bg-gray-800/20">
                    {pendingEvents.map(event => {
                      const decidedAction = pendingActionMap.get(event.id);
                      return (
                        <StagedEventRow
                          key={event.id}
                          event={event}
                          isProcessing={false}
                          decidedAction={decidedAction}
                          onApprove={(modification) => queueApproval(event, modification)}
                          onReject={() => queueRejection(event)}
                          onExcuse={(reason) => queueExcuse(event, reason)}
                          onUndo={() => undoAction(event.id)}
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

      {/* Pagination Controls */}
      {filteredAndSortedMembers.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {showAll 
                ? `Showing all ${filteredAndSortedMembers.length} members`
                : `Showing ${((currentPage - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedMembers.length)} of ${filteredAndSortedMembers.length}`
              }
            </span>
            <button
              onClick={() => {
                setShowAll(!showAll);
                setCurrentPage(1);
              }}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              {showAll ? 'Show pages' : 'Show all'}
            </button>
          </div>
          
          {!showAll && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              
              <span className="text-sm text-gray-400 min-w-[100px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* FLOATING ACTION BAR — Batch save controls                          */}
      {/* =================================================================== */}
      {hasAnyReviewed && (
        <div className={`floating-action-bar ${allReviewed ? 'success' : 'warning'}`}>
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              {/* Left: Progress */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {reviewedCount} of {totalStagedEvents} reviewed
                  </span>
                  <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        allReviewed ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${(reviewedCount / totalStagedEvents) * 100}%` }}
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
                  if (rejected) parts.push(`${rejected} rejected`);
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

                {/* Save Progress (TwoStageButton — only when NOT all reviewed) */}
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

      {/* Modals */}
      {eventModalMember && (
        <AddPointEventModal
          memberId={eventModalMember}
          isOpen={!!eventModalMember}
          onClose={() => setEventModalMember(null)}
        />
      )}

      {reductionModalMember && (
        <AddPointReductionModal
          memberId={reductionModalMember}
          isOpen={!!reductionModalMember}
          onClose={() => setReductionModalMember(null)}
        />
      )}

      {sickDayModalMember && (
        <AddSickDayModal
          memberId={sickDayModalMember}
          isOpen={!!sickDayModalMember}
          onClose={() => setSickDayModalMember(null)}
        />
      )}

      {vacationModalMember && (
        <AddVacationModal
          memberId={vacationModalMember}
          isOpen={!!vacationModalMember}
          onClose={() => setVacationModalMember(null)}
        />
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Avatar with automatic fallback to initials if image fails to load
 */
const AvatarWithFallback: React.FC<{
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ src, firstName, lastName, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-700/50 flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {src && !imgError ? (
        <img 
          src={src} 
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-medium text-gray-400">
          {initials || '?'}
        </span>
      )}
    </div>
  );
};

const StagedEventRow: React.FC<{
  event: StagedEvent;
  isProcessing: boolean;
  decidedAction?: PendingAction;
  onApprove: (modifiedEvent?: { event_type: string; points: number }) => void;
  onReject: () => void;
  onExcuse: (reason: string) => void;
  onUndo?: () => void;
}> = ({ event, isProcessing, decidedAction, onApprove, onReject, onExcuse, onUndo }) => {
  const [mode, setMode] = useState<'default' | 'modify' | 'excuse'>('default');
  const [selectedEventType, setSelectedEventType] = useState(event.event_type);
  const [selectedPoints, setSelectedPoints] = useState(event.suggested_points);
  const [excuseReason, setExcuseReason] = useState('');
  
  const isReduction = event.suggested_points < 0;

  const demeritOptions = [
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

  const excuseOptions = [
    { id: 'SICK OK', label: 'Sick (ESA Protected)' },
    { id: 'LATE OK', label: 'Approved Late Arrival' },
    { id: 'EARLY DEPART OK', label: 'Approved Early Departure' },
    { id: 'ABSENT OK', label: 'Approved Absence' },
    { id: 'BEREAVEMENT', label: 'Bereavement Leave' },
    { id: 'JURY DUTY', label: 'Jury Duty' },
    { id: 'EMERGENCY', label: 'Family Emergency' },
    { id: 'OTHER', label: 'Other' },
  ];

  const handleEventTypeChange = (eventType: string) => {
    const option = demeritOptions.find(o => o.id === eventType);
    if (option) {
      setSelectedEventType(eventType);
      setSelectedPoints(option.points);
    }
  };

  const resetToDefault = () => {
    setMode('default');
    setSelectedEventType(event.event_type);
    setSelectedPoints(event.suggested_points);
    setExcuseReason('');
  };

  const isModifyReady = selectedEventType !== event.event_type;
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
            <p className="text-sm truncate">{event.description}</p>
            <p className="text-xs opacity-60 mt-0.5">
              {decidedAction.type === 'approve' && `Approved: +${event.suggested_points} pts`}
              {decidedAction.type === 'approve_modified' && `Reclassified: ${decidedAction.modification?.event_type.replace(/_/g, ' ')} (${(decidedAction.modification?.points ?? 0) > 0 ? '+' : ''}${decidedAction.modification?.points} pts)`}
              {decidedAction.type === 'reject' && 'Rejected — will be discarded'}
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
      {/* Event Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isReduction ? (
          <TrendingDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        ) : (
          <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm text-gray-300 truncate">{event.description}</p>
          <p className="text-xs text-gray-500">{event.event_date} • {event.role || 'No role'}</p>
        </div>
      </div>

      {/* Actions Area */}
      <div className="flex items-center gap-2 ml-3">
        
        {/* DEFAULT MODE */}
        {mode === 'default' && (
          <>
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${
              isReduction ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {event.suggested_points > 0 ? '+' : ''}{event.suggested_points} pts
            </span>
            
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              disabled={isProcessing}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
              title="Accept as-is"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            
            {!isReduction && (
              <button
                onClick={(e) => { e.stopPropagation(); setMode('modify'); }}
                disabled={isProcessing}
                className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-primary-400 transition-colors disabled:opacity-50"
                title="Modify event type"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={(e) => { e.stopPropagation(); setMode('excuse'); }}
              disabled={isProcessing}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-amber-400 transition-colors disabled:opacity-50"
              title="Excuse - no points"
            >
              <Shield className="w-4 h-4" />
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              disabled={isProcessing}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-rose-400 transition-colors disabled:opacity-50"
              title="Reject - discard"
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
              <option value={event.event_type} disabled>Select new type...</option>
              {demeritOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label} ({opt.points} pts)</option>
              ))}
            </select>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isModifyReady) onApprove({ event_type: selectedEventType, points: selectedPoints });
              }}
              disabled={!isModifyReady || isProcessing}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                isModifyReady ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-500'
              }`}
              title={isModifyReady ? `Confirm: ${selectedEventType.replace(/_/g, ' ')} (+${selectedPoints} pts)` : 'Select an event type'}
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
              {excuseOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isExcuseReady) { onExcuse(excuseReason); resetToDefault(); }
              }}
              disabled={!isExcuseReady || isProcessing}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                isExcuseReady ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-500'
              }`}
              title={isExcuseReady ? `Excuse: ${excuseReason}` : 'Select a reason'}
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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

export default TeamTab;
