/**
 * NEXUS - Admin Communication Center
 * 
 * This is where Ω/α users configure what activity events get broadcast
 * to team members and through which channels.
 * 
 * Flow: Activity Log → Nexus Rules → Team Member Inboxes
 */

import React, { useState, useEffect } from "react";
import {
  Satellite,
  Bell,
  Users,
  Calendar,
  Package,
  ChefHat,
  Shield,
  DollarSign,
  Settings,
  ChevronUp,
  Info,
  Mail,
  Smartphone,
  Save,
  RotateCcw,
} from "lucide-react";
import { LoadingLogo } from "@/components/LoadingLogo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { clearBroadcastConfigCache, nexus } from "@/lib/nexus";
import { SECURITY_LEVELS, getSecurityConfig, getProtocolCode, type SecurityLevel } from "@/config/security";
import type { ActivityType, ActivityCategory } from "@/lib/nexus";

// =============================================================================
// TYPES
// =============================================================================

type BroadcastChannel = 'in_app' | 'email' | 'sms';

interface BroadcastRule {
  enabled: boolean;
  channels: BroadcastChannel[];
  minSecurityLevel: SecurityLevel; // Who receives this broadcast (and above)
}

interface NexusConfig {
  [key: string]: BroadcastRule;
}

// =============================================================================
// EVENT DEFINITIONS
// =============================================================================

interface EventDefinition {
  type: ActivityType;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultChannels: BroadcastChannel[];
  defaultMinSecurityLevel: SecurityLevel; // Default: who should receive this?
}

interface EventCategory {
  id: ActivityCategory;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  events: EventDefinition[];
}

