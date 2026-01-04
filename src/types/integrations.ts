/**
 * ChefLife Integration System Types
 * 
 * Integrations connect ChefLife to external services like scheduling platforms,
 * POS systems, accounting software, and monitoring devices.
 */

// =============================================================================
// BASE INTEGRATION CONFIG
// =============================================================================

export interface BaseIntegrationConfig {
  /** Whether the integration is enabled for this org */
  enabled: boolean;
  /** Whether actively connected (has valid credentials) */
  connected: boolean;
  /** When connection was established */
  connected_at?: string | null;
  /** User ID who connected */
  connected_by?: string | null;
  /** Integration-specific configuration */
  config: Record<string, unknown> | null;
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
  },
  // HACCP & Monitoring
  {
    id: 'sensorpush',
    label: 'SensorPush',
    description: 'Wireless temperature and humidity monitoring for food safety compliance',
    category: 'haccp',
    website: 'https://www.sensorpush.com',
    authType: 'credentials',
  },
  // Point of Sale
  {
    id: 'square',
    label: 'Square',
    description: 'Point of sale, payments, and inventory management',
    category: 'pos',
    website: 'https://squareup.com',
    authType: 'oauth',
    comingSoon: true,
  },
  {
    id: 'toast',
    label: 'Toast',
    description: 'Restaurant POS and management platform',
    category: 'pos',
    website: 'https://pos.toasttab.com',
    authType: 'api_key',
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

export type IntegrationStatus = 'disconnected' | 'connected' | 'error' | 'syncing';

export function getIntegrationStatus(integration: BaseIntegrationConfig): IntegrationStatus {
  if (!integration.enabled) return 'disconnected';
  if (!integration.connected) return 'disconnected';
  return 'connected';
}
