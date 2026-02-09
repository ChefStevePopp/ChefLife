/**
 * ImportTab - Attendance Audit & Staging
 * 
 * AUDIT ROLE: Import CSVs → Run Delta Engine → Show what happened → Stage new events.
 * LEDGER ROLE lives in Team tab: Approve, excuse, reject, allocate points.
 * 
 * This is the journal entry. Team tab is the general ledger.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RefreshCw,
  Check,
  X,
  Info,
  Calendar,
  Users,
  Filter,
  Send,
  Trash2,
  Zap,
  FileDown,
  ScanSearch,
  Ban,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { useTeamStore } from '@/stores/teamStore';
import { usePerformanceStore } from '@/stores/performanceStore';
import { nexus } from '@/lib/nexus';
import toast from 'react-hot-toast';
import {
  calculateDeltas,
  configToThresholds,
  formatVariance,
  type ImportResult,
  type ShiftDelta,
  type DetectedEvent,
  type TrackingRules,
  type EmployeeSecurityMap,
  DEFAULT_TRACKING_RULES,
} from '../../services/deltaEngine';
import { ActionLegend } from '../TeamPerformance/components/ActionLegend';

// =============================================================================
// TYPES
// =============================================================================

interface CSVFile {
  name: string;
  content: string;
  rowCount: number;
  dateRange?: { start: string; end: string };
}

interface DateRangeMismatch {
  scheduled: { start: string; end: string };
  worked: { start: string; end: string };
  overlap: { start: string; end: string };
  scheduledOnly: number;
  workedOnly: number;
}

/** Where a duplicate was found — or 'new' if it's fresh */
type DuplicateStatus = 'new' | 'staged' | 'approved' | 'reduction';

/** Read-only audit event with dedup tagging */
interface AuditEvent extends DetectedEvent {
  duplicateOf: DuplicateStatus;
}

/** Delta row for audit display — no review actions */
interface AuditDelta extends ShiftDelta {
  auditEvents: AuditEvent[];
  expanded: boolean;
}

interface LastImportInfo {
  date: string;
  userName: string;
  dateRange?: { start: string; end: string };
  eventCount?: number;
}

/** Dedup summary after pre-flight check */
interface DedupSummary {
  newCount: number;
  stagedCount: number;
  approvedCount: number;
  reductionCount: number;
  unmatchedEmployees: string[];
}

