/**
 * Delta Engine - 7shifts CSV Import & Variance Calculator
 * 
 * Compares Scheduled Hours vs Worked Hours CSVs from 7shifts
 * to detect attendance events (tardiness, early departure, no-shows)
 * and suggest point events for review.
 * 
 * Multi-shift alignment solved via TIME-PROXIMITY MATCHING:
 * - Group shifts by Employee ID + Date
 * - Match each worked shift to the closest scheduled shift (by start time)
 * - Handle mismatched shift counts gracefully:
 *   - Unmatched scheduled shifts = No-shows
 *   - Unmatched worked shifts = Unscheduled work
 */

// =============================================================================
// TYPES
// =============================================================================

export interface RawShiftRow {
  employeeId: string;
  date: string;           // "2025-01-05"
  firstName: string;
  lastName: string;
  location: string;
  inTime: string;         // "10:00AM " (note trailing space in 7shifts export)
  outTime: string;        // " 3:00PM"
  role: string;
  regularHours: number;
  otHours: number;
}

export interface ParsedShift {
  employeeId: string;
  employeeName: string;   // "First Last"
  date: string;           // "2025-01-05"
  inTime: Date;
  outTime: Date;
  role: string;
  scheduledMinutes: number;
  // Internal tracking (no longer used for matching, but kept for reference)
  matchKey: string;       // "0625-20250105-1" (employeeId-yyyyMMdd-sequence)
  sequence: number;       // 1, 2, 3... for multi-shift days
}

export interface ShiftDelta {
  matchKey: string;
  employeeId: string;
  employeeName: string;
  date: string;
  role: string;
  
  // Scheduled
  scheduledIn?: Date;
  scheduledOut?: Date;
  scheduledMinutes?: number;
  
  // Worked
  workedIn?: Date;
  workedOut?: Date;
  workedMinutes?: number;
  
  // Variances (in minutes, positive = late/left early)
  startVariance: number;  // Worked In - Scheduled In (positive = late)
  endVariance: number;    // Worked Out - Scheduled Out (negative = left early)
  
  // Detected events
  status: 'matched' | 'no_show' | 'unscheduled';
  events: DetectedEvent[];
}

export interface DetectedEvent {
  type: 
    | 'no_call_no_show'
    | 'tardiness_major'     // 15+ min
    | 'tardiness_minor'     // 5-15 min
    | 'early_departure'     // left 30+ min early
    | 'stayed_late'         // reduction: stayed 60+ min late
    | 'arrived_early'       // reduction: arrived 30+ min early
    | 'unscheduled_worked'; // worked without being scheduled
  description: string;
  suggestedPoints: number;
  autoDetected: boolean;
}

export interface ImportResult {
  scheduledCount: number;
  workedCount: number;
  matchedCount: number;
  noShowCount: number;
  unscheduledCount: number;
  exemptCount: number;       // Skipped due to tracking rules
  filteredCount: number;     // Zero-duration clock errors filtered out
  deltas: ShiftDelta[];
  errors: string[];
  dateRange: { start: string; end: string };
}

export interface PointThresholds {
  tardinessMinorMin: number;   // 5 min
  tardinessMinorMax: number;   // 15 min
  tardinessMajorMin: number;   // 15 min
  earlyDepartureMin: number;   // 30 min early
  stayedLateMin: number;       // 60 min (reduction)
  arrivedEarlyMin: number;     // 30 min (reduction)
}

export const DEFAULT_THRESHOLDS: PointThresholds = {
  tardinessMinorMin: 5,
  tardinessMinorMax: 15,
  tardinessMajorMin: 15,
  earlyDepartureMin: 30,
  stayedLateMin: 60,
  arrivedEarlyMin: 30,
};

export interface TrackingRules {
  exempt_security_levels: number[];      // Levels completely exempt from tracking
  track_unscheduled_shifts: boolean;     // Whether to flag unscheduled work
  unscheduled_exempt_levels: number[];   // Levels that can work unscheduled without flag
}

