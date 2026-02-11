/**
 * TeamLedgerView — Chronological feed of ALL point events across team
 * 
 * Filterable by date range, event type, and member.
 * Grouped by date with sticky headers.
 * Inline actions: reclassify, excuse, remove.
 * 
 * @diagnostics src/features/team/components/TeamPerformance/components/PointsTab/TeamLedgerView.tsx
 */

import React, { useState, useMemo } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { formatDateLong } from "@/utils/dateUtils";
import {
  Search,
  CheckCircle,
  X,
  Calendar,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { TeamLedgerRow, type TeamLedgerEntry } from "./TeamLedgerRow";
import { usePointActions } from "./usePointActions";
import {
  ALL_EVENT_LABELS,
  MANAGER_SECURITY_LEVELS,
  LEDGER_ITEMS_PER_PAGE,
} from "./pointsConstants";

// =============================================================================
// PROPS
// =============================================================================

interface TeamLedgerViewProps {
  onViewMember: (memberId: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TeamLedgerView: React.FC<TeamLedgerViewProps> = ({ onViewMember }) => {
  const { showDiagnostics } = useDiagnostics();
  const { securityLevel } = useAuth();
  const { teamPerformance } = usePerformanceStore();
  const { processingEntryId, handleModifyEvent, handleExcuseEntry, handleRemoveEntry } = usePointActions();

  // Filter state
  const [ledgerDateFrom, setLedgerDateFrom] = useState<string>('');
  const [ledgerDateTo, setLedgerDateTo] = useState<string>('');
  const [ledgerEventTypeFilter, setLedgerEventTypeFilter] = useState<'all' | 'demerit' | 'merit'>('all');
  const [ledgerMemberFilter, setLedgerMemberFilter] = useState<string>('all');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);

  const performanceArray = Array.from(teamPerformance.values());
  const canManagePoints = MANAGER_SECURITY_LEVELS.includes(securityLevel);

  // =============================================================================
  // BUILD UNIFIED TEAM LEDGER
  // =============================================================================

  const teamLedgerEntries = useMemo(() => {
    const entries: TeamLedgerEntry[] = [];

    performanceArray.forEach(member => {
      const memberName = `${member.team_member.first_name} ${member.team_member.last_name}`;
      
      member.events?.forEach(entry => {
        const isReduction = 'reduction_type' in entry;
        const eventType = isReduction ? (entry as any).reduction_type : (entry as any).event_type;
        const eventLabel = ALL_EVENT_LABELS[eventType] || eventType.replace(/_/g, ' ');
        
        entries.push({
          id: entry.id,
          memberId: member.team_member_id,
          memberName,
          memberAvatar: member.team_member.avatar_url,
          memberTier: member.tier,
          eventDate: entry.event_date,
          eventType,
          eventLabel,
          points: entry.points,
          notes: entry.notes,
          isReduction,
          isSickDay: false,
          runningBalance: (entry as any).running_balance || 0,
          createdAt: entry.created_at,
        });
      });

      // Sick day entries
      member.time_off?.sick_day_dates?.forEach((date, idx) => {
        entries.push({
          id: `sick-${member.team_member_id}-${date}-${idx}`,
          memberId: member.team_member_id,
          memberName,
          memberAvatar: member.team_member.avatar_url,
          memberTier: member.tier,
          eventDate: date,
          eventType: 'sick_day',
          eventLabel: 'ESA Sick Day',
          points: 0,
          notes: 'Protected under Ontario ESA',
          isReduction: false,
          isSickDay: true,
          runningBalance: 0,
          createdAt: undefined,
        });
      });
    });

    entries.sort((a, b) => {
      const dateCompare = new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return entries;
  }, [performanceArray]);

  // =============================================================================
  // FILTERING
  // =============================================================================

  const filteredLedgerEntries = useMemo(() => {
    let list = [...teamLedgerEntries];

    if (ledgerDateFrom) list = list.filter(e => e.eventDate >= ledgerDateFrom);
    if (ledgerDateTo) list = list.filter(e => e.eventDate <= ledgerDateTo);

    if (ledgerEventTypeFilter === 'demerit') list = list.filter(e => !e.isReduction);
    else if (ledgerEventTypeFilter === 'merit') list = list.filter(e => e.isReduction);

    if (ledgerMemberFilter !== 'all') list = list.filter(e => e.memberId === ledgerMemberFilter);

    if (ledgerSearchQuery.trim()) {
      const query = ledgerSearchQuery.toLowerCase();
      list = list.filter(e => 
        e.memberName.toLowerCase().includes(query) ||
        e.eventLabel.toLowerCase().includes(query) ||
        e.notes?.toLowerCase().includes(query)
      );
    }

    return list;
  }, [teamLedgerEntries, ledgerDateFrom, ledgerDateTo, ledgerEventTypeFilter, ledgerMemberFilter, ledgerSearchQuery]);

  // Pagination
  const ledgerTotalPages = Math.ceil(filteredLedgerEntries.length / LEDGER_ITEMS_PER_PAGE);
  const paginatedLedgerEntries = filteredLedgerEntries.slice(
    (ledgerPage - 1) * LEDGER_ITEMS_PER_PAGE,
    ledgerPage * LEDGER_ITEMS_PER_PAGE
  );

  React.useEffect(() => { setLedgerPage(1); }, [ledgerDateFrom, ledgerDateTo, ledgerEventTypeFilter, ledgerMemberFilter, ledgerSearchQuery]);

  // Stats
  const ledgerStats = useMemo(() => {
    const totalDemerits = filteredLedgerEntries.filter(e => !e.isReduction).length;
    const totalMerits = filteredLedgerEntries.filter(e => e.isReduction).length;
    const totalPoints = filteredLedgerEntries.reduce((sum, e) => sum + e.points, 0);
    return { totalDemerits, totalMerits, totalPoints };
  }, [filteredLedgerEntries]);

  // Group by date
  const ledgerEntriesByDate = useMemo(() => {
    const grouped = new Map<string, typeof paginatedLedgerEntries>();
    paginatedLedgerEntries.forEach(entry => {
      const existing = grouped.get(entry.eventDate) || [];
      existing.push(entry);
      grouped.set(entry.eventDate, existing);
    });
    return grouped;
  }, [paginatedLedgerEntries]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-4">
      {showDiagnostics && <div className="text-xs text-gray-500 font-mono">PointsTab/TeamLedgerView.tsx</div>}

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search events..."
            value={ledgerSearchQuery}
            onChange={(e) => setLedgerSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
          {ledgerSearchQuery && (
            <button onClick={() => setLedgerSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <input type="date" value={ledgerDateFrom} onChange={(e) => setLedgerDateFrom(e.target.value)} className="input bg-gray-800/50 border-gray-700/50 text-sm" />
          <span className="text-gray-500">→</span>
          <input type="date" value={ledgerDateTo} onChange={(e) => setLedgerDateTo(e.target.value)} className="input bg-gray-800/50 border-gray-700/50 text-sm" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={ledgerEventTypeFilter} onChange={(e) => setLedgerEventTypeFilter(e.target.value as any)} className="input bg-gray-800/50 border-gray-700/50 text-sm">
            <option value="all">All Events</option>
            <option value="demerit">Demerits Only</option>
            <option value="merit">Merits Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <select value={ledgerMemberFilter} onChange={(e) => setLedgerMemberFilter(e.target.value)} className="input bg-gray-800/50 border-gray-700/50 text-sm min-w-[150px]">
            <option value="all">All Members</option>
            {performanceArray
              .sort((a, b) => `${a.team_member.first_name} ${a.team_member.last_name}`.localeCompare(`${b.team_member.first_name} ${b.team_member.last_name}`))
              .map(m => (
                <option key={m.team_member_id} value={m.team_member_id}>
                  {m.team_member.first_name} {m.team_member.last_name}
                </option>
              ))
            }
          </select>
        </div>

        {(ledgerDateFrom || ledgerDateTo || ledgerEventTypeFilter !== 'all' || ledgerMemberFilter !== 'all' || ledgerSearchQuery) && (
          <button
            onClick={() => { setLedgerDateFrom(''); setLedgerDateTo(''); setLedgerEventTypeFilter('all'); setLedgerMemberFilter('all'); setLedgerSearchQuery(''); }}
            className="px-3 py-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{filteredLedgerEntries.length} events</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400">{ledgerStats.totalDemerits} demerits</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400">{ledgerStats.totalMerits} merits</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Net:</span>
          <span className={ledgerStats.totalPoints >= 0 ? 'text-amber-400' : 'text-emerald-400'}>
            {ledgerStats.totalPoints >= 0 ? '+' : ''}{ledgerStats.totalPoints} pts
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-700/30 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Date</div>
          <div className="col-span-3">Team Member</div>
          <div className="col-span-3">Event</div>
          <div className="col-span-1 text-right">Points</div>
          <div className="col-span-3">Notes</div>
        </div>

        {filteredLedgerEntries.length > 0 ? (
          <div className="divide-y divide-gray-700/30">
            {Array.from(ledgerEntriesByDate.entries()).map(([date, entries]) => (
              <React.Fragment key={date}>
                <div className="px-4 py-2 bg-gray-800/50 sticky top-0 z-10">
                  <span className="text-xs font-medium text-gray-400">{formatDateLong(date)}</span>
                </div>
                {entries.map((entry) => (
                  <TeamLedgerRow
                    key={entry.id}
                    entry={entry}
                    canManage={canManagePoints}
                    isProcessing={processingEntryId === entry.id}
                    onModify={(newType, newPoints) => {
                      const member = teamPerformance.get(entry.memberId);
                      if (member) handleModifyEvent(
                        { id: entry.id, event_type: entry.eventType, notes: entry.notes, event_date: entry.eventDate, points: entry.points },
                        entry.isReduction, newType, newPoints, member
                      );
                    }}
                    onExcuse={(reason) => {
                      const member = teamPerformance.get(entry.memberId);
                      if (member) handleExcuseEntry(
                        { id: entry.id, event_type: entry.eventType, reduction_type: entry.eventType, notes: entry.notes, event_date: entry.eventDate, points: entry.points },
                        entry.isReduction, reason, member
                      );
                    }}
                    onRemove={() => {
                      const member = teamPerformance.get(entry.memberId);
                      if (member) handleRemoveEntry(
                        { id: entry.id, event_type: entry.eventType, reduction_type: entry.eventType, notes: entry.notes, event_date: entry.eventDate, points: entry.points },
                        entry.isReduction, member
                      );
                    }}
                    onViewMember={() => onViewMember(entry.memberId)}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No events match your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredLedgerEntries.length > LEDGER_ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
          <span className="text-sm text-gray-500">
            Showing {((ledgerPage - 1) * LEDGER_ITEMS_PER_PAGE) + 1}–{Math.min(ledgerPage * LEDGER_ITEMS_PER_PAGE, filteredLedgerEntries.length)} of {filteredLedgerEntries.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
              disabled={ledgerPage === 1}
              className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-sm text-gray-400 min-w-[100px] text-center">Page {ledgerPage} of {ledgerTotalPages}</span>
            <button
              onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, p + 1))}
              disabled={ledgerPage === ledgerTotalPages}
              className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLedgerView;