// Reduction type mapping (delta engine event_type → approved reduction_type)
const REDUCTION_TYPE_MAP: Record<string, string> = {
  'stayed_late': 'stay_late',
  'arrived_early': 'arrive_early',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ImportTab: React.FC = () => {
  const { showDiagnostics } = useDiagnostics();
  const { organizationId, user } = useAuth();
  const { members } = useTeamStore();
  const { config, fetchConfig } = usePerformanceStore();
  
  // UI state
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  
  // File state
  const [scheduledFile, setScheduledFile] = useState<CSVFile | null>(null);
  const [workedFile, setWorkedFile] = useState<CSVFile | null>(null);
  
  // Date range mismatch
  const [dateRangeMismatch, setDateRangeMismatch] = useState<DateRangeMismatch | null>(null);
  const [trimToOverlap, setTrimToOverlap] = useState<boolean>(true);
  
  // Import / audit state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [auditDeltas, setAuditDeltas] = useState<AuditDelta[]>([]);
  const [dedupSummary, setDedupSummary] = useState<DedupSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStaging, setIsStaging] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'events_only' | 'new_only' | 'no_show'>('events_only');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  
  // Staged events (for clear action)
  const [stagedCount, setStagedCount] = useState<number>(0);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Last import metadata
  const [lastImport, setLastImport] = useState<LastImportInfo | null>(null);
  
  // File input refs
  const scheduledInputRef = useRef<HTMLInputElement>(null);
  const workedInputRef = useRef<HTMLInputElement>(null);

  // =============================================================================
  // FETCH STAGED COUNT
  // =============================================================================

  const fetchStagedCount = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { count, error } = await supabase
        .from('staged_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      if (!error && count !== null) setStagedCount(count);
    } catch (err) {
      console.error('Error fetching staged count:', err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchStagedCount(); }, [fetchStagedCount]);

  // =============================================================================
  // FETCH LAST IMPORT METADATA
  // =============================================================================

  const fetchLastImport = useCallback(async () => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('created_at, details')
        .eq('organization_id', organizationId)
        .eq('activity_type', 'performance_events_staged')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setLastImport({
          date: data.created_at,
          userName: data.details?.user_name || 'Unknown',
          dateRange: data.details?.date_range || undefined,
          eventCount: data.details?.event_count || undefined,
        });
      }
    } catch (err) {
      console.error('Error fetching last import:', err);
    }
  }, [organizationId]);

  useEffect(() => { fetchLastImport(); }, [fetchLastImport]);

  // =============================================================================
  // CLEAR STAGED EVENTS
  // =============================================================================

  const clearAllStagedEvents = async () => {
    if (!organizationId || !user) return;
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('staged_events')
        .delete()
        .eq('organization_id', organizationId);
      if (error) throw error;

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_staged_cleared',
        details: { cleared_count: stagedCount },
      });

      setStagedCount(0);
      setShowClearConfirm(false);
      toast.success(`Cleared ${stagedCount} staged events`);
    } catch (err: any) {
      console.error('Error clearing staged events:', err);
      toast.error(`Failed to clear: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  // =============================================================================
  // DATE RANGE HELPERS
  // =============================================================================

  const extractDateRange = (csvContent: string): { start: string; end: string } | null => {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) return null;
      const cols = lines[0].toLowerCase().split(',').map(c => c.replace(/["']/g, '').trim());
      const dateIndex = cols.findIndex(c => c === 'date');
      if (dateIndex === -1) return null;

      const dates: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const dateStr = line.split(',').map(v => v.replace(/["']/g, '').trim())[dateIndex];
        if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dates.push(dateStr);
      }
      if (dates.length === 0) return null;
      dates.sort();
      return { start: dates[0], end: dates[dates.length - 1] };
    } catch (e) {
      console.error('Error extracting date range:', e);
      return null;
    }
  };

  const detectMismatch = useCallback(() => {
    if (!scheduledFile?.dateRange || !workedFile?.dateRange) {
      setDateRangeMismatch(null);
      return;
    }
    const sched = scheduledFile.dateRange;
    const work = workedFile.dateRange;
    if (sched.start === work.start && sched.end === work.end) {
      setDateRangeMismatch(null);
      return;
    }
    const overlapStart = sched.start > work.start ? sched.start : work.start;
    const overlapEnd = sched.end < work.end ? sched.end : work.end;
    const daysDiff = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000));
    const scheduledOnly = Math.max(0, daysDiff(work.end, sched.end)) + Math.max(0, daysDiff(sched.start, work.start));
    const workedOnly = Math.max(0, daysDiff(sched.end, work.end)) + Math.max(0, daysDiff(work.start, sched.start));
    setDateRangeMismatch({ scheduled: sched, worked: work, overlap: { start: overlapStart, end: overlapEnd }, scheduledOnly, workedOnly });
  }, [scheduledFile?.dateRange, workedFile?.dateRange]);

  useEffect(() => { detectMismatch(); }, [detectMismatch]);

  // =============================================================================
  // FILE HANDLING
  // =============================================================================

  const handleFileSelect = useCallback(async (
    file: File,
    setFile: React.Dispatch<React.SetStateAction<CSVFile | null>>
  ) => {
    const content = await file.text();
    const rowCount = content.split('\n').filter(line => line.trim()).length - 1;
    const dateRange = extractDateRange(content);
    setFile({ name: file.name, content, rowCount, dateRange: dateRange || undefined });
  }, []);

  const handleDrop = useCallback((
    e: React.DragEvent,
    setFile: React.Dispatch<React.SetStateAction<CSVFile | null>>
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFileSelect(file, setFile);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  // =============================================================================
  // PRE-FLIGHT DEDUP CHECK
  // =============================================================================

  /**
   * After Delta Engine produces results, check all three tables and tag
   * each detected event as 'new', 'staged', 'approved', or 'reduction'.
   * This happens BEFORE the user sees anything — no wasted review time.
   */
  const runDedupCheck = useCallback(async (
    deltas: ShiftDelta[]
  ): Promise<{ auditDeltas: AuditDelta[]; summary: DedupSummary }> => {
    // Build employee ID map (punch_id → team_member_id)
    const employeeIdMap = new Map<string, string>();
    members.forEach(m => {
      if (m.punch_id) employeeIdMap.set(m.punch_id, m.id);
    });

    // Collect all events that need checking
    const allEvents: Array<{ teamMemberId: string | null; employeeId: string; eventDate: string; eventType: string }> = [];
    const unmatchedEmployees: string[] = [];

    for (const delta of deltas) {
      const teamMemberId = employeeIdMap.get(delta.employeeId) || null;
      if (!teamMemberId && delta.events.length > 0) {
        const label = `${delta.employeeName} (${delta.employeeId})`;
        if (!unmatchedEmployees.includes(label)) unmatchedEmployees.push(label);
      }
      for (const event of delta.events) {
        allEvents.push({ teamMemberId, employeeId: delta.employeeId, eventDate: delta.date, eventType: event.type });
      }
    }

    // Get unique IDs and dates for batch query
    const teamMemberIds = [...new Set(allEvents.map(e => e.teamMemberId).filter(Boolean))] as string[];
    const eventDates = [...new Set(allEvents.map(e => e.eventDate))];

    // Batch fetch existing records (only if we have matched employees)
    let stagedSet = new Set<string>();
    let eventsSet = new Set<string>();
    let reductionsSet = new Set<string>();

    if (teamMemberIds.length > 0 && eventDates.length > 0 && organizationId) {
      const [stagedRes, eventsRes, reductionsRes] = await Promise.all([
        supabase
          .from('staged_events')
          .select('team_member_id, event_date, event_type')
          .eq('organization_id', organizationId)
          .in('team_member_id', teamMemberIds)
          .in('event_date', eventDates),
        supabase
          .from('performance_point_events')
          .select('team_member_id, event_date, event_type')
          .eq('organization_id', organizationId)
          .in('team_member_id', teamMemberIds)
          .in('event_date', eventDates),
        supabase
          .from('performance_point_reductions')
          .select('team_member_id, event_date, reduction_type')
          .eq('organization_id', organizationId)
          .in('team_member_id', teamMemberIds)
          .in('event_date', eventDates),
      ]);

      stagedSet = new Set((stagedRes.data || []).map(e => `${e.team_member_id}|${e.event_date}|${e.event_type}`));
      eventsSet = new Set((eventsRes.data || []).map(e => `${e.team_member_id}|${e.event_date}|${e.event_type}`));
      reductionsSet = new Set((reductionsRes.data || []).map(e => `${e.team_member_id}|${e.event_date}|${e.reduction_type}`));
    }

    // Tag each event
    let newCount = 0, stagedDupCount = 0, approvedDupCount = 0, reductionDupCount = 0;

    const auditDeltas: AuditDelta[] = deltas.map(delta => {
      const teamMemberId = employeeIdMap.get(delta.employeeId);

      const auditEvents: AuditEvent[] = delta.events.map(event => {
        if (!teamMemberId) {
          // Can't check — treat as new (will fail at staging with unmatched warning)
          newCount++;
          return { ...event, duplicateOf: 'new' as DuplicateStatus };
        }

        const key = `${teamMemberId}|${delta.date}|${event.type}`;
        const reductionKey = `${teamMemberId}|${delta.date}|${REDUCTION_TYPE_MAP[event.type] || event.type}`;

        if (stagedSet.has(key)) {
          stagedDupCount++;
          return { ...event, duplicateOf: 'staged' as DuplicateStatus };
        }
        if (eventsSet.has(key)) {
          approvedDupCount++;
          return { ...event, duplicateOf: 'approved' as DuplicateStatus };
        }
        if (reductionsSet.has(reductionKey)) {
          reductionDupCount++;
          return { ...event, duplicateOf: 'reduction' as DuplicateStatus };
        }

        newCount++;
        return { ...event, duplicateOf: 'new' as DuplicateStatus };
      });

      return {
        ...delta,
        auditEvents,
        expanded: auditEvents.some(e => e.duplicateOf === 'new'), // Only auto-expand if has new events
      };
    });

    const summary: DedupSummary = {
      newCount,
      stagedCount: stagedDupCount,
      approvedCount: approvedDupCount,
      reductionCount: reductionDupCount,
      unmatchedEmployees,
    };

    return { auditDeltas, summary };
  }, [members, organizationId]);

  // =============================================================================
  // IMPORT & PROCESSING
  // =============================================================================

  const processImport = useCallback(async () => {
    if (!scheduledFile || !workedFile) return;
    setIsProcessing(true);

    const thresholds = configToThresholds(config.detection_thresholds);
    const trackingRules: TrackingRules = config.tracking_rules ?? DEFAULT_TRACKING_RULES;

    const employeeSecurityMap: EmployeeSecurityMap = new Map();
    members.forEach(m => {
      if (m.punch_id && m.security_level !== undefined) {
        employeeSecurityMap.set(m.punch_id, m.security_level);
      }
    });

    const dateFilter = (trimToOverlap && dateRangeMismatch) ? dateRangeMismatch.overlap : undefined;

    try {
      // 1. Run Delta Engine
      const result = calculateDeltas(
        scheduledFile.content,
        workedFile.content,
        thresholds,
        trackingRules,
        employeeSecurityMap,
        dateFilter
      );
      setImportResult(result);

      // 2. Pre-flight dedup check
      const { auditDeltas: tagged, summary } = await runDedupCheck(result.deltas);
      setAuditDeltas(tagged);
      setDedupSummary(summary);

      // 3. Log to NEXUS
      if (organizationId && user) {
        const totalEvents = result.deltas.reduce((acc, d) => acc + d.events.length, 0);
        await nexus({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'performance_import_processed',
          details: {
            scheduled_count: result.scheduledCount,
            worked_count: result.workedCount,
            matched_count: result.matchedCount,
            no_show_count: result.noShowCount,
            exempt_count: result.exemptCount,
            events_detected: totalEvents,
            new_events: summary.newCount,
            duplicate_events: summary.stagedCount + summary.approvedCount + summary.reductionCount,
            date_range: result.dateRange,
          },
        });
      }

      if (result.exemptCount > 0) {
        console.log(`Skipped ${result.exemptCount} shifts (exempt employees)`);
      }
    } catch (err) {
      console.error('Error processing import:', err);
      toast.error('Import processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [scheduledFile, workedFile, config.detection_thresholds, config.tracking_rules, members, organizationId, user, trimToOverlap, dateRangeMismatch, runDedupCheck]);

  const resetImport = () => {
    setScheduledFile(null);
    setWorkedFile(null);
    setImportResult(null);
    setAuditDeltas([]);
    setDedupSummary(null);
    setDateRangeMismatch(null);
    setTrimToOverlap(true);
  };

  // =============================================================================
  // STAGE ALL NEW — bulk push to staged_events, skip duplicates
  // =============================================================================

  const stageAllNew = async () => {
    if (!organizationId || !user) {
      toast.error('Not authenticated');
      return;
    }

    setIsStaging(true);
    const batchId = crypto.randomUUID();

    try {
      const employeeIdMap = new Map<string, string>();
      members.forEach(m => {
        if (m.punch_id) employeeIdMap.set(m.punch_id, m.id);
      });

      const stagedEvents: any[] = [];
      const errors: string[] = [];

      for (const delta of auditDeltas) {
        const newEvents = delta.auditEvents.filter(e => e.duplicateOf === 'new');
        if (newEvents.length === 0) continue;

        const teamMemberId = employeeIdMap.get(delta.employeeId);
        if (!teamMemberId) {
          errors.push(`${delta.employeeName}: No matching employee ID (${delta.employeeId})`);
          continue;
        }

        for (const event of newEvents) {
          stagedEvents.push({
            organization_id: organizationId,
            team_member_id: teamMemberId,
            event_type: event.type,
            suggested_points: event.suggestedPoints,
            description: event.description,
            event_date: delta.date,
            role: delta.role,
            scheduled_in: delta.scheduledIn?.toISOString() || null,
            scheduled_out: delta.scheduledOut?.toISOString() || null,
            worked_in: delta.workedIn?.toISOString() || null,
            worked_out: delta.workedOut?.toISOString() || null,
            start_variance: delta.startVariance,
            end_variance: delta.endVariance,
            source: 'import',
            import_batch_id: batchId,
            external_employee_id: delta.employeeId,
            created_by: user.id,
          });
        }
      }

      if (stagedEvents.length === 0) {
        if (errors.length > 0) {
          toast.error(`No events staged. ${errors.length} employees unmatched.`);
        } else {
          toast('Nothing new to stage — all events already processed.', { icon: 'ℹ️' });
        }
        setIsStaging(false);
        return;
      }

      const { error } = await supabase.from('staged_events').insert(stagedEvents);
      if (error) throw error;

      // NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_events_staged',
        details: {
          event_count: stagedEvents.length,
          skipped_duplicates: (dedupSummary?.stagedCount || 0) + (dedupSummary?.approvedCount || 0) + (dedupSummary?.reductionCount || 0),
          batch_id: batchId,
          date_range: importResult?.dateRange,
          skipped_unmatched: errors.length,
        },
      });

      let message = `${stagedEvents.length} event${stagedEvents.length !== 1 ? 's' : ''} staged for Team review`;
      if (errors.length > 0) {
        message += ` • ${errors.length} unmatched`;
        toast(message, { icon: '⚠️', duration: 5000 });
      } else {
        toast.success(message + ' 🎉');
      }

      await fetchStagedCount();
      await fetchLastImport();
      resetImport();
    } catch (err: any) {
      console.error('Error staging events:', err);
      toast.error(`Failed to stage: ${err.message}`);
    } finally {
      setIsStaging(false);
    }
  };

  // =============================================================================
  // TOGGLE EXPAND
  // =============================================================================

  const toggleExpanded = (deltaKey: string) => {
    setAuditDeltas(prev => prev.map(d =>
      d.matchKey === deltaKey ? { ...d, expanded: !d.expanded } : d
    ));
  };

  // =============================================================================
  // FILTERING
  // =============================================================================

  const filteredDeltas = auditDeltas.filter(delta => {
    if (filterStatus === 'events_only' && delta.auditEvents.length === 0) return false;
    if (filterStatus === 'new_only' && !delta.auditEvents.some(e => e.duplicateOf === 'new')) return false;
    if (filterStatus === 'no_show' && delta.status !== 'no_show') return false;
    if (filterEmployee && !delta.employeeName.toLowerCase().includes(filterEmployee.toLowerCase())) return false;
    return true;
  });

  const uniqueEmployees = [...new Set(auditDeltas.map(d => d.employeeName))].sort();
  const totalDuplicates = (dedupSummary?.stagedCount || 0) + (dedupSummary?.approvedCount || 0) + (dedupSummary?.reductionCount || 0);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        {showDiagnostics && <div className="text-xs text-gray-500 font-mono">src/features/team/components/ImportTab/index.tsx</div>}
        <div className="subheader">
          <div className="subheader-row">
            <div className="subheader-left">
              <div className="w-10 h-10 rounded-lg bg-gray-700/50 animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-48 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-4 w-72 bg-gray-700/30 rounded animate-pulse" />
              </div>
            </div>
            <div className="subheader-right">
              <div className="h-10 w-20 bg-gray-700/30 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 rounded-lg bg-gray-800/30 border-2 border-dashed border-gray-700/50 animate-pulse" />
          <div className="h-32 rounded-lg bg-gray-800/30 border-2 border-dashed border-gray-700/50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showDiagnostics && <div className="text-xs text-gray-500 font-mono">src/features/team/components/ImportTab/index.tsx</div>}

      {/* L5 Subheader */}
      <div className="subheader">
        <div className="subheader-row">
          <div className="subheader-left">
            <div className="subheader-icon-box primary">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="subheader-title">Attendance Audit</h3>
              <p className="subheader-subtitle">Import shift data from 7shifts, detect events, and stage for Team review</p>
            </div>
          </div>
          <div className="subheader-right">
            {stagedCount > 0 && (
              <>
                <div className="subheader-toggle">
                  <div className="subheader-toggle-icon">
                    <span className="text-sm font-medium text-gray-400">{stagedCount}</span>
                  </div>
                  <span className="subheader-toggle-label">Staged</span>
                </div>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="btn-ghost-red text-sm flex items-center gap-1.5 py-1.5 px-3"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className={`subheader-info expandable-info-section ${isInfoExpanded ? 'expanded' : ''}`}>
          <button
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">How Import Works</span>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${isInfoExpanded ? '' : 'rotate-180'}`} />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                Import <span className="font-semibold">Scheduled Hours</span> and <span className="font-semibold">Worked Hours</span> CSV
                exports from 7shifts. The Delta Engine compares them and detects attendance events.
                New events are staged for the <span className="font-semibold text-primary-400">Team tab</span> where
                all point decisions (approve, excuse, reject) are made.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="subheader-feature-card">
                  <FileDown className="w-4 h-4 text-primary-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Export from 7shifts</span>
                    <p className="subheader-feature-desc">Time Clocking → Reports → Export as CSV</p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <Zap className="w-4 h-4 text-primary-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Delta Engine</span>
                    <p className="subheader-feature-desc">Compares scheduled vs. worked, flags events & duplicates</p>
                  </div>
                </div>
                <div className="subheader-feature-card">
                  <ScanSearch className="w-4 h-4 text-primary-400/80" />
                  <div>
                    <span className="subheader-feature-title text-gray-300">Stage → Team Tab</span>
                    <p className="subheader-feature-desc">New events staged. Approve/excuse/reject happens in Team.</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                This tab is the audit journal. The Team tab is the ledger where points are allocated.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Legend */}
      <ActionLegend context="import" />

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Clear Staged Events?</h3>
                <p className="text-sm text-gray-400">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-6">
              This will permanently delete <strong className="text-white">{stagedCount} staged events</strong> that
              are pending review in the Team tab. Use this to clear bad imports before re-running.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowClearConfirm(false)} disabled={isClearing} className="btn-ghost text-sm py-2 px-4">Cancel</button>
              <button onClick={clearAllStagedEvents} disabled={isClearing} className="btn-primary text-sm py-2 px-4 !bg-rose-500 hover:!bg-rose-600 flex items-center gap-2">
                {isClearing ? <><RefreshCw className="w-4 h-4 animate-spin" />Clearing...</> : <><Trash2 className="w-4 h-4" />Clear All Staged</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FILE UPLOAD SECTION                                               */}
      {/* ================================================================= */}
      {!importResult && (
        <div className="space-y-4">
          {/* Last Import Header */}
          {lastImport && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Last import: <span className="text-gray-400">{new Date(lastImport.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {lastImport.userName && <> by <span className="text-gray-400">{lastImport.userName}</span></>}
                </span>
              </div>
              {lastImport.dateRange && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Covered: <span className="text-gray-400">{lastImport.dateRange.start} → {lastImport.dateRange.end}</span></span>
                  {lastImport.eventCount !== undefined && <><span className="text-gray-600">•</span><span><span className="text-gray-400">{lastImport.eventCount}</span> events staged</span></>}
                </div>
              )}
            </div>
          )}

          {/* Drop Zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scheduled Hours */}
            <div
              onDrop={(e) => handleDrop(e, setScheduledFile)}
              onDragOver={handleDragOver}
              onClick={() => scheduledInputRef.current?.click()}
              className={`relative p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
                scheduledFile ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-gray-700 hover:border-primary-500/50 hover:bg-gray-800/30'
              }`}
            >
              <input ref={scheduledInputRef} type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], setScheduledFile)} className="hidden" />
              <div className="text-center">
                {scheduledFile ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">{scheduledFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{scheduledFile.rowCount} shifts</p>
                    {scheduledFile.dateRange && <p className="text-xs text-gray-500 mt-0.5">{scheduledFile.dateRange.start} → {scheduledFile.dateRange.end}</p>}
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-300">Scheduled Hours CSV</p>
                    <p className="text-xs text-gray-500 mt-1">Drop file or click to browse</p>
                  </>
                )}
              </div>
            </div>

            {/* Worked Hours */}
            <div
              onDrop={(e) => handleDrop(e, setWorkedFile)}
              onDragOver={handleDragOver}
              onClick={() => workedInputRef.current?.click()}
              className={`relative p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
                workedFile ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-gray-700 hover:border-primary-500/50 hover:bg-gray-800/30'
              }`}
            >
              <input ref={workedInputRef} type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], setWorkedFile)} className="hidden" />
              <div className="text-center">
                {workedFile ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">{workedFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{workedFile.rowCount} shifts</p>
                    {workedFile.dateRange && <p className="text-xs text-gray-500 mt-0.5">{workedFile.dateRange.start} → {workedFile.dateRange.end}</p>}
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-300">Worked Hours CSV</p>
                    <p className="text-xs text-gray-500 mt-1">Drop file or click to browse</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Empty State Guidance */}
          {!scheduledFile && !workedFile && stagedCount === 0 && (
            <div className="card p-8 text-center">
              <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Ready to Audit Shift Data</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto mb-4">
                Drop your <span className="font-semibold text-gray-300">Scheduled Hours</span> and <span className="font-semibold text-gray-300">Worked Hours</span> CSV
                files above. The Delta Engine detects attendance events and checks for duplicates before staging anything.
              </p>
              <p className="text-xs text-gray-500">
                First time? Expand <span className="text-primary-400">How Import Works</span> above for guidance.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Date Range Mismatch Warning */}
      {!importResult && dateRangeMismatch && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-400 mb-2">Date Range Mismatch Detected</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-gray-500 mb-0.5">Scheduled</p>
                  <p className="text-gray-300">{dateRangeMismatch.scheduled.start} → {dateRangeMismatch.scheduled.end}</p>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-gray-500 mb-0.5">Worked</p>
                  <p className="text-gray-300">{dateRangeMismatch.worked.start} → {dateRangeMismatch.worked.end}</p>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-gray-500 mb-0.5">Overlap</p>
                  <p className="text-emerald-400">{dateRangeMismatch.overlap.start} → {dateRangeMismatch.overlap.end}</p>
                </div>
              </div>
              {dateRangeMismatch.workedOnly > 0 && (
                <p className="text-xs text-gray-400 mb-3">
                  <span className="text-amber-400">{dateRangeMismatch.workedOnly} extra days</span> in Worked file will appear as "unscheduled work" if not trimmed.
                </p>
              )}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="trimOption" checked={trimToOverlap} onChange={() => setTrimToOverlap(true)} className="w-4 h-4 text-primary-500 bg-gray-800 border-gray-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-300">Trim to overlap <span className="text-gray-500">(recommended)</span></span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="trimOption" checked={!trimToOverlap} onChange={() => setTrimToOverlap(false)} className="w-4 h-4 text-primary-500 bg-gray-800 border-gray-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-300">Process all dates</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Button */}
      {!importResult && scheduledFile && workedFile && (
        <div className="flex justify-center">
          <button onClick={processImport} disabled={isProcessing} className="btn-primary flex items-center gap-2 px-6">
            {isProcessing
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</>
              : <><Zap className="w-4 h-4" />Run Delta Engine</>
            }
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* AUDIT RESULTS                                                     */}
      {/* ================================================================= */}
      {importResult && dedupSummary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard icon={Calendar} label="Date Range" value={`${importResult.dateRange.start} → ${importResult.dateRange.end}`} small />
            <SummaryCard icon={CheckCircle2} label="Matched" value={importResult.matchedCount} />
            <SummaryCard icon={XCircle} label="No Shows" value={importResult.noShowCount} highlight={importResult.noShowCount > 0 ? 'rose' : undefined} />
            <SummaryCard icon={Zap} label="New Events" value={dedupSummary.newCount} highlight={dedupSummary.newCount > 0 ? 'emerald' : undefined} />
            <SummaryCard icon={Ban} label="Already Processed" value={totalDuplicates} highlight={totalDuplicates > 0 ? 'amber' : undefined} />
          </div>

          {/* Exempt + Unmatched warnings */}
          {(importResult.exemptCount > 0 || dedupSummary.unmatchedEmployees.length > 0 || importResult.filteredCount > 0) && (
            <div className="flex flex-wrap gap-3 text-xs">
              {importResult.exemptCount > 0 && (
                <span className="text-gray-500"><Users className="w-3.5 h-3.5 inline mr-1" />{importResult.exemptCount} exempt shifts skipped</span>
              )}
              {importResult.filteredCount > 0 && (
                <span className="text-gray-500"><XCircle className="w-3.5 h-3.5 inline mr-1" />{importResult.filteredCount} clock errors filtered</span>
              )}
              {dedupSummary.unmatchedEmployees.length > 0 && (
                <span className="text-amber-400"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />{dedupSummary.unmatchedEmployees.length} unmatched employee{dedupSummary.unmatchedEmployees.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}

          {/* Filters & Actions */}
          <div className="card flex flex-wrap items-center justify-between gap-3 !rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="input text-sm py-1.5">
                  <option value="all">All Shifts</option>
                  <option value="events_only">With Events Only</option>
                  <option value="new_only">New Events Only</option>
                  <option value="no_show">No Shows Only</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="input text-sm py-1.5">
                  <option value="">All Employees</option>
                  {uniqueEmployees.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={resetImport} className="btn-ghost text-sm flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" />
              New Import
            </button>
          </div>

          {/* Audit Delta List */}
          <div className="space-y-2">
            {filteredDeltas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No shifts match the current filters</div>
            ) : (
              filteredDeltas.map(delta => (
                <AuditDeltaRow
                  key={delta.matchKey}
                  delta={delta}
                  onToggle={() => toggleExpanded(delta.matchKey)}
                />
              ))
            )}
          </div>

          {/* Stage All New — floating action bar */}
          {dedupSummary.newCount > 0 && (
            <div className="floating-action-bar">
              <div className="floating-action-bar-inner">
                <div className="floating-action-bar-content">
                  <span className="text-sm text-gray-300">
                    {dedupSummary.newCount} new event{dedupSummary.newCount !== 1 ? 's' : ''} detected
                    {totalDuplicates > 0 && <span className="text-gray-500 ml-2">({totalDuplicates} already processed)</span>}
                  </span>
                  <button onClick={stageAllNew} disabled={isStaging} className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5">
                    {isStaging
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Staging...</>
                      : <><Send className="w-3.5 h-3.5" />Stage All New for Team Review</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* All duplicates — no action needed */}
          {dedupSummary.newCount === 0 && totalDuplicates > 0 && (
            <div className="card p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">All Events Already Processed</h3>
              <p className="text-sm text-gray-400">
                Every attendance event from this import has already been staged or decided.
                Nothing new to send to the Team tab.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const SummaryCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  small?: boolean;
  highlight?: 'rose' | 'amber' | 'emerald';
}> = ({ icon: Icon, label, value, small, highlight }) => (
  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-gray-500" />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <p className={`${small ? 'text-xs' : 'text-lg'} font-semibold ${
      highlight === 'rose' ? 'text-rose-400' :
      highlight === 'amber' ? 'text-amber-400' :
      highlight === 'emerald' ? 'text-emerald-400' :
      'text-white'
    }`}>{value}</p>
  </div>
);

/** Read-only audit row — shows delta + events with duplicate status */
const AuditDeltaRow: React.FC<{
  delta: AuditDelta;
  onToggle: () => void;
}> = ({ delta, onToggle }) => {
  const hasEvents = delta.auditEvents.length > 0;
  const newEvents = delta.auditEvents.filter(e => e.duplicateOf === 'new');
  const dupEvents = delta.auditEvents.filter(e => e.duplicateOf !== 'new');

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Header Row */}
      <button
        onClick={onToggle}
        disabled={!hasEvents}
        className={`w-full flex items-center justify-between p-3 text-left ${hasEvents ? 'hover:bg-gray-700/30 cursor-pointer' : 'cursor-default'} transition-colors`}
      >
        <div className="flex items-center gap-3">
          {hasEvents ? (
            delta.expanded
              ? <ChevronDown className="w-4 h-4 text-gray-500" />
              : <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <div className="w-4 h-4" />
          )}
          <div>
            <p className="text-sm font-medium text-white">{delta.employeeName}</p>
            <p className="text-xs text-gray-500">{delta.date} • {delta.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Display */}
          {delta.status === 'matched' && (
            <div className="text-right text-xs">
              <div className="text-gray-400">
                <span className="text-gray-500 mr-1">In:</span>
                {delta.startVariance === 0 ? (
                  <>{delta.scheduledIn && formatTimeShort(delta.scheduledIn)} <Check className="w-3 h-3 inline text-emerald-400" /></>
                ) : (
                  <>
                    {delta.scheduledIn && formatTimeShort(delta.scheduledIn)} → {delta.workedIn && formatTimeShort(delta.workedIn)}
                    <span className={`ml-1 ${delta.startVariance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>({formatVariance(delta.startVariance)})</span>
                  </>
                )}
              </div>
              <div className="text-gray-400">
                <span className="text-gray-500 mr-1">Out:</span>
                {delta.endVariance === 0 ? (
                  <>{delta.scheduledOut && formatTimeShort(delta.scheduledOut)} <Check className="w-3 h-3 inline text-emerald-400" /></>
                ) : (
                  <>
                    {delta.scheduledOut && formatTimeShort(delta.scheduledOut)} → {delta.workedOut && formatTimeShort(delta.workedOut)}
                    <span className={`ml-1 ${delta.endVariance < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>({formatVariance(delta.endVariance)})</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Status Badge */}
          <span className="text-xs font-medium">
            {delta.status === 'no_show' && <span className="text-rose-400">No Show</span>}
            {delta.status === 'matched' && hasEvents && (
              <span className="flex items-center gap-2">
                {newEvents.length > 0 && <span className="text-emerald-400">{newEvents.length} New</span>}
                {dupEvents.length > 0 && <span className="text-gray-500">{dupEvents.length} Dup</span>}
              </span>
            )}
            {delta.status === 'matched' && !hasEvents && <span className="text-emerald-400">OK</span>}
            {delta.status === 'unscheduled' && <span className="text-gray-400">Unscheduled</span>}
          </span>
        </div>
      </button>

      {/* Expanded Events — read-only audit view */}
      {hasEvents && delta.expanded && (
        <div className="border-t border-gray-700/50 p-3 pl-10 space-y-1.5">
          {delta.auditEvents.map((event, idx) => (
            <AuditEventRow key={idx} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Read-only event display with dedup badge */
const AuditEventRow: React.FC<{ event: AuditEvent }> = ({ event }) => {
  const isReduction = event.suggestedPoints < 0;
  const isDuplicate = event.duplicateOf !== 'new';

  const dupLabel: Record<DuplicateStatus, string> = {
    new: '',
    staged: 'Already Staged',
    approved: 'Already Approved',
    reduction: 'Already Approved',
  };

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg bg-gray-700/20 ${isDuplicate ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        {isReduction
          ? <TrendingDown className="w-4 h-4 text-emerald-400" />
          : <TrendingUp className="w-4 h-4 text-gray-400" />
        }
        <p className="text-sm text-gray-300">{event.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isReduction ? 'text-emerald-400' : 'text-amber-400'}`}>
          {event.suggestedPoints > 0 ? '+' : ''}{event.suggestedPoints} pts
        </span>
        {isDuplicate ? (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Ban className="w-3 h-3" />
            {dupLabel[event.duplicateOf]}
          </span>
        ) : (
          <span className="text-xs text-emerald-400 font-medium">New</span>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function formatTimeShort(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default ImportTab;