export const DEFAULT_TRACKING_RULES: TrackingRules = {
  exempt_security_levels: [0, 1],        // Owner, System exempt
  track_unscheduled_shifts: true,
  unscheduled_exempt_levels: [0, 1, 2],  // Owner, System, Manager can work unscheduled
};

// Map of employeeId (punch_id) to security level
export type EmployeeSecurityMap = Map<string, number>;

/**
 * Convert from config format to Delta Engine format
 */
export function configToThresholds(config?: {
  tardiness_minor_min?: number;
  tardiness_major_min?: number;
  early_departure_min?: number;
  arrived_early_min?: number;
  stayed_late_min?: number;
}): PointThresholds {
  if (!config) return DEFAULT_THRESHOLDS;
  return {
    tardinessMinorMin: config.tardiness_minor_min ?? DEFAULT_THRESHOLDS.tardinessMinorMin,
    tardinessMinorMax: config.tardiness_major_min ?? DEFAULT_THRESHOLDS.tardinessMinorMax,
    tardinessMajorMin: config.tardiness_major_min ?? DEFAULT_THRESHOLDS.tardinessMajorMin,
    earlyDepartureMin: config.early_departure_min ?? DEFAULT_THRESHOLDS.earlyDepartureMin,
    stayedLateMin: config.stayed_late_min ?? DEFAULT_THRESHOLDS.stayedLateMin,
    arrivedEarlyMin: config.arrived_early_min ?? DEFAULT_THRESHOLDS.arrivedEarlyMin,
  };
}

// =============================================================================
// CSV PARSING
// =============================================================================

/**
 * Parse time string from 7shifts format to Date
 * Handles: "10:00AM ", " 3:00PM", "10:00 AM", etc.
 */
