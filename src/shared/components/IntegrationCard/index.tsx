import React, { useState } from "react";
import { 
  Check, 
  Settings, 
  MoreVertical, 
  ExternalLink,
  Unplug,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Link2,
  Calendar,
  ThermometerSnowflake,
  CreditCard,
  Calculator,
  Pause,
  KeyRound,
} from "lucide-react";
import type { IntegrationStatus, IntegrationId } from "@/types/integrations";

// Map integration IDs to icons - match sidebar where applicable
const INTEGRATION_ICONS: Record<string, React.ElementType> = {
  '7shifts': Calendar,
  'hotschedules': Calendar,
  'whenIWork': Calendar,
  'deputy': Calendar,
  'homebase': Calendar,
  'sling': Calendar,
  'push': Calendar,
  'restaurant365': Calendar,
  'other_scheduler': Calendar,
  'sensorpush': ThermometerSnowflake,
  'square': CreditCard,
  'toast': CreditCard,
  'quickbooks': Calculator,
};

const STATUS_CONFIG: Record<IntegrationStatus, { 
  icon: React.ElementType; 
  text: string; 
  color: string;
  bg: string;
  border: string;
}> = {
  connected: { 
    icon: Check, 
    text: 'Connected', 
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/30'
  },
  disconnected: { 
    icon: Unplug, 
    text: 'Not Connected', 
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/30'
  },
  error: { 
    icon: AlertCircle, 
    text: 'Error', 
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30'
  },
  syncing: { 
    icon: Loader2, 
    text: 'Syncing', 
    color: 'text-primary-400',
    bg: 'bg-primary-500/20',
    border: 'border-primary-500/30'
  },
  expired: {
    icon: KeyRound,
    text: 'Credentials Expired',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30'
  },
  paused: {
    icon: Pause,
    text: 'Paused',
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/30'
  },
};

export interface IntegrationCardProps {
  id: IntegrationId;
  label: string;
  description: string;
  website: string;
  status: IntegrationStatus;
  
  // Actions
  onConnect?: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
  
  // State
  comingSoon?: boolean;
  isConnecting?: boolean;
  
  /** Connection mode badge — shown when connected */
  connectionMode?: 'csv' | 'api';
  
  // Optional custom icon
  icon?: React.ElementType;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  id,
  label,
  description,
  website,
  status,
  onConnect,
  onDisconnect,
  onConfigure,
  comingSoon = false,
  isConnecting = false,
  connectionMode,
  icon,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const Icon = icon || INTEGRATION_ICONS[id] || Link2;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const isConnected = status === 'connected';
  const isExpired = status === 'expired';
  const needsAttention = status === 'expired' || status === 'error';

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleConnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onConnect?.();
  };

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDisconnect?.();
  };

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onConfigure?.();
  };

  // Get short domain for display
  const shortDomain = website.replace('https://', '').replace('www.', '').split('/')[0];

  return (
    <div
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
      className={`bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 group flex flex-col relative ${
        isConnected
          ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30 scale-[1.02]'
          : needsAttention
            ? 'border-red-500/50 bg-red-500/5 ring-1 ring-red-500/20 scale-[1.02]'
            : 'border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 hover:scale-[1.01]'
      } ${isConnecting ? 'opacity-70 pointer-events-none' : ''}`}
    >
      {/* Main Content - Vertical Stack */}
      <div className="flex flex-col items-center text-center gap-3 flex-1">
        {/* Icon with ring */}
        <div className="relative">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ring-2 transition-all ${
            isConnected
              ? 'bg-primary-500/20 ring-primary-500/50'
              : needsAttention
                ? 'bg-red-500/15 ring-red-500/40'
                : 'bg-gray-700/50 ring-gray-700/50 group-hover:ring-primary-500/30'
          }`}>
            <Icon className={`w-8 h-8 transition-colors ${
              isConnected ? 'text-primary-400' : needsAttention ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
          {/* Status indicator dot */}
          {isConnected && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
          )}
          {needsAttention && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-800 animate-pulse" />
          )}
        </div>

        {/* Label */}
        <div className="text-white font-medium text-base leading-tight">
          {label}
        </div>

        {/* Status Badge */}
        <div className="h-7 flex items-center gap-2">
          {comingSoon ? (
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-gray-700/50 text-gray-400 border border-gray-600/30">
              Coming Soon
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wide ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
              <StatusIcon className={`w-3 h-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
              {statusConfig.text}
            </span>
          )}
          {isConnected && connectionMode && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
              connectionMode === 'api'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
            }`}>
              {connectionMode}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 line-clamp-2 px-2 mb-2">
          {description}
        </p>
      </div>

      {/* Footer section with actions */}
      <div className="mt-auto pt-3 border-t border-gray-700/30">
        {/* Website Link */}
        <div className="flex items-center justify-center mb-2">
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1 transition-colors"
          >
            {shortDomain}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Actions Row */}
        <div className="relative flex justify-end min-h-[32px]">
          {/* Animated Action Buttons - slides in horizontally from right */}
          {!comingSoon && (
            <div 
              className={`flex items-center gap-2 mr-2 transition-all duration-200 ease-out ${
                menuOpen 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 translate-x-4 pointer-events-none'
              }`}
            >
              {isConnected ? (
                <>
                  {onConfigure && (
                    <button
                      onClick={handleConfigure}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Configure
                    </button>
                  )}
                  {onDisconnect && (
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 bg-gray-800 hover:bg-rose-500/20 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  )}
                </>
              ) : needsAttention ? (
                <>
                  {onConfigure && (
                    <button
                      onClick={handleConfigure}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-300 bg-gray-800 hover:bg-red-500/20 rounded-lg border border-red-500/30 shadow-lg whitespace-nowrap transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {isExpired ? 'Reconnect' : 'Fix'}
                    </button>
                  )}
                  {onDisconnect && (
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 bg-gray-800 hover:bg-rose-500/20 rounded-lg border border-gray-700/50 shadow-lg whitespace-nowrap transition-colors"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  )}
                </>
              ) : (
                onConnect && (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="btn-ghost-primary text-xs px-3 py-1.5 disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5" />
                        Connect
                      </>
                    )}
                  </button>
                )
              )}
            </div>
          )}

          {/* 3-dot menu trigger */}
          {!comingSoon && (
            <button
              onClick={handleMenuToggle}
              className={`p-1.5 rounded-lg transition-colors ${
                menuOpen 
                  ? 'text-primary-400 bg-gray-700/50' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
              aria-label="Integration actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}

          {/* Coming soon placeholder */}
          {comingSoon && (
            <p className="text-xs text-gray-600 py-1.5 w-full text-center">
              Available soon
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
