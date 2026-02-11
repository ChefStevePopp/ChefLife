/**
 * ChefLife Integration System Types
 * 
 * Integrations connect ChefLife to external services like scheduling platforms,
 * POS systems, accounting software, and monitoring devices.
 */

// =============================================================================
// BASE INTEGRATION CONFIG
// =============================================================================

/** How the user connects: CSV uploads (universal) or API (premium) */
export type ConnectionMode = 'csv' | 'api';

export interface BaseIntegrationConfig {
  /** Whether the integration is enabled for this org */
  enabled: boolean;
  /** Whether actively connected (has valid credentials) */
  connected: boolean;
  /** How the user connects — CSV upload or API */
  connection_mode: ConnectionMode;
  /** When connection was established */
  connected_at?: string | null;
  /** User ID who connected */
  connected_by?: string | null;
  /** Integration-specific configuration */
  config: Record<string, unknown> | null;
}

// =============================================================================
// SCHEDULING PLATFORM CSV COLUMN MAPS
// =============================================================================

/**
 * Maps a scheduling platform's CSV column headers to the Delta Engine's
 * expected field names. The Delta Engine expects: employee_id, date,
 * first, last, in_time, out_time, role, location.
 *
 * Each platform template defines what header strings to look for.
 * Multiple aliases per field handle export format variations.
 */
export interface CSVColumnTemplate {
  platform: SchedulingPlatformId;
  label: string;
  /** Column aliases — first match wins (case-insensitive, trimmed) */
  columns: {
    employee_id: string[];
    date: string[];
    first_name: string[];
    last_name: string[];
    in_time: string[];
    out_time: string[];
    role: string[];
    location: string[];
  };
  /** Platform-specific time format notes (for the help text) */
  timeFormatNotes?: string;
  /** Platform-specific export instructions shown in Import tab */
  exportInstructions: string;
  /** URL for help documentation */
  helpUrl?: string;
}

/** All scheduling platforms ChefLife supports for CSV import */
export type SchedulingPlatformId =
  | '7shifts'
  | 'hotschedules'
  | 'whenIWork'
  | 'deputy'
  | 'homebase'
  | 'sling'
  | 'push'
  | 'restaurant365'
  | 'other';

/**
 * Column templates for known scheduling platforms.
 * The Delta Engine normalizer uses these to auto-map CSV headers.
 */
