import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useScheduleStore } from "@/stores/scheduleStore";
import { nexus } from "@/lib/nexus";
import {
  type ConnectionStatus,
  type HealthCheckResult,
  testConnection as apiTestConnection,
  storeCredentials,
  purgeCredentials,
  healthCheck as apiHealthCheck,
  previewShiftsVault,
  ProxyError,
} from "@/lib/7shifts";
import { matchEmployeeWithTeamMember } from "@/utils/employeeMatching";
import { logActivity } from "@/lib/activity-logger";
import { getLocalDateString, parseLocalDate } from "@/utils/dateUtils";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface SevenShiftsCredentials {
  api_key: string;
  company_id: string;
  location_id: string;
}

export interface SevenShiftsSettings {
  auto_sync: boolean;
  sync_frequency: "manual" | "6h" | "12h" | "daily" | "weekly";
  notify_changes: boolean;
  last_sync_at?: string;
}

interface Use7ShiftsIntegrationReturn {
  // Credentials (form inputs — only used before connection)
  apiKey: string;
  setApiKey: (key: string) => void;
  companyId: string;
  setCompanyId: (id: string) => void;
  locationId: string;
  setLocationId: (id: string) => void;

  // Connection state machine
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  isConnected: boolean; // convenience: status === 'active'
  connectionError: string | null;

  // Settings
  autoSync: boolean;
  setAutoSync: (enabled: boolean) => void;
  syncFrequency: "manual" | "6h" | "12h" | "daily" | "weekly";
  setSyncFrequency: (freq: "manual" | "6h" | "12h" | "daily" | "weekly") => void;
  notifyChanges: boolean;
  setNotifyChanges: (enabled: boolean) => void;
  lastSyncAt: string | null;

  // Actions
  testConnection: () => Promise<boolean>;
  saveCredentials: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  syncNow: (startDate: string, endDate: string) => Promise<boolean>;
  saveSettings: () => Promise<boolean>;
  runHealthCheck: () => Promise<HealthCheckResult | null>;

  // Validation
  hasCredentials: boolean;
  hasUnsavedChanges: boolean;

  // Disconnection flow
  showDisconnectConfirm: boolean;
  setShowDisconnectConfirm: (show: boolean) => void;
  scheduleDataSummary: { scheduleCount: number; shiftCount: number } | null;
}

/**
 * Hook for managing 7shifts integration with Vault-encrypted credentials
 *
 * Connection State Machine:
 *   disconnected → active (on successful connect + store)
 *   active → error (on sync failure, non-auth)
 *   active → expired (on 401/403 from 7shifts)
 *   active → paused (user-initiated pause — future)
 *   active → disconnected (user-initiated disconnect)
 *   error → active (on successful health check / reconnect)
 *   expired → active (on reconnect with new credentials)
 *   expired → disconnected (user gives up)
 *
 * Credential Flow:
 *   1. User enters API key in form → testConnection (direct mode)
 *   2. Test passes → storeCredentials() saves to Vault (encrypted)
 *   3. JSONB config stores ONLY non-sensitive metadata (connection_mode, status)
 *   4. All subsequent API calls use Vault mode (organizationId → Edge Function → Vault)
 *   5. Disconnect → purgeCredentials() wipes Vault, preserves schedule data
 *
 * @diagnostics src/features/integrations/hooks/use7ShiftsIntegration.ts
 * @version 5
 */
