/**
 * CommunicationsConfig - Organization-Level Communications Settings
 * 
 * L5 Design: Card-based layout with consistent styling.
 * Uses Edge Function for email sending (API key stays server-side).
 * 
 * Location: Admin → Modules → Communications
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Save,
  ArrowLeft,
  Settings,
  FileText,
  History,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Info,
  ChevronUp,
  Building2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import { sendTestEmail } from "@/lib/communications";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import type { CommunicationsConfig as CommunicationsConfigType } from "@/types/modules";
import { DEFAULT_COMMUNICATIONS_CONFIG } from "@/types/modules";
import { SECURITY_LEVELS } from "@/config/security";

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'emerald' | 'amber' | 'rose' | 'sky';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'sky' }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    rose: 'bg-rose-500/20 text-rose-400',
    sky: 'bg-sky-500/20 text-sky-400',
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TYPES
// =============================================================================

interface OrgEmailConfig {
  fromName: string;
  replyTo: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CommunicationsConfig: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, securityLevel, user, isLoading: authLoading } = useAuth();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [config, setConfig] = useState<CommunicationsConfigType>(DEFAULT_COMMUNICATIONS_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<CommunicationsConfigType>(DEFAULT_COMMUNICATIONS_CONFIG);
  const [orgEmail, setOrgEmail] = useState<OrgEmailConfig>({ fromName: '', replyTo: '' });
  const [originalOrgEmail, setOriginalOrgEmail] = useState<OrgEmailConfig>({ fromName: '', replyTo: '' });
  const [platformConfigured, setPlatformConfigured] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    templateCount: 0,
    sentThisWeek: 0,
    sentThisMonth: 0,
    failedCount: 0,
  });

  // Info section state
  const [howItWorksExpanded, setHowItWorksExpanded] = useState(false);

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
        // Load org config
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
          // Default from name to org name
          const defaultEmail = { fromName: org.name || '', replyTo: '' };
          setOrgEmail(defaultEmail);
          setOriginalOrgEmail(defaultEmail);
        }

        // Check if platform email is configured
        const { data: platformSettings } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'email_service')
          .single();

        const platformEmail = platformSettings?.value;
        setPlatformConfigured(
          platformEmail?.provider !== 'none' && 
          !!platformEmail?.api_key && 
          !!platformEmail?.from_email
        );

        // Load template count
        const { count: templateCount } = await supabase
          .from('email_templates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        // Load send stats (this week)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { count: sentThisWeek } = await supabase
          .from('email_send_log')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'sent')
          .gte('sent_at', weekAgo.toISOString());

        // Load send stats (this month)
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const { count: sentThisMonth } = await supabase
          .from('email_send_log')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'sent')
          .gte('sent_at', monthAgo.toISOString());

        // Load failed count
        const { count: failedCount } = await supabase
          .from('email_send_log')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'failed')
          .gte('created_at', monthAgo.toISOString());

        setStats({
          templateCount: templateCount || 0,
          sentThisWeek: sentThisWeek || 0,
          sentThisMonth: sentThisMonth || 0,
          failedCount: failedCount || 0,
        });

      } catch (error) {
        console.error('Error loading communications config:', error);
        toast.error('Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadData();
    }
  }, [organizationId, authLoading]);

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

  // ---------------------------------------------------------------------------
  // SEND TEST EMAIL (via Edge Function)
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
      // Get current modules
      const { data: org } = await supabase
        .from('organizations')
        .select('modules')
        .eq('id', organizationId)
        .single();

      const currentModules = org?.modules || {};

      // Build updated config
      const updatedConfig: CommunicationsConfigType = {
        ...config,
        email: {
          provider: 'resend',
          fromEmail: '', // Platform level
          fromName: orgEmail.fromName,
          replyTo: orgEmail.replyTo,
        },
      };

      // Update communications module config
      const updatedModules = {
        ...currentModules,
        communications: {
          ...currentModules.communications,
          config: updatedConfig,
        },
      };

      // Save to database
      const { error } = await supabase
        .from('organizations')
        .update({
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (error) throw error;

      // Update original states
      setOriginalConfig(updatedConfig);
      setOriginalOrgEmail({ ...orgEmail });

      // Log activity
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          module: 'communications',
          action: 'config_updated',
        },
      });

      toast.success('Configuration saved');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading communications settings..." />
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/CommunicationsConfig/index.tsx
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/modules')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Communications</h1>
              <p className="text-gray-400 text-sm">
                Email templates, broadcasts, and notifications
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              hasChanges
                ? 'bg-primary-500 hover:bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Platform Status Banner */}
      {!platformConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-medium">Platform Email Not Configured</p>
              <p className="text-sm text-amber-300/70 mt-1">
                The platform email service needs to be configured in{' '}
                <button
                  onClick={() => navigate('/admin/dev-management')}
                  className="text-amber-300 underline hover:no-underline"
                >
                  Development Settings
                </button>{' '}
                before emails can be sent.
              </p>
            </div>
          </div>
        </div>
      )}

      {platformConfigured && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <p className="text-emerald-300">Platform email service is configured and ready</p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Templates"
          value={stats.templateCount}
          icon={<FileText className="w-5 h-5" />}
          color="sky"
        />
        <StatCard
          label="Sent This Week"
          value={stats.sentThisWeek}
          icon={<Send className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Sent This Month"
          value={stats.sentThisMonth}
          icon={<History className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Failed (30d)"
          value={stats.failedCount}
          icon={<XCircle className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/modules/communications/templates')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30"
          >
            <FileText className="w-4 h-4" />
            Manage Templates
          </button>
          <button
            onClick={() => navigate('/admin/modules/communications/history')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-white hover:bg-gray-600"
          >
            <History className="w-4 h-4" />
            Send History
          </button>
          <button
            onClick={() => navigate('/admin/modules/communications/templates/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-gray-700 text-white hover:bg-gray-600"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Organization Email Settings */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Organization Email Settings</h2>
            <p className="text-sm text-gray-400">How your emails appear to recipients</p>
          </div>
        </div>

        {/* Expandable Info */}
        <div className={`bg-gray-800/50 rounded-lg border border-gray-700/50 mb-5 overflow-hidden`}>
          <button
            onClick={() => setHowItWorksExpanded(!howItWorksExpanded)}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <Info className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400 flex-1">How emails are sent</span>
            <ChevronUp className={`w-4 h-4 text-gray-500 transform transition-transform ${howItWorksExpanded ? '' : 'rotate-180'}`} />
          </button>
          {howItWorksExpanded && (
            <div className="px-4 pb-4 space-y-3">
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
          )}
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                isSendingTest || !platformConfigured
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
              }`}
            >
              {isSendingTest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Test Email
            </button>
          </div>
        </div>
      </div>

      {/* Module Settings */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
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
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.schedulingEnabled}
                onChange={(e) => updateConfig('schedulingEnabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          {/* Triggers Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div>
              <p className="text-white font-medium">Event Triggers</p>
              <p className="text-sm text-gray-400">Send emails automatically on events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.triggersEnabled}
                onChange={(e) => updateConfig('triggersEnabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationsConfig;