const EVENT_CATEGORIES: EventCategory[] = [
  // PRIMARY - Team Events
  {
    id: 'team',
    label: 'Team Events',
    icon: Users,
    iconColor: 'text-primary-400',
    bgColor: 'bg-primary-500/20',
    events: [
      {
        type: 'team_member_added',
        label: 'New Team Member',
        description: 'When someone joins the roster',
        defaultEnabled: true,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.BRAVO, // Supervisors+
      },
      {
        type: 'team_member_deactivated',
        label: 'Member Deactivated',
        description: 'When someone is deactivated',
        defaultEnabled: true,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.BRAVO, // Supervisors+
      },
      {
        type: 'bulk_team_import',
        label: 'Bulk Import',
        description: 'When team members are imported from CSV',
        defaultEnabled: true,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ALPHA, // Owners only
      },
      {
        type: 'security_protocol_promoted',
        label: 'Protocol Promotion',
        description: 'When someone gets elevated access',
        defaultEnabled: true,
        defaultChannels: ['in_app', 'email'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ALPHA, // Owners only
      },
    ],
  },
  // GREEN - Schedule Events
  {
    id: 'team',
    label: 'Schedule Events',
    icon: Calendar,
    iconColor: 'text-green-400',
    bgColor: 'bg-green-500/20',
    events: [
      {
        type: 'schedule_uploaded',
        label: 'Schedule Published',
        description: 'When a new schedule is uploaded',
        defaultEnabled: true,
        defaultChannels: ['in_app', 'email'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ECHO, // Everyone
      },
      {
        type: 'schedule_activated',
        label: 'Schedule Activated',
        description: 'When a schedule becomes current',
        defaultEnabled: true,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ECHO, // Everyone
      },
    ],
  },
  // AMBER - Recipe Events
  {
    id: 'recipes',
    label: 'Recipe Events',
    icon: ChefHat,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    events: [
      {
        type: 'recipe_created',
        label: 'New Recipe',
        description: 'When a recipe is created',
        defaultEnabled: false,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.CHARLIE, // Kitchen leads+
      },
      {
        type: 'recipe_updated',
        label: 'Recipe Updated',
        description: 'When a recipe is modified',
        defaultEnabled: true,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.DELTA, // Kitchen staff+
      },
      {
        type: 'recipe_status_changed',
        label: 'Recipe Status Change',
        description: 'When a recipe is activated/deactivated',
        defaultEnabled: true,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.DELTA, // Kitchen staff+
      },
    ],
  },
  // ROSE - Inventory Events
  {
    id: 'inventory',
    label: 'Inventory Events',
    icon: Package,
    iconColor: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    events: [
      {
        type: 'inventory_low_stock',
        label: 'Low Stock Alert',
        description: 'When an item falls below threshold',
        defaultEnabled: true,
        defaultChannels: ['in_app', 'email'],
        defaultMinSecurityLevel: SECURITY_LEVELS.BRAVO, // Supervisors+
      },
      {
        type: 'inventory_critical_low',
        label: 'Critical Stock Alert',
        description: 'When an item needs immediate attention',
        defaultEnabled: true,
        defaultChannels: ['in_app', 'email', 'sms'],
        defaultMinSecurityLevel: SECURITY_LEVELS.CHARLIE, // Kitchen leads+
      },
      {
        type: 'inventory_imported',
        label: 'Inventory Import',
        description: 'When inventory data is imported',
        defaultEnabled: false,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ALPHA, // Owners only
      },
    ],
  },
  // PURPLE - Financial Events
  {
    id: 'financial',
    label: 'Financial Events',
    icon: DollarSign,
    iconColor: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    events: [
      {
        type: 'invoice_imported',
        label: 'Invoice Imported',
        description: 'When vendor invoices are processed',
        defaultEnabled: false,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ALPHA, // Owners only
      },
      {
        type: 'price_change_detected',
        label: 'Price Change Detected',
        description: 'When vendor prices change',
        defaultEnabled: true,
        defaultChannels: ['in_app', 'email'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ALPHA, // Owners only
      },
    ],
  },
  // LIME - Security Events
  {
    id: 'security',
    label: 'Security Events',
    icon: Shield,
    iconColor: 'text-lime-400',
    bgColor: 'bg-lime-500/20',
    events: [
      {
        type: 'security_protocol_changed',
        label: 'Access Level Changed',
        description: 'When someone\'s protocol changes',
        defaultEnabled: true,
        defaultChannels: ['in_app', 'email'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ALPHA, // Owners only (affected person always gets it)
      },
      {
        type: 'permissions_changed',
        label: 'Permissions Updated',
        description: 'When app permissions are modified',
        defaultEnabled: true,
        defaultChannels: ['in_app'],
        defaultMinSecurityLevel: SECURITY_LEVELS.ALPHA, // Owners only
      },
    ],
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

// Section header
const SectionHeader: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
}> = ({ icon: Icon, iconColor, bgColor, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
    <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{subtitle}</p>
    </div>
  </div>
);

// Channel toggle pill
const ChannelPill: React.FC<{
  icon: React.ElementType;
  label: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}> = ({ icon: Icon, label, enabled, onToggle, disabled }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      enabled
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
        : 'bg-gray-800/50 border-gray-700/50 text-gray-500'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600 cursor-pointer'}`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

// Protocol selector dropdown
const ProtocolSelector: React.FC<{
  value: SecurityLevel;
  onChange: (level: SecurityLevel) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const protocols = [
    { level: SECURITY_LEVELS.OMEGA, code: 'Ω', name: 'Owner', color: 'text-amber-400' },
    { level: SECURITY_LEVELS.ALPHA, code: 'α', name: 'Alpha', color: 'text-rose-400' },
    { level: SECURITY_LEVELS.BRAVO, code: 'β', name: 'Bravo', color: 'text-purple-400' },
    { level: SECURITY_LEVELS.CHARLIE, code: 'γ', name: 'Charlie', color: 'text-gray-400' },
    { level: SECURITY_LEVELS.DELTA, code: 'δ', name: 'Delta', color: 'text-gray-400' },
    { level: SECURITY_LEVELS.ECHO, code: 'ε', name: 'Echo', color: 'text-gray-500' },
  ];

  const current = protocols.find(p => p.level === value) || protocols[protocols.length - 1];

  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as SecurityLevel)}
      disabled={disabled}
      className={`px-3 pr-8 py-1.5 rounded-lg text-xs font-medium border bg-gray-800/50 border-gray-700/50 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-600'}
        focus:outline-none focus:ring-1 focus:ring-primary-500/50`}
    >
      {protocols.map((p) => (
        <option key={p.level} value={p.level}>
          {p.code} {p.name}+
        </option>
      ))}
    </select>
  );
};

// Event row
const EventRow: React.FC<{
  event: EventDefinition;
  rule: BroadcastRule;
  onToggle: () => void;
  onChannelToggle: (channel: BroadcastChannel) => void;
  onSecurityLevelChange: (level: SecurityLevel) => void;
}> = ({ event, rule, onToggle, onChannelToggle, onSecurityLevelChange }) => (
  <div className={`p-4 rounded-lg border transition-all ${
    rule.enabled 
      ? 'bg-gray-800/30 border-gray-700/50' 
      : 'bg-gray-900/30 border-gray-800/50 opacity-60'
  }`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {/* Enable toggle */}
          <button
            onClick={onToggle}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              rule.enabled
                ? 'bg-gray-600 border-gray-500'
                : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
            }`}
          >
            {rule.enabled && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div>
            <h4 className="text-sm font-medium text-white">{event.label}</h4>
            <p className="text-xs text-gray-500">{event.description}</p>
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Protocol selector */}
        <ProtocolSelector
          value={rule.minSecurityLevel}
          onChange={onSecurityLevelChange}
          disabled={!rule.enabled}
        />
        
        {/* Channel toggles */}
        <div className="flex items-center gap-2">
          <ChannelPill
            icon={Bell}
            label="In-App"
            enabled={rule.channels.includes('in_app')}
            onToggle={() => onChannelToggle('in_app')}
            disabled={!rule.enabled}
          />
          <ChannelPill
            icon={Mail}
            label="Email"
            enabled={rule.channels.includes('email')}
            onToggle={() => onChannelToggle('email')}
            disabled={!rule.enabled}
          />
          <ChannelPill
            icon={Smartphone}
            label="SMS"
            enabled={rule.channels.includes('sms')}
            onToggle={() => onChannelToggle('sms')}
            disabled={!rule.enabled}
          />
        </div>
      </div>
    </div>
  </div>
);

// Expandable category section
const CategorySection: React.FC<{
  category: EventCategory;
  config: NexusConfig;
  onToggleEvent: (eventType: string) => void;
  onToggleChannel: (eventType: string, channel: BroadcastChannel) => void;
  onSecurityLevelChange: (eventType: string, level: SecurityLevel) => void;
  defaultExpanded?: boolean;
}> = ({ category, config, onToggleEvent, onToggleChannel, onSecurityLevelChange, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Count enabled events
  const enabledCount = category.events.filter(e => config[e.type]?.enabled).length;

  return (
    <section className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center gap-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center flex-shrink-0`}>
          <category.icon className={`w-5 h-5 ${category.iconColor}`} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-base font-semibold text-white">{category.label}</h3>
          <p className="text-sm text-gray-400">
            {enabledCount} of {category.events.length} broadcasts enabled
          </p>
        </div>
        <ChevronUp className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}>
        <div className="px-5 pb-5 space-y-3">
          {category.events.map((event) => (
            <EventRow
              key={event.type}
              event={event}
              rule={config[event.type] || {
                enabled: event.defaultEnabled,
                channels: event.defaultChannels,
                minSecurityLevel: event.defaultMinSecurityLevel,
              }}
              onToggle={() => onToggleEvent(event.type)}
              onChannelToggle={(channel) => onToggleChannel(event.type, channel)}
              onSecurityLevelChange={(level) => onSecurityLevelChange(event.type, level)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

// Build default config from EVENT_CATEGORIES
const buildDefaultConfig = (): NexusConfig => {
  const defaultConfig: NexusConfig = {};
  EVENT_CATEGORIES.forEach(category => {
    category.events.forEach(event => {
      defaultConfig[event.type] = {
        enabled: event.defaultEnabled,
        channels: [...event.defaultChannels],
        minSecurityLevel: event.defaultMinSecurityLevel,
      };
    });
  });
  return defaultConfig;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const Nexus: React.FC = () => {
  const { organizationId, user } = useAuth();
  const [config, setConfig] = useState<NexusConfig>({});
  const [originalConfig, setOriginalConfig] = useState<NexusConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  // Load config from database
  useEffect(() => {
    const loadConfig = async () => {
      if (!organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organization_communications')
          .select('id, broadcast_config')
          .eq('organization_id', organizationId)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine (use defaults)
          console.error('Error loading Nexus config:', error);
        }

        const defaultConfig = buildDefaultConfig();
        
        if (data?.broadcast_config) {
          // Merge saved config with defaults (in case new events were added)
          const savedConfig = data.broadcast_config as NexusConfig;
          const mergedConfig = { ...defaultConfig };
          
          Object.keys(savedConfig).forEach(key => {
            if (mergedConfig[key]) {
              mergedConfig[key] = savedConfig[key];
            }
          });
          
          setConfig(mergedConfig);
          setOriginalConfig(mergedConfig);
          setRecordId(data.id);
        } else {
          setConfig(defaultConfig);
          setOriginalConfig(defaultConfig);
        }
      } catch (err) {
        console.error('Error loading Nexus config:', err);
        const defaultConfig = buildDefaultConfig();
        setConfig(defaultConfig);
        setOriginalConfig(defaultConfig);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [organizationId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingLogo message="Loading broadcast settings..." />
      </div>
    );
  }

  // Check if config has changed
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // Toggle event enabled
  const handleToggleEvent = (eventType: string) => {
    setConfig(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        enabled: !prev[eventType]?.enabled,
      },
    }));
  };

  // Toggle channel for event
  const handleToggleChannel = (eventType: string, channel: BroadcastChannel) => {
    setConfig(prev => {
      const currentChannels = prev[eventType]?.channels || [];
      const newChannels = currentChannels.includes(channel)
        ? currentChannels.filter(c => c !== channel)
        : [...currentChannels, channel];

      return {
        ...prev,
        [eventType]: {
          ...prev[eventType],
          channels: newChannels,
        },
      };
    });
  };

  // Change security level for event
  const handleSecurityLevelChange = (eventType: string, level: SecurityLevel) => {
    setConfig(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        minSecurityLevel: level,
      },
    }));
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultConfig = buildDefaultConfig();
    setConfig(defaultConfig);
    toast.success('Reset to defaults');
  };

  // Save config to database
  const handleSave = async () => {
    if (!organizationId || !user?.id) {
      toast.error('Unable to save - not authenticated');
      return;
    }

    setIsSaving(true);
    try {
      if (recordId) {
        // Update existing record
        const { error } = await supabase
          .from('organization_communications')
          .update({
            broadcast_config: config,
            updated_by: user.id,
          })
          .eq('id', recordId);

        if (error) throw error;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('organization_communications')
          .insert({
            organization_id: organizationId,
            broadcast_config: config,
            updated_by: user.id,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data) setRecordId(data.id);
      }

      // Clear the cache so nexus picks up new config immediately
      clearBroadcastConfigCache(organizationId);

      // Log the activity
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          setting: 'broadcast_config',
          description: 'Nexus broadcast settings updated',
        },
      });

      setOriginalConfig({ ...config });
      toast.success('Broadcast settings saved');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Satellite className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Nexus</h1>
              <p className="text-gray-400 text-sm">Notification broadcast settings</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="btn-ghost text-sm"
              disabled={isSaving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
            <button
              onClick={handleSave}
              className="btn-primary text-sm"
              disabled={!hasChanges || isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Info section */}
        <div className="expandable-info-section mt-4">
          <button
            onClick={(e) => {
              const section = e.currentTarget.closest('.expandable-info-section');
              section?.classList.toggle('expanded');
            }}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About Nexus</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-3">
              <p className="text-sm text-gray-400">
                Nexus is your notification command center. Configure which activity events get broadcast 
                to your team and through which channels. Events flow from the Activity Log through Nexus 
                rules to team member inboxes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">Protocol</h4>
                    <p className="text-xs text-gray-500 mt-1">Set minimum security level to receive each broadcast</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <Bell className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">In-App</h4>
                    <p className="text-xs text-gray-500 mt-1">Notifications appear in the app's notification center</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">Email</h4>
                    <p className="text-xs text-gray-500 mt-1">Sent to team member's email address</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <Smartphone className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-300">SMS</h4>
                    <p className="text-xs text-gray-500 mt-1">Text message for urgent alerts</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                <span className="text-gray-400">Note:</span> Team members can customize their personal 
                receive preferences in My Profile, but they can only disable channels you've enabled here.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Categories */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6 space-y-4">
        {EVENT_CATEGORIES.map((category, index) => (
          <CategorySection
            key={`${category.id}-${category.label}`}
            category={category}
            config={config}
            onToggleEvent={handleToggleEvent}
            onToggleChannel={handleToggleChannel}
            onSecurityLevelChange={handleSecurityLevelChange}
            defaultExpanded={index === 0}
          />
        ))}
      </div>

      {/* Sticky save bar when changes exist */}
      {hasChanges && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <span className="text-sm text-amber-400">You have unsaved changes</span>
              <button
                onClick={handleSave}
                className="btn-primary text-sm"
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