export const SCHEDULING_CSV_TEMPLATES: CSVColumnTemplate[] = [
  {
    platform: '7shifts',
    label: '7shifts',
    columns: {
      employee_id: ['employee id', 'employee_id', 'emp id'],
      date: ['date', 'shift date'],
      first_name: ['first', 'first name', 'firstname'],
      last_name: ['last', 'last name', 'lastname'],
      in_time: ['in time', 'in_time', 'clock in', 'start time', 'start'],
      out_time: ['out time', 'out_time', 'clock out', 'end time', 'end'],
      role: ['role', 'position', 'job title'],
      location: ['location', 'site', 'store'],
    },
    timeFormatNotes: 'Times exported as 12-hour format with AM/PM (e.g., "10:00AM")',
    exportInstructions: 'In 7shifts, go to Time Clocking → Reports → select your date range → Export as CSV.',
    helpUrl: 'https://support.7shifts.com',
  },
  {
    platform: 'hotschedules',
    label: 'HotSchedules (Fourth)',
    columns: {
      employee_id: ['emp #', 'emp no', 'employee #', 'employee number', 'employee id'],
      date: ['shift date', 'date', 'work date'],
      first_name: ['first name', 'first', 'firstname'],
      last_name: ['last name', 'last', 'lastname'],
      in_time: ['start', 'start time', 'in time', 'clock in', 'scheduled start'],
      out_time: ['end', 'end time', 'out time', 'clock out', 'scheduled end'],
      role: ['job', 'job title', 'role', 'position'],
      location: ['location', 'store', 'site'],
    },
    exportInstructions: 'In HotSchedules, go to Reports → Labor → Scheduled vs Worked → Export to CSV.',
    helpUrl: 'https://support.hotschedules.com',
  },
  {
    platform: 'whenIWork',
    label: 'When I Work',
    columns: {
      employee_id: ['user id', 'employee id', 'id'],
      date: ['date', 'shift date'],
      first_name: ['first name', 'first', 'firstname'],
      last_name: ['last name', 'last', 'lastname'],
      in_time: ['clock in', 'start time', 'in time', 'start'],
      out_time: ['clock out', 'end time', 'out time', 'end'],
      role: ['position', 'role', 'job title'],
      location: ['location', 'site', 'workplace'],
    },
    exportInstructions: 'In When I Work, go to Attendance → Timesheets → select date range → Export CSV.',
    helpUrl: 'https://support.wheniwork.com',
  },
  {
    platform: 'deputy',
    label: 'Deputy',
    columns: {
      employee_id: ['employee', 'employee id', 'staff id'],
      date: ['date', 'shift date'],
      first_name: ['first name', 'given name', 'first'],
      last_name: ['last name', 'surname', 'last'],
      in_time: ['start time', 'start', 'clock on', 'in time'],
      out_time: ['end time', 'end', 'clock off', 'out time'],
      role: ['area', 'role', 'position'],
      location: ['location', 'workplace'],
    },
    exportInstructions: 'In Deputy, go to Timesheets → Export → select CSV format.',
    helpUrl: 'https://help.deputy.com',
  },
  {
    platform: 'homebase',
    label: 'Homebase',
    columns: {
      employee_id: ['employee id', 'id', 'emp id'],
      date: ['date', 'shift date', 'day'],
      first_name: ['first name', 'first', 'employee first'],
      last_name: ['last name', 'last', 'employee last'],
      in_time: ['clock in', 'start', 'in time', 'start time'],
      out_time: ['clock out', 'end', 'out time', 'end time'],
      role: ['role', 'position', 'job'],
      location: ['location', 'site'],
    },
    exportInstructions: 'In Homebase, go to Timesheets → select your date range → Export as CSV.',
    helpUrl: 'https://support.joinhomebase.com',
  },
  {
    platform: 'sling',
    label: 'Sling',
    columns: {
      employee_id: ['employee id', 'id', 'user id'],
      date: ['date', 'shift date'],
      first_name: ['first name', 'first'],
      last_name: ['last name', 'last'],
      in_time: ['start', 'clock in', 'in time', 'start time'],
      out_time: ['end', 'clock out', 'out time', 'end time'],
      role: ['position', 'role'],
      location: ['location', 'site'],
    },
    exportInstructions: 'In Sling, go to Reports → Time Clock → Export CSV.',
    helpUrl: 'https://support.getsling.com',
  },
  {
    platform: 'push',
    label: 'Push Operations',
    columns: {
      employee_id: ['employee id', 'emp id', 'id'],
      date: ['date', 'shift date'],
      first_name: ['first name', 'first'],
      last_name: ['last name', 'last'],
      in_time: ['start time', 'punch in', 'clock in', 'in time'],
      out_time: ['end time', 'punch out', 'clock out', 'out time'],
      role: ['position', 'role', 'department'],
      location: ['location', 'restaurant'],
    },
    exportInstructions: 'In Push, go to Reports → Timeclock → Export to CSV.',
    helpUrl: 'https://support.pushoperations.com',
  },
  {
    platform: 'restaurant365',
    label: 'Restaurant365',
    columns: {
      employee_id: ['employee id', 'emp id', 'employee number'],
      date: ['date', 'shift date', 'work date'],
      first_name: ['first name', 'first'],
      last_name: ['last name', 'last'],
      in_time: ['clock in', 'in time', 'start time', 'start'],
      out_time: ['clock out', 'out time', 'end time', 'end'],
      role: ['job title', 'role', 'position'],
      location: ['location', 'store', 'unit'],
    },
    exportInstructions: 'In R365, go to Labor → Timecards → Export to CSV.',
    helpUrl: 'https://university.restaurant365.com',
  },
];

/** Get template for a specific platform, or null for 'other' */
export function getCSVTemplate(platform: SchedulingPlatformId): CSVColumnTemplate | null {
  if (platform === 'other') return null;
  return SCHEDULING_CSV_TEMPLATES.find(t => t.platform === platform) ?? null;
}

// =============================================================================
// 7SHIFTS INTEGRATION
// =============================================================================

export interface SevenShiftsConfig {
  /** API key for 7shifts */
  api_key?: string;
  /** Company ID in 7shifts */
  company_id?: string;
  /** Location ID in 7shifts (for multi-location) */
  location_id?: string;
  /** Auto-sync schedule */
  auto_sync: boolean;
  /** Sync frequency */
  sync_frequency: 'manual' | 'daily' | 'weekly';
  /** Last successful sync */
  last_sync_at?: string;
  /** Field mappings */
  field_mapping?: {
    employee_id?: string;
    department?: string;
    role?: string;
  };
}

export interface SevenShiftsIntegration extends BaseIntegrationConfig {
  config: SevenShiftsConfig | null;
}

// =============================================================================
// SENSORPUSH INTEGRATION (HACCP)
// =============================================================================

export interface SensorPushConfig {
  /** Email for SensorPush account */
  email?: string;
  /** Whether credentials are stored */
  credentials_stored: boolean;
  /** Auto-sync readings */
  auto_sync: boolean;
  /** Sync frequency in minutes */
  sync_interval_minutes: number;
  /** Last successful sync */
  last_sync_at?: string;
  /** Number of sensors configured */
  sensor_count?: number;
  /** Number of gateways configured */
  gateway_count?: number;
}

