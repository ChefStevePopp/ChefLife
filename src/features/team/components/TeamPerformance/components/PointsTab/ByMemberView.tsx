/**
 * ByMemberView — Card grid with expandable individual point ledger
 * 
 * Three states: card grid → selected member detail → point ledger.
 * Shows attendance pills, sick day / vacation tracking, and
 * interleaved ledger (events + reductions + sick days).
 * 
 * @diagnostics src/features/team/components/TeamPerformance/components/PointsTab/ByMemberView.tsx
 */

import React, { useState, useMemo } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { formatDateForDisplay } from "@/utils/dateUtils";
import {
  Search,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CalendarCheck,
  Thermometer,
  Palmtree,
} from "lucide-react";
import { AddPointEventModal } from "../AddPointEventModal";
import { AddPointReductionModal } from "../AddPointReductionModal";
import { LedgerEntryRow } from "./LedgerEntryRow";
import { usePointActions } from "./usePointActions";
import {
  MANAGER_SECURITY_LEVELS,
  ABSENCE_EVENT_TYPES,
  ITEMS_PER_PAGE,
} from "./pointsConstants";
import type { SortOption } from "./pointsConstants";

// =============================================================================
// PROPS
// =============================================================================

interface ByMemberViewProps {
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onClearMember: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ByMemberView: React.FC<ByMemberViewProps> = ({
  selectedMemberId,
  onSelectMember,
  onClearMember,
}) => {
  const { showDiagnostics } = useDiagnostics();
  const { securityLevel } = useAuth();
  const {
    teamPerformance,
    config,
    getReductionsInLast30Days,
  } = usePerformanceStore();
  const { processingEntryId, handleModifyEvent, handleExcuseEntry, handleRemoveEntry } = usePointActions();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddReductionModal, setShowAddReductionModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');

  const performanceArray = Array.from(teamPerformance.values());
  const canManagePoints = MANAGER_SECURITY_LEVELS.includes(securityLevel);

  // =============================================================================
  // FILTERING & SORTING
  // =============================================================================

  const filteredMembers = useMemo(() => {
    let list = [...performanceArray];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.team_member.first_name?.toLowerCase().includes(query) ||
        p.team_member.last_name?.toLowerCase().includes(query) ||
        p.team_member.email?.toLowerCase().includes(query)
      );
    }
    
    list.sort((a, b) => {
      const aName = `${a.team_member?.first_name || ''} ${a.team_member?.last_name || ''}`.trim().toLowerCase();
      const bName = `${b.team_member?.first_name || ''} ${b.team_member?.last_name || ''}`.trim().toLowerCase();
      
      switch (sortOption) {
        case 'name_asc': return aName.localeCompare(bName);
        case 'name_desc': return bName.localeCompare(aName);
        case 'points_asc': return a.current_points - b.current_points;
        case 'points_desc': return b.current_points - a.current_points;
        case 'tier_asc': return a.tier - b.tier;
        case 'tier_desc': return b.tier - a.tier;
        default: return aName.localeCompare(bName);
      }
    });
    
    return list;
  }, [performanceArray, searchQuery, sortOption]);

  // Reset page when filters change
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, sortOption]);

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = showAll 
    ? filteredMembers 
    : filteredMembers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // =============================================================================
  // SELECTED MEMBER DATA
  // =============================================================================

  const selectedMember = selectedMemberId ? teamPerformance.get(selectedMemberId) : null;

  const getTierColor = (tier: 1 | 2 | 3) => {
    switch (tier) {
      case 1: return "text-green-400 bg-green-500/20";
      case 2: return "text-amber-400 bg-amber-500/20";
      case 3: return "text-rose-400 bg-rose-500/20";
    }
  };

  // Reductions info
  const reductionsUsed = selectedMemberId ? Math.abs(getReductionsInLast30Days(selectedMemberId)) : 0;
  const reductionsRemaining = config.max_reduction_per_30_days - reductionsUsed;

  // Attendance metrics
  const attendanceMetrics = useMemo(() => {
    if (!selectedMember) return { absenceCount: 0, sickDays: 0, totalMissed: 0 };
    const absenceCount = selectedMember.events.filter(e => 
      'event_type' in e && ABSENCE_EVENT_TYPES.includes(e.event_type)
    ).length;
    const sickDays = selectedMember.time_off?.sick_days_used ?? 0;
    return { absenceCount, sickDays, totalMissed: absenceCount + sickDays };
  }, [selectedMember]);

  // Interleaved ledger (events + reductions + sick days)
  const interleavedLedger = useMemo(() => {
    if (!selectedMember) return [];

    const entries: Array<{
      type: 'event' | 'reduction' | 'sick_day';
      id: string;
      event_date: string;
      data: any;
    }> = selectedMember.events.map(e => ({
      type: 'reduction_type' in e ? 'reduction' : 'event',
      id: e.id,
      event_date: e.event_date,
      data: e,
    }));

    const sickDayDates = selectedMember.time_off?.sick_day_dates || [];
    sickDayDates.forEach((date, idx) => {
      entries.push({
        type: 'sick_day',
        id: `sick-${date}-${idx}`,
        event_date: date,
        data: { event_date: date },
      });
    });

    entries.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    return entries;
  }, [selectedMember]);

  // Duplicate detection
  const duplicateKeys = useMemo(() => {
    if (!selectedMember?.events) return new Set<string>();
    const keyCounts = new Map<string, number>();
    for (const entry of selectedMember.events) {
      const isReduction = 'reduction_type' in entry;
      const eventType = isReduction ? entry.reduction_type : entry.event_type;
      const key = `${eventType}|${entry.event_date}`;
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    }
    const duplicates = new Set<string>();
    keyCounts.forEach((count, key) => { if (count > 1) duplicates.add(key); });
    return duplicates;
  }, [selectedMember?.events]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <>
      {showDiagnostics && <div className="text-xs text-gray-500 font-mono">PointsTab/ByMemberView.tsx</div>}

      {/* Member Selector */}
      <div className="flex flex-col sm:flex-row gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search team member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="input bg-gray-800/50 border-gray-700/50 text-sm pr-8"
          >
            <option value="name_asc">Name (A → Z)</option>
            <option value="name_desc">Name (Z → A)</option>
            <option value="points_asc">Points (Low → High)</option>
            <option value="points_desc">Points (High → Low)</option>
            <option value="tier_asc">Tier (1 → 3)</option>
            <option value="tier_desc">Tier (3 → 1)</option>
          </select>
        </div>
      </div>

      {/* =====================================================
          CARD GRID (no member selected)
          ===================================================== */}
      {!selectedMemberId ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedMembers.map((member) => (
              <button
                key={member.team_member_id}
                onClick={() => onSelectMember(member.team_member_id)}
                className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30 hover:border-primary-500/50 hover:bg-gray-800/50 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                      {member.team_member.avatar_url ? (
                        <img src={member.team_member.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.team_member.email || member.team_member_id}`} alt="" className="w-full h-full" />
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
                      member.tier === 1 ? 'bg-green-500' : member.tier === 2 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, (member.current_points / 15) * 100)}%` }}
                  />
                </div>
              </button>
            ))}

            {paginatedMembers.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No team members found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredMembers.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {showAll 
                    ? `Showing all ${filteredMembers.length} members`
                    : `Showing ${((currentPage - 1) * ITEMS_PER_PAGE) + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of ${filteredMembers.length}`
                  }
                </span>
                <button
                  onClick={() => { setShowAll(!showAll); setCurrentPage(1); }}
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
                  <span className="text-sm text-gray-400 min-w-[100px] text-center">Page {currentPage} of {totalPages}</span>
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
        </>
      ) : (
        /* =====================================================
           SELECTED MEMBER DETAIL
           ===================================================== */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="flex items-center gap-4">
              <button onClick={onClearMember} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                  {selectedMember?.team_member.avatar_url ? (
                    <img src={selectedMember.team_member.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember?.team_member.email || selectedMemberId}`} alt="" className="w-full h-full" />
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
                    <span className="text-sm text-gray-500">{selectedMember?.current_points} points</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance + Time Off Pills + Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Attendance Pill */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-200 ${
                  attendanceMetrics.absenceCount === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : attendanceMetrics.absenceCount <= 2
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
                title={`Attendance: ${attendanceMetrics.absenceCount} unexcused absence(s) this cycle`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  {attendanceMetrics.absenceCount === 0 ? 'No absences' : `${attendanceMetrics.absenceCount} absence${attendanceMetrics.absenceCount !== 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Sick Day Pill */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-200 ${
                  selectedMember?.time_off && selectedMember.time_off.sick_days_used >= selectedMember.time_off.sick_days_available
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : selectedMember?.time_off && selectedMember.time_off.sick_days_used > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-gray-700/30 border-gray-600/30 text-gray-400'
                }`}
                title={`ESA Sick Days: ${selectedMember?.time_off?.sick_days_used ?? 0} of ${selectedMember?.time_off?.sick_days_available ?? 3} used`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{selectedMember?.time_off?.sick_days_used ?? 0}/{selectedMember?.time_off?.sick_days_available ?? 3} sick</span>
              </div>

              {/* Vacation Pill */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-200 ${
                  selectedMember?.time_off && (selectedMember.time_off.vacation_hours_used || 0) >= (selectedMember.time_off.vacation_hours_available || 1)
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : selectedMember?.time_off && (selectedMember.time_off.vacation_hours_used || 0) > 0
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                      : 'bg-gray-700/30 border-gray-600/30 text-gray-400'
                }`}
                title={`Vacation: ${selectedMember?.time_off?.vacation_hours_used ?? 0}h of ${selectedMember?.time_off?.vacation_hours_available ?? 0}h used`}
              >
                <Palmtree className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{selectedMember?.time_off?.vacation_hours_used ?? 0}h vacation</span>
              </div>

              <div className="w-px h-6 bg-gray-700/50" />

              <button onClick={() => setShowAddReductionModal(true)} className="btn-ghost text-sm">
                <Minus className="w-4 h-4 mr-1" />Add Reduction
              </button>
              <button onClick={() => setShowAddEventModal(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4 mr-1" />Add Event
              </button>
            </div>
          </div>

          {/* Reduction Limit Info */}
          {reductionsUsed > 0 && (
            <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${reductionsRemaining <= 0 ? 'text-amber-400' : 'text-gray-500'}`} />
                <div>
                  <p className="text-sm text-gray-300">
                    {reductionsRemaining <= 0 
                      ? `Limit reached: ${reductionsUsed} of ${config.max_reduction_per_30_days} points used this 30-day period`
                      : `${reductionsUsed} of ${config.max_reduction_per_30_days} point reduction used this 30-day period`
                    }
                  </p>
                  {reductionsRemaining <= 0 && (
                    <p className="text-xs text-gray-500 mt-1">Managers can override this limit when adding reductions</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Point Ledger */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/30 flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Point Ledger</h4>
              {canManagePoints && <span className="text-xs text-gray-500">Manager actions available</span>}
            </div>
            
            {interleavedLedger.length > 0 ? (
              <div className="divide-y divide-gray-700/30">
                {[...interleavedLedger].reverse().map((item) => {
                  if (item.type === 'sick_day') {
                    return (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-500/20">
                            <Thermometer className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm text-amber-300">ESA Sick Day</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatDateForDisplay(item.event_date)}
                              <span>• Protected under Ontario ESA</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className="text-sm font-medium text-amber-400/60">—</span>
                          <span className="text-xs text-gray-600 italic">No points</span>
                        </div>
                      </div>
                    );
                  }

                  const entry = item.data;
                  const isReduction = item.type === 'reduction';
                  const eventType = isReduction ? entry.reduction_type : entry.event_type;
                  const dupeKey = `${eventType}|${entry.event_date}`;
                  const isDuplicate = duplicateKeys.has(dupeKey);
                  
                  return (
                    <LedgerEntryRow
                      key={entry.id}
                      entry={entry}
                      canManage={canManagePoints}
                      isProcessing={processingEntryId === entry.id}
                      isDuplicate={isDuplicate}
                      onModify={(newType, newPoints) => handleModifyEvent(entry, isReduction, newType, newPoints, selectedMember!)}
                      onExcuse={(reason) => handleExcuseEntry(entry, isReduction, reason, selectedMember!)}
                      onRemove={() => handleRemoveEntry(entry, isReduction, selectedMember!)}
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
          <AddPointEventModal memberId={selectedMemberId} isOpen={showAddEventModal} onClose={() => setShowAddEventModal(false)} />
          <AddPointReductionModal memberId={selectedMemberId} isOpen={showAddReductionModal} onClose={() => setShowAddReductionModal(false)} />
        </>
      )}
    </>
  );
};

export default ByMemberView;
