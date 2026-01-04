import React from "react";
import {
  X,
  Calendar,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Unplug,
  RefreshCw,
  Info,
} from "lucide-react";
import { use7ShiftsIntegration } from "../hooks";

interface SevenShiftsConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const SevenShiftsConfigPanel: React.FC<SevenShiftsConfigPanelProps> = ({
  isOpen,
  onClose,
  onConnectionChange,
}) => {
  const {
    apiKey,
    setApiKey,
    companyId,
    setCompanyId,
    locationId,
    setLocationId,
    isLoading,
    isConnecting,
    isConnected,
    connectionError,
    autoSync,
    setAutoSync,
    syncFrequency,
    setSyncFrequency,
    notifyChanges,
    setNotifyChanges,
    lastSyncAt,
    testConnection,
    saveCredentials,
    disconnect,
    hasCredentials,
    hasUnsavedChanges,
  } = use7ShiftsIntegration();

  const handleSave = async () => {
    const success = await saveCredentials();
    if (success) {
      onConnectionChange?.(true);
    }
  };

  const handleDisconnect = async () => {
    const success = await disconnect();
    if (success) {
      onConnectionChange?.(false);
    }
  };

  const handleTestConnection = async () => {
    await testConnection();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl my-8 max-h-[90vh] flex flex-col border border-gray-700/50">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <img
                src="https://framerusercontent.com/images/GTwNANjmDcbIsFhKyhhH32pNv4.png?scale-down-to=512"
                alt="7shifts logo"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">7shifts Integration</h2>
              <p className="text-sm text-gray-400">Connect your scheduling platform</p>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Connection Status */}
              <div className={`p-4 rounded-lg border ${
                isConnected 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-gray-800/50 border-gray-700/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isConnected ? (
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-medium">
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {isConnected 
                          ? `Location ID: ${locationId}`
                          : 'Enter your credentials below to connect'
                        }
                      </p>
                    </div>
                  </div>
                  {isConnected && (
                    <button
                      onClick={handleDisconnect}
                      className="btn-ghost-red text-sm"
                    >
                      <Unplug className="w-4 h-4 mr-1" />
                      Disconnect
                    </button>
                  )}
                </div>
                {lastSyncAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Last synced: {new Date(lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Error Display */}
              {connectionError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-400 font-medium">Connection Error</h4>
                    <p className="text-sm text-red-300/80">{connectionError}</p>
                  </div>
                </div>
              )}

              {/* Credentials */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-white">API Credentials</h3>
                
                {/* Info box */}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      API Key <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      placeholder="Enter your 7shifts API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Company ID
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="7140"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Usually 7140 for most accounts</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Location ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="Enter your location ID"
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                    />
                  </div>
                </div>

                {/* Test Connection Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleTestConnection}
                    disabled={!hasCredentials || isConnecting}
                    className="btn-ghost text-sm"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Test Connection
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sync Settings */}
              <div className="space-y-4 pt-4 border-t border-gray-700/50">
                <h3 className="text-base font-medium text-white">Sync Settings</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-gray-900"
                    />
                    <div>
                      <span className="text-gray-300 group-hover:text-white transition-colors">
                        Automatically sync schedules
                      </span>
                      <p className="text-xs text-gray-500">Pull new schedules from 7shifts on a schedule</p>
                    </div>
                  </label>

                  {autoSync && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Sync Frequency
                      </label>
                      <select
                        value={syncFrequency}
                        onChange={(e) => setSyncFrequency(e.target.value as any)}
                        className="input w-full max-w-xs"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={notifyChanges}
                      onChange={(e) => setNotifyChanges(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-gray-900"
                    />
                    <div>
                      <span className="text-gray-300 group-hover:text-white transition-colors">
                        Notify on schedule changes
                      </span>
                      <p className="text-xs text-gray-500">Get notified when schedules are updated in 7shifts</p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <a
            href="https://www.7shifts.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-400 flex items-center gap-1"
          >
            7shifts.com <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasCredentials || isConnecting}
              className="btn-primary text-sm"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Connecting...
                </>
              ) : isConnected && !hasUnsavedChanges ? (
                'Save Settings'
              ) : (
                'Connect & Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