export interface SensorPushIntegration extends BaseIntegrationConfig {
  config: SensorPushConfig | null;
}

// =============================================================================
// SQUARE POS INTEGRATION
// =============================================================================

export interface SquareConfig {
  /** OAuth access token */
  access_token?: string;
  /** Refresh token */
  refresh_token?: string;
  /** Token expiry */
  token_expires_at?: string;
  /** Merchant ID */
  merchant_id?: string;
  /** Location ID */
  location_id?: string;
  /** Sync sales data */
  sync_sales: boolean;
  /** Sync inventory */
  sync_inventory: boolean;
}

export interface SquareIntegration extends BaseIntegrationConfig {
  config: SquareConfig | null;
}

// =============================================================================
// TOAST POS INTEGRATION
// =============================================================================

export interface ToastConfig {
  /** API key */
  api_key?: string;
  /** Restaurant GUID */
  restaurant_guid?: string;
  /** Sync sales data */
  sync_sales: boolean;
  /** Sync labor data */
  sync_labor: boolean;
}

export interface ToastIntegration extends BaseIntegrationConfig {
  config: ToastConfig | null;
}

// =============================================================================
// QUICKBOOKS INTEGRATION
// =============================================================================

export interface QuickBooksConfig {
  /** OAuth access token */
  access_token?: string;
  /** Refresh token */
  refresh_token?: string;
  /** Token expiry */
  token_expires_at?: string;
  /** Company ID */
  company_id?: string;
  /** Sync invoices */
  sync_invoices: boolean;
  /** Sync payroll */
  sync_payroll: boolean;
  /** Chart of accounts mapping */
  account_mapping?: Record<string, string>;
}

export interface QuickBooksIntegration extends BaseIntegrationConfig {
  config: QuickBooksConfig | null;
}

// =============================================================================
// ALL INTEGRATIONS MAP
// =============================================================================

export interface OrganizationIntegrations {
  '7shifts': SevenShiftsIntegration;
  'hotschedules': BaseIntegrationConfig;
  'whenIWork': BaseIntegrationConfig;
  'deputy': BaseIntegrationConfig;
  'homebase': BaseIntegrationConfig;
  'sling': BaseIntegrationConfig;
  'push': BaseIntegrationConfig;
  'restaurant365': BaseIntegrationConfig;
  'other_scheduler': BaseIntegrationConfig;
  'sensorpush': SensorPushIntegration;
  'square': SquareIntegration;
  'toast': ToastIntegration;
  'quickbooks': QuickBooksIntegration;
}

export type IntegrationId = keyof OrganizationIntegrations;

// =============================================================================
// INTEGRATION REGISTRY (for UI)
// =============================================================================

export type IntegrationCategory = 'scheduling' | 'haccp' | 'pos' | 'accounting' | 'inventory' | 'communication';

export interface IntegrationDefinition {
  id: IntegrationId;
  label: string;
  description: string;
  category: IntegrationCategory;
  website: string;
  authType: 'oauth' | 'api_key' | 'credentials';
  /** Which connection modes this integration supports */
  supportedModes: ConnectionMode[];
  /** Scheduling platform ID for CSV column mapping (scheduling category only) */
  schedulingPlatformId?: SchedulingPlatformId;
  comingSoon?: boolean;
}

