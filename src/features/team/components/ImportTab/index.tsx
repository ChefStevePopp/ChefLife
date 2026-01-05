/**
 * ImportTab - CSV Import & Delta Review UI
 * 
 * Allows importing Scheduled and Worked Hours CSVs from 7shifts,
 * calculates variances, and presents detected events for review.
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
  RefreshCw,
  Check,
  X,
  Info,
  Calendar,
  Users,
  Filter,
  Send,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
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
} from '../../services/deltaEngine';

// =============================================================================
// TYPES
// =============================================================================

interface CSVFile {
  name: string;
  content: string;
  rowCount: number;
}

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'excused';

interface ReviewedEvent extends DetectedEvent {
  reviewStatus: ReviewStatus;
  excuseReason?: string;
}

interface ReviewedDelta extends ShiftDelta {
  reviewedEvents: ReviewedEvent[];
  expanded: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ImportTab: React.FC = () => {
  // Auth & data context
  const { organizationId, user } = useAuth();
  const { members } = useTeamStore();
  const { config, fetchConfig } = usePerformanceStore();
  
  // Fetch config on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);
  
  // File state
  const [scheduledFile, setScheduledFile] = useState<CSVFile | null>(null);
  const [workedFile, setWorkedFile] = useState<CSVFile | null>(null);
  
  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [reviewedDeltas, setReviewedDeltas] = useState<ReviewedDelta[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState<'all' | 'events_only' | 'no_show'>('events_only');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  
  // Refs for file inputs
  const scheduledInputRef = useRef<HTMLInputElement>(null);
  const workedInputRef = useRef<HTMLInputElement>(null);

  // =============================================================================
  // FILE HANDLING
  // =============================================================================

  const handleFileSelect = useCallback(async (
    file: File,
    setFile: React.Dispatch<React.SetStateAction<CSVFile | null>>
  ) => {
    const content = await file.text();
    const rowCount = content.split('\n').filter(line => line.trim()).length - 1; // -1 for header
    
    setFile({
      name: file.name,
      content,
      rowCount,
    });
  }, []);

  const handleDrop = useCallback((
    e: React.DragEvent,
    setFile: React.Dispatch<React.SetStateAction<CSVFile | null>>
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file, setFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // =============================================================================
  // IMPORT & PROCESSING
  // =============================================================================

  const processImport = useCallback(() => {
    if (!scheduledFile || !workedFile) return;
    
    setIsProcessing(true);
    
    // Convert config thresholds to Delta Engine format
    const thresholds = configToThresholds(config.detection_thresholds);
    
    // Small delay to show processing state
    setTimeout(async () => {
      const result = calculateDeltas(scheduledFile.content, workedFile.content, thresholds);
      setImportResult(result);
      
      // Initialize reviewed deltas
      const reviewed: ReviewedDelta[] = result.deltas.map(delta => ({
        ...delta,
        reviewedEvents: delta.events.map(event => ({
          ...event,
          reviewStatus: 'pending' as ReviewStatus,
        })),
        expanded: delta.events.length > 0, // Auto-expand if has events
      }));
      
      setReviewedDeltas(reviewed);
      setIsProcessing(false);

      // Log to NEXUS
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
            events_detected: totalEvents,
            date_range: result.dateRange,
          },
        });
      }
    }, 500);
  }, [scheduledFile, workedFile, config.detection_thresholds, organizationId, user]);

  const resetImport = () => {
    setScheduledFile(null);
    setWorkedFile(null);
    setImportResult(null);
    setReviewedDeltas([]);
  };

  // =============================================================================
  // EVENT REVIEW ACTIONS
  // =============================================================================

  const updateEventStatus = (deltaKey: string, eventIndex: number, status: ReviewStatus, reason?: string) => {
    setReviewedDeltas(prev => prev.map(delta => {
      if (delta.matchKey === deltaKey) {
        const newEvents = [...delta.reviewedEvents];
        newEvents[eventIndex] = {
          ...newEvents[eventIndex],
          reviewStatus: status,
          excuseReason: reason,
        };
        return { ...delta, reviewedEvents: newEvents };
      }
      return delta;
    }));
  };

  const toggleExpanded = (deltaKey: string) => {
    setReviewedDeltas(prev => prev.map(delta => {
      if (delta.matchKey === deltaKey) {
        return { ...delta, expanded: !delta.expanded };
      }
      return delta;
    }));
  };

  const approveAllPending = () => {
    setReviewedDeltas(prev => prev.map(delta => ({
      ...delta,
      reviewedEvents: delta.reviewedEvents.map(event => ({
        ...event,
        reviewStatus: event.reviewStatus === 'pending' ? 'approved' : event.reviewStatus,
      })),
    })));
  };

  // =============================================================================
  // SAVE TO DATABASE
  // =============================================================================

  const sendToTeamForApproval = async () => {
    if (!organizationId || !user) {
      toast.error('Not authenticated');
      return;
    }

    setIsSaving(true);
    const batchId = crypto.randomUUID();
    const errors: string[] = [];
    let savedCount = 0;

    try {
      // Build a map of punch_id (7shifts Employee ID) -> team_member_id for quick lookup
      const employeeIdMap = new Map<string, string>();
      members.forEach(m => {
        if (m.punch_id) {
          employeeIdMap.set(m.punch_id, m.id);
        }
      });

      // Debug: Log the mapping
      console.log('Employee ID mapping:', Object.fromEntries(employeeIdMap));
      console.log('Total members with punch_id:', employeeIdMap.size);

      // Collect all approved events
      const stagedEvents: any[] = [];

      for (const delta of reviewedDeltas) {
        const approvedEvents = delta.reviewedEvents.filter(e => e.reviewStatus === 'approved');
        if (approvedEvents.length === 0) continue;

        // Debug: Log each delta's employeeId
        console.log(`Looking up: ${delta.employeeName} (ID: ${delta.employeeId})`);

        // Look up team member by employee_id (from CSV) -> punch_id (in DB)
        const teamMemberId = employeeIdMap.get(delta.employeeId);
        if (!teamMemberId) {
          errors.push(`${delta.employeeName}: No matching employee ID (${delta.employeeId})`);
          continue;
        }

        // Create staged event records
        for (const event of approvedEvents) {
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
        toast.error('No events to save. Check employee ID mappings.');
        console.log('Errors (unmatched):', errors);
        setIsSaving(false);
        return;
      }

      // Debug: Log what we're about to insert
      console.log('Inserting staged events:', stagedEvents.length);
      console.log('Sample event:', stagedEvents[0]);

      // Insert all staged events
      const { data, error } = await supabase
        .from('staged_events')
        .insert(stagedEvents)
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Insert successful, returned:', data);

      savedCount = stagedEvents.length;

      // Log to NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'performance_events_staged',
        details: {
          event_count: savedCount,
          batch_id: batchId,
          date_range: importResult?.dateRange,
          skipped_count: errors.length,
        },
      });

      // Show results
      if (errors.length > 0) {
        toast(
          `Saved ${savedCount} events. ${errors.length} skipped (unmatched employees).`,
          { icon: '⚠️', duration: 5000 }
        );
        console.warn('Unmatched employees:', errors);
      } else {
        toast.success(`${savedCount} events sent to Team for approval! 🎉`);
      }

      // Reset import after successful save
      resetImport();

    } catch (err: any) {
      console.error('Error saving staged events:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // =============================================================================
  // FILTERING
  // =============================================================================

  const filteredDeltas = reviewedDeltas.filter(delta => {
    // Status filter
    if (filterStatus === 'events_only' && delta.reviewedEvents.length === 0) return false;
    if (filterStatus === 'no_show' && delta.status !== 'no_show') return false;
    
    // Employee filter
    if (filterEmployee && !delta.employeeName.toLowerCase().includes(filterEmployee.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Get unique employee names for filter dropdown
  const uniqueEmployees = [...new Set(reviewedDeltas.map(d => d.employeeName))].sort();

  // Count stats
  const pendingCount = reviewedDeltas.reduce((acc, d) => 
    acc + d.reviewedEvents.filter(e => e.reviewStatus === 'pending').length, 0
  );
  const approvedCount = reviewedDeltas.reduce((acc, d) => 
    acc + d.reviewedEvents.filter(e => e.reviewStatus === 'approved').length, 0
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300">
              Import <strong>Scheduled Hours &amp; Wages</strong> and <strong>Worked Hours &amp; Wages</strong> CSV 
              exports from 7shifts. The Delta Engine will compare them and detect attendance events 
              (tardiness, early departure, no-shows) for your review.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              7shifts → Time Clocking → Reports → Export as CSV
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      {!importResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Hours Drop Zone */}
          <div
            onDrop={(e) => handleDrop(e, setScheduledFile)}
            onDragOver={handleDragOver}
            onClick={() => scheduledInputRef.current?.click()}
            className={`
              relative p-6 rounded-lg border-2 border-dashed cursor-pointer
              transition-all duration-200
              ${scheduledFile 
                ? 'border-emerald-500/50 bg-emerald-500/10' 
                : 'border-gray-700 hover:border-primary-500/50 hover:bg-gray-800/30'
              }
            `}
          >
            <input
              ref={scheduledInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], setScheduledFile)}
              className="hidden"
            />
            
            <div className="text-center">
              {scheduledFile ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">{scheduledFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{scheduledFile.rowCount} shifts</p>
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

          {/* Worked Hours Drop Zone */}
          <div
            onDrop={(e) => handleDrop(e, setWorkedFile)}
            onDragOver={handleDragOver}
            onClick={() => workedInputRef.current?.click()}
            className={`
              relative p-6 rounded-lg border-2 border-dashed cursor-pointer
              transition-all duration-200
              ${workedFile 
                ? 'border-emerald-500/50 bg-emerald-500/10' 
                : 'border-gray-700 hover:border-primary-500/50 hover:bg-gray-800/30'
              }
            `}
          >
            <input
              ref={workedInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], setWorkedFile)}
              className="hidden"
            />
            
            <div className="text-center">
              {workedFile ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">{workedFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{workedFile.rowCount} shifts</p>
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
      )}

      {/* Process Button */}
      {!importResult && scheduledFile && workedFile && (
        <div className="flex justify-center">
          <button
            onClick={processImport}
            disabled={isProcessing}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Calculate Deltas
              </>
            )}
          </button>
        </div>
      )}

      {/* Results Section */}
      {importResult && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard
              icon={Calendar}
              label="Date Range"
              value={`${importResult.dateRange.start} → ${importResult.dateRange.end}`}
              small
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Matched"
              value={importResult.matchedCount}
            />
            <SummaryCard
              icon={XCircle}
              label="No Shows"
              value={importResult.noShowCount}
              highlight={importResult.noShowCount > 0 ? 'rose' : undefined}
            />
            <SummaryCard
              icon={Clock}
              label="Pending"
              value={pendingCount}
              highlight={pendingCount > 0 ? 'amber' : undefined}
            />
            <SummaryCard
              icon={Check}
              label="Staged"
              value={approvedCount}
              highlight={approvedCount > 0 ? 'emerald' : undefined}
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="input text-sm py-1.5"
                >
                  <option value="all">All Shifts</option>
                  <option value="events_only">With Events Only</option>
                  <option value="no_show">No Shows Only</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="input text-sm py-1.5"
                >
                  <option value="">All Employees</option>
                  {uniqueEmployees.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <button
                  onClick={approveAllPending}
                  className="btn-ghost text-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Stage All ({pendingCount})
                </button>
              )}
              <button
                onClick={resetImport}
                className="btn-ghost text-sm flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                New Import
              </button>
            </div>
          </div>

          {/* Delta List */}
          <div className="space-y-2">
            {filteredDeltas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No shifts match the current filters
              </div>
            ) : (
              filteredDeltas.map(delta => (
                <DeltaRow
                  key={delta.matchKey}
                  delta={delta}
                  onToggle={() => toggleExpanded(delta.matchKey)}
                  onUpdateEvent={(idx, status, reason) => 
                    updateEventStatus(delta.matchKey, idx, status, reason)
                  }
                />
              ))
            )}
          </div>

          {/* Bottom Action Bar */}
          {approvedCount > 0 && (
            <div className="floating-action-bar">
              <div className="floating-action-bar-inner">
                <div className="floating-action-bar-content">
                  <span className="text-sm text-gray-300">
                    {approvedCount} event{approvedCount !== 1 ? 's' : ''} staged
                  </span>
                  <button 
                    onClick={sendToTeamForApproval}
                    disabled={isSaving}
                    className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send to Team for Approval
                      </>
                    )}
                  </button>
                </div>
              </div>
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
  <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
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