export const use7ShiftsIntegration = (): Use7ShiftsIntegrationReturn => {
  const { organizationId, user } = useAuth();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Connection state machine
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Credentials (form state — only used before connection)
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("7140");
  const [locationId, setLocationId] = useState("");

  // Saved credentials metadata (NOT the secrets themselves)
  const [savedCredentials, setSavedCredentials] =
    useState<SevenShiftsCredentials | null>(null);

  // Settings
  const [autoSync, setAutoSync] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState<
    "manual" | "6h" | "12h" | "daily" | "weekly"
  >("manual");
  const [notifyChanges, setNotifyChanges] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Disconnection flow
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [scheduleDataSummary, setScheduleDataSummary] = useState<{
    scheduleCount: number;
    shiftCount: number;
  } | null>(null);

  // Ref to track if migration from plaintext has happened
  const migrationChecked = useRef(false);

  // Store functions
  const { testConnection: storeTestConnection, sync7shiftsSchedule } =
    useScheduleStore();

  // Convenience
  const isConnected = connectionStatus === "active";
  const hasCredentials = Boolean(apiKey && locationId);
  const hasUnsavedChanges = Boolean(
    apiKey !== (savedCredentials?.api_key || "") ||
      locationId !== (savedCredentials?.location_id || "") ||
      companyId !== (savedCredentials?.company_id || "7140")
  );

  // ─── LOAD INTEGRATION CONFIG ────────────────────────────────────────────

  useEffect(() => {
    const loadIntegration = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("integrations")
          .eq("id", organizationId)
          .single();

        if (error) throw error;

        const sevenShifts = data?.integrations?.["7shifts"];

        if (sevenShifts) {
          const config = sevenShifts.config || {};
          const status: ConnectionStatus =
            sevenShifts.status || (sevenShifts.connected ? "active" : "disconnected");

          setConnectionStatus(status);

          // Set form fields from saved metadata
          setCompanyId(config.company_id || "7140");
          setLocationId(config.location_id || "");

          // Settings
          setAutoSync(config.auto_sync || false);
          setSyncFrequency(config.sync_frequency || "manual");
          setNotifyChanges(config.notify_changes || false);
          setLastSyncAt(config.last_sync_at || null);

          setSavedCredentials({
            api_key: "", // Never stored in JSONB anymore
            company_id: config.company_id || "7140",
            location_id: config.location_id || "",
          });

          // ─── MIGRATION: If old plaintext API key exists, move to Vault ────
          if (
            !migrationChecked.current &&
            config.api_key &&
            sevenShifts.connected &&
            user
          ) {
            migrationChecked.current = true;
            console.log("[7shifts] Migrating plaintext credentials to Vault...");

            try {
              await storeCredentials(organizationId, {
                apiKey: config.api_key,
                companyId: config.company_id || "7140",
                locationId: config.location_id,
              }, user.id);

              // Remove plaintext from JSONB
              const updated = {
                ...data.integrations,
                "7shifts": {
                  ...sevenShifts,
                  status: "active",
                  config: {
                    company_id: config.company_id || "7140",
                    location_id: config.location_id || "",
                    auto_sync: config.auto_sync || false,
                    sync_frequency: config.sync_frequency || "manual",
                    notify_changes: config.notify_changes || false,
                    last_sync_at: config.last_sync_at || null,
                    // api_key deliberately OMITTED
                  },
                },
              };

              await supabase
                .from("organizations")
                .update({ integrations: updated })
                .eq("id", organizationId);

              console.log("[7shifts] Migration complete — plaintext API key removed from JSONB");
              setConnectionStatus("active");
            } catch (migErr) {
              console.error("[7shifts] Migration failed:", migErr);
              // Don't break — old credentials still work via direct mode
            }
          }

          // If connected, set credentials in schedule store for backward compat
          if (
            (status === "active" || sevenShifts.connected) &&
            config.api_key &&
            config.location_id
          ) {
            useScheduleStore.getState().setCredentials({
              accessToken: config.api_key,
              companyId: config.company_id || "7140",
              locationId: config.location_id,
            });
          }
        }
      } catch (error) {
        console.error("Error loading 7shifts integration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadIntegration();
  }, [organizationId, user]);

  // ─── HEALTH CHECK ───────────────────────────────────────────────────────

  /**
   * Verify stored credentials are still valid.
   * Updates connectionStatus based on result.
   */
  const runHealthCheck = useCallback(async (): Promise<HealthCheckResult | null> => {
    if (!organizationId || connectionStatus === "disconnected") return null;

    try {
      const result = await apiHealthCheck({ organizationId });
      setConnectionStatus(result.status);

      if (result.status === "expired") {
        setConnectionError(
          "Your 7shifts API credentials have expired. Please reconnect with a new API key."
        );
      } else if (result.status === "error") {
        setConnectionError(
          "Unable to reach 7shifts. The service may be temporarily unavailable."
        );
      } else if (result.status === "active") {
        setConnectionError(null);
      }

      return result;
    } catch (error) {
      console.error("Health check failed:", error);
      return null;
    }
  }, [organizationId, connectionStatus]);

  // ─── TEST CONNECTION ────────────────────────────────────────────────────

  /**
   * Test connection using DIRECT credentials (before storing in Vault)
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!apiKey || !locationId) {
      toast.error("Please enter API key and location ID");
      return false;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      useScheduleStore.getState().setCredentials({
        accessToken: apiKey,
        companyId,
        locationId,
      });

      const success = await storeTestConnection();

      if (success) {
        toast.success("Connection successful!");
        return true;
      } else {
        setConnectionError(
          "Connection failed. Please check your credentials."
        );
        toast.error("Connection failed. Please check your credentials.");
        return false;
      }
    } catch (error) {
      console.error("Connection test error:", error);
      const message =
        error instanceof Error ? error.message : "Error testing connection";
      setConnectionError(message);
      toast.error(message);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [apiKey, companyId, locationId, storeTestConnection]);

  // ─── SAVE CREDENTIALS (Vault-backed) ───────────────────────────────────

  /**
   * Test connection, then store credentials in Vault (encrypted at rest).
   * The JSONB config stores ONLY non-sensitive metadata.
   */
  const saveCredentialsHandler = useCallback(async (): Promise<boolean> => {
    if (!organizationId || !user) {
      toast.error("Not authenticated");
      return false;
    }

    if (!apiKey || !locationId) {
      toast.error("Please enter API key and location ID");
      return false;
    }

    setIsConnecting(true);

    try {
      // 1. Test connection first (direct mode)
      const connectionSuccess = await testConnection();
      if (!connectionSuccess) return false;

      // 2. Store credentials in Vault (encrypted)
      await storeCredentials(
        organizationId,
        { apiKey, companyId, locationId },
        user.id
      );

      // 3. Update JSONB with metadata ONLY (no API key!)
      const { data: orgData, error: fetchError } = await supabase
        .from("organizations")
        .select("integrations")
        .eq("id", organizationId)
        .single();

      if (fetchError) throw fetchError;

      const currentIntegrations = orgData?.integrations || {};
      const updatedIntegrations = {
        ...currentIntegrations,
        "7shifts": {
          enabled: true,
          connected: true,
          status: "active" as ConnectionStatus,
          connected_at: new Date().toISOString(),
          connected_by: user.id,
          connection_mode: "api",
          config: {
            // NO api_key — it's in Vault
            company_id: companyId,
            location_id: locationId,
            auto_sync: false,
            sync_frequency: "manual",
            notify_changes: false,
            last_sync_at: null,
          },
        },
      };

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          integrations: updatedIntegrations,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (updateError) throw updateError;

      // 4. Update local state
      setConnectionStatus("active");
      setSavedCredentials({
        api_key: "", // Not stored locally
        company_id: companyId,
        location_id: locationId,
      });

      // 5. Log to NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: "integration_connected",
        details: {
          integration_id: "7shifts",
          integration_name: "7shifts",
          vault_encrypted: true,
        },
      });

      toast.success("7shifts connected securely!");
      return true;
    } catch (error) {
      console.error("Error saving 7shifts credentials:", error);
      toast.error("Failed to save credentials");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [
    organizationId,
    user,
    apiKey,
    companyId,
    locationId,
    testConnection,
  ]);

  // ─── GRACEFUL DISCONNECT ───────────────────────────────────────────────

  /**
   * Disconnect 7shifts integration:
   * 1. Purge ALL credentials from Vault
   * 2. Update JSONB status to 'disconnected'
   * 3. Preserve all synced schedule data (it's THEIR data)
   * 4. Reset local form state
   * 5. Log disconnect to NEXUS audit trail
   */
  const disconnect = useCallback(async (): Promise<boolean> => {
    if (!organizationId || !user) {
      toast.error("Not authenticated");
      return false;
    }

    try {
      // 1. Purge credentials from Vault
      const purgedCount = await purgeCredentials(organizationId);
      console.log(`[7shifts] Purged ${purgedCount} secrets from Vault`);

      // 2. Update JSONB — status only, preserve metadata for audit
      const { data: orgData, error: fetchError } = await supabase
        .from("organizations")
        .select("integrations")
        .eq("id", organizationId)
        .single();

      if (fetchError) throw fetchError;

      const current = orgData?.integrations?.["7shifts"] || {};
      const updatedIntegrations = {
        ...(orgData?.integrations || {}),
        "7shifts": {
          enabled: false,
          connected: false,
          status: "disconnected" as ConnectionStatus,
          connected_at: null,
          connected_by: null,
          connection_mode: current.connection_mode || "csv",
          disconnected_at: new Date().toISOString(),
          disconnected_by: user.id,
          config: {
            // Preserve non-sensitive metadata for potential reconnect
            company_id: current.config?.company_id || "7140",
            location_id: current.config?.location_id || "",
            // NO api_key — it's been purged from Vault
          },
        },
      };

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          integrations: updatedIntegrations,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (updateError) throw updateError;

      // 3. Reset local state
      setApiKey("");
      setLocationId("");
      setCompanyId("7140");
      setSavedCredentials(null);
      setConnectionStatus("disconnected");
      setConnectionError(null);
      setAutoSync(false);
      setSyncFrequency("manual");
      setNotifyChanges(false);
      setLastSyncAt(null);
      setShowDisconnectConfirm(false);

      // 4. Clear credentials from schedule store
      useScheduleStore.getState().setCredentials({
        accessToken: "",
        companyId: "",
        locationId: "",
      });

      // 5. Log to NEXUS
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: "integration_disconnected",
        details: {
          integration_id: "7shifts",
          integration_name: "7shifts",
          secrets_purged: purgedCount,
          schedule_data_preserved: true,
        },
      });

      toast.success(
        "7shifts disconnected. Your synced schedules have been preserved."
      );
      return true;
    } catch (error) {
      console.error("Error disconnecting 7shifts:", error);
      toast.error("Failed to disconnect");
      return false;
    }
  }, [organizationId, user]);

  // ─── SYNC NOW (Vault-backed) ───────────────────────────────────────────

  /**
   * Manually sync shifts using Vault credentials via Edge Function.
   * Orchestrates the full flow: fetch → match → insert → log.
   * No raw API key needed — Vault mode reads encrypted secrets server-side.
   */
  const syncNow = useCallback(
    async (startDate: string, endDate: string): Promise<boolean> => {
      if (connectionStatus !== "active") {
        toast.error("Integration is not connected");
        return false;
      }

      if (!organizationId || !user) {
        toast.error("Not authenticated");
        return false;
      }

      setIsSyncing(true);
      try {
        // ── 1. FETCH ENRICHED SHIFTS VIA VAULT ─────────────────────
        const result = await previewShiftsVault({
          organizationId,
          startDate,
          endDate,
        });

        const enrichedShifts = result.data || [];

        if (enrichedShifts.length === 0) {
          toast.error("No published shifts found for the selected date range");
          return false;
        }

        // ── 2. DUPLICATE DETECTION ─────────────────────────────────
        const { data: existingSchedules } = await supabase
          .from("schedules")
          .select("id, start_date, end_date, status")
          .eq("organization_id", organizationId)
          .eq("source", "7shifts")
          .eq("start_date", startDate)
          .eq("end_date", endDate)
          .in("status", ["current", "upcoming"]);

        if (existingSchedules && existingSchedules.length > 0) {
          const existing = existingSchedules[0];
          await supabase
            .from("schedule_shifts")
            .delete()
            .eq("schedule_id", existing.id);
          await supabase
            .from("schedules")
            .delete()
            .eq("id", existing.id);
          console.log(
            `[sync7shifts] Replaced existing schedule ${existing.id} for ${startDate} – ${endDate}`
          );
        }

        // ── 3. EMPLOYEE MATCHING ───────────────────────────────────
        const matchedShifts = await Promise.all(
          enrichedShifts.map(async (shift: any) => {
            const matched = await matchEmployeeWithTeamMember(
              shift.employee_name,
              shift.user_id?.toString()
            );
            return {
              ...shift,
              matched_employee_id: matched.employee_id || null,
              matched_first_name: matched.first_name || null,
              matched_last_name: matched.last_name || null,
            };
          })
        );

        // ── 4. CREATE SCHEDULE RECORD ─────────────────────────────
        const { data: newSchedule, error: insertError } = await supabase
          .from("schedules")
          .insert([{
            organization_id: organizationId,
            start_date: startDate,
            end_date: endDate,
            status: "upcoming",
            created_by: user.id,
            source: "7shifts",
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // ── 5. TRANSFORM & INSERT SHIFTS ──────────────────────────
        const shiftsToInsert = matchedShifts.map((shift: any) => {
          // Use dateUtils to avoid UTC midnight → previous day bug
          const startDt = shift.start ? new Date(shift.start) : null;
          const endDt = shift.end ? new Date(shift.end) : null;
          const shiftDate = startDt
            ? getLocalDateString(startDt)
            : startDate;
          // Time extraction: toTimeString uses local timezone (HH:MM)
          const startTime = startDt
            ? startDt.toTimeString().slice(0, 5)
            : "";
          const endTime = endDt
            ? endDt.toTimeString().slice(0, 5)
            : "";

          return {
            schedule_id: newSchedule.id,
            employee_name: shift.employee_name,
            employee_id:
              shift.matched_employee_id ||
              shift.user_id?.toString() ||
              null,
            first_name: shift.matched_first_name || null,
            last_name: shift.matched_last_name || null,
            role: shift.role_name || null,
            shift_date: shiftDate,
            start_time: startTime,
            end_time: endTime,
            break_duration: 0,
            notes: shift.notes || "",
          };
        });

        // Insert in batches
        const batchSize = 100;
        for (let i = 0; i < shiftsToInsert.length; i += batchSize) {
          const batch = shiftsToInsert.slice(i, i + batchSize);
          const { error: shiftsError } = await supabase
            .from("schedule_shifts")
            .insert(batch);
          if (shiftsError) throw shiftsError;
        }

        // ── 6. UPDATE TIMESTAMPS ──────────────────────────────────
        const now = new Date().toISOString();
        setLastSyncAt(now);

        const { data: orgData } = await supabase
          .from("organizations")
          .select("integrations")
          .eq("id", organizationId)
          .single();

        if (orgData?.integrations?.["7shifts"]) {
          const updated = {
            ...orgData.integrations,
            "7shifts": {
              ...orgData.integrations["7shifts"],
              config: {
                ...(orgData.integrations["7shifts"].config || {}),
                last_sync_at: now,
              },
            },
          };
          await supabase
            .from("organizations")
            .update({ integrations: updated })
            .eq("id", organizationId);
        }

        // ── 7. ACTIVITY LOG ───────────────────────────────────────
        await logActivity({
          organization_id: organizationId,
          user_id: user.id,
          activity_type: "schedule_synced_7shifts" as any,
          details: {
            schedule_id: newSchedule.id,
            start_date: startDate,
            end_date: endDate,
            shift_count: enrichedShifts.length,
            employee_count: result.meta?.user_count || 0,
            role_count: result.meta?.role_count || 0,
            source: "7shifts",
            vault_mode: true,
            replaced_existing:
              (existingSchedules && existingSchedules.length > 0) || false,
          },
          metadata: {
            category: "team",
            severity: "info",
          },
        });

        toast.success(
          `Synced ${enrichedShifts.length} shifts from 7shifts (${startDate} – ${endDate})`
        );
        return true;
      } catch (error) {
        console.error("Sync failed:", error);

        // Detect auth expiry during sync
        if (error instanceof ProxyError && error.isAuthExpired) {
          setConnectionStatus("expired");
          setConnectionError(
            "Your 7shifts API credentials have expired. Please reconnect."
          );
          toast.error(
            "7shifts credentials expired. Please reconnect with a new API key."
          );
        } else {
          const msg =
            error instanceof Error
              ? error.message
              : "Failed to sync 7shifts schedule";
          toast.error(msg);
        }

        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [connectionStatus, organizationId, user]
  );

  // ─── SAVE SETTINGS ─────────────────────────────────────────────────────

  const saveSettings = useCallback(async (): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const { data: orgData, error: fetchError } = await supabase
        .from("organizations")
        .select("integrations")
        .eq("id", organizationId)
        .single();

      if (fetchError) throw fetchError;

      const current = orgData?.integrations?.["7shifts"] || {};
      const updated = {
        ...(orgData?.integrations || {}),
        "7shifts": {
          ...current,
          config: {
            ...(current.config || {}),
            auto_sync: autoSync,
            sync_frequency: syncFrequency,
            notify_changes: notifyChanges,
          },
        },
      };

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ integrations: updated, updated_at: new Date().toISOString() })
        .eq("id", organizationId);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  }, [organizationId, autoSync, syncFrequency, notifyChanges]);

  // ─── AUTO-SAVE SETTINGS ON CHANGE ───────────────────────────────────────

  const settingsInitialized = useRef(false);

  useEffect(() => {
    // Skip the initial load — only save on user-driven changes
    if (!settingsInitialized.current) {
      if (!isLoading && connectionStatus !== 'disconnected') {
        settingsInitialized.current = true;
      }
      return;
    }
    // Debounce saves to avoid rapid-fire DB writes
    const timer = setTimeout(() => {
      saveSettings();
    }, 300);
    return () => clearTimeout(timer);
  }, [autoSync, syncFrequency, notifyChanges]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── LOAD SCHEDULE SUMMARY (for disconnect confirmation) ────────────────

  useEffect(() => {
    const loadScheduleSummary = async () => {
      if (!organizationId || connectionStatus === "disconnected") return;

      try {
        const { count: scheduleCount } = await supabase
          .from("schedules")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("source", "7shifts");

        const { count: shiftCount } = await supabase
          .from("schedule_shifts")
          .select("id", { count: "exact", head: true })
          .in(
            "schedule_id",
            (
              await supabase
                .from("schedules")
                .select("id")
                .eq("organization_id", organizationId)
                .eq("source", "7shifts")
            ).data?.map((s: any) => s.id) || []
          );

        setScheduleDataSummary({
          scheduleCount: scheduleCount || 0,
          shiftCount: shiftCount || 0,
        });
      } catch (error) {
        // Non-critical — just for the confirmation modal
        console.error("Error loading schedule summary:", error);
      }
    };

    loadScheduleSummary();
  }, [organizationId, connectionStatus]);

  // ─── RETURN ─────────────────────────────────────────────────────────────

  return {
    // Credentials (form)
    apiKey,
    setApiKey,
    companyId,
    setCompanyId,
    locationId,
    setLocationId,

    // Connection state
    connectionStatus,
    isLoading,
    isConnecting,
    isSyncing,
    isConnected,
    connectionError,

    // Settings
    autoSync,
    setAutoSync,
    syncFrequency,
    setSyncFrequency,
    notifyChanges,
    setNotifyChanges,
    lastSyncAt,

    // Actions
    testConnection,
    saveCredentials: saveCredentialsHandler,
    disconnect,
    syncNow,
    saveSettings,
    runHealthCheck,

    // Validation
    hasCredentials,
    hasUnsavedChanges,

    // Disconnection flow
    showDisconnectConfirm,
    setShowDisconnectConfirm,
    scheduleDataSummary,
  };
};
