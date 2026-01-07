/**
 * Communications Module - Merge Engine
 * 
 * Renders email templates by replacing merge field placeholders with actual data.
 */

import type { 
  MergeContext, 
  TemplateField, 
  FieldTransform 
} from './types';
import { formatDateForDisplay, formatDateShort, formatDateLong } from '@/utils/dateUtils';

// =============================================================================
// MERGE OPTIONS
// =============================================================================

export type MergeSyntax = 'guillemets' | 'handlebars';

export interface MergeOptions {
  /** Field syntax: 'guillemets' for «field» or 'handlebars' for {{field}} */
  syntax?: MergeSyntax;
  /** Behavior when field not found: 'blank', 'preserve', or 'error' */
  missingFieldBehavior?: 'blank' | 'preserve' | 'error';
  /** Field mappings (tag → data path) */
  fieldMappings?: Map<string, TemplateField>;
}

// Regex patterns for different syntaxes
const SYNTAX_PATTERNS: Record<MergeSyntax, RegExp> = {
  guillemets: /«([^»]+)»/g,
  handlebars: /\{\{([^}]+)\}\}/g,
};

// =============================================================================
// CORE MERGE FUNCTION
// =============================================================================

/**
 * Merge a template string with context data
 * 
 * @param template - HTML or text template with merge fields
 * @param context - Data context for merge
 * @param options - Merge options
 * @returns Rendered template string
 */
export function mergeTemplate(
  template: string,
  context: MergeContext,
  options: MergeOptions = {}
): string {
  const syntax = options.syntax || 'guillemets';
  const pattern = SYNTAX_PATTERNS[syntax];
  const missingBehavior = options.missingFieldBehavior || 'blank';
  const fieldMappings = options.fieldMappings;

  return template.replace(pattern, (match, fieldTag) => {
    const cleanTag = fieldTag.trim();
    
    // If we have explicit field mappings, use them
    if (fieldMappings) {
      const fullTag = syntax === 'guillemets' ? `«${cleanTag}»` : `{{${cleanTag}}}`;
      const mapping = fieldMappings.get(fullTag);
      
      if (mapping) {
        const value = getValueByPath(context, `${mapping.data_source}.${mapping.data_path}`);
        const transformed = applyTransform(value, mapping.transform, mapping.format_options);
        return transformed ?? mapping.default_value ?? '';
      }
    }

    // Otherwise, try to resolve directly from context
    // Try common patterns: First_Name → recipient.first_name
    const resolvedPath = resolveFieldPath(cleanTag);
    const value = getValueByPath(context, resolvedPath);

    if (value !== undefined && value !== null) {
      return String(value);
    }

    // Handle missing field
    switch (missingBehavior) {
      case 'preserve':
        return match;
      case 'error':
        throw new Error(`Merge field not found: ${cleanTag}`);
      case 'blank':
      default:
        return '';
    }
  });
}

// =============================================================================
// PATH RESOLUTION
// =============================================================================

/**
 * Navigate an object by dot-separated path
 */
function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Convert common field tag formats to context paths
 * 
 * Examples:
 *   First_Name → recipient.first_name
 *   Attend__Period → performance.attendance_period_pct
 *   Sick_Remain → time_off.sick_days_remaining
 */
