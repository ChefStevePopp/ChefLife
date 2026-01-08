/**
 * SettingsTab - Communications Module Settings
 * 
 * L5 Design: Form-based settings with save bar
 * Extracted from CommunicationsConfig for tabbed interface
 * 
 * Features:
 * - Organization email settings (from name, reply-to)
 * - Module configuration (merge syntax, timezone, toggles)
 * - Test email functionality
 * - Floating save bar with undo
 * 
 * Location: Admin → Modules → Communications → Settings Tab
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Save,
  Send,
  Info,
  ChevronUp,
  Building2,
  Settings,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import { sendTestEmail } from "@/lib/communications";
import toast from "react-hot-toast";
import type { CommunicationsConfig as CommunicationsConfigType } from "@/types/modules";
import { DEFAULT_COMMUNICATIONS_CONFIG } from "@/types/modules";

// =============================================================================
// TYPES
// =============================================================================

interface OrgEmailConfig {
  fromName: string;
  replyTo: string;
}

interface SettingsTabProps {
  platformConfigured?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  platformConfigured = false,
}) => {
  const navigate = useNavigate();
  const { organizationId, user } = useAuth();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [config, setConfig] = useState<CommunicationsConfigType>(DEFAULT_COMMUNICATIONS_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<CommunicationsConfigType>(DEFAULT_COMMUNICATIONS_CONFIG);
  const [orgEmail, setOrgEmail] = useState<OrgEmailConfig>({ fromName: '', replyTo: '' });
  const [originalOrgEmail, setOriginalOrgEmail] = useState<OrgEmailConfig>({ fromName: '', replyTo: '' });

  // Derive hasChanges
  const hasChanges = 
    JSON.stringify(config) !== JSON.stringify(originalConfig) ||
    JSON.stringify(orgEmail) !== JSON.stringify(originalOrgEmail);

  // ---------------------------------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;

      try {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('name, modules')
          .eq('id', organizationId)
          .single();

        if (orgError) throw orgError;

        const commsConfig = org?.modules?.communications?.config;
        if (commsConfig) {
          setConfig(commsConfig);
          setOriginalConfig(commsConfig);
          const emailConfig = {
            fromName: commsConfig.email?.fromName || org.name || '',
            replyTo: commsConfig.email?.replyTo || '',
          };
          setOrgEmail(emailConfig);
          setOriginalOrgEmail(emailConfig);
        } else {
          const defaultEmail = { fromName: org.name || '', replyTo: '' };
          setOrgEmail(defaultEmail);
          setOriginalOrgEmail(defaultEmail);
        }

      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [organizationId]);

  // ---------------------------------------------------------------------------
  // UPDATE HANDLERS
  // ---------------------------------------------------------------------------
  const updateConfig = <K extends keyof CommunicationsConfigType>(
    key: K,
    value: CommunicationsConfigType[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateOrgEmail = <K extends keyof OrgEmailConfig>(
    key: K,
    value: OrgEmailConfig[K]
  ) => {
    setOrgEmail(prev => ({ ...prev, [key]: value }));
  };

  const handleUndo = () => {
    setConfig(originalConfig);
    setOrgEmail(originalOrgEmail);
    toast('Changes reverted', { icon: '↩️' });
  };

  // ---------------------------------------------------------------------------
  // SEND TEST EMAIL
  // ---------------------------------------------------------------------------
  const handleSendTestEmail = async () => {
    if (!platformConfigured) {
      toast.error('Platform email service not configured');
      return;
    }
    if (!user?.email) {
      toast.error('No email address on your account');
      return;
    }

    setIsSendingTest(true);
    try {
      const result = await sendTestEmail(user.email);

      if (result.success) {
        toast.success(`Test email sent to ${user.email}`);
      } else {
        toast.error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      toast.error('Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!organizationId || !user) return;

    setIsSaving(true);
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('modules')
        .eq('id', organizationId)
        .single();

      const currentModules = org?.modules || {};

      const updatedConfig: CommunicationsConfigType = {
        ...config,
        email: {
          provider: 'resend',
          fromEmail: '',
          fromName: orgEmail.fromName,
          replyTo: orgEmail.replyTo,
        },
      };

      const updatedModules = {
        ...currentModules,
        communications: {
          ...currentModules.communications,
          config: updatedConfig,
        },
      };

      const { error } = await supabase
        .from('organizations')
        .update({
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (error) throw error;

      setOriginalConfig(updatedConfig);
      setOriginalOrgEmail({ ...orgEmail });

      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          module: 'communications',
          action: 'config_updated',
        },
      });

      toast.success('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Email Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Organization Email Settings</h2>
            <p className="text-sm text-gray-400">How your emails appear to recipients</p>
          </div>
        </div>

        {/* Expandable Info */}
        <div className="expandable-info-section">
          <button
            onClick={(e) => {
              const section = e.currentTarget.closest('.expandable-info-section');
              section?.classList.toggle('expanded');
            }}
            className="expandable-info-header"
          >
            <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-sm text-gray-400 flex-1">How emails are sent</span>
            <ChevronUp className="w-4 h-4 text-gray-500" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-3">
              <p className="text-sm text-gray-400">
                Emails are sent from the ChefLife platform with your organization's name as the sender:
              </p>
              <div className="bg-gray-900/50 rounded-lg p-3 font-mono text-sm">
                <p className="text-gray-300">From: <span className="text-primary-400">{orgEmail.fromName || 'Your Business'}</span> &lt;notifications@news.cheflife.ca&gt;</p>
                <p className="text-gray-300">Reply-To: <span className="text-primary-400">{orgEmail.replyTo || 'your-email@example.com'}</span></p>
              </div>
              <p className="text-sm text-gray-400">
                Team members see your business name, and replies go to your email address.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* From Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={orgEmail.fromName}
              onChange={(e) => updateOrgEmail('fromName', e.target.value)}
              placeholder="Memphis Fire BBQ"
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Your business name shown as the email sender
            </p>
          </div>

          {/* Reply-To */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reply-To Email
            </label>
            <input
              type="email"
              value={orgEmail.replyTo}
              onChange={(e) => updateOrgEmail('replyTo', e.target.value)}
              placeholder="office@memphisfirebbq.com"
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Where replies from team members will go
            </p>
          </div>

          {/* Send Test Email */}
          <div className="md:col-span-2">
            <button
              onClick={handleSendTestEmail}
              disabled={isSendingTest || !platformConfigured}
              className={`btn ${
                isSendingTest || !platformConfigured
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'btn-ghost'
              }`}
            >
              {isSendingTest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Test Email to {user?.email || 'yourself'}
            </button>
            {!platformConfigured && (
              <p className="text-xs text-amber-400 mt-1.5">
                Platform email must be configured in{' '}
                <button
                  onClick={() => navigate('/admin/dev-management')}
                  className="underline hover:no-underline"
                >
                  Development Settings
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Module Settings */}
      <div className="space-y-4 pt-6 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Module Settings</h2>
            <p className="text-sm text-gray-400">Configure Communications behavior</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Merge Syntax */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Merge Field Syntax
            </label>
            <select
              value={config.mergeSyntax}
              onChange={(e) => updateConfig('mergeSyntax', e.target.value as 'guillemets' | 'handlebars')}
              className="w-full"
            >
              <option value="guillemets">Guillemets: «Field_Name»</option>
              <option value="handlebars">Handlebars: {'{{field_name}}'}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Choose the syntax for merge fields in your templates
            </p>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={config.timezone}
              onChange={(e) => updateConfig('timezone', e.target.value)}
              className="w-full"
            >
              <option value="America/Toronto">Eastern (Toronto)</option>
              <option value="America/Chicago">Central (Chicago)</option>
              <option value="America/Denver">Mountain (Denver)</option>
              <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
              <option value="America/Vancouver">Pacific (Vancouver)</option>
              <option value="Europe/London">UK (London)</option>
              <option value="Australia/Sydney">Australia (Sydney)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Used for scheduling and date formatting
            </p>
          </div>

          {/* Scheduling Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div>
              <p className="text-white font-medium">Scheduled Sends</p>
              <p className="text-sm text-gray-400">Allow scheduling emails for later delivery</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.schedulingEnabled}
                onChange={(e) => updateConfig('schedulingEnabled', e.target.checked)}
              />
              <div className="toggle-switch-track" />
            </label>
          </div>

          {/* Triggers Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div>
              <p className="text-white font-medium">Event Triggers</p>
              <p className="text-sm text-gray-400">Send emails automatically on events</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.triggersEnabled}
                onChange={(e) => updateConfig('triggersEnabled', e.target.checked)}
              />
              <div className="toggle-switch-track" />
            </label>
          </div>
        </div>
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <span className="text-sm text-gray-300">Unsaved changes</span>
              <button
                onClick={handleUndo}
                disabled={isSaving}
                className="btn-ghost"
              >
                <RotateCcw className="w-4 h-4" />
                Undo
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
