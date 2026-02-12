/**
 * SchedulingConfigPanel
 *
 * Unified config modal for ALL scheduling platforms.
 * Handles both CSV mode (export instructions + column preview) and
 * API mode (credential entry + test connection + sync settings).
 *
 * Single-active enforcement: only one scheduler at a time.
 * When API mode is selected for 7shifts, embeds the full credential flow.
 *
 * @diagnostics src/features/integrations/components/SchedulingConfigPanel.tsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Check,
  ExternalLink,
  FileSpreadsheet,
  Unplug,
  Info,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Upload,
  Zap,
  ChevronRight,
  RefreshCw,
  Key,
  Settings,
  Users,
  Calendar,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { nexus } from '@/lib/nexus';
import toast from 'react-hot-toast';
import {
  type IntegrationId,
  type IntegrationDefinition,
  type ConnectionMode,
  INTEGRATION_REGISTRY,
  getCSVTemplate,
} from '@/types/integrations';
import { use7ShiftsIntegration } from '../hooks';
import { previewShifts, type ConnectionStatus } from '@/lib/7shifts';
import { IntegrationFieldMapper, type FieldMap } from './IntegrationFieldMapper';
import { getLocalDateString, formatDateForDisplay, parseLocalDate } from '@/utils/dateUtils';

// =============================================================================
// TYPES
// =============================================================================

interface SchedulingConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** The integration being configured */
  integrationId: IntegrationId | null;
  /** Callback when connection state changes (connect/disconnect) */
  onConnectionChange?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const SchedulingConfigPanel: React.FC<SchedulingConfigPanelProps> = ({
  isOpen,
  onClose,
  integrationId,
  onConnectionChange,
}) => {
  const { organizationId, user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIntegrations, setCurrentIntegrations] = useState<Record<string, any>>({});
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('csv');

  // 7shifts API hook — only active when platform is 7shifts
  const sevenShifts = use7ShiftsIntegration();

  // Disconnect confirmation modal
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Preview state — shown after successful test
  const [testSucceeded, setTestSucceeded] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Field mapping modal — shown after successful API connection
  const [showFieldMapper, setShowFieldMapper] = useState(false);
  const [previewData, setPreviewData] = useState<{
    shiftCount: number;
    employees: string[];
    dateRange: string;
    shifts: Array<{ employee: string; role: string; date: string; time: string }>;
  } | null>(null);

  // Look up the integration definition + CSV template
  const definition = useMemo(() => {
    if (!integrationId) return null;
    return INTEGRATION_REGISTRY.find(i => i.id === integrationId) ?? null;
  }, [integrationId]);

  const csvTemplate = useMemo(() => {
    if (!definition?.schedulingPlatformId) return null;
    return getCSVTemplate(definition.schedulingPlatformId);
  }, [definition]);

  const supportsApi = definition?.supportedModes?.includes('api') ?? false;
  const isConnected = currentIntegrations[integrationId ?? '']?.connected === true;
  const is7shifts = integrationId === '7shifts';
  const currentSavedMode = currentIntegrations[integrationId ?? '']?.connection_mode as ConnectionMode | undefined;
  const connectionStatus: ConnectionStatus = is7shifts
    ? sevenShifts.connectionStatus
    : isConnected ? 'active' : 'disconnected';

  // For API mode on 7shifts, use the hook's connected state
  const isApiConnected = is7shifts && connectionMode === 'api' && sevenShifts.isConnected;
  const isExpired = is7shifts && connectionStatus === 'expired';
  const isErrorState = is7shifts && connectionStatus === 'error';

  // Find if another scheduling platform is already active
  const activeScheduler = useMemo(() => {
    const schedulingIds = INTEGRATION_REGISTRY
      .filter(i => i.category === 'scheduling')
      .map(i => i.id);

    for (const id of schedulingIds) {
      if (id === integrationId) continue;
      const config = currentIntegrations[id];
      if (config?.enabled && config?.connected) {
        const def = INTEGRATION_REGISTRY.find(i => i.id === id);
        return { id, label: def?.label ?? id };
      }
    }
    return null;
  }, [currentIntegrations, integrationId]);

  // Load current org integrations
  const loadIntegrations = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('integrations')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      setCurrentIntegrations(data?.integrations ?? {});

      // Set connection mode from existing config
      const existing = data?.integrations?.[integrationId ?? ''];
      if (existing?.connection_mode) {
        setConnectionMode(existing.connection_mode);
      } else {
        setConnectionMode('csv');
      }
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, integrationId]);

  useEffect(() => {
    if (isOpen && integrationId) {
      loadIntegrations();
      // Reset preview state on fresh open
      setTestSucceeded(false);
      setPreviewData(null);
      setPreviewLoading(false);
      setShowDisconnectModal(false);
    }
  }, [isOpen, integrationId, loadIntegrations]);

  // Health check on open for active 7shifts connections
  useEffect(() => {
    if (isOpen && is7shifts && sevenShifts.isConnected && currentSavedMode === 'api') {
      sevenShifts.runHealthCheck();
    }
  }, [isOpen, is7shifts, sevenShifts.isConnected, currentSavedMode]);

  // =========================================================================
  // CONNECT: CSV MODE
  // =========================================================================

  const handleConnectCSV = async () => {
    if (!organizationId || !user || !integrationId) return;
    setIsConnecting(true);

    try {
      const updated = { ...currentIntegrations };

      // Disconnect any other active scheduler first
      if (activeScheduler) {
        updated[activeScheduler.id] = {
          ...updated[activeScheduler.id],
          enabled: false,
          connected: false,
        };
      }

      // Connect this one in CSV mode
      updated[integrationId] = {
        ...updated[integrationId],
        enabled: true,
        connected: true,
        connection_mode: 'csv',
        connected_at: new Date().toISOString(),
        connected_by: user.id,
      };

      const { error } = await supabase
        .from('organizations')
        .update({ integrations: updated, updated_at: new Date().toISOString() })
        .eq('id', organizationId);

      if (error) throw error;

      setCurrentIntegrations(updated);

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          integration_id: integrationId,
          integration_name: definition?.label,
          action: 'connected',
          connection_mode: 'csv',
          replaced: activeScheduler?.label ?? null,
        },
      });

      const msg = activeScheduler
        ? `${definition?.label} connected via CSV (replaced ${activeScheduler.label})`
        : `${definition?.label} connected via CSV`;
      toast.success(msg);

      onConnectionChange?.();
      onClose();
    } catch (err: any) {
      console.error('Error connecting integration:', err);
      toast.error(`Failed to connect: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // =========================================================================
  // CONNECT: API MODE (7shifts)
  // =========================================================================

  const handleConnectAPI = async () => {
    if (!is7shifts) return;

    // Disconnect any other active scheduler first
    if (activeScheduler && organizationId && user) {
      const updated = { ...currentIntegrations };
      updated[activeScheduler.id] = {
        ...updated[activeScheduler.id],
        enabled: false,
        connected: false,
      };

      // Also set connection_mode on this platform before the hook saves
      updated[integrationId!] = {
        ...updated[integrationId!],
        connection_mode: 'api',
      };

      await supabase
        .from('organizations')
        .update({ integrations: updated, updated_at: new Date().toISOString() })
        .eq('id', organizationId);

      setCurrentIntegrations(updated);
    }

    // Delegate to the 7shifts hook — it tests connection + saves credentials
    const success = await sevenShifts.saveCredentials();
    if (success) {
      // Ensure connection_mode is 'api' in the saved config
      if (organizationId) {
        const { data } = await supabase
          .from('organizations')
          .select('integrations')
          .eq('id', organizationId)
          .single();

        if (data?.integrations) {
          const patched = {
            ...data.integrations,
            '7shifts': {
              ...data.integrations['7shifts'],
              connection_mode: 'api',
            },
          };
          await supabase
            .from('organizations')
            .update({ integrations: patched })
            .eq('id', organizationId);
          setCurrentIntegrations(patched);
        }
      }

      if (activeScheduler) {
        await nexus({
          organization_id: organizationId!,
          user_id: user!.id,
          activity_type: 'settings_changed',
          details: {
            integration_id: integrationId,
            integration_name: definition?.label,
            action: 'replaced_scheduler',
            replaced: activeScheduler.label,
          },
        });
      }

      // Show field mapping step instead of immediately closing
      setShowFieldMapper(true);
    }
  };

  /** Called when field mapper saves or is skipped */
  const handleFieldMapperComplete = () => {
    setShowFieldMapper(false);
    onConnectionChange?.();
    onClose();
  };

  // =========================================================================
  // DISCONNECT
  // =========================================================================

  const handleDisconnect = async () => {
    if (!organizationId || !user || !integrationId) return;

    // For 7shifts API mode, use the hook's disconnect (Vault purge + state reset)
    if (is7shifts && currentSavedMode === 'api') {
      setIsDisconnecting(true);
      const success = await sevenShifts.disconnect();
      setIsDisconnecting(false);
      setShowDisconnectModal(false);
      if (success) {
        await loadIntegrations();
        onConnectionChange?.();
        onClose();
      }
      return;
    }

    // CSV mode disconnect
    setIsDisconnecting(true);
    try {
      const updated = {
        ...currentIntegrations,
        [integrationId]: {
          ...currentIntegrations[integrationId],
          enabled: false,
          connected: false,
          config: null,
        },
      };

      const { error } = await supabase
        .from('organizations')
        .update({ integrations: updated, updated_at: new Date().toISOString() })
        .eq('id', organizationId);

      if (error) throw error;

      setCurrentIntegrations(updated);

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          integration_id: integrationId,
          integration_name: definition?.label,
          action: 'disconnected',
        },
      });

      toast.success(`${definition?.label} disconnected`);
      onConnectionChange?.();
      onClose();
    } catch (err: any) {
      console.error('Error disconnecting:', err);
      toast.error(`Failed to disconnect: ${err.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // =========================================================================
  // CONNECT HANDLER (routes to CSV or API)
  // =========================================================================

  const handleConnect = () => {
    if (connectionMode === 'api' && is7shifts) {
      handleConnectAPI();
    } else {
      handleConnectCSV();
    }
  };

  if (!isOpen || !integrationId || !definition) return null;

  // Derive effective loading / connecting state
  const effectiveLoading = isLoading || (is7shifts && sevenShifts.isLoading);
  const effectiveConnecting = isConnecting || (is7shifts && sevenShifts.isConnecting);

  // For API mode: can we submit?
  const apiCanConnect = is7shifts && connectionMode === 'api' && sevenShifts.hasCredentials;

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-lg w-full max-w-xl my-8 max-h-[90vh] flex flex-col border border-gray-700/50">

        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{definition.label}</h2>
              <p className="text-sm text-gray-400">{definition.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {effectiveLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* ─── CONNECTION STATUS BANNER ─── */}
              {isConnected && connectionStatus === 'active' && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400">Connected</p>
                    <p className="text-xs text-gray-400">
                      {currentSavedMode === 'api'
                        ? `API sync active — Location ID: ${sevenShifts.locationId}`
                        : `CSV import mode — upload exports from ${definition.label} in the Import tab`
                      }
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    currentSavedMode === 'api'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                  }`}>
                    {currentSavedMode}
                  </span>
                </div>
              )}

              {/* ─── EXPIRED CREDENTIALS BANNER + RECONNECT FIELDS ─── */}
              {isExpired && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-400">Credentials Expired</p>
                      <p className="text-xs text-gray-400">
                        Your 7shifts API key is no longer valid. Please enter a new key and reconnect.
                        Your synced schedule data is safe and unaffected.
                      </p>
                    </div>
                  </div>

                  {/* Reconnect credential fields */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Reconnect with New API Key
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">
                          New API Key <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          className="input w-full"
                          placeholder="Enter your new 7shifts API key"
                          value={sevenShifts.apiKey}
                          onChange={(e) => sevenShifts.setApiKey(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1.5">Company ID</label>
                          <input
                            type="text"
                            className="input w-full"
                            placeholder="7140"
                            value={sevenShifts.companyId}
                            onChange={(e) => sevenShifts.setCompanyId(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1.5">Location ID</label>
                          <input
                            type="text"
                            className="input w-full"
                            value={sevenShifts.locationId}
                            onChange={(e) => sevenShifts.setLocationId(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-500">
                          Company & Location IDs are preserved from your previous connection.
                        </p>
                        <button
                          onClick={async () => {
                            const success = await sevenShifts.saveCredentials();
                            if (success) {
                              onConnectionChange?.();
                              onClose();
                            }
                          }}
                          disabled={!sevenShifts.hasCredentials || sevenShifts.isConnecting}
                          className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                        >
                          {sevenShifts.isConnecting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Testing & Reconnecting...</>
                          ) : (
                            <><Key className="w-4 h-4" />Test & Reconnect</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── ERROR STATE BANNER ─── */}
              {isErrorState && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-400">Connection Issue</p>
                    <p className="text-xs text-gray-400">
                      {sevenShifts.connectionError || 'Unable to reach 7shifts. The service may be temporarily unavailable.'}
                    </p>
                    <button
                      onClick={() => sevenShifts.runHealthCheck()}
                      className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                </div>
              )}

              {/* ─── SINGLE-ACTIVE WARNING ─── */}
              {!isConnected && activeScheduler && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">
                      {activeScheduler.label} is currently active
                    </p>
                    <p className="text-xs text-gray-400">
                      ChefLife supports one scheduling platform at a time. Connecting {definition.label} will
                      disconnect {activeScheduler.label}. Your import history is preserved.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── CONNECTION MODE SELECTOR (platforms with both CSV + API) ─── */}
              {supportsApi && !isConnected && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Connection Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setConnectionMode('csv')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        connectionMode === 'csv'
                          ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Upload className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-medium text-white">CSV Import</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Export CSVs manually and upload in the Import tab. Works immediately.
                      </p>
                    </button>
                    <button
                      onClick={() => setConnectionMode('api')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        connectionMode === 'api'
                          ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-white">API Sync</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Auto-sync shifts and time data. Requires API credentials.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* CSV MODE CONTENT                                                  */}
              {/* ================================================================= */}
              {(connectionMode === 'csv' || !supportsApi) && !isConnected && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-300">How CSV Import Works</h3>
                  <div className="space-y-2">
                    <StepCard
                      number={1}
                      title={`Export from ${definition.label}`}
                      description={csvTemplate?.exportInstructions || 'Export your scheduled and worked hours as CSV files.'}
                    />
                    <StepCard
                      number={2}
                      title="Upload in Import Tab"
                      description="Drop both CSV files into the Import tab. ChefLife auto-detects the column format."
                    />
                    <StepCard
                      number={3}
                      title="Delta Engine Analyzes"
                      description="Scheduled vs. worked shifts are compared. Attendance events are detected and staged for review."
                    />
                  </div>

                  {/* Column mapping preview */}
                  {csvTemplate && (
                    <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-300">Auto-Mapped Columns</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {Object.entries(csvTemplate.columns).map(([field, aliases]) => (
                          <div key={field} className="flex items-center gap-1.5">
                            <span className="text-gray-500 min-w-[70px]">{formatFieldName(field)}</span>
                            <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                            <span className="text-gray-300 truncate">{(aliases as string[])[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CSV connected — show column mapping + instructions as reference */}
              {isConnected && currentSavedMode === 'csv' && csvTemplate && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Import Configuration
                  </h3>

                  <div className="p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">
                      <strong className="text-gray-300">Export steps:</strong> {csvTemplate.exportInstructions}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-300">Auto-Mapped Columns</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {Object.entries(csvTemplate.columns).map(([field, aliases]) => (
                        <div key={field} className="flex items-center gap-1.5">
                          <span className="text-gray-500 min-w-[70px]">{formatFieldName(field)}</span>
                          <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                          <span className="text-gray-300 truncate">{(aliases as string[])[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* API MODE CONTENT (7shifts)                                        */}
              {/* ================================================================= */}
              {connectionMode === 'api' && is7shifts && (
                <div className="space-y-4">

                  {/* API Error Display */}
                  {sevenShifts.connectionError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-400">Connection Error</h4>
                        <p className="text-xs text-red-300/80">{sevenShifts.connectionError}</p>
                      </div>
                    </div>
                  )}

                  {/* API Credentials Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      API Credentials
                    </h3>

                  {isApiConnected ? (
                    /* ── CONNECTED: Locked credential display ── */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <Key className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                            Credentials Stored Securely
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            API key encrypted in vault — Company {sevenShifts.companyId || '7140'} · Location {sevenShifts.locationId || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── NOT CONNECTED: Editable credential fields ── */
                    <>
                    {/* Help text */}
                    <div className="flex items-start gap-2 p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                      <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-400">
                        Find your API key in 7shifts under <strong className="text-gray-300">Company Settings → Integrations → API</strong>.
                        Your Location ID is in the URL when viewing a location.
                        <a
                          href="https://www.7shifts.com/integrations"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-400 hover:text-primary-300 ml-1 inline-flex items-center gap-0.5"
                        >
                          Learn more <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>

                    {/* Credential Fields */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">
                          API Key <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          className="input w-full"
                          placeholder="Enter your 7shifts API key"
                          value={sevenShifts.apiKey}
                          onChange={(e) => sevenShifts.setApiKey(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1.5">
                            Company ID
                          </label>
                          <input
                            type="text"
                            className="input w-full"
                            placeholder="7140"
                            value={sevenShifts.companyId}
                            onChange={(e) => sevenShifts.setCompanyId(e.target.value)}
                          />
                          <p className="text-[10px] text-gray-500 mt-1">Usually 7140 for most accounts</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1.5">
                            Location ID <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            className="input w-full"
                            placeholder="Your location ID"
                            value={sevenShifts.locationId}
                            onChange={(e) => sevenShifts.setLocationId(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Test Connection */}
                      <div className="flex justify-end">
                        <button
                          onClick={async () => {
                            setTestSucceeded(false);
                            setPreviewData(null);
                            const success = await sevenShifts.testConnection();
                            if (success) {
                              setTestSucceeded(true);
                              // Fetch preview data
                              setPreviewLoading(true);
                              try {
                                const startDate = getLocalDateString();
                                const endObj = new Date();
                                endObj.setDate(endObj.getDate() + 6);
                                const endDate = getLocalDateString(endObj);

                                const result = await previewShifts({
                                  accessToken: sevenShifts.apiKey,
                                  companyId: sevenShifts.companyId,
                                  locationId: sevenShifts.locationId,
                                  startDate,
                                  endDate,
                                });

                                const shifts = result.data || [];
                                const meta = result.meta || { shift_count: 0, user_count: 0, role_count: 0 };

                                // Extract unique employee names from enriched data
                                const employeeSet = new Set<string>();
                                shifts.forEach((s) => employeeSet.add(s.employee_name));

                                // Build preview rows from first 5 shifts
                                const previewRows = shifts.slice(0, 5).map((s) => {
                                  const shiftDate = s.start
                                    ? new Date(s.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                    : '';
                                  const startTime = s.start
                                    ? new Date(s.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                    : '';
                                  const endTime = s.end
                                    ? new Date(s.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                    : '';
                                  return {
                                    employee: s.employee_name,
                                    role: s.role_name,
                                    date: shiftDate,
                                    time: `${startTime} – ${endTime}`,
                                  };
                                });

                                setPreviewData({
                                  shiftCount: meta.shift_count,
                                  employees: Array.from(employeeSet),
                                  dateRange: `${startDate} – ${endDate}`,
                                  shifts: previewRows,
                                });
                              } catch (err) {
                                console.warn('Preview fetch failed (connection still valid):', err);
                                // Don't block — test still succeeded
                              } finally {
                                setPreviewLoading(false);
                              }
                            }
                          }}
                          disabled={!sevenShifts.hasCredentials || sevenShifts.isConnecting}
                          className="btn-ghost text-sm flex items-center gap-1.5"
                        >
                          {sevenShifts.isConnecting ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Testing...</>
                          ) : (
                            <><RefreshCw className="w-3.5 h-3.5" />Test Connection</>
                          )}
                        </button>
                      </div>

                      {/* ─── CONNECTION TEST SUCCESS + DATA PREVIEW ─── */}
                      {!isApiConnected && testSucceeded && (
                        <div className="space-y-3">
                          {/* Success Banner */}
                          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-400">Connection Verified</p>
                              <p className="text-xs text-gray-400">
                                Successfully authenticated with 7shifts (Company {sevenShifts.companyId}, Location {sevenShifts.locationId})
                              </p>
                            </div>
                          </div>

                          {/* Data Preview */}
                          {previewLoading ? (
                            <div className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                              <span className="text-sm text-gray-400">Loading shift preview...</span>
                            </div>
                          ) : previewData ? (
                            <div className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-300">Live Data Preview</h4>
                                <span className="text-[10px] text-gray-500 font-mono">{previewData.dateRange}</span>
                              </div>

                              {/* Stats Row */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                                  <Calendar className="w-4 h-4 text-primary-400" />
                                  <div>
                                    <p className="text-sm font-semibold text-white">{previewData.shiftCount}</p>
                                    <p className="text-[10px] text-gray-500">Shifts</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                                  <Users className="w-4 h-4 text-amber-400" />
                                  <div>
                                    <p className="text-sm font-semibold text-white">{previewData.employees.length}</p>
                                    <p className="text-[10px] text-gray-500">Employees</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                                  <Clock className="w-4 h-4 text-green-400" />
                                  <div>
                                    <p className="text-sm font-semibold text-white">7 days</p>
                                    <p className="text-[10px] text-gray-500">Range</p>
                                  </div>
                                </div>
                              </div>

                              {/* Sample Shifts Table */}
                              {previewData.shifts.length > 0 ? (
                                <div className="overflow-hidden rounded-lg border border-gray-700/30">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-800/60 text-gray-400">
                                        <th className="text-left px-3 py-1.5 font-medium">Employee</th>
                                        <th className="text-left px-3 py-1.5 font-medium">Role</th>
                                        <th className="text-left px-3 py-1.5 font-medium">Date</th>
                                        <th className="text-left px-3 py-1.5 font-medium">Time</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/30">
                                      {previewData.shifts.map((shift, idx) => (
                                        <tr key={idx} className="text-gray-300">
                                          <td className="px-3 py-1.5 font-medium text-white">{shift.employee}</td>
                                          <td className="px-3 py-1.5">{shift.role}</td>
                                          <td className="px-3 py-1.5 text-gray-400">{shift.date}</td>
                                          <td className="px-3 py-1.5 text-gray-400">{shift.time}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {previewData.shiftCount > 5 && (
                                    <div className="px-3 py-1.5 bg-gray-800/40 text-[10px] text-gray-500 text-center">
                                      Showing 5 of {previewData.shiftCount} shifts this week
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-3">
                                  <p className="text-xs text-gray-500">No shifts scheduled for the next 7 days.</p>
                                  <p className="text-[10px] text-gray-600 mt-1">Connection is working — shifts will appear once published in 7shifts.</p>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    </>  
                  )}
                  </div>

                  {/* Sync Settings (shown only during setup, before connection) */}
                  {!isApiConnected && sevenShifts.hasCredentials && (
                    <div className="space-y-3 pt-3 border-t border-gray-700/50">
                      <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Sync Settings
                      </h3>

                      <p className="text-xs text-gray-400">
                        Once connected, you can manually sync this week's shifts using the <strong className="text-gray-300">Sync This Week</strong> button.
                      </p>

                      <label className="flex items-center gap-3 cursor-not-allowed group opacity-60">
                        <input
                          type="checkbox"
                          checked={false}
                          disabled
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-gray-900"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-400">
                            Automatically sync schedules
                          </span>
                          <p className="text-[10px] text-gray-500">Scheduled background sync</p>
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-gray-700/50 text-gray-400 border border-gray-600/30">
                          Coming Soon
                        </span>
                      </label>

                      <label className="flex items-center gap-3 cursor-not-allowed group opacity-60">
                        <input
                          type="checkbox"
                          checked={false}
                          disabled
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-gray-900"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-400">
                            Notify on schedule changes
                          </span>
                          <p className="text-[10px] text-gray-500">Change detection notifications</p>
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-gray-700/50 text-gray-400 border border-gray-600/30">
                          Coming Soon
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* ─── API connected: Manual Sync + Settings ─── */}
              {isConnected && currentSavedMode === 'api' && is7shifts && (
                <div className="space-y-4">

                  {/* ── STALE DATA WARNING ── */}
                  {(() => {
                    if (!sevenShifts.lastSyncAt) return null;
                    const daysSinceSync = Math.floor(
                      (Date.now() - new Date(sevenShifts.lastSyncAt).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (daysSinceSync < 7) return null;
                    return (
                      <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-400">Schedule Data May Be Stale</p>
                          <p className="text-xs text-gray-400">
                            Last sync was {daysSinceSync} day{daysSinceSync !== 1 ? 's' : ''} ago. Published schedules in 7shifts may have changed since then.
                          </p>
                          <button
                            onClick={async () => {
                              const startDate = getLocalDateString();
                              const endObj = new Date();
                              endObj.setDate(endObj.getDate() + 6);
                              await sevenShifts.syncNow(
                                startDate,
                                getLocalDateString(endObj)
                              );
                            }}
                            disabled={sevenShifts.isSyncing}
                            className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                          >
                            {sevenShifts.isSyncing ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Syncing...</>
                            ) : (
                              <><RefreshCw className="w-3 h-3" /> Sync Now</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── MANUAL SYNC ── */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Sync Schedules
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          const startDate = getLocalDateString();
                          const endObj = new Date();
                          endObj.setDate(endObj.getDate() + 6);
                          const endDate = getLocalDateString(endObj);
                          await sevenShifts.syncNow(startDate, endDate);
                        }}
                        disabled={sevenShifts.isSyncing}
                        className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                      >
                        {sevenShifts.isSyncing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Syncing...</>
                        ) : (
                          <><RefreshCw className="w-4 h-4" />Sync This Week</>
                        )}
                      </button>
                      {sevenShifts.lastSyncAt && (
                        <p className="text-[10px] text-gray-500">
                          Last synced: {new Date(sevenShifts.lastSyncAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Pulls published shifts for the next 7 days from 7shifts. If a schedule already exists for this period, it will be replaced with fresh data.
                    </p>
                  </div>

                  {/* ── SYNC SETTINGS ── */}
                  <div className="space-y-4 pt-3 border-t border-gray-700/50">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Sync Settings
                    </h3>

                    {/* ── Auto-Sync Toggle + Frequency ── */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={sevenShifts.autoSync}
                          onClick={() => {
                            const newValue = !sevenShifts.autoSync;
                            sevenShifts.setAutoSync(newValue);
                            // If turning off, reset to manual
                            if (!newValue) {
                              sevenShifts.setSyncFrequency('manual');
                            } else if (sevenShifts.syncFrequency === 'manual') {
                              // Default to daily when enabling
                              sevenShifts.setSyncFrequency('daily');
                            }
                          }}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                            sevenShifts.autoSync ? 'bg-primary-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              sevenShifts.autoSync ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${
                            sevenShifts.autoSync ? 'text-white' : 'text-gray-400'
                          }`}>
                            Auto-sync schedules
                          </span>
                          <p className="text-[10px] text-gray-500">
                            {sevenShifts.autoSync
                              ? 'Schedules will sync automatically'
                              : 'Only manual sync via the button above'}
                          </p>
                        </div>
                      </label>

                      {/* Frequency picker — shown when auto-sync enabled */}
                      {sevenShifts.autoSync && (
                        <div className="ml-12 space-y-2">
                          <label className="block text-xs font-medium text-gray-400">Frequency</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: '6h', label: 'Every 6 hours', desc: '4× daily' },
                              { value: '12h', label: 'Every 12 hours', desc: '2× daily' },
                              { value: 'daily', label: 'Daily', desc: 'Each morning' },
                              { value: 'weekly', label: 'Weekly', desc: 'Monday AM' },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  sevenShifts.setSyncFrequency(opt.value as any);
                                }}
                                className={`p-2 rounded-lg border text-left transition-all ${
                                  sevenShifts.syncFrequency === opt.value
                                    ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30'
                                    : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
                                }`}
                              >
                                <span className={`text-xs font-medium ${
                                  sevenShifts.syncFrequency === opt.value ? 'text-white' : 'text-gray-300'
                                }`}>{opt.label}</span>
                                <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Info className="w-3 h-3 flex-shrink-0" />
                            Pulls this week's published shifts and replaces existing data.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Notify on Changes — Coming Soon ── */}
                    <label className="flex items-center gap-3 cursor-not-allowed group opacity-50">
                      <div className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full bg-gray-700 border-2 border-transparent">
                        <span className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-gray-500 shadow ring-0 translate-x-0" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-gray-500">
                          Notify on schedule changes
                        </span>
                        <p className="text-[10px] text-gray-600">Get alerted when 7shifts schedules are updated</p>
                      </div>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-gray-700/50 text-gray-500 border border-gray-600/30">
                        Coming Soon
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* ─── WEBSITE LINK ─── */}
              {definition.website && (
                <a
                  href={definition.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  {definition.website.replace('https://', '').replace('www.', '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DISCONNECT CONFIRMATION MODAL                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {showDisconnectModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center p-6 rounded-lg">
            <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-rose-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Unplug className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Disconnect {definition?.label}?</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    This will remove your stored API credentials.
                  </p>
                </div>
              </div>

              {/* What stays */}
              <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg space-y-1.5">
                <p className="text-xs font-medium text-green-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> What stays
                </p>
                <ul className="text-xs text-gray-400 space-y-1 pl-5">
                  <li>All synced schedules and shift history</li>
                  <li>Employee attendance records from 7shifts data</li>
                  <li>Import history and audit trail</li>
                  {sevenShifts.scheduleDataSummary && sevenShifts.scheduleDataSummary.scheduleCount > 0 && (
                    <li className="text-gray-300 font-medium">
                      {sevenShifts.scheduleDataSummary.scheduleCount} schedule{sevenShifts.scheduleDataSummary.scheduleCount !== 1 ? 's' : ''} with{' '}
                      {sevenShifts.scheduleDataSummary.shiftCount} shift{sevenShifts.scheduleDataSummary.shiftCount !== 1 ? 's' : ''} preserved
                    </li>
                  )}
                </ul>
              </div>

              {/* What goes */}
              <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg space-y-1.5">
                <p className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> What's removed
                </p>
                <ul className="text-xs text-gray-400 space-y-1 pl-5">
                  <li>API credentials (purged from encrypted storage)</li>
                  <li>Auto-sync settings</li>
                  <li>Live connection to 7shifts</li>
                </ul>
              </div>

              <p className="text-[10px] text-gray-500">
                You can reconnect anytime with a new API key. CSV import will remain available as a fallback.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDisconnectModal(false)}
                  className="btn-ghost text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg transition-colors"
                >
                  {isDisconnecting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Disconnecting...</>
                  ) : (
                    <><Unplug className="w-4 h-4" />Disconnect</>  
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── FOOTER ACTIONS ─── */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          {(isConnected || isExpired) ? (
            <>
              <button
                onClick={() => setShowDisconnectModal(true)}
                disabled={isDisconnecting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Unplug className="w-4 h-4" />
                Disconnect
              </button>
              <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">
                Done
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={
                  effectiveConnecting ||
                  (connectionMode === 'api' && is7shifts && !sevenShifts.hasCredentials)
                }
                className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
              >
                {effectiveConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {connectionMode === 'api' ? 'Testing & Connecting...' : 'Connecting...'}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {activeScheduler
                      ? `Replace ${activeScheduler.label}`
                      : connectionMode === 'api'
                        ? `Connect & Test`
                        : `Connect ${definition.label}`
                    }
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Field Mapping Modal — shown after successful API connection */}
    {showFieldMapper && integrationId && organizationId && (
      <IntegrationFieldMapper
        isOpen={showFieldMapper}
        onClose={handleFieldMapperComplete}
        onSave={() => handleFieldMapperComplete()}
        integrationKey={integrationId}
        integrationName={definition?.label || integrationId}
        organizationId={organizationId}
        isConnectionFlow={true}
      />
    )}
    </>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const StepCard: React.FC<{ number: number; title: string; description: string }> = ({
  number,
  title,
  description,
}) => (
  <div className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
    <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
      <span className="text-xs font-semibold text-primary-400">{number}</span>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-200">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
    </div>
  </div>
);

// =============================================================================
// HELPERS
// =============================================================================

/** Format snake_case field name for display: "employee_id" → "Employee ID" */
function formatFieldName(field: string): string {
  return field
    .split('_')
    .map(word => word === 'id' ? 'ID' : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
