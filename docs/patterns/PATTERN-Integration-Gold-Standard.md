# ChefLife Integration Pattern — Gold Standard

> **Status:** Proven with 7shifts (Sessions 107–110)  
> **Next Target:** SensorPush  
> **Pattern Version:** 1.0  
> **Last Updated:** February 10, 2026

---

## Philosophy

Every external integration in ChefLife follows the same architecture — a five-layer stack that separates security, state management, and UI concerns cleanly. Build it once per integration, reuse the patterns, and the only thing that changes is the external API you're talking to.

**People-first principle applies here too:** Every integration should reassure the user that their data is safe, their credentials are encrypted, and disconnecting never destroys what they've already built.

---

## The Five Layers

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 5: UI — Config Panel + IntegrationCard badges    │
├─────────────────────────────────────────────────────────┤
│  LAYER 4: Hook — State machine + credential lifecycle   │
├─────────────────────────────────────────────────────────┤
│  LAYER 3: Client Library — Proxy callers + Vault ops    │
├─────────────────────────────────────────────────────────┤
│  LAYER 2: Edge Function — Credential resolver + API     │
├─────────────────────────────────────────────────────────┤
│  LAYER 1: Database — Vault secrets + JSONB metadata     │
└─────────────────────────────────────────────────────────┘
```

Each layer has one job. No layer reaches past its neighbor.

---

## Layer 1: Database — Vault + JSONB

### What Lives Where

| Data | Location | Why |
|------|----------|-----|
| API keys, tokens, passwords | `vault.secrets` via `integration_secrets` view | Encrypted at rest, never exposed to client |
| Connection status, mode, timestamps | `organizations.integrations` JSONB | Drives UI state, readable by client |
| Non-sensitive config (company_id, location_id, settings) | Same JSONB | Needed for display and reconnect |

**The rule:** If it could be used to authenticate against an external service, it goes in Vault. Everything else stays in JSONB.

### Vault Helper Functions (Already Deployed — Reusable)

These three RPC functions are **integration-agnostic** — they take an `integration_key` string parameter:

```sql
-- Store a single credential (upserts — safe to call repeatedly)
store_integration_secret(
  p_organization_id UUID,
  p_integration_key  TEXT,    -- e.g. '7shifts', 'sensorpush', 'square'
  p_secret_name      TEXT,    -- e.g. 'api_key', 'oauth_token', 'refresh_token'
  p_secret_value     TEXT,    -- the actual secret
  p_created_by       UUID     -- audit trail
) → UUID (secret id)

-- Retrieve all credentials for an integration as JSONB
get_integration_secrets(
  p_organization_id UUID,
  p_integration_key TEXT
) → JSONB  -- e.g. { "api_key": "xxx", "company_id": "7140", "location_id": "123" }

-- Purge all credentials on disconnect
purge_integration_secrets(
  p_organization_id UUID,
  p_integration_key TEXT
) → INTEGER (count of secrets removed)
```

**For SensorPush:** Same functions, just pass `'sensorpush'` as the integration key. No migration needed.

### JSONB Config Shape (Standard for All Integrations)

```jsonc
{
  "sensorpush": {
    // Connection state
    "enabled": true,
    "connected": true,
    "status": "active",           // "disconnected" | "active" | "error" | "expired" | "paused"
    "connection_mode": "api",     // "api" | "oauth" | "csv" — depends on integration
    
    // Audit
    "connected_at": "2026-02-10T...",
    "connected_by": "user-uuid",
    "disconnected_at": null,
    "disconnected_by": null,
    
    // Non-sensitive config (varies per integration)
    "config": {
      "device_id": "123456",      // SensorPush-specific
      "poll_interval": 300,       // SensorPush-specific
      "auto_sync": false,
      "last_sync_at": null
      // NEVER put api_key, token, password here
    }
  }
}
```

---

## Layer 2: Edge Function — The Proxy

Each integration gets its own Edge Function. The skeleton is identical — only the external API calls change.

### Skeleton: `supabase/functions/{integration}-proxy/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXTERNAL_API = "https://api.sensorpush.com/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── TYPES ───────────────────────────────────────────────────────────────

