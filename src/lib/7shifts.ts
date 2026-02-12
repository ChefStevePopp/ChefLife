/**
 * 7shifts API Client — v6 (Vault-backed + Wage Data)
 *
 * TWO CREDENTIAL MODES:
 * 1. Direct mode: API key passed explicitly (test_connection before storing)
 * 2. Vault mode: organizationId → Edge Function reads from encrypted Vault
 *
 * After initial connection, ALL operations use Vault mode.
 * API keys never leave the server after being stored.
 *
 * Edge Function: /functions/v1/7shifts-proxy
 *
 * @diagnostics src/lib/7shifts.ts
 * @version 6
 */

import { supabase } from "@/lib/supabase";

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL || "https://vcfigkwtsqvrvahfprya.supabase.co"}/functions/v1/7shifts-proxy`;

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type ConnectionStatus = "disconnected" | "active" | "error" | "expired" | "paused";

export interface Shift {
  id: number;
  location_id: number;
  user_id: number;
  department_id: number;
  role_id: number;
  start: Date;
  end: Date;
  notes: string;
  date: string;
  start_time: string;
  end_time: string;
  break_length: number;
  employee: {
    id: number;
    name: string;
  };
  user: {
    name: string;
  };
  role: {
    name: string;
  };
}

interface ConnectionParams {
  accessToken: string;
  companyId: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
}

interface VaultParams {
  organizationId: string;
  integrationKey?: string;  // defaults to '7shifts'
  locationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface HealthCheckResult {
  status: ConnectionStatus;
  error_code?: string;
  http_status?: number;
  checked_at: string;
}

export interface EnrichedShift {
  id: number;
  user_id: number;
  role_id: number;
  start: string;
  end: string;
  employee_name: string;
  role_name: string;
  notes: string;
}

export interface PreviewResult {
  data: EnrichedShift[];
  meta: { shift_count: number; user_count: number; role_count: number };
}

/** Structured error from the Edge Function with error code */
export class ProxyError extends Error {
  code: string;
  httpStatus: number;

  constructor(message: string, code: string, httpStatus: number) {
    super(message);
    this.name = "ProxyError";
    this.code = code;
    this.httpStatus = httpStatus;
  }

  get isAuthExpired(): boolean {
    return this.code === "AUTH_EXPIRED";
  }

  get isNoCredentials(): boolean {
    return this.code === "NO_CREDENTIALS";
  }

  get isRateLimited(): boolean {
    return this.code === "RATE_LIMITED";
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

// ─── PROXY CALLERS ───────────────────────────────────────────────────────────

/** Call proxy with DIRECT credentials (test_connection before storing) */
async function callProxyDirect(body: Record<string, any>): Promise<any> {
  const token = await getAuthToken();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": anonKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new ProxyError(
      errorData?.error || errorData?.message || `7shifts API error (${response.status})`,
      errorData?.code || "UNKNOWN",
      response.status
    );
  }

  return response.json();
}

/** Call proxy with VAULT credentials (post-connection operations) */
async function callProxyVault(
  action: string,
  organizationId: string,
  integrationKey: string = "7shifts",
  extra: Record<string, any> = {}
): Promise<any> {
  const token = await getAuthToken();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": anonKey,
    },
    body: JSON.stringify({
      action,
      organizationId,
      integrationKey,
      ...extra,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new ProxyError(
      errorData?.error || errorData?.message || `7shifts API error (${response.status})`,
      errorData?.code || "UNKNOWN",
      response.status
    );
  }

  return response.json();
}

// ─── VAULT CREDENTIAL MANAGEMENT ─────────────────────────────────────────────

/**
 * Store 7shifts credentials in Vault (encrypted at rest)
 * Call this AFTER successful test_connection
 */
export async function storeCredentials(
  organizationId: string,
  credentials: { apiKey: string; companyId: string; locationId?: string },
  createdBy?: string
): Promise<void> {
  // Store each credential as a separate Vault secret
  const entries = [
    { name: "api_key", value: credentials.apiKey },
    { name: "company_id", value: credentials.companyId },
  ];
  if (credentials.locationId) {
    entries.push({ name: "location_id", value: credentials.locationId });
  }

  for (const entry of entries) {
    const { error } = await supabase.rpc("store_integration_secret", {
      p_organization_id: organizationId,
      p_integration_key: "7shifts",
      p_secret_name: entry.name,
      p_secret_value: entry.value,
      p_created_by: createdBy || null,
    });
    if (error) {
      console.error(`Failed to store ${entry.name}:`, error);
      throw new Error(`Failed to securely store credentials: ${error.message}`);
    }
  }
}

/**
 * Purge all 7shifts credentials from Vault (used on disconnect)
 * Returns the number of secrets purged
 */
export async function purgeCredentials(organizationId: string): Promise<number> {
  const { data, error } = await supabase.rpc("purge_integration_secrets", {
    p_organization_id: organizationId,
    p_integration_key: "7shifts",
  });
  if (error) {
    console.error("Failed to purge credentials:", error);
    throw new Error(`Failed to purge credentials: ${error.message}`);
  }
  return data || 0;
}

// ─── DIRECT MODE FUNCTIONS (pre-connection) ──────────────────────────────────

/**
 * Test connection to 7shifts API (direct mode — before storing credentials)
 */
export async function testConnection({
  accessToken,
  companyId,
}: ConnectionParams): Promise<boolean> {
  try {
    await callProxyDirect({
      action: "test_connection",
      apiKey: accessToken,
      companyId,
    });
    return true;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}

/**
 * Fetch enriched shift preview — DIRECT mode (pre-connection live preview)
 */
export async function previewShifts({
  accessToken,
  companyId,
  locationId,
  startDate,
  endDate,
}: ConnectionParams): Promise<PreviewResult> {
  return callProxyDirect({
    action: "preview_shifts",
    apiKey: accessToken,
    companyId,
    locationId,
    params: { startDate, endDate },
  });
}

// ─── VAULT MODE FUNCTIONS (post-connection) ──────────────────────────────────

/**
 * Health check: verify stored credentials are still valid
 * Returns connection status for state machine
 */
export async function healthCheck(params: VaultParams): Promise<HealthCheckResult> {
  try {
    return await callProxyVault(
      "health_check",
      params.organizationId,
      params.integrationKey
    );
  } catch (error) {
    if (error instanceof ProxyError) {
      if (error.isNoCredentials) {
        return { status: "disconnected", error_code: "NO_CREDENTIALS", checked_at: new Date().toISOString() };
      }
      if (error.isAuthExpired) {
        return { status: "expired", error_code: "AUTH_EXPIRED", checked_at: new Date().toISOString() };
      }
    }
    return { status: "error", error_code: "UNKNOWN", checked_at: new Date().toISOString() };
  }
}

/**
 * Fetch enriched shift preview — VAULT mode (post-connection sync)
 */
export async function previewShiftsVault(params: VaultParams): Promise<PreviewResult> {
  return callProxyVault(
    "preview_shifts",
    params.organizationId,
    params.integrationKey,
    { params: { startDate: params.startDate, endDate: params.endDate } }
  );
}

/**
 * Fetch shifts — VAULT mode
 */
export async function getShiftsVault(params: VaultParams & { limit?: number }): Promise<Shift[]> {
  const data = await callProxyVault(
    "get_shifts",
    params.organizationId,
    params.integrationKey,
    { params: { startDate: params.startDate, endDate: params.endDate, limit: params.limit || 250 } }
  );
  return (data?.data || []).map((shift: any) => ({
    ...shift,
    start: new Date(shift.start),
    end: new Date(shift.end),
  }));
}

// ─── LEGACY DIRECT MODE FUNCTIONS (kept for backward compatibility) ──────────

export async function getShifts({
  accessToken,
  companyId,
  locationId,
  startDate,
  endDate,
}: ConnectionParams): Promise<Shift[]> {
  try {
    const data = await callProxyDirect({
      action: "get_shifts",
      apiKey: accessToken,
      companyId,
      locationId,
      params: { startDate, endDate, limit: 250 },
    });
    return (data?.data || []).map((shift: any) => ({
      ...shift,
      start: new Date(shift.start),
      end: new Date(shift.end),
    }));
  } catch (error) {
    console.error("Failed to fetch shifts:", error);
    throw error;
  }
}

export const fetchSchedule = async (
  config: { apiKey: string; locationId?: string; companyId?: string },
  startDate: string,
  endDate: string,
) => {
  if (!config.apiKey) {
    throw new Error("7shifts API key is required");
  }
  try {
    const data = await callProxyDirect({
      action: "get_shifts",
      apiKey: config.apiKey,
      companyId: config.companyId || "7140",
      locationId: config.locationId,
      params: { startDate, endDate, limit: 250 },
    });
    return {
      shifts: data?.data || [],
      meta: data?.meta || {},
    };
  } catch (error) {
    console.error("Error fetching 7shifts schedule:", error);
    throw error;
  }
};

// ─── VAULT MODE: USER & REFERENCE DATA ───────────────────────────────────────

/**
 * 7shifts user object shape (from get_users endpoint)
 */
export interface SevenShiftsUser {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  mobile_phone?: string;
  photo_url?: string;
  hire_date?: string;
  type?: string;           // 'employee' | 'manager' | 'admin'
  status?: string;         // active, inactive
  wage_type?: string;
  punch_id?: number;       // 7shifts' own punch_id field
}

/**
 * Fetch users — VAULT mode (for roster enrichment & matching)
 */
export async function getUsersVault(params: VaultParams & { status?: string }): Promise<SevenShiftsUser[]> {
  const data = await callProxyVault(
    "get_users",
    params.organizationId,
    params.integrationKey,
    { params: { status: params.status || "active" } }
  );
  return data?.data || [];
}

/**
 * Fetch roles — VAULT mode
 */
export async function getRolesVault(params: VaultParams): Promise<any[]> {
  const data = await callProxyVault(
    "get_roles",
    params.organizationId,
    params.integrationKey
  );
  return data?.data || [];
}

/**
 * Fetch departments — VAULT mode
 */
export async function getDepartmentsVault(params: VaultParams): Promise<any[]> {
  const data = await callProxyVault(
    "get_departments",
    params.organizationId,
    params.integrationKey,
    { locationId: params.locationId }
  );
  return data?.data || [];
}

// ─── LEGACY DIRECT MODE FUNCTIONS (kept for backward compatibility) ──────────

export async function getLocations({ accessToken, companyId }: ConnectionParams): Promise<any[]> {
  const data = await callProxyDirect({ action: "get_locations", apiKey: accessToken, companyId });
  return data?.data || [];
}

export async function getDepartments({ accessToken, companyId, locationId }: ConnectionParams): Promise<any[]> {
  const data = await callProxyDirect({ action: "get_departments", apiKey: accessToken, companyId, locationId });
  return data?.data || [];
}

export async function getRoles({ accessToken, companyId, locationId }: ConnectionParams): Promise<any[]> {
  const data = await callProxyDirect({ action: "get_roles", apiKey: accessToken, companyId, locationId });
  return data?.data || [];
}

// ─── VAULT MODE: WAGE & LABOR DATA ──────────────────────────────────────────

/**
 * 7shifts wage object — per-role wage with effective date
 * From GET /v2/company/{id}/users/{userId}/wages
 */
export interface SevenShiftsWage {
  effective_date: string;       // YYYY-MM-DD
  role_id: number | null;       // null = salary/role-agnostic
  wage_type: 'hourly' | 'weekly_salary';
  wage_cents: number;           // Amount in cents (e.g. 1550 = $15.50)
}

export interface SevenShiftsWageResponse {
  current_wages: SevenShiftsWage[];
  upcoming_wages: SevenShiftsWage[];
}

/**
 * 7shifts labor settings (company-level)
 * wage_based_roles_enabled: whether wages are assigned per-role or flat
 */
export interface SevenShiftsLaborSettings {
  wage_based_roles_enabled: boolean;
  [key: string]: any;
}

/**
 * Fetch wages for a single user — VAULT mode
 * Returns current_wages and upcoming_wages arrays
 */
export async function getUserWagesVault(
  params: VaultParams & { userId: number }
): Promise<SevenShiftsWageResponse> {
  const data = await callProxyVault(
    "get_user_wages",
    params.organizationId,
    params.integrationKey,
    { userId: params.userId }
  );
  return {
    current_wages: data?.data?.current_wages || [],
    upcoming_wages: data?.data?.upcoming_wages || [],
  };
}

/**
 * Fetch wages for multiple users in parallel — VAULT mode
 * Returns a map of userId → wage response
 * Gracefully handles individual failures (returns empty wages for that user)
 */
export async function getBulkUserWagesVault(
  params: VaultParams & { userIds: number[] }
): Promise<Record<number, SevenShiftsWageResponse>> {
  const results: Record<number, SevenShiftsWageResponse> = {};

  // Batch in groups of 5 to respect rate limits (10 req/s)
  const BATCH_SIZE = 5;
  for (let i = 0; i < params.userIds.length; i += BATCH_SIZE) {
    const batch = params.userIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(userId =>
        getUserWagesVault({ ...params, userId })
      )
    );

    batch.forEach((userId, idx) => {
      const result = batchResults[idx];
      if (result.status === 'fulfilled') {
        results[userId] = result.value;
      } else {
        console.warn(`[7shifts] Failed to fetch wages for user ${userId}:`, result.reason);
        results[userId] = { current_wages: [], upcoming_wages: [] };
      }
    });

    // Small delay between batches to stay under rate limit
    if (i + BATCH_SIZE < params.userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Fetch user assignments (roles, departments, locations) — VAULT mode
 */
export async function getUserAssignmentsVault(
  params: VaultParams & { userId: number }
): Promise<any> {
  const data = await callProxyVault(
    "get_user_assignments",
    params.organizationId,
    params.integrationKey,
    { userId: params.userId }
  );
  return data?.data || [];
}

/**
 * Fetch company labor settings — VAULT mode
 * Includes wage_based_roles_enabled flag
 */
export async function getLaborSettingsVault(
  params: VaultParams
): Promise<SevenShiftsLaborSettings> {
  const data = await callProxyVault(
    "get_labor_settings",
    params.organizationId,
    params.integrationKey
  );
  return data?.data || { wage_based_roles_enabled: false };
}