function parseTime(timeStr: string, dateStr: string): Date {
  // Clean up the string
  const cleaned = timeStr.trim().toUpperCase();
  
  // Extract hours, minutes, and AM/PM
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  // Convert to 24-hour
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  // Combine with date
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

/**
 * Parse a 7shifts Hours & Wages CSV
 * Expected columns: Employee ID, Date, First, Last, Location, In Time, Out Time, Role, ...
 */
export function parseShiftsCSV(csvContent: string): RawShiftRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }
  
  // Parse header to find column indices
  const header = parseCSVLine(lines[0]);
  const colIndex: Record<string, number> = {};
  header.forEach((col, idx) => {
    colIndex[col.toLowerCase().replace(/['"]/g, '').trim()] = idx;
  });
  
  // Required columns
  const required = ['employee id', 'date', 'first', 'last', 'in time', 'out time'];
  for (const col of required) {
    if (colIndex[col] === undefined) {
      throw new Error(`Missing required column: ${col}`);
    }
  }
  
  const rows: RawShiftRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = parseCSVLine(line);
    
    const employeeId = cols[colIndex['employee id']]?.replace(/['"]/g, '').trim();
    const date = cols[colIndex['date']]?.replace(/['"]/g, '').trim();
    const inTime = cols[colIndex['in time']]?.replace(/['"]/g, '').trim();
    const outTime = cols[colIndex['out time']]?.replace(/['"]/g, '').trim();
    
    // Skip rows with missing essential data
    if (!employeeId || !date || !inTime || !outTime) {
      continue;
    }
    
    rows.push({
      employeeId,
      date,
      firstName: cols[colIndex['first']]?.replace(/['"]/g, '').trim() || '',
      lastName: cols[colIndex['last']]?.replace(/['"]/g, '').trim() || '',
      location: cols[colIndex['location']]?.replace(/['"]/g, '').trim() || '',
      inTime,
      outTime,
      role: cols[colIndex['role']]?.replace(/['"]/g, '').trim() || '',
      regularHours: parseFloat(cols[colIndex['regular hours']]?.replace(/['"]/g, '') || '0') || 0,
      otHours: parseFloat(cols[colIndex['ot hours']]?.replace(/['"]/g, '') || '0') || 0,
    });
  }
  
  return rows;
}

/**
 * Parse a CSV line handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

// =============================================================================
// SHIFT PROCESSING
// =============================================================================

/**
 * Convert raw rows to parsed shifts
 * Groups by employee + date for proximity matching
 * Filters out zero-duration shifts (clock errors)
 * Returns { shifts, filteredCount }
 */
function processShifts(rows: RawShiftRow[]): { shifts: ParsedShift[]; filteredCount: number } {
  // Filter out zero-duration shifts (clock errors where In Time == Out Time)
  let filteredCount = 0;
  const validRows = rows.filter(row => {
    const inTime = parseTime(row.inTime, row.date);
    const outTime = parseTime(row.outTime, row.date);
    const durationMinutes = (outTime.getTime() - inTime.getTime()) / 60000;
    
    if (durationMinutes <= 0) {
      console.log(`Filtering zero-duration shift: ${row.firstName} ${row.lastName} on ${row.date} (${row.inTime} - ${row.outTime})`);
      filteredCount++;
      return false;
    }
    return true;
  });
  
  // Sort by date, then employee, then in time
  const sorted = [...validRows].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.employeeId !== b.employeeId) return a.employeeId.localeCompare(b.employeeId);
    // Sort by in time
    const aTime = parseTime(a.inTime, a.date);
    const bTime = parseTime(b.inTime, b.date);
    return aTime.getTime() - bTime.getTime();
  });
  
  // Group by employee + date and assign sequence numbers (for reference only)
  const groups = new Map<string, RawShiftRow[]>();
  for (const row of sorted) {
    const groupKey = `${row.employeeId}-${row.date}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  }
  
  // Convert to ParsedShift with sequence numbers
  const result: ParsedShift[] = [];
  
  for (const [, groupRows] of groups) {
    groupRows.forEach((row, index) => {
      const inTime = parseTime(row.inTime, row.date);
      const outTime = parseTime(row.outTime, row.date);
      const sequence = index + 1;
      const dateCompact = row.date.replace(/-/g, '');
      
      result.push({
        employeeId: row.employeeId,
        employeeName: `${row.firstName} ${row.lastName}`.trim(),
        date: row.date,
        inTime,
        outTime,
        role: row.role,
        scheduledMinutes: (outTime.getTime() - inTime.getTime()) / 60000,
        matchKey: `${row.employeeId}-${dateCompact}-${sequence}`,
        sequence,
      });
    });
  }
  
  return { shifts: result, filteredCount };
}

// =============================================================================
// TIME-PROXIMITY MATCHING
// =============================================================================

interface MatchedPair {
  scheduled: ParsedShift;
  worked: ParsedShift;
  startTimeDiff: number; // minutes between scheduled start and worked start
}

/**
 * Match worked shifts to scheduled shifts using time proximity.
 * 
 * For each employee/day:
 * 1. Find all scheduled and worked shifts
 * 2. For each worked shift, find the best matching scheduled shift (closest start time)
 * 3. A match is valid if start times are within 4 hours (configurable)
 * 4. Each scheduled shift can only match once
 * 
 * Returns: { matched pairs, unmatched scheduled (no-shows), unmatched worked (unscheduled) }
 */
function matchShiftsByProximity(
  scheduledShifts: ParsedShift[],
  workedShifts: ParsedShift[],
  maxMatchWindow: number = 240 // 4 hours in minutes
): {
  matched: MatchedPair[];
  noShows: ParsedShift[];
  unscheduled: ParsedShift[];
} {
  // Group by employee + date
  const schedByGroup = new Map<string, ParsedShift[]>();
  const workByGroup = new Map<string, ParsedShift[]>();
  
  for (const s of scheduledShifts) {
    const key = `${s.employeeId}-${s.date}`;
    if (!schedByGroup.has(key)) schedByGroup.set(key, []);
    schedByGroup.get(key)!.push(s);
  }
  
  for (const w of workedShifts) {
    const key = `${w.employeeId}-${w.date}`;
    if (!workByGroup.has(key)) workByGroup.set(key, []);
    workByGroup.get(key)!.push(w);
  }
  
  // All unique employee-date keys
  const allGroups = new Set([...schedByGroup.keys(), ...workByGroup.keys()]);
  
  const matched: MatchedPair[] = [];
  const noShows: ParsedShift[] = [];
  const unscheduled: ParsedShift[] = [];
  
  for (const groupKey of allGroups) {
    const schedList = schedByGroup.get(groupKey) || [];
    const workList = workByGroup.get(groupKey) || [];
    
    // Track which scheduled shifts have been claimed
    const usedScheduled = new Set<ParsedShift>();
    
    // Sort worked shifts by start time to process in order
    const sortedWork = [...workList].sort((a, b) => a.inTime.getTime() - b.inTime.getTime());
    
    for (const work of sortedWork) {
      // Find the best matching scheduled shift (not already used)
      let bestMatch: ParsedShift | null = null;
      let bestDiff = Infinity;
      
      for (const sched of schedList) {
        if (usedScheduled.has(sched)) continue;
        
        // Calculate time difference between start times (in minutes)
        const diff = Math.abs(work.inTime.getTime() - sched.inTime.getTime()) / 60000;
        
        // Must be within the match window
        if (diff <= maxMatchWindow && diff < bestDiff) {
          bestDiff = diff;
          bestMatch = sched;
        }
      }
      
      if (bestMatch) {
        matched.push({
          scheduled: bestMatch,
          worked: work,
          startTimeDiff: bestDiff,
        });
        usedScheduled.add(bestMatch);
      } else {
        // No matching schedule found - this is unscheduled work
        unscheduled.push(work);
      }
    }
    
    // Any scheduled shifts not matched are no-shows
    for (const sched of schedList) {
      if (!usedScheduled.has(sched)) {
        noShows.push(sched);
      }
    }
  }
  
  return { matched, noShows, unscheduled };
}

// =============================================================================
// DELTA CALCULATION
// =============================================================================

/**
 * Calculate deltas between scheduled and worked shifts
 * 
 * @param scheduledCSV - Raw CSV content of scheduled shifts
 * @param workedCSV - Raw CSV content of worked shifts  
 * @param thresholds - Detection thresholds (when events trigger)
 * @param trackingRules - Who gets tracked
 * @param employeeSecurityMap - Map of employeeId -> securityLevel for filtering
 * @param dateFilter - Optional date range to filter results (inclusive)
 */
export function calculateDeltas(
  scheduledCSV: string,
  workedCSV: string,
  thresholds: PointThresholds = DEFAULT_THRESHOLDS,
  trackingRules: TrackingRules = DEFAULT_TRACKING_RULES,
  employeeSecurityMap?: EmployeeSecurityMap,
  dateFilter?: { start: string; end: string }
): ImportResult {
  const errors: string[] = [];
  
  // Parse CSVs
  let scheduledRaw: RawShiftRow[] = [];
  let workedRaw: RawShiftRow[] = [];
  
  try {
    scheduledRaw = parseShiftsCSV(scheduledCSV);
  } catch (e) {
    errors.push(`Error parsing scheduled CSV: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
  
  try {
    workedRaw = parseShiftsCSV(workedCSV);
  } catch (e) {
    errors.push(`Error parsing worked CSV: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
  
  if (errors.length > 0) {
    return {
      scheduledCount: 0,
      workedCount: 0,
      matchedCount: 0,
      noShowCount: 0,
      unscheduledCount: 0,
      exemptCount: 0,
      filteredCount: 0,
      deltas: [],
      errors,
      dateRange: { start: '', end: '' },
    };
  }
  
  // Process into ParsedShifts
  const scheduledResult = processShifts(scheduledRaw);
  const workedResult = processShifts(workedRaw);
  let scheduled = scheduledResult.shifts;
  let worked = workedResult.shifts;
  const totalFilteredCount = scheduledResult.filteredCount + workedResult.filteredCount;
  
  // Apply date filter if provided
  if (dateFilter) {
    const { start, end } = dateFilter;
    scheduled = scheduled.filter(s => s.date >= start && s.date <= end);
    worked = worked.filter(w => w.date >= start && w.date <= end);
  }
  
  // Helper: Check if employee is exempt from tracking
  const isExemptFromTracking = (employeeId: string): boolean => {
    if (!employeeSecurityMap) return false;
    const level = employeeSecurityMap.get(employeeId);
    if (level === undefined) return false; // Unknown employee, track them
    return trackingRules.exempt_security_levels.includes(level);
  };
  
  // Helper: Check if employee is exempt from unscheduled flags
  const isExemptFromUnscheduledFlag = (employeeId: string): boolean => {
    if (!trackingRules.track_unscheduled_shifts) return true; // Not tracking unscheduled at all
    if (!employeeSecurityMap) return false;
    const level = employeeSecurityMap.get(employeeId);
    if (level === undefined) return false;
    return trackingRules.unscheduled_exempt_levels.includes(level);
  };
  
  // Filter out exempt employees before matching
  const trackedScheduled = scheduled.filter(s => !isExemptFromTracking(s.employeeId));
  const trackedWorked = worked.filter(w => !isExemptFromTracking(w.employeeId));
  const exemptCount = (scheduled.length - trackedScheduled.length) + (worked.length - trackedWorked.length);
  
  // Use time-proximity matching
  const { matched, noShows, unscheduled: unschedList } = matchShiftsByProximity(
    trackedScheduled,
    trackedWorked
  );
  
  // Calculate date range
  const allDates = [...scheduled.map(s => s.date), ...worked.map(w => w.date)];
  allDates.sort();
  const dateRange = {
    start: allDates[0] || '',
    end: allDates[allDates.length - 1] || '',
  };
  
  const deltas: ShiftDelta[] = [];
  let deltaIndex = 0;
  
  // Process matched pairs
  for (const pair of matched) {
    const { scheduled: sched, worked: work } = pair;
    deltaIndex++;
    const dateCompact = sched.date.replace(/-/g, '');
    
    const delta: ShiftDelta = {
      matchKey: `${sched.employeeId}-${dateCompact}-M${deltaIndex}`,
      employeeId: sched.employeeId,
      employeeName: sched.employeeName || work.employeeName,
      date: sched.date,
      role: sched.role || work.role,
      scheduledIn: sched.inTime,
      scheduledOut: sched.outTime,
      scheduledMinutes: sched.scheduledMinutes,
      workedIn: work.inTime,
      workedOut: work.outTime,
      workedMinutes: work.scheduledMinutes,
      startVariance: (work.inTime.getTime() - sched.inTime.getTime()) / 60000,
      endVariance: (work.outTime.getTime() - sched.outTime.getTime()) / 60000,
      status: 'matched',
      events: [],
    };
    
    // Detect events for matched shifts
    delta.events = detectEvents(delta, thresholds);
    deltas.push(delta);
  }
  
  // Process no-shows (scheduled but didn't work)
  for (const sched of noShows) {
    deltaIndex++;
    const dateCompact = sched.date.replace(/-/g, '');
    
    deltas.push({
      matchKey: `${sched.employeeId}-${dateCompact}-NS${deltaIndex}`,
      employeeId: sched.employeeId,
      employeeName: sched.employeeName,
      date: sched.date,
      role: sched.role,
      scheduledIn: sched.inTime,
      scheduledOut: sched.outTime,
      scheduledMinutes: sched.scheduledMinutes,
      workedIn: undefined,
      workedOut: undefined,
      workedMinutes: undefined,
      startVariance: 0,
      endVariance: 0,
      status: 'no_show',
      events: [{
        type: 'no_call_no_show',
        description: `Scheduled ${formatTime(sched.inTime)} - ${formatTime(sched.outTime)}, did not clock in`,
        suggestedPoints: 6,
        autoDetected: true,
      }],
    });
  }
  
  // Process unscheduled work (worked but wasn't scheduled)
  const filteredUnscheduled = unschedList.filter(w => !isExemptFromUnscheduledFlag(w.employeeId));
  
  for (const work of filteredUnscheduled) {
    deltaIndex++;
    const dateCompact = work.date.replace(/-/g, '');
    
    deltas.push({
      matchKey: `${work.employeeId}-${dateCompact}-UN${deltaIndex}`,
      employeeId: work.employeeId,
      employeeName: work.employeeName,
      date: work.date,
      role: work.role,
      scheduledIn: undefined,
      scheduledOut: undefined,
      scheduledMinutes: undefined,
      workedIn: work.inTime,
      workedOut: work.outTime,
      workedMinutes: work.scheduledMinutes,
      startVariance: 0,
      endVariance: 0,
      status: 'unscheduled',
      events: [{
        type: 'unscheduled_worked',
        description: `Worked ${formatTime(work.inTime)} - ${formatTime(work.outTime)} without being scheduled`,
        suggestedPoints: 0,
        autoDetected: true,
      }],
    });
  }
  
  // Update exempt count for filtered unscheduled
  const finalExemptCount = exemptCount + (unschedList.length - filteredUnscheduled.length);
  
  // Sort by date, then employee name
  deltas.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.employeeName.localeCompare(b.employeeName);
  });
  
  return {
    scheduledCount: scheduledResult.shifts.length,
    workedCount: workedResult.shifts.length,
    matchedCount: matched.length,
    noShowCount: noShows.length,
    unscheduledCount: filteredUnscheduled.length,
    exemptCount: finalExemptCount,
    filteredCount: totalFilteredCount,
    deltas,
    errors,
    dateRange,
  };
}

/**
 * Detect attendance events based on variances and thresholds
 */
function detectEvents(delta: ShiftDelta, thresholds: PointThresholds): DetectedEvent[] {
  const events: DetectedEvent[] = [];
  
  // Tardiness (late arrival)
  if (delta.startVariance >= thresholds.tardinessMajorMin) {
    events.push({
      type: 'tardiness_major',
      description: `Arrived ${Math.round(delta.startVariance)} min late`,
      suggestedPoints: 2,
      autoDetected: true,
    });
  } else if (delta.startVariance >= thresholds.tardinessMinorMin) {
    events.push({
      type: 'tardiness_minor',
      description: `Arrived ${Math.round(delta.startVariance)} min late`,
      suggestedPoints: 1,
      autoDetected: true,
    });
  }
  
  // Early departure (left early)
  if (delta.endVariance <= -thresholds.earlyDepartureMin) {
    events.push({
      type: 'early_departure',
      description: `Left ${Math.round(Math.abs(delta.endVariance))} min early`,
      suggestedPoints: 2,
      autoDetected: true,
    });
  }
  
  // REDUCTIONS (positive behaviors)
  
  // Arrived early (30+ min before scheduled)
  if (delta.startVariance <= -thresholds.arrivedEarlyMin) {
    events.push({
      type: 'arrived_early',
      description: `Arrived ${Math.round(Math.abs(delta.startVariance))} min early`,
      suggestedPoints: -1, // Reduction
      autoDetected: true,
    });
  }
  
  // Stayed late (60+ min after scheduled)
  if (delta.endVariance >= thresholds.stayedLateMin) {
    events.push({
      type: 'stayed_late',
      description: `Stayed ${Math.round(delta.endVariance)} min late`,
      suggestedPoints: -1, // Reduction
      autoDetected: true,
    });
  }
  
  return events;
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export function formatVariance(minutes: number): string {
  const absMin = Math.abs(Math.round(minutes));
  const hours = Math.floor(absMin / 60);
  const mins = absMin % 60;
  
  let str = '';
  if (hours > 0) str += `${hours}h `;
  str += `${mins}m`;
  
  if (minutes > 0) return `+${str}`;
  if (minutes < 0) return `-${str}`;
  return 'On time';
}

export function getEventColor(type: DetectedEvent['type']): string {
  switch (type) {
    case 'no_call_no_show':
      return 'rose';
    case 'tardiness_major':
    case 'early_departure':
      return 'amber';
    case 'tardiness_minor':
      return 'yellow';
    case 'stayed_late':
    case 'arrived_early':
      return 'green';
    case 'unscheduled_worked':
      return 'gray';
    default:
      return 'gray';
  }
}

export function getStatusColor(status: ShiftDelta['status']): string {
  switch (status) {
    case 'matched':
      return 'emerald';
    case 'no_show':
      return 'rose';
    case 'unscheduled':
      return 'gray';
    default:
      return 'gray';
  }
}