interface ProxyRequest {
  action: string;
  // Direct mode (test before storing)
  apiKey?: string;
  [directModeFields: string]: any;
  // Vault mode (post-connection)
  organizationId?: string;
  integrationKey?: string;       // defaults to this integration's key
  // Common
  params?: Record<string, any>;
}

interface ResolvedCredentials {
  apiKey: string;
  [otherFields: string]: any;   // integration-specific
}

// ─── CREDENTIAL RESOLVER (copy exactly — this is the reusable core) ──────

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
}

async function resolveCredentials(body: ProxyRequest): Promise<ResolvedCredentials> {
  // Direct mode: credentials in request body (test_connection)
  if (body.apiKey) {
    return { apiKey: body.apiKey, /* ...other direct fields */ };
  }

  // Vault mode: read from encrypted storage
  if (body.organizationId && body.integrationKey) {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc("get_integration_secrets", {
      p_organization_id: body.organizationId,
      p_integration_key: body.integrationKey,
    });

    if (error) throw new Error("Failed to retrieve stored credentials");
    if (!data?.api_key) throw new Error("NO_CREDENTIALS");

    return { apiKey: data.api_key, /* ...other Vault fields */ };
  }

  throw new Error("MISSING_AUTH");
}

// ─── ERROR RESPONSE HELPER ───────────────────────────────────────────────