function resolveFieldPath(fieldTag: string): string {
  // Normalize: remove spaces, convert to lowercase
  const normalized = fieldTag.trim();
  
  // Common mappings
  const FIELD_MAP: Record<string, string> = {
    // Recipient fields
    'First_Name': 'recipient.first_name',
    'Last_Name': 'recipient.last_name',
    'Email': 'recipient.email',
    'Hire_Date': 'recipient.hire_date',
    'Position': 'recipient.position',
    
    // Period fields
    'Reporting_Start': 'period.start_date',
    'Reporting_End': 'period.end_date',
    'Week_Label': 'period.week_label',
    'Period_Label': 'period.period_label',
    
    // Performance fields
    'Attend_Points_This_Week': 'performance.points_this_week',
    'Total_Attendance_Points': 'performance.points_this_period',
    'Attend__Period': 'performance.attendance_period_pct',
    'Attend__YTD': 'performance.attendance_ytd_pct',
    'Current_Tier': 'performance.tier',
    'Tier_Label': 'performance.tier_label',
    'Current_Points': 'performance.current_points',
    
    // Time-off fields
    'Avail_Sick_Days': 'time_off.sick_days_available',
    'Sick_Used': 'time_off.sick_days_used',
    'Sick_Remain': 'time_off.sick_days_remaining',
    'Vacation_Hours_Benefit': 'time_off.vacation_hours_benefit',
    'Vacation_Hours_Used': 'time_off.vacation_hours_used',
    'Vacation_Hours_Remaining': 'time_off.vacation_hours_remaining',
    'Status_Level': 'time_off.seniority_status',
    
    // Organization fields
    'Org_Name': 'organization.name',
    'Company_Name': 'organization.name',
    
    // Historical trimester fields - Punctuality (late arrivals)
    // T1 = Winter/Spring (Jan-Apr), T2 = Spring/Summer (May-Aug), T3/M3 = Fall/Winter (Sep-Dec)
    'T12025_LATE': 'history.t1_2025_late',
    'T2025_LATE': 'history.t2_2025_late',
    'T22025_LATE': 'history.t2_2025_late',
    'M_32025_LATE': 'history.t3_2025_late',
    'T32025_LATE': 'history.t3_2025_late',
    'T12026_LATE': 'history.t1_2026_late',
    
    // Historical trimester fields - Attendance (absences)
    'T12025_ATTENDANCE': 'history.t1_2025_attendance',
    'T2025_ATTENDANCE': 'history.t2_2025_attendance',
    'T22025_ATTENDANCE': 'history.t2_2025_attendance',
    'M_32025_ATTENDANCE': 'history.t3_2025_attendance',
    'T32025_ATTENDANCE': 'history.t3_2025_attendance',
    'T12026_ATTENDANCE': 'history.t1_2026_attendance',
    
    // Rolling period fields - Current period (active cycle)
    'Current_Period_Label': 'periods.current.label',
    'Current_Period_Late': 'periods.current.late',
    'Current_Period_Absences': 'periods.current.absences',
    'Current_Period_Points': 'periods.current.points',
    
    // Rolling period fields - Previous period 1 (most recent completed)
    'Prev1_Period_Label': 'periods.prev1.label',
    'Prev1_Period_Late': 'periods.prev1.late',
    'Prev1_Period_Absences': 'periods.prev1.absences',
    'Prev1_Period_Points': 'periods.prev1.points',
    
    // Rolling period fields - Previous period 2 (two cycles ago)
    'Prev2_Period_Label': 'periods.prev2.label',
    'Prev2_Period_Late': 'periods.prev2.late',
    'Prev2_Period_Absences': 'periods.prev2.absences',
    'Prev2_Period_Points': 'periods.prev2.points',
    
    // Rolling period fields - Previous period 3 (three cycles ago)
    'Prev3_Period_Label': 'periods.prev3.label',
    'Prev3_Period_Late': 'periods.prev3.late',
    'Prev3_Period_Absences': 'periods.prev3.absences',
    'Prev3_Period_Points': 'periods.prev3.points',
    
    // Day fields (for weekly reports)
    'Day_1': 'period.days.0.date',
    'Day_2': 'period.days.1.date',
    'Day_3': 'period.days.2.date',
    'Day_4': 'period.days.3.date',
    'Day_5': 'period.days.4.date',
    'Day_6': 'period.days.5.date',
    'Day_7': 'period.days.6.date',
    'Day_1_Info': 'period.days.0.info',
    'Day_2_Info': 'period.days.1.info',
    'Day_3_Info': 'period.days.2.info',
    'Day_4_Info': 'period.days.3.info',
    'Day_5_Info': 'period.days.4.info',
    'Day_6_Info': 'period.days.5.info',
    'Day_7_Info': 'period.days.6.info',
  };

  // Check direct mapping first
  if (FIELD_MAP[normalized]) {
    return FIELD_MAP[normalized];
  }

  // Try to auto-resolve: convert Field_Name to field_name and search common sources
  const snakeCase = normalized.toLowerCase().replace(/\s+/g, '_');
  
  // Common source prefixes to try
  const sources = ['recipient', 'performance', 'time_off', 'period', 'organization', 'custom'];
  
  for (const source of sources) {
    const path = `${source}.${snakeCase}`;
    // We can't actually test the path here without context, 
    // so just return the most likely path based on field name patterns
    if (normalized.toLowerCase().includes('name') || 
        normalized.toLowerCase().includes('email') ||
        normalized.toLowerCase().includes('hire')) {
      return `recipient.${snakeCase}`;
    }
    if (normalized.toLowerCase().includes('point') ||
        normalized.toLowerCase().includes('tier') ||
        normalized.toLowerCase().includes('attend')) {
      return `performance.${snakeCase}`;
    }
    if (normalized.toLowerCase().includes('sick') ||
        normalized.toLowerCase().includes('vacation')) {
      return `time_off.${snakeCase}`;
    }
  }

  // Fallback: assume it's a custom field
  return `custom.${snakeCase}`;
}

// =============================================================================
// TRANSFORMATIONS
// =============================================================================

/**
 * Apply a transformation to a value
 */
function applyTransform(
  value: unknown,
  transform?: FieldTransform,
  options?: Record<string, unknown>
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const str = String(value);

  if (!transform) {
    return str;
  }

  switch (transform) {
    case 'uppercase':
      return str.toUpperCase();
    
    case 'lowercase':
      return str.toLowerCase();
    
    case 'capitalize':
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    
    case 'date_short':
      return formatDateShort(str);
    
    case 'date_long':
      return formatDateLong(str);
    
    case 'date_iso':
      return str; // Already ISO format
    
    case 'time_12h':
      return formatTime12h(str);
    
    case 'time_24h':
      return formatTime24h(str);
    
    case 'percentage':
      const pctDecimals = (options?.decimals as number) ?? 1;
      const num = parseFloat(str);
      return isNaN(num) ? str : `${num.toFixed(pctDecimals)}%`;
    
    case 'currency':
      const curDecimals = (options?.decimals as number) ?? 2;
      const prefix = (options?.prefix as string) ?? '$';
      const amount = parseFloat(str);
      return isNaN(amount) 
        ? str 
        : `${prefix}${amount.toLocaleString('en-US', { minimumFractionDigits: curDecimals, maximumFractionDigits: curDecimals })}`;
    
    case 'number':
      const n = parseFloat(str);
      return isNaN(n) ? str : n.toLocaleString('en-US');
    
    default:
      return str;
  }
}

