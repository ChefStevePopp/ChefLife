/**
 * TeamTab - Chef's Operational Command Center
 * 
 * Shows team members with pending staged events for review.
 * Approve/Reject/Excuse events from Import workflow.
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
  Filter,
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
} from "lucide-react";
import { AddPointEventModal } from "./AddPointEventModal";
import { AddPointReductionModal } from "./AddPointReductionModal";

// =============================================================================
// TYPES
// =============================================================================

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

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
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

  // Fetch on mount only
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
    // Use performance data if available, otherwise fall back to team members
    if (performanceArray.length > 0) {
      return performanceArray;
    }
    
    // Fallback: create minimal performance objects from team members
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

  const approveEvent = async (event: StagedEvent) => {
    if (!organizationId || !user) return;
    
    setProcessingEventId(event.id);
    try {
      // Get current cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('performance_cycles')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_current', true)
        .single();

      if (cycleError) {
        console.error('Cycle query error:', cycleError);
        toast.error(`No active performance cycle: ${cycleError.message || cycleError.code || 'Unknown error'}`);
        setProcessingEventId(null);
        return;
      }
      
      if (!cycle) {
        toast.error('No active performance cycle found. Create one in Settings.');
        setProcessingEventId(null);
        return;
      }
      
      console.log('Using cycle:', cycle.id);
      console.log('Event type:', event.event_type, 'Points:', event.suggested_points);

      // Determine which table to use based on event type
      const isReduction = event.suggested_points < 0;
      const isInformational = event.event_type === 'unscheduled_worked';
      
      // Map Delta Engine event types to database event types
      const reductionTypeMap: Record<string, string> = {
        'stayed_late': 'stay_late',
        'arrived_early': 'arrive_early',
      };
      
      if (isInformational) {
        // Unscheduled work is informational - just remove from staged
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
        // Insert into performance_point_reductions
        const reductionType = reductionTypeMap[event.event_type] || event.event_type;
        
        const { data: insertedReduction, error: insertError } = await supabase
          .from('performance_point_reductions')
          .insert({
            organization_id: organizationId,
            team_member_id: event.team_member_id,
            cycle_id: cycle.id,
            reduction_type: reductionType,
            points: event.suggested_points, // Already negative
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
        
        console.log('Inserted reduction:', insertedReduction);
      } else {
        // Insert into performance_point_events (demerits)
        const { data: insertedEvent, error: insertError } = await supabase
          .from('performance_point_events')
          .insert({
            organization_id: organizationId,
            team_member_id: event.team_member_id,
            cycle_id: cycle.id,
            event_type: event.event_type,
            points: event.suggested_points,
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
        
        console.log('Inserted event:', insertedEvent);
      }

      // Delete from staged_events
      const { error: deleteError } = await supabase
        .from('staged_events')
        .delete()
        .eq('id', event.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        // Event was created but staged wasn't deleted - not critical
        toast.error('Event saved but cleanup failed');
      }

      // Get member name for logging
      const member = combinedMembers.find(m => m.team_member_id === event.team_member_id);
      const memberName = member?.team_member 
        ? `${member.team_member.first_name} ${member.team_member.last_name}`
        : 'Team member';

      // Log to NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_approved',
        details: {
          name: memberName,
          event_type: event.event_type,
          points: event.suggested_points,
          event_date: event.event_date,
        },
      });

      // Refresh staged events
      await fetchStagedEvents();
      toast.success(`Event approved: ${event.suggested_points > 0 ? '+' : ''}${event.suggested_points} pts`);
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
      // Just delete from staged_events
      const { error } = await supabase
        .from('staged_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      // Get member name for logging
      const member = combinedMembers.find(m => m.team_member_id === event.team_member_id);
      const memberName = member?.team_member 
        ? `${member.team_member.first_name} ${member.team_member.last_name}`
        : 'Team member';

      // Log to NEXUS
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
      // Delete from staged_events (no points recorded)
      const { error } = await supabase
        .from('staged_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      // Get member name for logging
      const member = combinedMembers.find(m => m.team_member_id === event.team_member_id);
      const memberName = member?.team_member 
        ? `${member.team_member.first_name} ${member.team_member.last_name}`
        : 'Team member';

      // Log to NEXUS
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

  const filteredMembers = useMemo(() => {
    let memberList = [...combinedMembers];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      memberList = memberList.filter(m => 
        m.team_member?.display_name?.toLowerCase().includes(query) ||
        m.team_member?.first_name?.toLowerCase().includes(query) ||
        m.team_member?.last_name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    switch (filterOption) {
      case 'pending':
        memberList = memberList.filter(m => stagedByMember.has(m.team_member_id));
        break;
      case 'tier1':
        memberList = memberList.filter(m => m.tier === 1);
        break;
      case 'tier2':
        memberList = memberList.filter(m => m.tier === 2);
        break;
      case 'tier3':
        memberList = memberList.filter(m => m.tier === 3);
        break;
      case 'coaching':
        memberList = memberList.filter(m => m.coaching_stage && m.coaching_stage >= 1);
        break;
    }

    // Sort: members with pending events first, then by tier, then by points
    memberList.sort((a, b) => {
      const aPending = stagedByMember.get(a.team_member_id)?.length || 0;
      const bPending = stagedByMember.get(b.team_member_id)?.length || 0;
      if (aPending !== bPending) return bPending - aPending;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.current_points - b.current_points;
    });

    return memberList;
  }, [combinedMembers, searchQuery, filterOption, stagedByMember]);

  // Count stats
  const stats = useMemo(() => {
    const total = combinedMembers.length;
    const pending = stagedByMember.size;
    const tier1 = combinedMembers.filter(m => m.tier === 1).length;
    const tier2 = combinedMembers.filter(m => m.tier === 2).length;
    const tier3 = combinedMembers.filter(m => m.tier === 3).length;
    const coaching = combinedMembers.filter(m => m.coaching_stage && m.coaching_stage >= 1).length;
    
    return { total, pending, tier1, tier2, tier3, coaching };
  }, [combinedMembers, stagedByMember]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team members..."
            className="input w-full pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value as FilterOption)}
            className="input"
          >
            <option value="all">All Team ({stats.total})</option>
            {stats.pending > 0 && (
              <option value="pending">⏳ Pending Review ({stats.pending})</option>
            )}
            <option value="tier1">Tier 1 — Excellence ({stats.tier1})</option>
            <option value="tier2">Tier 2 — Strong ({stats.tier2})</option>
            <option value="tier3">Tier 3 — Focus ({stats.tier3})</option>
            {stats.coaching > 0 && (
              <option value="coaching">In Coaching ({stats.coaching})</option>
            )}
          </select>
          
          <button
            onClick={fetchStagedEvents}
            disabled={isLoadingStaged}
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            title="Refresh pending events"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoadingStaged ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        <QuickStat 
          label="Pending" 
          value={stats.pending}
          icon={Clock}
          highlight={stats.pending > 0}
          active={filterOption === 'pending'}
          onClick={() => setFilterOption(filterOption === 'pending' ? 'all' : 'pending')}
        />
        <QuickStat 
          label="Excellence" 
          value={stats.tier1} 
          icon={Star}
          active={filterOption === 'tier1'}
          onClick={() => setFilterOption(filterOption === 'tier1' ? 'all' : 'tier1')}
        />
        <QuickStat 
          label="Strong" 
          value={stats.tier2}
          icon={Users}
          active={filterOption === 'tier2'}
          onClick={() => setFilterOption(filterOption === 'tier2' ? 'all' : 'tier2')}
        />
        <QuickStat 
          label="Focus" 
          value={stats.tier3}
          icon={TrendingDown}
          highlight={stats.tier3 > 0}
          active={filterOption === 'tier3'}
          onClick={() => setFilterOption(filterOption === 'tier3' ? 'all' : 'tier3')}
        />
        <QuickStat 
          label="Coaching" 
          value={stats.coaching}
          icon={Users}
          highlight={stats.coaching > 0}
          active={filterOption === 'coaching'}
          onClick={() => setFilterOption(filterOption === 'coaching' ? 'all' : 'coaching')}
        />
      </div>

      {/* Team Member List */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/30 mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery ? 'No matches found' : 'No Team Members'}
          </h3>
          <p className="text-gray-500 text-sm">
            {searchQuery 
              ? 'Try a different search term'
              : 'Add team members to The Roster to get started.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => {
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

                    <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center overflow-hidden">
                      {member.team_member?.avatar_url ? (
                        <img 
                          src={member.team_member.avatar_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-400">
                          {member.team_member?.first_name?.[0]}
                          {member.team_member?.last_name?.[0]}
                        </span>
                      )}
                    </div>

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
                        onApprove={() => approveEvent(event)}
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

const QuickStat: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  highlight?: boolean;
  active?: boolean;
  onClick: () => void;
}> = ({ label, value, icon: Icon, highlight, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      p-3 rounded-lg border transition-all text-left
      ${active 
        ? 'bg-primary-500/10 border-primary-500/30' 
        : 'bg-gray-800/40 border-gray-700/30 hover:border-gray-600/50'
      }
    `}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-gray-500" />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <p className={`text-lg font-semibold ${highlight ? 'text-amber-400' : 'text-white'}`}>
      {value}
    </p>
  </button>
);

const StagedEventRow: React.FC<{
  event: StagedEvent;
  isProcessing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onExcuse: (reason: string) => void;
}> = ({ event, isProcessing, onApprove, onReject, onExcuse }) => {
  const [showExcuseInput, setShowExcuseInput] = useState(false);
  const [excuseReason, setExcuseReason] = useState('');
  
  const isReduction = event.suggested_points < 0;
  
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-700/20">
      <div className="flex items-center gap-3">
        {isReduction ? (
          <TrendingDown className="w-4 h-4 text-emerald-400" />
        ) : (
          <TrendingUp className="w-4 h-4 text-gray-400" />
        )}
        <div>
          <p className="text-sm text-gray-300">{event.description}</p>
          <p className="text-xs text-gray-500">{event.event_date} • {event.role || 'No role'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isReduction ? 'text-emerald-400' : 'text-amber-400'}`}>
          {event.suggested_points > 0 ? '+' : ''}{event.suggested_points} pts
        </span>
        
        {!showExcuseInput ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              disabled={isProcessing}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
              title="Approve - add points"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExcuseInput(true);
              }}
              disabled={isProcessing}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-primary-400 transition-colors disabled:opacity-50"
              title="Excuse - no points"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReject();
              }}
              disabled={isProcessing}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-rose-400 transition-colors disabled:opacity-50"
              title="Reject - discard"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <select
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              className="input text-xs py-1"
              autoFocus
            >
              <option value="">Select reason...</option>
              <option value="SICK OK">Sick (ESA Protected)</option>
              <option value="LATE OK">Approved Late Arrival</option>
              <option value="EARLY DEPART OK">Approved Early Departure</option>
              <option value="ABSENT OK">Approved Absence</option>
              <option value="OTHER">Other</option>
            </select>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (excuseReason) {
                  onExcuse(excuseReason);
                  setShowExcuseInput(false);
                }
              }}
              disabled={!excuseReason || isProcessing}
              className="p-1.5 rounded hover:bg-gray-600/50 text-primary-400 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExcuseInput(false);
              }}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400"
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