export const INTEGRATION_REGISTRY: IntegrationDefinition[] = [
  // Scheduling & Labor
  {
    id: '7shifts',
    label: '7shifts',
    description: 'Restaurant scheduling, time clocking, and team communication',
    category: 'scheduling',
    website: 'https://www.7shifts.com',
    authType: 'api_key',
    supportedModes: ['csv', 'api'],
    schedulingPlatformId: '7shifts',
  },
  {
    id: 'hotschedules',
    label: 'HotSchedules (Fourth)',
    description: 'Enterprise scheduling and labor management',
    category: 'scheduling',
    website: 'https://www.fourth.com',
    authType: 'api_key',
    supportedModes: ['csv'],
    schedulingPlatformId: 'hotschedules',
    comingSoon: false,
  },
  {
    id: 'whenIWork',
    label: 'When I Work',
    description: 'Employee scheduling and time tracking',
    category: 'scheduling',
    website: 'https://wheniwork.com',
    authType: 'api_key',
    supportedModes: ['csv'],
    schedulingPlatformId: 'whenIWork',
    comingSoon: false,
  },
  {
    id: 'deputy',
    label: 'Deputy',
    description: 'Workforce management and shift scheduling',
    category: 'scheduling',
    website: 'https://www.deputy.com',
    authType: 'oauth',
    supportedModes: ['csv'],
    schedulingPlatformId: 'deputy',
    comingSoon: false,
  },
  {
    id: 'homebase',
    label: 'Homebase',
    description: 'Free scheduling and time clock for small teams',
    category: 'scheduling',
    website: 'https://joinhomebase.com',
    authType: 'api_key',
    supportedModes: ['csv'],
    schedulingPlatformId: 'homebase',
    comingSoon: false,
  },
  {
    id: 'sling',
    label: 'Sling',
    description: 'Shift scheduling and team communication',
    category: 'scheduling',
    website: 'https://getsling.com',
    authType: 'api_key',
    supportedModes: ['csv'],
    schedulingPlatformId: 'sling',
    comingSoon: false,
  },
  {
    id: 'push',
    label: 'Push Operations',
    description: 'Canadian restaurant workforce management',
    category: 'scheduling',
    website: 'https://pushoperations.com',
    authType: 'api_key',
    supportedModes: ['csv'],
    schedulingPlatformId: 'push',
    comingSoon: false,
  },
  {
    id: 'restaurant365',
    label: 'Restaurant365',
    description: 'All-in-one restaurant management platform',
    category: 'scheduling',
    website: 'https://www.restaurant365.com',
    authType: 'api_key',
    supportedModes: ['csv'],
    schedulingPlatformId: 'restaurant365',
    comingSoon: false,
  },
  {
    id: 'other_scheduler',
    label: 'Other Scheduler',
    description: 'Any platform that exports scheduled and worked hours as CSV',
    category: 'scheduling',
    website: '',
    authType: 'credentials',
    supportedModes: ['csv'],
    schedulingPlatformId: 'other',
    comingSoon: false,
  },
  // HACCP & Monitoring
  {
    id: 'sensorpush',
    label: 'SensorPush',
    description: 'Wireless temperature and humidity monitoring for food safety compliance',
    category: 'haccp',
    website: 'https://www.sensorpush.com',
    authType: 'credentials',
    supportedModes: ['api'],
  },
  // Point of Sale
  {
    id: 'square',
    label: 'Square',
    description: 'Point of sale, payments, and inventory management',
    category: 'pos',
    website: 'https://squareup.com',
    authType: 'oauth',
    supportedModes: ['api'],
    comingSoon: true,
  },
  {
    id: 'toast',
    label: 'Toast',
    description: 'Restaurant POS and management platform',
    category: 'pos',
    website: 'https://pos.toasttab.com',
    authType: 'api_key',
    supportedModes: ['csv', 'api'],
    comingSoon: true,
  },
  // Accounting
  {
    id: 'quickbooks',
    label: 'QuickBooks',
    description: 'Accounting, payroll, and financial management',
    category: 'accounting',
    website: 'https://quickbooks.intuit.com',
    authType: 'oauth',
    supportedModes: ['api'],
    comingSoon: true,
  },
];

// Category metadata for UI
export const INTEGRATION_CATEGORIES: Record<IntegrationCategory, { label: string; description: string }> = {
  scheduling: {
    label: 'Scheduling & Labor',
    description: 'Connect your scheduling and time tracking systems',
  },
  haccp: {
    label: 'HACCP & Monitoring',
    description: 'Temperature sensors and food safety compliance tools',
  },
  pos: {
    label: 'Point of Sale',
    description: 'Integrate with your POS for sales and menu data',
  },
  accounting: {
    label: 'Accounting & Finance',
    description: 'Sync financial data with your accounting software',
  },
  inventory: {
    label: 'Inventory Management',
    description: 'Connect inventory and ordering systems',
  },
  communication: {
    label: 'Communication',
    description: 'Integrate messaging and notification services',
  },
};

// =============================================================================
// INTEGRATION STATUS
// =============================================================================

export type IntegrationStatus = 'disconnected' | 'connected' | 'error' | 'syncing' | 'expired' | 'paused';

/**
 * Derive display status from JSONB config.
 * Prefers the explicit `status` field (written by Vault-aware hooks)
 * over the legacy `enabled`/`connected` booleans.
 */
export function getIntegrationStatus(integration: BaseIntegrationConfig & { status?: string }): IntegrationStatus {
  // Vault-aware status field takes precedence
  const rawStatus = (integration as any).status as string | undefined;
  if (rawStatus === 'expired') return 'expired';
  if (rawStatus === 'paused') return 'paused';
  if (rawStatus === 'error') return 'error';
  if (rawStatus === 'active') return 'connected';

  // Legacy fallback
  if (!integration.enabled) return 'disconnected';
  if (!integration.connected) return 'disconnected';
  return 'connected';
}
