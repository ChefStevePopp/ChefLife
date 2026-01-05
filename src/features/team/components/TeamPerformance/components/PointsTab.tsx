import React, { useState, useMemo } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { 
  Search, 
  Plus, 
  Minus, 
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Pencil,
  Shield,
  Trash2,
  Check,
  RefreshCw,
  Flag,
} from "lucide-react";
import { AddPointEventModal } from "./AddPointEventModal";
import { AddPointReductionModal } from "./AddPointReductionModal";
import { ActionLegend } from "./ActionLegend";
import type { TeamMemberPerformance, PointEvent, PointReduction } from "@/features/team/types";

// =============================================================================
// CONSTANTS
// =============================================================================

// Event type labels
const EVENT_TYPE_LABELS: Record<string, string> = {
  no_call_no_show: "No-call/No-show",
  dropped_shift_no_coverage: "Dropped Shift (No Coverage)",
  unexcused_absence: "Unexcused Absence",
  tardiness_major: "Tardiness (>15 min)",
  tardiness_minor: "Tardiness (5-15 min)",
  early_departure: "Early Departure",
  late_notification: "Late Notification",
  food_safety_violation: "Food Safety Violation",
  insubordination: "Insubordination",
};

const REDUCTION_TYPE_LABELS: Record<string, string> = {
  cover_shift_urgent: "Covered Shift (<24hr)",
  cover_shift_standard: "Covered Shift (24-48hr)",
  stay_late: "Stayed 2+ Hours Late",
  arrive_early: "Arrived 2+ Hours Early",
  training_mentoring: "Training/Mentoring",
  special_event: "Special Event/Catering",
};

// Demerit options for reclassification
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

// Excuse reasons
const EXCUSE_OPTIONS = [
  { id: 'SICK OK', label: 'Sick (ESA Protected)' },
  { id: 'LATE OK', label: 'Approved Late Arrival' },
  { id: 'EARLY DEPART OK', label: 'Approved Early Departure' },
  { id: 'ABSENT OK', label: 'Approved Absence' },
  { id: 'BEREAVEMENT', label: 'Bereavement Leave' },
  { id: 'JURY DUTY', label: 'Jury Duty' },
  { id: 'EMERGENCY', label: 'Family Emergency' },
  { id: 'CHALLENGE ACCEPTED', label: 'Challenge Accepted (Ombudsman)' },
  { id: 'DATA ERROR', label: 'Data Entry Error' },
  { id: 'OTHER', label: 'Other' },
];