function errorResponse(message: string, status: number, code?: string): Response {
  return new Response(
    JSON.stringify({ error: message, code: code || "UNKNOWN" }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const body: ProxyRequest = await req.json();
    const { action, params } = body;
    if (!action) return errorResponse("Missing action", 400, "MISSING_ACTION");

    // Resolve credentials (direct or Vault)
    let creds: ResolvedCredentials;
    try {
      creds = await resolveCredentials(body);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "NO_CREDENTIALS") return errorResponse("No stored credentials", 404, "NO_CREDENTIALS");
      if (msg === "MISSING_AUTH") return errorResponse("Missing credentials", 400, "MISSING_AUTH");
      return errorResponse("Credential error", 500, "CREDENTIAL_ERROR");
    }

    // ─── HEALTH CHECK (same pattern for every integration) ────────
    if (action === "health_check") {
      // Call the simplest possible endpoint to verify credentials
      const res = await fetch(`${EXTERNAL_API}/some/lightweight/endpoint`, {
        headers: { "Authorization": `Bearer ${creds.apiKey}` },
      });
      
      if (res.ok) {
        return new Response(JSON.stringify({ 
          status: "active", checked_at: new Date().toISOString() 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // Map auth failures → "expired", everything else → "error"
      const status = (res.status === 401 || res.status === 403) ? "expired" : "error";
      const code = status === "expired" ? "AUTH_EXPIRED" : "API_ERROR";
      return new Response(JSON.stringify({ 
        status, error_code: code, http_status: res.status, checked_at: new Date().toISOString() 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── INTEGRATION-SPECIFIC ACTIONS ─────────────────────────────
    // This is the part that changes per integration
    switch (action) {
      case "test_connection":
        // ...
      case "get_readings":    // SensorPush-specific
        // ...
      case "get_devices":     // SensorPush-specific
        // ...
      default:
        return errorResponse(`Unknown action: ${action}`, 400, "UNKNOWN_ACTION");
    }

  } catch (error) {
    return errorResponse((error as Error).message, 500, "INTERNAL_ERROR");
  }
});
```

### Key Design Decisions

1. **Always JWT-verified** (`verify_jwt: true`) — Supabase gateway enforces auth before the function runs
2. **Always POST** — credentials and params in the body, never in URLs or query strings
3. **Two credential modes** — Direct for testing, Vault for everything after
4. **Auth failure detection** — 401/403 from external API → `AUTH_EXPIRED` error code → drives state machine
5. **Rate limiting** — per API key, in-memory (optional but recommended)
6. **Structured error codes** — `ProxyError` class in client maps codes to state transitions

---

## Layer 3: Client Library — `src/lib/{integration}.ts`

The client library provides typed functions for calling the Edge Function and managing Vault operations.

### Standard Exports (Every Integration)

```typescript
// ─── Types ───────────────────────────────────────────────────────────────
export type ConnectionStatus = "disconnected" | "active" | "error" | "expired" | "paused";

export class ProxyError extends Error {
  code: string;
  httpStatus: number;
  get isAuthExpired(): boolean;
  get isNoCredentials(): boolean;
  get isRateLimited(): boolean;
}

export interface HealthCheckResult {
  status: ConnectionStatus;
  error_code?: string;
  checked_at: string;
}

// ─── Vault Operations (same for every integration) ───────────────────────
export async function storeCredentials(orgId, credentials, userId): Promise<void>;
export async function purgeCredentials(orgId): Promise<number>;

// ─── Direct Mode (pre-connection testing) ────────────────────────────────
export async function testConnection(params): Promise<boolean>;

// ─── Vault Mode (post-connection operations) ─────────────────────────────
export async function healthCheck(params): Promise<HealthCheckResult>;

// ─── Integration-Specific Functions ──────────────────────────────────────
// These vary per integration:
// 7shifts: previewShifts(), getShiftsVault(), getLocations(), etc.
// SensorPush: getReadings(), getDevices(), getGateways(), etc.
```

### Proxy Caller Pattern (Reusable Core)

```typescript
const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/{integration}-proxy`;

// Direct mode — apiKey in request body
async function callProxyDirect(body: Record<string, any>): Promise<any> {
  const token = await getAuthToken();
  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ProxyError(err.error || "API error", err.code || "UNKNOWN", response.status);
  }
  return response.json();
}

// Vault mode — organizationId in request, Edge Function reads Vault
async function callProxyVault(
  action: string, 
  organizationId: string, 
  integrationKey: string,
  extra: Record<string, any> = {}
): Promise<any> {
  // Same fetch pattern, body includes organizationId + integrationKey instead of apiKey
}
```

### Vault Credential Management (Copy-Paste Reusable)

The `storeCredentials` and `purgeCredentials` functions call the same database RPCs for every integration. The only thing that changes is the integration key and the credential field names:

```typescript
export async function storeCredentials(
  organizationId: string,
  credentials: { apiKey: string; /* integration-specific fields */ },
  createdBy?: string
): Promise<void> {
  const entries = [
    { name: "api_key", value: credentials.apiKey },
    // Add integration-specific credential fields here
    // SensorPush might have: { name: "auth_token", value: credentials.authToken }
  ];

  for (const entry of entries) {
    const { error } = await supabase.rpc("store_integration_secret", {
      p_organization_id: organizationId,
      p_integration_key: "sensorpush",   // ← only this changes
      p_secret_name: entry.name,
      p_secret_value: entry.value,
      p_created_by: createdBy || null,
    });
    if (error) throw new Error(`Failed to store credentials: ${error.message}`);
  }
}
```

---

## Layer 4: Hook — `src/features/integrations/hooks/use{Integration}.ts`

The hook manages the connection state machine, credential lifecycle, and JSONB synchronization.

### The Universal State Machine

```
disconnected ──→ active ──→ error ──→ active (retry/health check)
                   │
                   ├──→ expired ──→ active (reconnect with new credentials)
                   │                 ↘ disconnected (user gives up)
                   │
                   └──→ paused ──→ active (resume — future feature)
```

Every integration follows this exact state machine. The transitions are triggered by:

| Trigger | Transition |
|---------|-----------|
| `saveCredentials()` succeeds | `disconnected → active` |
| Health check returns `active` | `error → active` or stays `active` |
| Health check returns `expired` | `active → expired` |
| Sync/operation gets 401/403 | `active → expired` |
| Sync/operation fails (non-auth) | `active → error` |
| `disconnect()` called | `any → disconnected` |
| Reconnect with new creds | `expired → active` |

### Standard Hook Return Shape

```typescript
interface UseIntegrationReturn {
  // Credential form state (only used before connection)
  apiKey: string;          setApiKey: (key: string) => void;
  // ...integration-specific form fields

  // Connection state machine
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  isConnected: boolean;     // convenience: status === 'active'
  connectionError: string | null;

  // Settings (integration-specific)
  autoSync: boolean;         setAutoSync: (v: boolean) => void;
  lastSyncAt: string | null;
  // ...other settings

  // Actions
  testConnection: () => Promise<boolean>;
  saveCredentials: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  runHealthCheck: () => Promise<HealthCheckResult | null>;
  // ...integration-specific actions (syncNow, getReadings, etc.)

  // Disconnection flow
  showDisconnectConfirm: boolean;
  setShowDisconnectConfirm: (show: boolean) => void;
  dataSummary: { /* count of preserved data */ } | null;
}
```

### Critical Hook Behaviors

1. **On mount:** Load JSONB config → set state → if connected, run health check
2. **Migration check:** If old plaintext credentials exist in JSONB, auto-migrate to Vault on first load
3. **`saveCredentials()` flow:** Test connection (direct) → store in Vault → update JSONB metadata (NO secrets) → set status `active` → log to NEXUS
4. **`disconnect()` flow:** Purge Vault → update JSONB status → reset local state → preserve synced data → log to NEXUS
5. **Auth failure detection:** Any `ProxyError` with `isAuthExpired` → set status `expired` → show reconnect UI
6. **NEXUS logging:** Every connect, disconnect, sync, and credential event gets an audit entry

### JSONB Update Pattern (Always Read-Modify-Write)

```typescript
// Always fetch current state first (prevents race conditions)
const { data: orgData } = await supabase
  .from("organizations")
  .select("integrations")
  .eq("id", organizationId)
  .single();

const updatedIntegrations = {
  ...(orgData?.integrations || {}),
  "sensorpush": {
    enabled: true,
    connected: true,
    status: "active" as ConnectionStatus,
    connected_at: new Date().toISOString(),
    connected_by: user.id,
    connection_mode: "api",
    config: {
      // Non-sensitive metadata ONLY
    },
  },
};

await supabase
  .from("organizations")
  .update({ integrations: updatedIntegrations, updated_at: new Date().toISOString() })
  .eq("id", organizationId);
```

---

## Layer 5: UI — Config Panel + Card Badges

### IntegrationCard Status Badges (Already Built — Automatic)

The `IntegrationCard` component reads `IntegrationStatus` and renders the correct badge. No per-integration work needed — just pass the status:

| Status | Icon | Color | Badge Text | Card Treatment |
|--------|------|-------|------------|----------------|
| `disconnected` | — | gray | — | Default gray border |
| `connected` | Check | green | "Connected" | Blue ring, green dot |
| `error` | AlertCircle | amber | "Error" | Red ring, pulsing red dot, "Fix" button |
| `expired` | KeyRound | red | "Credentials Expired" | Red ring, pulsing red dot, "Reconnect" button |
| `paused` | Pause | gray | "Paused" | Gray styling |
| `syncing` | Loader2 | blue | "Syncing" | Spinner animation |

The `getIntegrationStatus()` function in `types/integrations.ts` maps the JSONB `status` field to these display states automatically.

### Config Panel Pattern

Each integration's config panel should follow this visual structure:

```
┌──────────────────────────────────────────────────┐
│  Panel Header (integration name + icon)          │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌── Status Banner ──────────────────────────┐   │
│  │  Green: Connected since {date}            │   │
│  │  Red: Credentials Expired                 │   │
│  │  Amber: Error — {message} + Retry         │   │
│  │  Amber: Stale Data Warning + Sync Now     │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌── Credential Fields (when disconnected/   │   │
│  │   expired) ───────────────────────────────┐   │
│  │  API Key: [____________]                  │   │
│  │  Integration-specific fields...           │   │
│  │  [Test Connection]  [Connect / Reconnect] │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌── Connected Features ─────────────────────┐   │
│  │  Sync controls / data preview / settings  │   │
│  │  (varies per integration)                 │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌── Disconnect Section ─────────────────────┐   │
│  │  "What happens when you disconnect"       │   │
│  │  ✓ What's KEPT: synced data, settings     │   │
│  │  ✗ What's REMOVED: API credentials        │   │
│  │  [Disconnect] (with confirmation modal)   │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
├──────────────────────────────────────────────────┤
│  [Disconnect]                          [Done]    │
└──────────────────────────────────────────────────┘
```

### Reconnect UX (Expired State)

When status is `expired`, the panel shows:
1. Red banner: "Credentials expired. Your data is safe."
2. Credential input fields with **pre-populated non-sensitive fields** (company ID, device ID, etc.)
3. Empty API key field (the user enters a fresh one)
4. "Test & Reconnect" button (same as initial connect flow)

This reduces friction — the user only has to update the one thing that changed.

### Stale Data Warning

When `lastSyncAt` exceeds a threshold (7 days for schedules, configurable per integration):
- Amber banner: "Last sync was X days ago"
- Inline "Sync Now" button
- Non-blocking — informational, not alarming

---

## Integration Checklist — New Integration Setup

Use this checklist when adding a new integration (e.g., SensorPush):

### Database (Layer 1)
- [ ] No migration needed — Vault helpers are integration-agnostic
- [ ] Decide credential field names (e.g., `auth_token`, `api_key`, `device_id`)
- [ ] Define JSONB config shape for `organizations.integrations['{key}']`

### Edge Function (Layer 2)
- [ ] Create `supabase/functions/{integration}-proxy/index.ts`
- [ ] Copy credential resolver from 7shifts (change integration key string only)
- [ ] Implement `health_check` action (lightest possible external API call)
- [ ] Implement `test_connection` action
- [ ] Implement integration-specific actions (get_readings, get_devices, etc.)
- [ ] Handle 401/403 → `AUTH_EXPIRED` error code on every action
- [ ] Deploy with `verify_jwt: true`
- [ ] Add rate limiting if external API has limits

### Client Library (Layer 3)
- [ ] Create `src/lib/{integration}.ts`
- [ ] Define `ConnectionStatus`, `ProxyError`, `HealthCheckResult` types (or import shared)
- [ ] Implement `callProxyDirect()` and `callProxyVault()` 
- [ ] Implement `storeCredentials()` and `purgeCredentials()` (change integration key only)
- [ ] Implement `testConnection()` and `healthCheck()`
- [ ] Implement integration-specific functions

### Hook (Layer 4)
- [ ] Create `src/features/integrations/hooks/use{Integration}.ts`
- [ ] Implement state machine (disconnected → active → error → expired)
- [ ] Implement `loadIntegration` effect (read JSONB → set state → health check)
- [ ] Implement `saveCredentials` (test → Vault store → JSONB update → NEXUS log)
- [ ] Implement `disconnect` (Vault purge → JSONB update → preserve data → NEXUS log)
- [ ] Implement plaintext migration check (if upgrading existing integration)
- [ ] Add `dataSummary` for disconnect confirmation modal

### UI (Layer 5)
- [ ] Add integration to `INTEGRATION_REGISTRY` in `types/integrations.ts` (if not already)
- [ ] Create config panel component (or extend existing category panel)
- [ ] Wire status banners: green (active), red (expired), amber (error), amber (stale)
- [ ] Wire credential fields for disconnected + expired states
- [ ] Wire disconnect section with "what stays / what goes" explanation
- [ ] Add integration-specific connected features (sync controls, data preview, etc.)
- [ ] Test IntegrationCard badge displays correctly for all states

### Testing
- [ ] Fresh connect: credentials → test → Vault → JSONB → green badge
- [ ] Panel open when connected: health check → green banner → controls
- [ ] Disconnect: Vault purged → JSONB updated → data preserved → card updates
- [ ] Reconnect after disconnect: new credentials → Vault → active
- [ ] Expired detection: simulate 401 → red banner → reconnect fields
- [ ] Expired reconnect: new key → test → Vault → back to active
- [ ] Stale data warning: old lastSyncAt → amber banner → Sync Now works
- [ ] API error (non-auth): amber banner → Retry button

---

## File Locations (Reference)

### Shared Infrastructure (Don't Duplicate)
| Component | Path |
|-----------|------|
| Vault RPC functions | Database (`store/get/purge_integration_secret`) |
| IntegrationStatus type | `src/types/integrations.ts` |
| getIntegrationStatus() | `src/types/integrations.ts` |
| IntegrationCard component | `src/shared/components/IntegrationCard/index.tsx` |
| IntegrationsManager | `src/features/admin/components/sections/IntegrationsManager/index.tsx` |
| INTEGRATION_REGISTRY | `src/types/integrations.ts` |

### Per-Integration (Create New)
| Component | Path Pattern |
|-----------|-------------|
| Edge Function | `supabase/functions/{integration}-proxy/index.ts` |
| Client Library | `src/lib/{integration}.ts` |
| React Hook | `src/features/integrations/hooks/use{Integration}.ts` |
| Config Panel | `src/features/integrations/components/{Integration}ConfigPanel.tsx` |

### 7shifts Reference Implementation
| Component | Path |
|-----------|------|
| Edge Function (v5) | Deployed — `7shifts-proxy` |
| Client Library (v5) | `src/lib/7shifts.ts` |
| React Hook (v5) | `src/features/integrations/hooks/use7ShiftsIntegration.ts` |
| Config Panel | `src/features/integrations/components/SchedulingConfigPanel.tsx` |

---

## Future Considerations

### Base Hook Extraction
Once SensorPush is built, the ~70% overlap between `use7ShiftsIntegration` and `useSensorPushIntegration` should be extracted into a `useIntegrationConnection` base hook that handles:
- State machine transitions
- JSONB read/write pattern
- Vault store/purge lifecycle
- Health check polling
- NEXUS audit logging
- Disconnect confirmation flow

Each integration hook then extends it with integration-specific actions and settings.

### OAuth Integrations
Some future integrations (Square, Toast) may use OAuth instead of API keys. The pattern extends naturally:
- `connection_mode: "oauth"` in JSONB
- Vault stores `access_token` + `refresh_token`
- Edge Function handles token refresh automatically
- State machine adds `refreshing` state between `active` and `expired`

### Webhook Receivers
Some integrations push data to us (vs. us pulling). The Edge Function pattern extends:
- Separate webhook endpoint (no JWT — uses webhook signature verification)
- Writes directly to integration-specific tables
- Updates `lastSyncAt` in JSONB
- Fires NEXUS events for audit trail

---

## SensorPush Quick-Start

When you're ready to build SensorPush, here's what's unique vs. 7shifts:

| Aspect | 7shifts | SensorPush |
|--------|---------|------------|
| Auth method | API key (Bearer token) | Email + password → auth token |
| Credential fields | api_key, company_id, location_id | email, password, auth_token |
| Primary data | Shifts, users, roles | Temperature readings, devices, gateways |
| Sync pattern | Manual/scheduled pull | Continuous polling (every 5 min) |
| HACCP integration | None | Feeds directly into HACCP temp logs |
| Category | `scheduling` | `haccp` |

The SensorPush API uses a two-step auth (authorize → get access token), so the Edge Function will need an `authorize` action that exchanges email/password for an access token, which then gets stored in Vault. After that, the pattern is identical.
