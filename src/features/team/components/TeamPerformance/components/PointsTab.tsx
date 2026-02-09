/**
 * PointsTab - Points Management, Team Ledger & Gap Audit
 * 
 * L5 Design: Three view modes:
 * - By Member: Card grid, click to expand individual ledger
 * - Team Ledger: Chronological feed of ALL events across team
 * - Gap Audit: Scheduled-vs-worked shift gap resolution (Alpha/Omega only)
 */

import React, { useState, useMemo } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useAuth } from "@/hooks/useAuth";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import { formatDateForDisplay, formatDateShort, formatDateLong } from "@/utils/dateUtils";
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Users,
  List,
  Calendar,
  CalendarCheck,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Palmtree,
} from "lucide-react";
import { AddPointEventModal } from "./AddPointEventModal";
import { AddPointReductionModal } from "./AddPointReductionModal";
import { ActionLegend } from "./ActionLegend";
import type { TeamMemberPerformance, PointEvent, PointReduction } from "@/features/team/types";
import { GapScannerTab } from "./GapScannerTab";
import { SECURITY_LEVELS } from "@/config/security";

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

// Combined labels for filtering
const ALL_EVENT_LABELS: Record<string, string> = {
  ...EVENT_TYPE_LABELS,
  ...REDUCTION_TYPE_LABELS,
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

// View mode type
type ViewMode = 'by_member' | 'team_ledger' | 'gap_audit';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PointsTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  const { 
    teamPerformance, 
    config, 
    getReductionsInLast30Days,
    fetchTeamPerformance,
    currentCycle,
  } = usePerformanceStore();
  const { user, organizationId, securityLevel } = useAuth();

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('by_member');

  // By Member view state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddReductionModal, setShowAddReductionModal] = useState(false);
  
  // Processing state for ledger actions
  const [processingEntryId, setProcessingEntryId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const ITEMS_PER_PAGE = 12;

  // Sort state
  type SortOption = 'name_asc' | 'name_desc' | 'points_asc' | 'points_desc' | 'tier_asc' | 'tier_desc';
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');

  // Team Ledger view state
  const [ledgerDateFrom, setLedgerDateFrom] = useState<string>('');
  const [ledgerDateTo, setLedgerDateTo] = useState<string>('');
  const [ledgerEventTypeFilter, setLedgerEventTypeFilter] = useState<'all' | 'demerit' | 'merit'>('all');
  const [ledgerMemberFilter, setLedgerMemberFilter] = useState<string>('all');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const LEDGER_ITEMS_PER_PAGE = 25;

  const performanceArray = Array.from(teamPerformance.values());

  // Check if current user can manage points (security level 0-3)
  const canManagePoints = MANAGER_SECURITY_LEVELS.includes(securityLevel);

  // Filter and sort members (By Member view)
  const filteredMembers = useMemo(() => {
    let list = [...performanceArray];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.team_member.first_name?.toLowerCase().includes(query) ||
        p.team_member.last_name?.toLowerCase().includes(query) ||
        p.team_member.email?.toLowerCase().includes(query)
      );
    }
    
    // Apply sort
    list.sort((a, b) => {
      const aName = `${a.team_member?.first_name || ''} ${a.team_member?.last_name || ''}`.trim().toLowerCase();
      const bName = `${b.team_member?.first_name || ''} ${b.team_member?.last_name || ''}`.trim().toLowerCase();
      
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
        default:
          return aName.localeCompare(bName);
      }
    });
    
    return list;
  }, [performanceArray, searchQuery, sortOption]);

  // Reset to page 1 when filters/sort change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOption]);

  // Pagination calculations (By Member)
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = showAll 
    ? filteredMembers 
    : filteredMembers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      );

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

  // Absence types that count against attendance
  const ABSENCE_EVENT_TYPES = ['no_call_no_show', 'dropped_shift_no_coverage', 'unexcused_absence'];

  // Calculate attendance metrics for selected member
  const attendanceMetrics = useMemo(() => {
    if (!selectedMember) return { absenceCount: 0, sickDays: 0, totalMissed: 0 };
    
    const absenceCount = selectedMember.events.filter(e => 
      'event_type' in e && ABSENCE_EVENT_TYPES.includes(e.event_type)
    ).length;
    const sickDays = selectedMember.time_off?.sick_days_used ?? 0;
    const totalMissed = absenceCount + sickDays;
    
    return { absenceCount, sickDays, totalMissed };
  }, [selectedMember]);

  // Build interleaved ledger: point events + sick day entries
  const interleavedLedger = useMemo(() => {
    if (!selectedMember) return [];

    // Start with real point events/reductions
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

    // Add sick day entries from time_off dates
    const sickDayDates = selectedMember.time_off?.sick_day_dates || [];
    sickDayDates.forEach((date, idx) => {
      entries.push({
        type: 'sick_day',
        id: `sick-${date}-${idx}`,
        event_date: date,
        data: { event_date: date },
      });
    });

    // Sort by date ascending (oldest first), then reversed for display
    entries.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

    return entries;
  }, [selectedMember]);

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
  // TEAM LEDGER DATA
  // =============================================================================

  // Build unified team ledger from all members
  const teamLedgerEntries = useMemo(() => {
    const entries: Array<{
      id: string;
      memberId: string;
      memberName: string;
      memberAvatar?: string | null;
      memberTier: 1 | 2 | 3;
      eventDate: string;
      eventType: string;
      eventLabel: string;
      points: number;
      notes?: string;
      isReduction: boolean;
      isSickDay: boolean;
      runningBalance: number;
      createdAt?: string;
    }> = [];

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

      // Add sick day entries from time_off
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

    // Sort by date descending (newest first)
    entries.sort((a, b) => {
      const dateCompare = new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      // Secondary sort by created_at for same-day entries
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return entries;
  }, [performanceArray]);

  // Filter team ledger entries
  const filteredLedgerEntries = useMemo(() => {
    let list = [...teamLedgerEntries];

    // Date range filter
    if (ledgerDateFrom) {
      list = list.filter(e => e.eventDate >= ledgerDateFrom);
    }
    if (ledgerDateTo) {
      list = list.filter(e => e.eventDate <= ledgerDateTo);
    }

    // Event type filter (demerit/merit)
    if (ledgerEventTypeFilter === 'demerit') {
      list = list.filter(e => !e.isReduction);
    } else if (ledgerEventTypeFilter === 'merit') {
      list = list.filter(e => e.isReduction);
    }

    // Member filter
    if (ledgerMemberFilter !== 'all') {
      list = list.filter(e => e.memberId === ledgerMemberFilter);
    }

    // Search filter
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

  // Ledger pagination
  const ledgerTotalPages = Math.ceil(filteredLedgerEntries.length / LEDGER_ITEMS_PER_PAGE);
  const paginatedLedgerEntries = filteredLedgerEntries.slice(
    (ledgerPage - 1) * LEDGER_ITEMS_PER_PAGE,
    ledgerPage * LEDGER_ITEMS_PER_PAGE
  );

  // Reset ledger page when filters change
  React.useEffect(() => {
    setLedgerPage(1);
  }, [ledgerDateFrom, ledgerDateTo, ledgerEventTypeFilter, ledgerMemberFilter, ledgerSearchQuery]);

  // Ledger stats
  const ledgerStats = useMemo(() => {
    const totalDemerits = filteredLedgerEntries.filter(e => !e.isReduction).length;
    const totalMerits = filteredLedgerEntries.filter(e => e.isReduction).length;
    const totalPoints = filteredLedgerEntries.reduce((sum, e) => sum + e.points, 0);
    return { totalDemerits, totalMerits, totalPoints };
  }, [filteredLedgerEntries]);

  // Group ledger entries by date for sticky headers
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
  // LEDGER ENTRY ACTIONS
  // =============================================================================

  /**
   * Modify an existing point event (reclassify)
   */
  const handleModifyEvent = async (
    entry: any,
    isReduction: boolean,
    newEventType: string,
    newPoints: number,
    memberForAction?: TeamMemberPerformance
  ) => {
    const member = memberForAction || selectedMember;
    if (!organizationId || !user || !member) return;
    
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
          team_member_id: member.team_member_id,
          name: `${member.team_member.first_name} ${member.team_member.last_name}`,
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
  const handleExcuseEntry = async (entry: any, isReduction: boolean, reason: string, memberForAction?: TeamMemberPerformance) => {
    const member = memberForAction || selectedMember;
    if (!organizationId || !user || !member) return;
    
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
          team_member_id: member.team_member_id,
          name: `${member.team_member.first_name} ${member.team_member.last_name}`,
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
  const handleRemoveEntry = async (entry: any, isReduction: boolean, memberForAction?: TeamMemberPerformance) => {
    const member = memberForAction || selectedMember;
    if (!organizationId || !user || !member) return;
    
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
          team_member_id: member.team_member_id,
          name: `${member.team_member.first_name} ${member.team_member.last_name}`,
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
      {showDiagnostics && <div className="text-xs text-gray-500 font-mono">src/features/team/components/TeamPerformance/components/PointsTab.tsx</div>}
      {/* Help Legend */}
      <ActionLegend context="points" />

      {/* View Mode Toggle - L5 Pill Design */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg border border-gray-700/30">
          <button
            onClick={() => {
              setViewMode('by_member');
              setSelectedMemberId(null);
            }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${viewMode === 'by_member'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-gray-400 hover:text-gray-300 border border-transparent'
              }
            `}
          >
            <Users className="w-4 h-4" />
            By Member
          </button>
          <button
            onClick={() => setViewMode('team_ledger')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${viewMode === 'team_ledger'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-gray-400 hover:text-gray-300 border border-transparent'
              }
            `}
          >
            <List className="w-4 h-4" />
            Team Ledger
          </button>
          {/* Gap Audit — Alpha/Omega only */}
          {(securityLevel === SECURITY_LEVELS.OMEGA || securityLevel === SECURITY_LEVELS.ALPHA) && (
            <button
              onClick={() => setViewMode('gap_audit')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${viewMode === 'gap_audit'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-gray-400 hover:text-gray-300 border border-transparent'
                }
              `}
            >
              <Search className="w-4 h-4" />
              Gap Audit
            </button>
          )}
        </div>

        {/* Cycle indicator */}
        {currentCycle && (
          <div className="text-xs text-gray-500">
            Cycle: {formatDateShort(currentCycle.start_date)} 
            {' - '}
            {formatDateForDisplay(currentCycle.end_date)}
          </div>
        )}
      </div>

      {/* =========================================================================
          BY MEMBER VIEW
          ========================================================================= */}
      {viewMode === 'by_member' && (
        <>
          {/* Member Selector */}
          <div className="flex flex-col sm:flex-row gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
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
                onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
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

          {/* Member Cards / Selection */}
          {!selectedMemberId ? (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedMembers.map((member) => (
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

              {paginatedMembers.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-500">No team members found</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
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
            </>
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

                {/* Attendance + Time Off Pills + Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Attendance Pill */}
                  <div
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                      border transition-all duration-200
                      ${attendanceMetrics.absenceCount === 0
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : attendanceMetrics.absenceCount <= 2
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }
                    `}
                    title={`Attendance: ${attendanceMetrics.absenceCount} unexcused absence(s) this cycle`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {attendanceMetrics.absenceCount === 0
                        ? 'No absences'
                        : `${attendanceMetrics.absenceCount} absence${attendanceMetrics.absenceCount !== 1 ? 's' : ''}`
                      }
                    </span>
                  </div>

                  {/* Sick Day Pill */}
                  <div
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                      border transition-all duration-200
                      ${selectedMember?.time_off && selectedMember.time_off.sick_days_used >= selectedMember.time_off.sick_days_available
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : selectedMember?.time_off && selectedMember.time_off.sick_days_used > 0
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-gray-700/30 border-gray-600/30 text-gray-400'
                      }
                    `}
                    title={`ESA Sick Days: ${selectedMember?.time_off?.sick_days_used ?? 0} of ${selectedMember?.time_off?.sick_days_available ?? 3} used`}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {selectedMember?.time_off?.sick_days_used ?? 0}/{selectedMember?.time_off?.sick_days_available ?? 3} sick
                    </span>
                  </div>

                  {/* Vacation Pill */}
                  <div
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                      border transition-all duration-200
                      ${selectedMember?.time_off && (selectedMember.time_off.vacation_hours_used || 0) >= (selectedMember.time_off.vacation_hours_available || 1)
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : selectedMember?.time_off && (selectedMember.time_off.vacation_hours_used || 0) > 0
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                          : 'bg-gray-700/30 border-gray-600/30 text-gray-400'
                      }
                    `}
                    title={`Vacation: ${selectedMember?.time_off?.vacation_hours_used ?? 0}h of ${selectedMember?.time_off?.vacation_hours_available ?? 0}h used`}
                  >
                    <Palmtree className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {selectedMember?.time_off?.vacation_hours_used ?? 0}h vacation
                    </span>
                  </div>

                  <div className="w-px h-6 bg-gray-700/50" />

                  {/* Action Buttons */}
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
                
                {interleavedLedger.length > 0 ? (
                  <div className="divide-y divide-gray-700/30">
                    {[...interleavedLedger].reverse().map((item) => {
                      // Sick day row — informational, no points
                      if (item.type === 'sick_day') {
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50"
                          >
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

                      // Regular point event or reduction
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
        </>
      )}

      {/* =========================================================================
          TEAM LEDGER VIEW
          ========================================================================= */}
      {viewMode === 'team_ledger' && (
        <div className="space-y-4">
          {/* Filters Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
            {/* Search */}
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
                <button
                  onClick={() => setLedgerSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={ledgerDateFrom}
                onChange={(e) => setLedgerDateFrom(e.target.value)}
                className="input bg-gray-800/50 border-gray-700/50 text-sm"
                placeholder="From"
              />
              <span className="text-gray-500">→</span>
              <input
                type="date"
                value={ledgerDateTo}
                onChange={(e) => setLedgerDateTo(e.target.value)}
                className="input bg-gray-800/50 border-gray-700/50 text-sm"
                placeholder="To"
              />
            </div>

            {/* Event Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={ledgerEventTypeFilter}
                onChange={(e) => setLedgerEventTypeFilter(e.target.value as 'all' | 'demerit' | 'merit')}
                className="input bg-gray-800/50 border-gray-700/50 text-sm"
              >
                <option value="all">All Events</option>
                <option value="demerit">Demerits Only</option>
                <option value="merit">Merits Only</option>
              </select>
            </div>

            {/* Member Filter */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <select
                value={ledgerMemberFilter}
                onChange={(e) => setLedgerMemberFilter(e.target.value)}
                className="input bg-gray-800/50 border-gray-700/50 text-sm min-w-[150px]"
              >
                <option value="all">All Members</option>
                {performanceArray
                  .sort((a, b) => 
                    `${a.team_member.first_name} ${a.team_member.last_name}`.localeCompare(
                      `${b.team_member.first_name} ${b.team_member.last_name}`
                    )
                  )
                  .map(m => (
                    <option key={m.team_member_id} value={m.team_member_id}>
                      {m.team_member.first_name} {m.team_member.last_name}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Clear Filters */}
            {(ledgerDateFrom || ledgerDateTo || ledgerEventTypeFilter !== 'all' || ledgerMemberFilter !== 'all' || ledgerSearchQuery) && (
              <button
                onClick={() => {
                  setLedgerDateFrom('');
                  setLedgerDateTo('');
                  setLedgerEventTypeFilter('all');
                  setLedgerMemberFilter('all');
                  setLedgerSearchQuery('');
                }}
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

          {/* Team Ledger Table */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-700/30 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Team Member</div>
              <div className="col-span-3">Event</div>
              <div className="col-span-1 text-right">Points</div>
              <div className="col-span-3">Notes</div>
            </div>

            {/* Table Body */}
            {filteredLedgerEntries.length > 0 ? (
              <div className="divide-y divide-gray-700/30">
                {Array.from(ledgerEntriesByDate.entries()).map(([date, entries]) => (
                  <React.Fragment key={date}>
                    {/* Date Header */}
                    <div className="px-4 py-2 bg-gray-800/50 sticky top-0 z-10">
                      <span className="text-xs font-medium text-gray-400">
                        {formatDateLong(date)}
                      </span>
                    </div>
                    
                    {/* Entries for this date */}
                    {entries.map((entry) => (
                      <TeamLedgerRow
                        key={entry.id}
                        entry={entry}
                        canManage={canManagePoints}
                        isProcessing={processingEntryId === entry.id}
                        onModify={(newType, newPoints) => {
                          const member = teamPerformance.get(entry.memberId);
                          if (member) {
                            handleModifyEvent(
                              { id: entry.id, event_type: entry.eventType, notes: entry.notes, event_date: entry.eventDate, points: entry.points },
                              entry.isReduction,
                              newType,
                              newPoints,
                              member
                            );
                          }
                        }}
                        onExcuse={(reason) => {
                          const member = teamPerformance.get(entry.memberId);
                          if (member) {
                            handleExcuseEntry(
                              { id: entry.id, event_type: entry.eventType, reduction_type: entry.eventType, notes: entry.notes, event_date: entry.eventDate, points: entry.points },
                              entry.isReduction,
                              reason,
                              member
                            );
                          }
                        }}
                        onRemove={() => {
                          const member = teamPerformance.get(entry.memberId);
                          if (member) {
                            handleRemoveEntry(
                              { id: entry.id, event_type: entry.eventType, reduction_type: entry.eventType, notes: entry.notes, event_date: entry.eventDate, points: entry.points },
                              entry.isReduction,
                              member
                            );
                          }
                        }}
                        onViewMember={() => {
                          setViewMode('by_member');
                          setSelectedMemberId(entry.memberId);
                        }}
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
                
                <span className="text-sm text-gray-400 min-w-[100px] text-center">
                  Page {ledgerPage} of {ledgerTotalPages}
                </span>
                
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
      )}

      {/* =========================================================================
          GAP AUDIT VIEW
          ========================================================================= */}
      {viewMode === 'gap_audit' && <GapScannerTab />}

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
// LEDGER ENTRY ROW SUB-COMPONENT (By Member View)
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
            {formatDateForDisplay(entry.event_date)}
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

// =============================================================================
// TEAM LEDGER ROW SUB-COMPONENT
// =============================================================================

interface TeamLedgerRowProps {
  entry: {
    id: string;
    memberId: string;
    memberName: string;
    memberAvatar?: string | null;
    memberTier: 1 | 2 | 3;
    eventDate: string;
    eventType: string;
    eventLabel: string;
    points: number;
    notes?: string;
    isReduction: boolean;
    isSickDay?: boolean;
  };
  canManage: boolean;
  isProcessing: boolean;
  onModify: (newType: string, newPoints: number) => void;
  onExcuse: (reason: string) => void;
  onRemove: () => void;
  onViewMember: () => void;
}

const TeamLedgerRow: React.FC<TeamLedgerRowProps> = ({
  entry,
  canManage,
  isProcessing,
  onModify,
  onExcuse,
  onRemove,
  onViewMember,
}) => {
  const [mode, setMode] = useState<'default' | 'modify' | 'excuse' | 'confirm_remove'>('default');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedPoints, setSelectedPoints] = useState(0);
  const [excuseReason, setExcuseReason] = useState('');

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

  const getTierBadgeColor = (tier: 1 | 2 | 3) => {
    switch (tier) {
      case 1: return 'bg-emerald-500/20 text-emerald-400';
      case 2: return 'bg-amber-500/20 text-amber-400';
      case 3: return 'bg-rose-500/20 text-rose-400';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-800/50 items-center">
      {/* Date - Hidden in grouped view since we have date headers */}
      <div className="col-span-2 text-sm text-gray-400">
        {formatDateShort(entry.eventDate)}
      </div>

      {/* Team Member */}
      <div className="col-span-3">
        <button
          onClick={onViewMember}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
            {entry.memberAvatar ? (
              <img src={entry.memberAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.memberId}`}
                alt=""
                className="w-full h-full"
              />
            )}
          </div>
          <span className="text-sm text-white truncate">{entry.memberName}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${getTierBadgeColor(entry.memberTier)}`}>
            T{entry.memberTier}
          </span>
        </button>
      </div>

      {/* Event Type */}
      <div className="col-span-3 flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          entry.isReduction ? 'bg-emerald-500/20' : 'bg-amber-500/20'
        }`}>
          {entry.isReduction 
            ? <TrendingDown className="w-3 h-3 text-emerald-400" />
            : <TrendingUp className="w-3 h-3 text-amber-400" />
          }
        </div>
        <span className="text-sm text-gray-300 truncate">{entry.eventLabel}</span>
      </div>

      {/* Points */}
      <div className="col-span-1 text-right">
        <span className={`text-sm font-medium ${
          entry.points > 0 ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          {entry.points > 0 ? '+' : ''}{entry.points}
        </span>
      </div>

      {/* Notes & Actions */}
      <div className="col-span-3 flex items-center justify-between gap-2">
        {mode === 'default' && (
          <>
            <span className="text-xs text-gray-500 truncate flex-1">
              {entry.notes || '—'}
            </span>
            
            {canManage && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {!entry.isReduction && (
                  <button
                    onClick={() => setMode('modify')}
                    disabled={isProcessing}
                    className="
                      flex items-center justify-center w-7 h-7 rounded-full
                      bg-gray-700/30 border border-gray-600/30
                      text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 hover:border-primary-500/30
                      transition-all duration-200 disabled:opacity-50
                    "
                    title="Reclassify"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setMode('excuse')}
                  disabled={isProcessing}
                  className="
                    flex items-center justify-center w-7 h-7 rounded-full
                    bg-gray-700/30 border border-gray-600/30
                    text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30
                    transition-all duration-200 disabled:opacity-50
                  "
                  title="Excuse"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMode('confirm_remove')}
                  disabled={isProcessing}
                  className="
                    flex items-center justify-center w-7 h-7 rounded-full
                    bg-gray-700/30 border border-gray-600/30
                    text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30
                    transition-all duration-200 disabled:opacity-50
                  "
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}

        {/* MODIFY MODE */}
        {mode === 'modify' && (
          <div className="flex items-center gap-1 w-full">
            <select
              value={selectedEventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="input text-xs py-1 flex-1 min-w-0"
              autoFocus
            >
              <option value="" disabled>Reclassify...</option>
              {DEMERIT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
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
              className="p-1 rounded bg-emerald-500/20 text-emerald-400"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={resetMode} className="p-1 rounded text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* EXCUSE MODE */}
        {mode === 'excuse' && (
          <div className="flex items-center gap-1 w-full">
            <select
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              className="input text-xs py-1 flex-1 min-w-0"
              autoFocus
            >
              <option value="" disabled>Reason...</option>
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
              className="p-1 rounded bg-emerald-500/20 text-emerald-400"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={resetMode} className="p-1 rounded text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* CONFIRM REMOVE MODE */}
        {mode === 'confirm_remove' && (
          <div className="flex items-center gap-1 w-full justify-end">
            <span className="text-xs text-rose-400">Remove?</span>
            <button
              onClick={() => {
                onRemove();
                resetMode();
              }}
              disabled={isProcessing}
              className="p-1 rounded bg-rose-500/20 text-rose-400"
            >
              {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={resetMode} className="p-1 rounded text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsTab;