const DeltaRow: React.FC<{
  delta: ReviewedDelta;
  onToggle: () => void;
  onUpdateEvent: (index: number, status: ReviewStatus, reason?: string) => void;
}> = ({ delta, onToggle, onUpdateEvent }) => {
  const hasEvents = delta.reviewedEvents.length > 0;
  
  return (
    <div className="bg-gray-800/40 rounded-lg border border-gray-700/30 overflow-hidden">
      {/* Header Row */}
      <button
        onClick={onToggle}
        disabled={!hasEvents}
        className={`
          w-full flex items-center justify-between p-3 text-left
          ${hasEvents ? 'hover:bg-gray-700/30 cursor-pointer' : 'cursor-default'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-3">
          {hasEvents ? (
            delta.expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )
          ) : (
            <div className="w-4 h-4" /> // Spacer
          )}
          
          <div>
            <p className="text-sm font-medium text-white">{delta.employeeName}</p>
            <p className="text-xs text-gray-500">{delta.date} • {delta.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Time Display with In/Out labels */}
          {delta.status === 'matched' && (
            <div className="text-right text-xs">
              <div className="text-gray-400">
                <span className="text-gray-500 mr-1">In:</span>
                {delta.startVariance === 0 ? (
                  <>{delta.scheduledIn && formatTimeShort(delta.scheduledIn)} <Check className="w-3 h-3 inline text-emerald-400" /></>
                ) : (
                  <>
                    {delta.scheduledIn && formatTimeShort(delta.scheduledIn)} → {delta.workedIn && formatTimeShort(delta.workedIn)}
                    <span className={`ml-1 ${delta.startVariance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ({formatVariance(delta.startVariance)})
                    </span>
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
                    <span className={`ml-1 ${delta.endVariance < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ({formatVariance(delta.endVariance)})
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Status Badge - TEXT COLOR ONLY */}
          <span className="text-xs font-medium">
            {delta.status === 'no_show' && <span className="text-rose-400">No Show</span>}
            {delta.status === 'matched' && hasEvents && (
              <span className="text-amber-400">{delta.reviewedEvents.length} Event{delta.reviewedEvents.length > 1 ? 's' : ''}</span>
            )}
            {delta.status === 'matched' && !hasEvents && <span className="text-emerald-400">OK</span>}
            {delta.status === 'unscheduled' && <span className="text-gray-400">Unscheduled</span>}
          </span>
        </div>
      </button>

      {/* Expanded Events */}
      {hasEvents && delta.expanded && (
        <div className="border-t border-gray-700/30 p-3 pl-10 space-y-2">
          {delta.reviewedEvents.map((event, idx) => (
            <EventRow
              key={idx}
              event={event}
              onApprove={() => onUpdateEvent(idx, 'approved')}
              onReject={() => onUpdateEvent(idx, 'rejected')}
              onExcuse={(reason) => onUpdateEvent(idx, 'excused', reason)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EventRow: React.FC<{
  event: ReviewedEvent;
  onApprove: () => void;
  onReject: () => void;
  onExcuse: (reason: string) => void;
}> = ({ event, onApprove, onReject, onExcuse }) => {
  const [showExcuseInput, setShowExcuseInput] = useState(false);
  const [excuseReason, setExcuseReason] = useState('');
  
  const isReduction = event.suggestedPoints < 0;
  const isProcessed = event.reviewStatus !== 'pending';
  
  return (
    <div className={`
      flex items-center justify-between p-2 rounded-lg bg-gray-700/20
      ${isProcessed ? 'opacity-60' : ''}
    `}>
      <div className="flex items-center gap-3">
        {isReduction ? (
          <TrendingDown className="w-4 h-4 text-emerald-400" />
        ) : (
          <TrendingUp className="w-4 h-4 text-gray-400" />
        )}
        <div>
          <p className="text-sm text-gray-300">{event.description}</p>
          {event.reviewStatus === 'excused' && event.excuseReason && (
            <p className="text-xs text-gray-500">Excused: {event.excuseReason}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Points - colored text only */}
        <span className={`
          text-sm font-medium
          ${isReduction ? 'text-emerald-400' : 'text-amber-400'}
        `}>
          {event.suggestedPoints > 0 ? '+' : ''}{event.suggestedPoints} pts
        </span>
        
        {event.reviewStatus === 'pending' && !showExcuseInput && (
          <>
            <button
              onClick={onApprove}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-emerald-400 transition-colors"
              title="Approve"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowExcuseInput(true)}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-primary-400 transition-colors"
              title="Excuse (no points)"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
            <button
              onClick={onReject}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400 hover:text-rose-400 transition-colors"
              title="Reject"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
        
        {showExcuseInput && (
          <div className="flex items-center gap-2">
            <select
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              className="input text-xs py-1"
            >
              <option value="">Select reason...</option>
              <option value="SICK OK">Sick (ESA Protected)</option>
              <option value="LATE OK">Approved Late Arrival</option>
              <option value="EARLY DEPART OK">Approved Early Departure</option>
              <option value="ABSENT OK">Approved Absence</option>
              <option value="OTHER">Other</option>
            </select>
            <button
              onClick={() => {
                if (excuseReason) {
                  onExcuse(excuseReason);
                  setShowExcuseInput(false);
                }
              }}
              disabled={!excuseReason}
              className="p-1.5 rounded hover:bg-gray-600/50 text-primary-400"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowExcuseInput(false)}
              className="p-1.5 rounded hover:bg-gray-600/50 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Status text - colored text only, no background */}
        {event.reviewStatus !== 'pending' && (
          <span className={`text-xs font-medium
            ${event.reviewStatus === 'approved' ? 'text-emerald-400' : ''}
            ${event.reviewStatus === 'rejected' ? 'text-gray-500' : ''}
            ${event.reviewStatus === 'excused' ? 'text-primary-400' : ''}
          `}>
            {event.reviewStatus === 'approved' && 'Staged'}
            {event.reviewStatus === 'rejected' && 'Skipped'}
            {event.reviewStatus === 'excused' && 'Excused'}
          </span>
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
