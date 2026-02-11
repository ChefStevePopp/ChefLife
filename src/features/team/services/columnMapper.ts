/**
 * Column Mapper — Scheduling CSV Normalizer
 *
 * Translates CSV exports from any scheduling platform into the column format
 * the Delta Engine expects. The Delta Engine requires these exact headers
 * (case-insensitive):
 *
 *   Employee ID, Date, First, Last, In Time, Out Time, Role, Location
 *
 * Three-tier mapping strategy:
 *   1. Known platform selected → auto-map using platform template aliases
 *   2. "Other" platform → attempt fuzzy match, fall back to manual mapping
 *   3. Saved custom mapping → re-apply user's previous column assignments
 *
 * The mapper rewrites the CSV header row only — data rows pass through untouched.
 * This keeps the Delta Engine's proven parser completely unchanged.
 */

import {
  type SchedulingPlatformId,
  type CSVColumnTemplate,
  getCSVTemplate,
  SCHEDULING_CSV_TEMPLATES,
} from '@/types/integrations';

// =============================================================================
// TYPES
// =============================================================================

/** The normalized field names the Delta Engine expects */
export type DeltaField =
  | 'employee_id'
  | 'date'
  | 'first_name'
  | 'last_name'
  | 'in_time'
  | 'out_time'
  | 'role'
  | 'location';

/** The exact header strings the Delta Engine parser looks for */
export const DELTA_ENGINE_HEADERS: Record<DeltaField, string> = {
  employee_id: 'Employee ID',
  date: 'Date',
  first_name: 'First',
  last_name: 'Last',
  in_time: 'In Time',
  out_time: 'Out Time',
  role: 'Role',
  location: 'Location',
};

/** Required fields — CSV must have these to be processable */
export const REQUIRED_FIELDS: DeltaField[] = [
  'employee_id',
  'date',
  'first_name',
  'last_name',
  'in_time',
  'out_time',
];

/** Optional fields — nice to have but won't block import */
export const OPTIONAL_FIELDS: DeltaField[] = ['role', 'location'];

/** Result of attempting to map CSV columns */
export interface ColumnMappingResult {
  /** Whether all required fields were successfully mapped */
  success: boolean;
  /** The resolved mapping: deltaField → original CSV column index */
  mapping: Map<DeltaField, number>;
  /** Human-readable mapping: deltaField → original header name */
  mappingLabels: Map<DeltaField, string>;
  /** Fields that couldn't be auto-mapped */
  unmappedFields: DeltaField[];
  /** Original CSV headers (for manual mapping UI) */
  originalHeaders: string[];
  /** Which platform template was used (null if manual/other) */
  templateUsed: SchedulingPlatformId | null;
}

/** A saved custom mapping (persisted per org for "Other" platforms) */
export interface SavedColumnMapping {
  /** User-friendly name (e.g., "My POS Export Format") */
  name: string;
  /** Map of deltaField → original header string (case-insensitive match) */
  headerMap: Record<DeltaField, string>;
  /** When this mapping was last used */
  lastUsedAt: string;
  /** Platform it was created for */
  platform: SchedulingPlatformId;
}

// =============================================================================
// CORE MAPPER
// =============================================================================

/**
 * Extract the header row from raw CSV content.
 * Returns cleaned, trimmed header strings.
 */
