/**
 * EmailServicePanel - Platform-Level Email Configuration
 * 
 * L5 Design: Card-based layout with consistent styling.
 * Uses Edge Function for all API calls (API key never exposed to browser).
 * 
 * Location: Admin → Development (Omega only)
 */

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Save, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Send,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { testEmailConnection, sendTestEmail } from '@/lib/communications';
import toast from 'react-hot-toast';

// =============================================================================
// TYPES
// =============================================================================

interface PlatformEmailConfig {
  provider: 'resend' | 'sendgrid' | 'none';
  api_key: string;
  from_email: string;
  verified_domain: string;
}

const DEFAULT_CONFIG: PlatformEmailConfig = {
  provider: 'none',
  api_key: '',
  from_email: 'notifications@news.cheflife.ca',
  verified_domain: 'news.cheflife.ca',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const EmailServicePanel: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<PlatformEmailConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<PlatformEmailConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  // Derive hasChanges from comparing current to original
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // ---------------------------------------------------------------------------
  // LOAD CONFIG
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'email_service')
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data?.value) {
          const loaded = data.value as PlatformEmailConfig;
          setConfig(loaded);
          setOriginalConfig(loaded);
          // If we have a key, mark as potentially connected
          if (loaded.api_key) {
            setConnectionStatus('unknown');
          }
        }
      } catch (error) {
        console.error('Error loading email config:', error);
        toast.error('Failed to load email configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // ---------------------------------------------------------------------------
  // UPDATE CONFIG
  // ---------------------------------------------------------------------------
  const updateConfig = <K extends keyof PlatformEmailConfig>(
    key: K,
    value: PlatformEmailConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    if (key === 'api_key' || key === 'provider') {
      setConnectionStatus('unknown');
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'email_service',
          value: config,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        }, {
          onConflict: 'key',
        });

      if (error) throw error;

      setOriginalConfig(config);
      toast.success('Email configuration saved');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TEST CONNECTION (via Edge Function)
  // ---------------------------------------------------------------------------
  const handleTestConnection = async () => {
    if (!config.api_key) {
      toast.error('Please save your API key first');
      return;
    }

    // Must save first so Edge Function can read it
    if (hasChanges) {
      toast.error('Please save changes before testing');
      return;
    }

    setIsTesting(true);
    try {
      const result = await testEmailConnection();
      
      if (result.success) {
        setConnectionStatus('connected');
        toast.success('Connection successful!');
      } else {
        setConnectionStatus('failed');
        toast.error(result.error || 'Connection failed');
      }
    } catch (error) {
      setConnectionStatus('failed');
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SEND TEST EMAIL (via Edge Function)
  // ---------------------------------------------------------------------------
  const handleSendTestEmail = async () => {
    if (!config.api_key || !config.from_email) {
      toast.error('Please configure and save email settings first');
      return;
    }

    if (hasChanges) {
      toast.error('Please save changes before sending test');
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
        setConnectionStatus('connected');
      } else {
        toast.error(result.error || 'Failed to send test email');
        setConnectionStatus('failed');
      }
    } catch (error) {
      toast.error('Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Email Service</h3>
            <p className="text-sm text-gray-400">Platform-level email delivery</p>
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
          Save
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Row 1: Provider + Domain */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Provider
            </label>
            <select
              value={config.provider}
              onChange={(e) => updateConfig('provider', e.target.value as PlatformEmailConfig['provider'])}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            >
              <option value="none">Not Configured</option>
              <option value="resend">Resend (Recommended)</option>
              <option value="sendgrid">SendGrid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Verified Domain
            </label>
            <input
              type="text"
              value={config.verified_domain}
              onChange={(e) => updateConfig('verified_domain', e.target.value)}
              placeholder="news.cheflife.ca"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Row 2: API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.api_key}
                onChange={(e) => updateConfig('api_key', e.target.value)}
                placeholder="re_xxxxxxxx..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pr-10 text-white font-mono text-sm placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Test Connection Button - L5 Pill */}
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !config.api_key || hasChanges}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                isTesting || !config.api_key || hasChanges
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : connectionStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : connectionStatus === 'failed'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : connectionStatus === 'connected' ? (
                <CheckCircle className="w-4 h-4" />
              ) : connectionStatus === 'failed' ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              Test
            </button>
          </div>
          
          {/* Connection Status */}
          {connectionStatus === 'connected' && (
            <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              API connection verified
            </p>
          )}
          {connectionStatus === 'failed' && (
            <p className="text-sm text-rose-400 mt-2 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Connection failed — check API key
            </p>
          )}
          {hasChanges && config.api_key && (
            <p className="text-sm text-amber-400 mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Save changes before testing
            </p>
          )}
        </div>

        {/* Row 3: From Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            From Email
          </label>
          <input
            type="email"
            value={config.from_email}
            onChange={(e) => updateConfig('from_email', e.target.value)}
            placeholder="notifications@news.cheflife.ca"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Must match the verified domain above
          </p>
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-700/50">
          <button
            onClick={handleSendTestEmail}
            disabled={isSendingTest || !config.api_key || !config.from_email || hasChanges}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              isSendingTest || !config.api_key || !config.from_email || hasChanges
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30'
            }`}
          >
            {isSendingTest ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Test Email
          </button>
          
          <a
            href="https://resend.com/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Manage Domains
          </a>
        </div>

        {/* Info Box */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-300 font-medium mb-1">How it works</p>
              <p className="text-sm text-gray-400">
                All customer emails are sent from{' '}
                <code className="text-sky-400 bg-gray-800 px-1.5 py-0.5 rounded">
                  {config.from_email || 'notifications@news.cheflife.ca'}
                </code>{' '}
                with the customer's business name as the display name and their email as Reply-To.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
