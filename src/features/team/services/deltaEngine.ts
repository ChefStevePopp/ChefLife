/**
 * Delta Engine - 7shifts CSV Import & Variance Calculator
 * 
 * Compares Scheduled Hours vs Worked Hours CSVs from 7shifts
 * to detect attendance events (tardiness, early departure, no-shows)
 * and suggest point events for review.
 * 
 * Multi-shift alignment solved via sequence numbering:
 * - Sort by Date → Employee ID → In Time
 * - Group by Employee ID + Date
 * - Assign sequence numbers (1, 2, 3...) within each group
 * - Match scheduled[n] to worked[n] for each employee/day
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
  // Matching key
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
// SHIFT ALIGNMENT & MATCHING
// =============================================================================

/**
 * Convert raw rows to parsed shifts with match keys
 * Handles multi-shift alignment via sequence numbering
 */
function processShifts(rows: RawShiftRow[]): ParsedShift[] {
  // Sort by date, then employee, then in time
  const sorted = [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.employeeId !== b.employeeId) return a.employeeId.localeCompare(b.employeeId);
    // Sort by in time
    const aTime = parseTime(a.inTime, a.date);
    const bTime = parseTime(b.inTime, b.date);
    return aTime.getTime() - bTime.getTime();
  });
  
  // Group by employee + date and assign sequence numbers
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
  
  return result;
}

// =============================================================================
// DELTA CALCULATION
// =============================================================================

/**
 * Calculate deltas between scheduled and worked shifts
 */
export function calculateDeltas(
  scheduledCSV: string,
  workedCSV: string,
  thresholds: PointThresholds = DEFAULT_THRESHOLDS
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
      deltas: [],
      errors,
      dateRange: { start: '', end: '' },
    };
  }
  
  // Process into ParsedShifts with match keys
  const scheduled = processShifts(scheduledRaw);
  const worked = processShifts(workedRaw);
  
  // Build lookup maps
  const scheduledMap = new Map<string, ParsedShift>();
  scheduled.forEach(s => scheduledMap.set(s.matchKey, s));
  
  const workedMap = new Map<string, ParsedShift>();
  worked.forEach(w => workedMap.set(w.matchKey, w));
  
  // Get all unique match keys
  const allKeys = new Set([...scheduledMap.keys(), ...workedMap.keys()]);
  
  const deltas: ShiftDelta[] = [];
  let matchedCount = 0;
  let noShowCount = 0;
  let unscheduledCount = 0;
  
  // Calculate date range
  const allDates = [...scheduled.map(s => s.date), ...worked.map(w => w.date)];
  allDates.sort();
  const dateRange = {
    start: allDates[0] || '',
    end: allDates[allDates.length - 1] || '',
  };
  
  for (const key of allKeys) {
    const sched = scheduledMap.get(key);
    const work = workedMap.get(key);
    
    const delta: ShiftDelta = {
      matchKey: key,
      employeeId: sched?.employeeId || work?.employeeId || '',
      employeeName: sched?.employeeName || work?.employeeName || '',
      date: sched?.date || work?.date || '',
      role: sched?.role || work?.role || '',
      scheduledIn: sched?.inTime,
      scheduledOut: sched?.outTime,
      scheduledMinutes: sched?.scheduledMinutes,
      workedIn: work?.inTime,
      workedOut: work?.outTime,
      workedMinutes: work?.scheduledMinutes, // reusing field, it's calculated the same way
      startVariance: 0,
      endVariance: 0,
      status: 'matched',
      events: [],
    };
    
    if (sched && work) {
      // MATCHED: Calculate variances
      matchedCount++;
      delta.status = 'matched';
      
      // Start variance: positive = late, negative = early
      delta.startVariance = (work.inTime.getTime() - sched.inTime.getTime()) / 60000;
      
      // End variance: negative = left early, positive = stayed late
      delta.endVariance = (work.outTime.getTime() - sched.outTime.getTime()) / 60000;
      
      // Detect events
      delta.events = detectEvents(delta, thresholds);
      
    } else if (sched && !work) {
      // NO SHOW: Scheduled but didn't work
      noShowCount++;
      delta.status = 'no_show';
      delta.events = [{
        type: 'no_call_no_show',
        description: `Scheduled ${formatTime(sched.inTime)} - ${formatTime(sched.outTime)}, did not clock in`,
        suggestedPoints: 6, // Will be configurable
        autoDetected: true,
      }];
      
    } else if (!sched && work) {
      // UNSCHEDULED: Worked without being scheduled
      unscheduledCount++;
      delta.status = 'unscheduled';
      delta.events = [{
        type: 'unscheduled_worked',
        description: `Worked ${formatTime(work.inTime)} - ${formatTime(work.outTime)} without being scheduled`,
        suggestedPoints: 0, // Informational, not a demerit
        autoDetected: true,
      }];
    }
    
    deltas.push(delta);
  }
  
  // Sort by date, then employee name
  deltas.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.employeeName.localeCompare(b.employeeName);
  });
  
  return {
    scheduledCount: scheduled.length,
    workedCount: worked.length,
    matchedCount,
    noShowCount,
    unscheduledCount,
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