export function extractCSVHeaders(csvContent: string): string[] {
  const firstLine = csvContent.trim().split('\n')[0];
  if (!firstLine) return [];

  // Parse header respecting quoted fields
  return parseCSVLine(firstLine).map((h) =>
    h.replace(/['"]/g, '').trim()
  );
}

/**
 * Attempt to auto-map CSV columns using a platform template.
 *
 * For known platforms: uses the alias list from SCHEDULING_CSV_TEMPLATES.
 * For 'other': attempts a best-effort fuzzy match against all known aliases.
 *
 * @param csvContent   Raw CSV string (only the header row is read)
 * @param platform     Which scheduling platform this CSV came from
 * @param savedMapping Optional saved custom mapping to try first
 * @returns            ColumnMappingResult with mapping details
 */
export function autoMapColumns(
  csvContent: string,
  platform: SchedulingPlatformId,
  savedMapping?: SavedColumnMapping
): ColumnMappingResult {
  const headers = extractCSVHeaders(csvContent);
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  const mapping = new Map<DeltaField, number>();
  const mappingLabels = new Map<DeltaField, string>();
  const unmappedFields: DeltaField[] = [];

  // Strategy 1: Try saved custom mapping first
  if (savedMapping) {
    const result = applySavedMapping(normalizedHeaders, headers, savedMapping);
    if (result.success) {
      return { ...result, originalHeaders: headers, templateUsed: null };
    }
    // If saved mapping fails (format changed), fall through to template
  }

  // Strategy 2: Use platform template
  const template = getCSVTemplate(platform);

  // For 'other' platform, build a mega-template from all known aliases
  const aliasSource: CSVColumnTemplate['columns'] = template
    ? template.columns
    : buildMegaAliasMap();

  const allFields: DeltaField[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

  for (const field of allFields) {
    const aliases = aliasSource[field];
    let found = false;

    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(alias.toLowerCase());
      if (idx !== -1 && !isColumnAlreadyMapped(mapping, idx)) {
        mapping.set(field, idx);
        mappingLabels.set(field, headers[idx]);
        found = true;
        break;
      }
    }

    if (!found) {
      unmappedFields.push(field);
    }
  }

  // Check if all required fields are mapped
  const missingRequired = unmappedFields.filter((f) =>
    REQUIRED_FIELDS.includes(f)
  );
  const success = missingRequired.length === 0;

  return {
    success,
    mapping,
    mappingLabels,
    unmappedFields,
    originalHeaders: headers,
    templateUsed: template ? platform : null,
  };
}

/**
 * Apply a manual column mapping (from the UI) and return the result.
 */
export function applyManualMapping(
  csvHeaders: string[],
  manualMap: Partial<Record<DeltaField, number>>
): ColumnMappingResult {
  const mapping = new Map<DeltaField, number>();
  const mappingLabels = new Map<DeltaField, string>();
  const unmappedFields: DeltaField[] = [];

  const allFields: DeltaField[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

  for (const field of allFields) {
    const colIdx = manualMap[field];
    if (colIdx !== undefined && colIdx >= 0 && colIdx < csvHeaders.length) {
      mapping.set(field, colIdx);
      mappingLabels.set(field, csvHeaders[colIdx]);
    } else {
      unmappedFields.push(field);
    }
  }

  const missingRequired = unmappedFields.filter((f) =>
    REQUIRED_FIELDS.includes(f)
  );

  return {
    success: missingRequired.length === 0,
    mapping,
    mappingLabels,
    unmappedFields,
    originalHeaders: csvHeaders,
    templateUsed: null,
  };
}

/**
 * Normalize a CSV so its header row matches the Delta Engine's expected format.
 *
 * This is the final step before passing CSV content to `parseShiftsCSV()`.
 * Only the header row is rewritten — data rows are untouched.
 *
 * @param csvContent  Raw CSV string from the platform export
 * @param mapping     Resolved column mapping (from autoMapColumns or manual)
 * @returns           Normalized CSV string ready for the Delta Engine
 */
export function normalizeCSV(
  csvContent: string,
  mapping: Map<DeltaField, number>
): string {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return csvContent;

  const originalHeaders = parseCSVLine(lines[0]);

  // Build new header row: replace mapped columns with Delta Engine names
  const newHeaders = [...originalHeaders];
  for (const [field, colIdx] of mapping) {
    if (colIdx < newHeaders.length) {
      newHeaders[colIdx] = DELTA_ENGINE_HEADERS[field];
    }
  }

  // Reconstruct: new header + original data rows
  lines[0] = newHeaders.map((h) => quoteIfNeeded(h)).join(',');
  return lines.join('\n');
}

/**
 * Quick check: does this CSV look like it came from a specific platform?
 * Uses header fingerprinting to detect platform without user selection.
 * Returns the best-matching platform or null.
 */
export function detectPlatform(csvContent: string): SchedulingPlatformId | null {
  const headers = extractCSVHeaders(csvContent);
  const normalizedHeaders = new Set(headers.map((h) => h.toLowerCase().trim()));

  let bestMatch: SchedulingPlatformId | null = null;
  let bestScore = 0;

  const platformIds: SchedulingPlatformId[] = [
    '7shifts', 'hotschedules', 'whenIWork', 'deputy',
    'homebase', 'sling', 'push', 'restaurant365',
  ];

  for (const platformId of platformIds) {
    const template = getCSVTemplate(platformId);
    if (!template) continue;

    let score = 0;
    const fields = Object.values(template.columns);

    for (const aliases of fields) {
      for (const alias of aliases) {
        if (normalizedHeaders.has(alias.toLowerCase())) {
          score++;
          break; // Only count one match per field
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = platformId;
    }
  }

  // Require at least 5 of 8 fields to match (high confidence)
  return bestScore >= 5 ? bestMatch : null;
}

/**
 * Generate a preview of how the mapping will transform data.
 * Returns the first few rows with field labels for user confirmation.
 */
export function generateMappingPreview(
  csvContent: string,
  mapping: Map<DeltaField, number>,
  maxRows: number = 3
): Array<Record<DeltaField, string>> {
  const lines = csvContent.trim().split('\n');
  const preview: Array<Record<DeltaField, string>> = [];

  for (let i = 1; i <= Math.min(maxRows, lines.length - 1); i++) {
    const cols = parseCSVLine(lines[i]);
    const row: Partial<Record<DeltaField, string>> = {};

    for (const [field, colIdx] of mapping) {
      row[field] = cols[colIdx]?.replace(/['"]/g, '').trim() || '';
    }

    preview.push(row as Record<DeltaField, string>);
  }

  return preview;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Parse a CSV line respecting quoted fields */
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

/** Quote a header value if it contains commas */
function quoteIfNeeded(value: string): string {
  return value.includes(',') ? `"${value}"` : value;
}

/** Check if a column index is already claimed by another field */
function isColumnAlreadyMapped(
  mapping: Map<DeltaField, number>,
  colIdx: number
): boolean {
  for (const idx of mapping.values()) {
    if (idx === colIdx) return true;
  }
  return false;
}

/** Try applying a saved mapping by matching header strings */
function applySavedMapping(
  normalizedHeaders: string[],
  originalHeaders: string[],
  saved: SavedColumnMapping
): Omit<ColumnMappingResult, 'originalHeaders' | 'templateUsed'> {
  const mapping = new Map<DeltaField, number>();
  const mappingLabels = new Map<DeltaField, string>();
  const unmappedFields: DeltaField[] = [];

  const allFields: DeltaField[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

  for (const field of allFields) {
    const savedHeader = saved.headerMap[field];
    if (!savedHeader) {
      unmappedFields.push(field);
      continue;
    }

    const idx = normalizedHeaders.indexOf(savedHeader.toLowerCase().trim());
    if (idx !== -1) {
      mapping.set(field, idx);
      mappingLabels.set(field, originalHeaders[idx]);
    } else {
      unmappedFields.push(field);
    }
  }

  const missingRequired = unmappedFields.filter((f) =>
    REQUIRED_FIELDS.includes(f)
  );

  return {
    success: missingRequired.length === 0,
    mapping,
    mappingLabels,
    unmappedFields,
  };
}

/**
 * Build a combined alias map from ALL platform templates.
 * Used for "Other" platform auto-detection — tries every known alias.
 */
function buildMegaAliasMap(): CSVColumnTemplate['columns'] {
  const mega: CSVColumnTemplate['columns'] = {
    employee_id: [],
    date: [],
    first_name: [],
    last_name: [],
    in_time: [],
    out_time: [],
    role: [],
    location: [],
  };

  for (const template of SCHEDULING_CSV_TEMPLATES) {
    for (const field of Object.keys(mega) as Array<keyof typeof mega>) {
      for (const alias of template.columns[field]) {
        if (!mega[field].includes(alias)) {
          mega[field].push(alias);
        }
      }
    }
  }

  return mega;
}