function formatTime12h(timeStr: string): string {
  try {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return timeStr;
  }
}

function formatTime24h(timeStr: string): string {
  try {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return timeStr;
  }
}

// =============================================================================
// FIELD DETECTION
// =============================================================================

/**
 * Detect all merge fields in a template
 */
export function detectFields(template: string, syntax: MergeSyntax = 'guillemets'): string[] {
  const pattern = SYNTAX_PATTERNS[syntax];
  const fields: string[] = [];
  let match;

  // Reset regex state
  pattern.lastIndex = 0;

  while ((match = pattern.exec(template)) !== null) {
    const tag = syntax === 'guillemets' ? `«${match[1]}»` : `{{${match[1]}}}`;
    if (!fields.includes(tag)) {
      fields.push(tag);
    }
  }

  return fields;
}

/**
 * Suggest data path for a field tag
 */
export function suggestFieldPath(fieldTag: string): { source: string; path: string } {
  const cleanTag = fieldTag.replace(/[«»{}]/g, '').trim();
  const resolved = resolveFieldPath(cleanTag);
  const [source, ...pathParts] = resolved.split('.');
  
  return {
    source,
    path: pathParts.join('.'),
  };
}

// =============================================================================
// PREVIEW
// =============================================================================

/**
 * Generate sample context data for template preview
 */
export function getSampleContext(): MergeContext {
  return {
    recipient: {
      id: 'sample-001',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      avatar_url: undefined,
      hire_date: '2023-06-15',
      position: 'Line Cook',
      department: 'Kitchen',
    },
    organization: {
      name: 'Memphis Fire Barbeque Company',
      logo_url: undefined,
      timezone: 'America/Toronto',
    },
    performance: {
      current_points: 2,
      tier: 1,
      tier_label: 'Priority',
      coaching_stage: undefined,
      coaching_stage_label: undefined,
      points_this_week: 1,
      points_this_period: 2,
      events_this_week: [
        { date: '2026-01-06', event_type: 'late_5', points: 1, notes: 'Traffic' },
      ],
      attendance_period_pct: 96.5,
      attendance_ytd_pct: 94.2,
    },
    time_off: {
      sick_days_available: 3,
      sick_days_used: 1,
      sick_days_remaining: 2,
      vacation_hours_benefit: 80,
      vacation_hours_used: 16,
      vacation_hours_remaining: 64,
      seniority_status: 'Standard',
    },
    period: {
      start_date: '2026-01-06',
      end_date: '2026-01-12',
      week_label: 'Week of January 6, 2026',
      period_label: 'Winter/Spring 2026',
      days: [
        { date: '2026-01-06', day_name: 'Monday', info: 'Worked 8hrs' },
        { date: '2026-01-07', day_name: 'Tuesday', info: 'Worked 8hrs' },
        { date: '2026-01-08', day_name: 'Wednesday', info: 'Off' },
        { date: '2026-01-09', day_name: 'Thursday', info: 'Worked 8hrs' },
        { date: '2026-01-10', day_name: 'Friday', info: 'Worked 8hrs' },
        { date: '2026-01-11', day_name: 'Saturday', info: 'Worked 10hrs' },
        { date: '2026-01-12', day_name: 'Sunday', info: 'Off' },
      ],
    },
    // Historical trimester data for past period stats (legacy support)
    history: {
      // 2025 Trimester 1 (Jan-Apr) - Winter/Spring
      t1_2025_late: 0,
      t1_2025_attendance: 0,
      // 2025 Trimester 2 (May-Aug) - Spring/Summer  
      t2_2025_late: 2,
      t2_2025_attendance: 1,
      // 2025 Trimester 3 (Sep-Dec) - Fall/Winter
      t3_2025_late: 1,
      t3_2025_attendance: 0,
      // 2026 Trimester 1 (Jan-Apr) - Current
      t1_2026_late: 1,
      t1_2026_attendance: 0,
    },
    // Rolling periods - universal field names that work for any operator
    periods: {
      current: {
        label: 'Winter/Spring 2026',
        late: 1,
        absences: 0,
        points: 2,
      },
      prev1: {
        label: 'Fall/Winter 2025',
        late: 1,
        absences: 0,
        points: 3,
      },
      prev2: {
        label: 'Spring/Summer 2025',
        late: 2,
        absences: 1,
        points: 4,
      },
      prev3: {
        label: 'Winter/Spring 2025',
        late: 0,
        absences: 0,
        points: 0,
      },
    },
  };
}
