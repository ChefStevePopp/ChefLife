/**
 * Communications Module - Merge Engine
 * 
 * L5 Architecture: Uses Field Registry for path resolution.
 * Renders email templates by replacing merge field placeholders with actual data.
 */

import type { 
  MergeContext, 
  TemplateField, 
  FieldTransform 
} from './types';
import { formatDateForDisplay, formatDateShort, formatDateLong } from '@/utils/dateUtils';
import { getFieldByTag, getDataPath, getDefaultValue } from './fieldRegistry';

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
    
    // Priority 1: Explicit field mappings (per-template overrides)
    if (fieldMappings) {
      const fullTag = syntax === 'guillemets' ? `«${cleanTag}»` : `{{${cleanTag}}}`;
      const mapping = fieldMappings.get(fullTag);
      
      if (mapping) {
        const value = getValueByPath(context, `${mapping.data_source}.${mapping.data_path}`);
        const transformed = applyTransform(value, mapping.transform, mapping.format_options);
        return transformed ?? mapping.default_value ?? '';
      }
    }

    // Priority 2: Field Registry (single source of truth)
    const registryPath = getDataPath(cleanTag);
    if (registryPath) {
      const value = getValueByPath(context, registryPath);
      
      if (value !== undefined && value !== null) {
        // Apply any transforms from registry
        const fieldDef = getFieldByTag(cleanTag);
        if (fieldDef?.transform && fieldDef.transform !== 'none') {
          return applyTransform(value, fieldDef.transform as FieldTransform) ?? String(value);
        }
        return String(value);
      }
      
      // Return default value from registry if available
      const defaultVal = getDefaultValue(cleanTag);
      if (defaultVal) {
        return defaultVal;
      }
    }

    // Priority 3: Fallback path resolution (for unregistered fields)
    const fallbackPath = resolveFallbackPath(cleanTag);
    const fallbackValue = getValueByPath(context, fallbackPath);

    if (fallbackValue !== undefined && fallbackValue !== null) {
      return String(fallbackValue);
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
 * Supports array notation: "days.0.date"
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
    
    // Handle array index
    if (!isNaN(Number(part)) && Array.isArray(current)) {
      current = current[Number(part)];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Fallback path resolution for unregistered fields
 * Tries to auto-resolve based on field name patterns
 */
function resolveFallbackPath(fieldTag: string): string {
  const normalized = fieldTag.trim();
  const snakeCase = normalized.toLowerCase().replace(/\s+/g, '_');
  
  // Guess source based on field name patterns
  if (normalized.toLowerCase().includes('name') || 
      normalized.toLowerCase().includes('email') ||
      normalized.toLowerCase().includes('hire') ||
      normalized.toLowerCase().includes('position')) {
    return `recipient.${snakeCase}`;
  }
  if (normalized.toLowerCase().includes('point') ||
      normalized.toLowerCase().includes('tier') ||
      normalized.toLowerCase().includes('attend') ||
      normalized.toLowerCase().includes('coaching')) {
    return `performance.${snakeCase}`;
  }
  if (normalized.toLowerCase().includes('sick') ||
      normalized.toLowerCase().includes('vacation') ||
      normalized.toLowerCase().includes('time_off')) {
    return `time_off.${snakeCase}`;
  }
  if (normalized.toLowerCase().includes('period') ||
      normalized.toLowerCase().includes('week') ||
      normalized.toLowerCase().includes('day_')) {
    return `period.${snakeCase}`;
  }
  if (normalized.toLowerCase().includes('org') ||
      normalized.toLowerCase().includes('company')) {
    return `organization.${snakeCase}`;
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
  transform?: FieldTransform | string,
  options?: Record<string, unknown>
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const str = String(value);

  if (!transform || transform === 'none') {
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
      return str;
    
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
 * Suggest data path for a field tag (uses registry)
 */
export function suggestFieldPath(fieldTag: string): { source: string; path: string } {
  const cleanTag = fieldTag.replace(/[«»{}]/g, '').trim();
  
  // Check registry first
  const registryPath = getDataPath(cleanTag);
  if (registryPath) {
    const [source, ...pathParts] = registryPath.split('.');
    return {
      source,
      path: pathParts.join('.'),
    };
  }
  
  // Fallback
  const fallback = resolveFallbackPath(cleanTag);
  const [source, ...pathParts] = fallback.split('.');
  
  return {
    source,
    path: pathParts.join('.'),
  };
}

// =============================================================================
// PERIOD LABEL CALCULATION
// =============================================================================

function calculatePeriodLabels(): { current: string; prev1: string; prev2: string; prev3: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  let currentPeriod: number;
  if (month >= 1 && month <= 4) {
    currentPeriod = 1;
  } else if (month >= 5 && month <= 8) {
    currentPeriod = 2;
  } else {
    currentPeriod = 3;
  }
  
  const labels: string[] = [];
  let period = currentPeriod;
  let labelYear = year;
  
  for (let i = 0; i < 4; i++) {
    labels.push(getPeriodName(period, labelYear));
    period--;
    if (period < 1) {
      period = 3;
      labelYear--;
    }
  }
  
  return {
    current: labels[0],
    prev1: labels[1],
    prev2: labels[2],
    prev3: labels[3],
  };
}

function getPeriodName(period: number, year: number): string {
  switch (period) {
    case 1: return `Winter/Spring ${year}`;
    case 2: return `Summer ${year}`;
    case 3: return `Fall/Winter ${year}`;
    default: return `Period ${period} ${year}`;
  }
}

// =============================================================================
// SAMPLE CONTEXT GENERATOR
// =============================================================================

/**
 * Generate sample context data for template preview
 * Uses Field Registry for dynamic sample values
 */
export function getSampleContext(): MergeContext {
  const periodLabels = calculatePeriodLabels();
  
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatDateDisplay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatWeekLabel = (d: Date) => `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    
    // Sample activity info showing event-based data
    let info = 'Good';
    if (i === 2) info = 'Late (5-15 min) (+1)'; // Wednesday had a minor tardiness
    if (i === 5) info = 'Stayed Late (-1)'; // Saturday covered extra time
    
    days.push({
      date: formatDateDisplay(day),
      day_name: day.toLocaleDateString('en-US', { weekday: 'long' }),
      info,
    });
  }

  return {
    recipient: {
      id: 'sample-001',
      first_name: 'Marcus',
      last_name: 'Chen',
      email: 'marcus.chen@gmail.com',
      avatar_url: undefined,
      hire_date: 'Mar 15, 2023',
      position: 'Grill Lead',
      department: 'Kitchen',
    },
    organization: {
      name: 'Memphis Fire BBQ',
      logo_url: undefined,
      timezone: 'America/Toronto',
    },
    performance: {
      current_points: 2,
      tier: 1,
      tier_label: 'Priority',
      coaching_stage: undefined,
      coaching_stage_label: undefined,
      points_this_week: 0,           // Net: +1 - 1 = 0
      points_gained_this_week: 1,    // One tardiness
      points_lost_this_week: 1,      // One stay late reduction
      points_this_period: 2,
      events_this_week: [],
      attendance_period_pct: 97.8,
      attendance_ytd_pct: 96.2,
    },
    time_off: {
      sick_days_available: 3,
      sick_days_used: 1,
      sick_days_remaining: 2,
      vacation_hours_benefit: 80,
      vacation_hours_used: 24,
      vacation_hours_remaining: 56,
      seniority_status: 'Core Team',
    },
    period: {
      start_date: formatDate(monday),
      end_date: formatDate(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)),
      week_label: formatWeekLabel(monday),
      period_label: periodLabels.current,
      days,
    },
    history: {
      t1_2025_late: 0,
      t1_2025_attendance: 0,
      t2_2025_late: 2,
      t2_2025_attendance: 1,
      t3_2025_late: 1,
      t3_2025_attendance: 0,
      t1_2026_late: 1,
      t1_2026_attendance: 0,
    },
    periods: {
      current: {
        label: periodLabels.current,
        late: 1,
        absences: 0,
        points: 2,
      },
      prev1: {
        label: periodLabels.prev1,
        late: 1,
        absences: 0,
        points: 2,
      },
      prev2: {
        label: periodLabels.prev2,
        late: 2,
        absences: 1,
        points: 4,
      },
      prev3: {
        label: periodLabels.prev3,
        late: 0,
        absences: 0,
        points: 0,
      },
    },
  };
}