// Security levels that can manage points
const MANAGER_SECURITY_LEVELS = [0, 1, 2, 3];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PointsTab: React.FC = () => {
  const { 
    teamPerformance, 
    config, 
    getReductionsInLast30Days,
    fetchTeamPerformance,
    currentCycle,
  } = usePerformanceStore();
  const { user, organizationId, securityLevel } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddReductionModal, setShowAddReductionModal] = useState(false);
  
  // Processing state for ledger actions
  const [processingEntryId, setProcessingEntryId] = useState<string | null>(null);

  const performanceArray = Array.from(teamPerformance.values());

  // Check if current user can manage points (security level 0-3)
  const canManagePoints = MANAGER_SECURITY_LEVELS.includes(securityLevel);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return performanceArray;
    const query = searchQuery.toLowerCase();
    return performanceArray.filter(p => 
      p.team_member.first_name?.toLowerCase().includes(query) ||
      p.team_member.last_name?.toLowerCase().includes(query) ||
      p.team_member.email?.toLowerCase().includes(query)
    );
  }, [performanceArray, searchQuery]);

  // Get selected member
  const selectedMember = selectedMemberId 
    ? teamPerformance.get(selectedMemberId) 
    : null;

  // Get tier color
  const getTierColor = (tier: 1 | 2 | 3) => {
    switch (tier) {
      case 1: return "text-green-400 bg-green-500/20";
      case 2: return "text-amber-400 bg-amber-500/20";
      case 3: return "text-rose-400 bg-rose-500/20";
    }
  };

  // Get reductions info
  const reductionsUsed = selectedMemberId ? Math.abs(getReductionsInLast30Days(selectedMemberId)) : 0;
  const reductionsRemaining = config.max_reduction_per_30_days - reductionsUsed;

  // Detect duplicate entries (same type + same date)
  const duplicateKeys = useMemo(() => {
    if (!selectedMember?.events) return new Set<string>();
    
    const keyCounts = new Map<string, number>();
    
    for (const entry of selectedMember.events) {
      const isReduction = 'reduction_type' in entry;
      const eventType = isReduction ? entry.reduction_type : entry.event_type;
      const key = `${eventType}|${entry.event_date}`;
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    }
    
    // Return keys that appear more than once
    const duplicates = new Set<string>();
    keyCounts.forEach((count, key) => {
      if (count > 1) duplicates.add(key);
    });
    
    return duplicates;
  }, [selectedMember?.events]);

  // =============================================================================
  // LEDGER ENTRY ACTIONS
  // =============================================================================

  /**
   * Modify an existing point event (reclassify)
   */
  const handleModifyEvent = async (
    entry: any,
    isReduction: boolean,
    newEventType: string,
    newPoints: number
  ) => {
    if (!organizationId || !user || !selectedMember) return;
    
    setProcessingEntryId(entry.id);
    try {
      const table = isReduction ? 'performance_point_reductions' : 'performance_point_events';
      const typeField = isReduction ? 'reduction_type' : 'event_type';
      
      const { error } = await supabase
        .from(table)
        .update({
          [typeField]: newEventType,
          points: newPoints,
          notes: `${entry.notes || ''} [Modified from ${isReduction ? entry.reduction_type : entry.event_type}]`.trim(),
        })
        .eq('id', entry.id);
      
      if (error) throw error;
      
      // Log to NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_modified',
        details: {
          team_member_id: selectedMember.team_member_id,
          name: `${selectedMember.team_member.first_name} ${selectedMember.team_member.last_name}`,
          entry_id: entry.id,
          original_type: isReduction ? entry.reduction_type : entry.event_type,
          new_type: newEventType,
          original_points: entry.points,
          new_points: newPoints,
          event_date: entry.event_date,
        },
      });
      
      // Refresh data
      await fetchTeamPerformance();
      toast.success('Event reclassified');
    } catch (err: any) {
      console.error('Error modifying event:', err);
      toast.error(`Failed to modify: ${err.message}`);
    } finally {
      setProcessingEntryId(null);
    }
  };

  /**
   * Excuse an entry (delete with reason logged)
   */
  const handleExcuseEntry = async (entry: any, isReduction: boolean, reason: string) => {
    if (!organizationId || !user || !selectedMember) return;
    
    setProcessingEntryId(entry.id);
    try {
      const table = isReduction ? 'performance_point_reductions' : 'performance_point_events';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', entry.id);
      
      if (error) throw error;
      
      // Log to NEXUS (this is the audit trail!)
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_excused',
        details: {
          team_member_id: selectedMember.team_member_id,
          name: `${selectedMember.team_member.first_name} ${selectedMember.team_member.last_name}`,
          entry_id: entry.id,
          event_type: isReduction ? entry.reduction_type : entry.event_type,
          points: entry.points,
          event_date: entry.event_date,
          excuse_reason: reason,
          original_notes: entry.notes,
        },
      });
      
      // Refresh data
      await fetchTeamPerformance();
      toast.success(`Excused: ${reason}`);
    } catch (err: any) {
      console.error('Error excusing entry:', err);
      toast.error(`Failed to excuse: ${err.message}`);
    } finally {
      setProcessingEntryId(null);
    }
  };

  /**
   * Remove an entry entirely (delete, logged as removal)
   */
  const handleRemoveEntry = async (entry: any, isReduction: boolean) => {
    if (!organizationId || !user || !selectedMember) return;
    
    setProcessingEntryId(entry.id);
    try {
      const table = isReduction ? 'performance_point_reductions' : 'performance_point_events';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', entry.id);
      
      if (error) throw error;
      
      // Log to NEXUS (this is the audit trail!)
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_event_removed',
        details: {
          team_member_id: selectedMember.team_member_id,
          name: `${selectedMember.team_member.first_name} ${selectedMember.team_member.last_name}`,
          entry_id: entry.id,
          event_type: isReduction ? entry.reduction_type : entry.event_type,
          points: entry.points,
          event_date: entry.event_date,
          original_notes: entry.notes,
        },
      });
      
      // Refresh data
      await fetchTeamPerformance();
      toast('Entry removed', { icon: '🗑️' });
    } catch (err: any) {
      console.error('Error removing entry:', err);
      toast.error(`Failed to remove: ${err.message}`);
    } finally {
      setProcessingEntryId(null);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Help Legend */}
      <ActionLegend context="points" />

      {/* Member Selector */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search team member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
      </div>

      {/* Member Cards / Selection */}
      {!selectedMemberId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMembers.map((member) => (
            <button
              key={member.team_member_id}
              onClick={() => setSelectedMemberId(member.team_member_id)}
              className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30 hover:border-primary-500/50 hover:bg-gray-800/50 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                    {member.team_member.avatar_url ? (
                      <img 
                        src={member.team_member.avatar_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.team_member.email || member.team_member_id}`}
                        alt=""
                        className="w-full h-full"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {member.team_member.first_name} {member.team_member.last_name}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTierColor(member.tier)}`}>
                  Tier {member.tier}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Current Points</span>
                <span className="text-lg font-bold text-white">{member.current_points}</span>
              </div>
              <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    member.tier === 1 ? 'bg-green-500' :
                    member.tier === 2 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, (member.current_points / 15) * 100)}%` }}
                />
              </div>
            </button>
          ))}

          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">No team members found</p>
            </div>
          )}
        </div>
      ) : (
        /* Selected Member Detail View */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedMemberId(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                  {selectedMember?.team_member.avatar_url ? (
                    <img 
                      src={selectedMember.team_member.avatar_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember?.team_member.email || selectedMemberId}`}
                      alt=""
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div>
                  <div className="text-lg font-medium text-white">
                    {selectedMember?.team_member.first_name} {selectedMember?.team_member.last_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTierColor(selectedMember?.tier || 1)}`}>
                      Tier {selectedMember?.tier}
                    </span>
                    <span className="text-sm text-gray-500">
                      {selectedMember?.current_points} points
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddReductionModal(true)}
                className="btn-ghost text-sm"
              >
                <Minus className="w-4 h-4 mr-1" />
                Add Reduction
              </button>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Event
              </button>
            </div>
          </div>

          {/* Reduction Limit Info - L5 muted style */}
          {reductionsUsed > 0 && (
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  reductionsRemaining <= 0 ? 'text-amber-400' : 'text-gray-500'
                }`} />
                <div>
                  <p className="text-sm text-gray-300">
                    {reductionsRemaining <= 0 
                      ? `Limit reached: ${reductionsUsed} of ${config.max_reduction_per_30_days} points used this 30-day period`
                      : `${reductionsUsed} of ${config.max_reduction_per_30_days} point reduction used this 30-day period`
                    }
                  </p>
                  {reductionsRemaining <= 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Managers can override this limit when adding reductions
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Point Ledger */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/30 flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Point Ledger</h4>
              {canManagePoints && (
                <span className="text-xs text-gray-500">Manager actions available</span>
              )}
            </div>
            
            {selectedMember?.events && selectedMember.events.length > 0 ? (
              <div className="divide-y divide-gray-700/30">
                {[...selectedMember.events].reverse().map((entry, idx) => {
                  const isReduction = 'reduction_type' in entry;
                  const eventType = isReduction ? entry.reduction_type : entry.event_type;
                  const dupeKey = `${eventType}|${entry.event_date}`;
                  const isDuplicate = duplicateKeys.has(dupeKey);
                  
                  return (
                    <LedgerEntryRow
                      key={entry.id || idx}
                      entry={entry}
                      canManage={canManagePoints}
                      isProcessing={processingEntryId === entry.id}
                      isDuplicate={isDuplicate}
                      onModify={(newType, newPoints) => 
                        handleModifyEvent(entry, isReduction, newType, newPoints)
                      }
                      onExcuse={(reason) => handleExcuseEntry(entry, isReduction, reason)}
                      onRemove={() => handleRemoveEntry(entry, isReduction)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No events recorded this cycle</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedMemberId && (
        <>
          <AddPointEventModal
            memberId={selectedMemberId}
            isOpen={showAddEventModal}
            onClose={() => setShowAddEventModal(false)}
          />
          <AddPointReductionModal
            memberId={selectedMemberId}
            isOpen={showAddReductionModal}
            onClose={() => setShowAddReductionModal(false)}
          />
        </>
      )}
    </div>
  );
};

// =============================================================================
// LEDGER ENTRY ROW SUB-COMPONENT
// =============================================================================

interface LedgerEntryRowProps {
  entry: any;
  canManage: boolean;
  isProcessing: boolean;
  isDuplicate: boolean;
  onModify: (newType: string, newPoints: number) => void;
  onExcuse: (reason: string) => void;
  onRemove: () => void;
}

const LedgerEntryRow: React.FC<LedgerEntryRowProps> = ({
  entry,
  canManage,
  isProcessing,
  isDuplicate,
  onModify,
  onExcuse,
  onRemove,
}) => {
  const [mode, setMode] = useState<'default' | 'modify' | 'excuse' | 'confirm_remove'>('default');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedPoints, setSelectedPoints] = useState(0);
  const [excuseReason, setExcuseReason] = useState('');

  const isReduction = 'reduction_type' in entry;
  const eventType = isReduction ? entry.reduction_type : entry.event_type;
  const label = isReduction 
    ? REDUCTION_TYPE_LABELS[eventType] || eventType
    : EVENT_TYPE_LABELS[eventType] || eventType;

  const handleEventTypeChange = (newType: string) => {
    const option = DEMERIT_OPTIONS.find(o => o.id === newType);
    if (option) {
      setSelectedEventType(newType);
      setSelectedPoints(option.points);
    }
  };

  const resetMode = () => {
    setMode('default');
    setSelectedEventType('');
    setSelectedPoints(0);
    setExcuseReason('');
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50">
      {/* Entry Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isReduction ? 'bg-green-500/20' : 'bg-rose-500/20'
        }`}>
          {isReduction 
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <AlertTriangle className="w-4 h-4 text-rose-400" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">{label}</span>
            {isDuplicate && (
              <Flag 
                className="w-3.5 h-3.5 text-amber-400" 
                title="Possible duplicate entry"
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {new Date(entry.event_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {entry.notes && <span className="truncate">• {entry.notes}</span>}
          </div>
        </div>
      </div>

      {/* Points & Actions */}
      <div className="flex items-center gap-2 ml-3">
        {/* DEFAULT MODE */}
        {mode === 'default' && (
          <>
            <span className={`text-sm font-medium ${
              entry.points > 0 ? 'text-rose-400' : 'text-green-400'
            }`}>
              {entry.points > 0 ? '+' : ''}{entry.points}
            </span>
            <span className="text-sm text-gray-500 w-12 text-right">
              = {entry.running_balance}
            </span>
            
            {/* Action buttons - always visible for managers */}
            {canManage && (
              <div className="flex items-center gap-1 ml-2">
                {!isReduction && (
                  <button
                    onClick={() => setMode('modify')}
                    disabled={isProcessing}
                    className="p-1.5 rounded hover:bg-gray-600/50 text-gray-500 hover:text-primary-400 transition-colors"
                    title="Reclassify event"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setMode('excuse')}
                  disabled={isProcessing}
                  className="p-1.5 rounded hover:bg-gray-600/50 text-gray-500 hover:text-amber-400 transition-colors"
                  title="Excuse (remove with reason)"
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMode('confirm_remove')}
                  disabled={isProcessing}
                  className="p-1.5 rounded hover:bg-gray-600/50 text-gray-500 hover:text-rose-400 transition-colors"
                  title="Remove entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* MODIFY MODE */}
        {mode === 'modify' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedEventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="input text-xs py-1 min-w-[180px]"
              autoFocus
            >
              <option value="" disabled>Reclassify as...</option>
              {DEMERIT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.points} pts)
                </option>
              ))}
            </select>
            
            <button
              onClick={() => {
                if (selectedEventType) {
                  onModify(selectedEventType, selectedPoints);
                  resetMode();
                }
              }}
              disabled={!selectedEventType || isProcessing}
              className={`p-1.5 rounded transition-colors ${
                selectedEventType ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-500'
              }`}
              title="Confirm"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            
            <button
              onClick={resetMode}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* EXCUSE MODE */}
        {mode === 'excuse' && (
          <div className="flex items-center gap-2">
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
              onClick={() => {
                if (excuseReason) {
                  onExcuse(excuseReason);
                  resetMode();
                }
              }}
              disabled={!excuseReason || isProcessing}
              className={`p-1.5 rounded transition-colors ${
                excuseReason ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-gray-500'
              }`}
              title="Confirm excuse"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            
            <button
              onClick={resetMode}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-gray-200 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CONFIRM REMOVE MODE */}
        {mode === 'confirm_remove' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-400">Remove permanently?</span>
            
            <button
              onClick={() => {
                onRemove();
                resetMode();
              }}
              disabled={isProcessing}
              className="p-1.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
              title="Confirm remove"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={resetMode}
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

export default PointsTab;
