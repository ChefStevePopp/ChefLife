/**
 * TeamTab - Chef's Operational Command Center
 * 
 * Shows team members with pending staged events for review.
 * Approve/Reject/Excuse events from Import workflow.
 * 
 * L5 Design: Clean search/sort/filter controls
 */

import React, { useState, useMemo, useEffect } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useTeamStore } from "@/stores/teamStore";
import { useAuth } from "@/hooks/useAuth";
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
  TrendingUp,
  RefreshCw,
  Pencil,
  Shield,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { AddPointEventModal } from "./AddPointEventModal";
import { AddPointReductionModal } from "./AddPointReductionModal";
import { ActionLegend } from "./ActionLegend";

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
  const { organizationId, user } = useAuth();
  const { teamPerformance } = usePerformanceStore();
  const { members } = useTeamStore();
  const performanceArray = Array.from(teamPerformance.values());

  // Staged events state
  const [stagedEvents, setStagedEvents] = useState<StagedEvent[]>([]);
  const [isLoadingStaged, setIsLoadingStaged] = useState(false);
  const [processingEventId, setProcessingEventId] = useState<string | null>(null);

  // Search, Sort, Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  
  // Modal state
  const [eventModalMember, setEventModalMember] = useState<string | null>(null);
  const [reductionModalMember, setReductionModalMember] = useState<string | null>(null);

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
  // EVENT ACTIONS
  // =============================================================================

  const approveEvent = async (event: StagedEvent, modification?: { event_type: string; points: number }) => {
    if (!organizationId || !user) return;
    
    const eventType = modification?.event_type || event.event_type;
    const points = modification?.points ?? event.suggested_points;
    
    setProcessingEventId(event.id);
    try {
      let { data: existingCycle, error: cycleError } = await supabase
        .from('performance_cycles')
        .select('id, start_date, end_date')
        .eq('organization_id', organizationId)
        .lte('start_date', event.event_date)
        .gte('end_date', event.event_date)
        .single();

      let cycle: CycleInfo;
      let cycleName: string | undefined;

      if (cycleError || !existingCycle) {
        const result = await ensureCycleExists(organizationId, event.event_date);
        
        if (!result) {
          toast.error(`Could not create cycle for ${event.event_date}. Check module configuration.`);
          setProcessingEventId(null);
          return;
        }
        
        cycle = result.cycle;
        cycleName = result.name;
        toast.success(`Created cycle: ${cycleName}`);
      } else {
        cycle = existingCycle as CycleInfo;
      }

      const isReduction = points < 0;
      const isInformational = eventType === 'unscheduled_worked';
      
      const reductionTypeMap: Record<string, string> = {
        'stayed_late': 'stay_late',
        'arrived_early': 'arrive_early',
      };
      
      if (isInformational) {
        const { error: deleteError } = await supabase
          .from('staged_events')
          .delete()
          .eq('id', event.id);

        if (deleteError) throw new Error(deleteError.message || 'Delete failed');
        
        await fetchStagedEvents();
        toast.success('Unscheduled shift noted (no points)');
        setProcessingEventId(null);
        return;
      }
      
      if (isReduction) {
        const reductionType = reductionTypeMap[eventType] || eventType;
        
        const { error: insertError } = await supabase
          .from('performance_point_reductions')
          .insert({
            organization_id: organizationId,
            team_member_id: event.team_member_id,
            cycle_id: cycle.id,
            reduction_type: reductionType,
            points: points,
            event_date: event.event_date,
            notes: event.description,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert reduction error:', insertError);
          throw new Error(insertError.message || insertError.code || 'Insert failed');
        }
      } else {
        const { error: insertError } = await supabase
          .from('performance_point_events')
          .insert({
            organization_id: organizationId,
            team_member_id: event.team_member_id,
            cycle_id: cycle.id,
            event_type: eventType,
            points: points,
            event_date: event.event_date,
            notes: event.description,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert event error:', insertError);
          throw new Error(insertError.message || insertError.code || 'Insert failed');
        }
      }

      const { error: deleteError } = await supabase
        .from('staged_events')
        .delete()
        .eq('id', event.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        toast.error('Event saved but cleanup failed');
      }

      const member = combinedMembers.find(m => m.team_member_id === event.team_member_id);
      const memberName = member?.team_member 
        ? `${member.team_member.first_name} ${member.team_member.last_name}`
        : 'Team member';

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_approved',
        details: {
          name: memberName,
          event_type: eventType,
          original_event_type: event.event_type,
          points: points,
          original_points: event.suggested_points,
          was_modified: modification !== undefined,
          event_date: event.event_date,
        },
      });

      await fetchStagedEvents();
      const modifiedLabel = modification ? ' (reclassified)' : '';
      toast.success(`Event approved${modifiedLabel}: ${points > 0 ? '+' : ''}${points} pts`);
    } catch (err: any) {
      console.error('Error approving event:', err);
      const message = err?.message || err?.code || (typeof err === 'string' ? err : 'Unknown error');
      toast.error(`Failed to approve: ${message}`);
    } finally {
      setProcessingEventId(null);
    }
  };

  const rejectEvent = async (event: StagedEvent) => {
    if (!organizationId || !user) return;
    
    setProcessingEventId(event.id);
    try {
      const { error } = await supabase
        .from('staged_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      const member = combinedMembers.find(m => m.team_member_id === event.team_member_id);
      const memberName = member?.team_member 
        ? `${member.team_member.first_name} ${member.team_member.last_name}`
        : 'Team member';

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_rejected',
        details: {
          name: memberName,
          event_type: event.event_type,
          event_date: event.event_date,
        },
      });

      await fetchStagedEvents();
      toast('Event rejected', { icon: '🗑️' });
    } catch (err: any) {
      console.error('Error rejecting event:', err);
      const message = err?.message || err?.code || (typeof err === 'string' ? err : 'Unknown error');
      toast.error(`Failed to reject: ${message}`);
    } finally {
      setProcessingEventId(null);
    }
  };

  const excuseEvent = async (event: StagedEvent, reason: string) => {
    if (!organizationId || !user) return;
    
    setProcessingEventId(event.id);
    try {
      const { error } = await supabase
        .from('staged_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      const member = combinedMembers.find(m => m.team_member_id === event.team_member_id);
      const memberName = member?.team_member 
        ? `${member.team_member.first_name} ${member.team_member.last_name}`
        : 'Team member';

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_excused',
        details: {
          name: memberName,
          event_type: event.event_type,
          reason: reason,
          event_date: event.event_date,
        },
      });

      await fetchStagedEvents();
      toast.success(`Event excused: ${reason}`);
    } catch (err: any) {
      console.error('Error excusing event:', err);
      const message = err?.message || err?.code || (typeof err === 'string' ? err : 'Unknown error');
      toast.error(`Failed to excuse: ${message}`);
    } finally {
      setProcessingEventId(null);
    }
  };

  // =============================================================================
  // FILTERING & SORTING
  // =============================================================================

  const filteredAndSortedMembers = useMemo(() => {
    let list = [...combinedMembers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.team_member?.display_name?.toLowerCase().includes(query) ||
        m.team_member?.first_name?.toLowerCase().includes(query) ||
        m.team_member?.last_name?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
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
  }, [combinedMembers, searchQuery, filterOption, sortOption, stagedByMember]);

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
          {filteredAndSortedMembers.map((member) => {
            const pendingEvents = stagedByMember.get(member.team_member_id) || [];
            const isExpanded = expandedMember === member.team_member_id;
            const hasPending = pendingEvents.length > 0;

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
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">
                            {pendingEvents.length} pending
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventModalMember(member.team_member_id);
                      }}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
                      title="Add point event"
                    >
                      + Event
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReductionModalMember(member.team_member_id);
                      }}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50 rounded transition-colors"
                      title="Add point reduction"
                    >
                      - Reduce
                    </button>
                  </div>
                </div>

                {/* Expanded Pending Events */}
                {isExpanded && hasPending && (
                  <div className="border-t border-gray-700/30 p-3 pl-12 space-y-2 bg-gray-800/20">
                    {pendingEvents.map(event => (
                      <StagedEventRow
                        key={event.id}
                        event={event}
                        isProcessing={processingEventId === event.id}
                        onApprove={(modification) => approveEvent(event, modification)}
                        onReject={() => rejectEvent(event)}
                        onExcuse={(reason) => excuseEvent(event, reason)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
  onApprove: (modifiedEvent?: { event_type: string; points: number }) => void;
  onReject: () => void;
  onExcuse: (reason: string) => void;
}> = ({ event, isProcessing, onApprove, onReject, onExcuse }) => {
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
