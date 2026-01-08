/**
 * Communications - Main Module View (Tabbed)
 * 
 * L5 Design: Following Team Performance gold standard pattern
 * - Header card with icon, title, stats
 * - Platform status banner
 * - Expandable info section
 * - Tabbed content (Library, Settings)
 * 
 * Tabs:
 * - Library (primary): Template management - search, filter, CRUD
 * - Settings (green): Organization email config, module settings
 * 
 * Future:
 * - Store (amber): Pre-built template marketplace
 * 
 * Location: Admin → Modules → Communications
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  FileText,
  Send,
  History,
  XCircle,
  CheckCircle,
  Info,
  ChevronUp,
  Settings,
  Library,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/features/shared/components";
import { SECURITY_LEVELS } from "@/config/security";

// Tab Components
import { LibraryTab } from "./components/LibraryTab";
import { SettingsTab } from "./components/SettingsTab";

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'library' | 'settings';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface Stats {
  templateCount: number;
  activeCount: number;
  sentThisWeek: number;
  sentThisMonth: number;
  failedCount: number;
}

// =============================================================================
// STAT CARD COMPONENT
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
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const Communications: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organizationId, securityLevel, isLoading: authLoading } = useAuth();
  
  // Tab from URL or default to 'library'
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam || 'library');
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [platformConfigured, setPlatformConfigured] = useState(false);
  const [stats, setStats] = useState<Stats>({
    templateCount: 0,
    activeCount: 0,
    sentThisWeek: 0,
    sentThisMonth: 0,
    failedCount: 0,
  });

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'library') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // ---------------------------------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;

      try {
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

        // Load template counts
        const { count: templateCount } = await supabase
          .from('email_templates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        const { count: activeCount } = await supabase
          .from('email_templates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true);

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
          activeCount: activeCount || 0,
          sentThisWeek: sentThisWeek || 0,
          sentThisMonth: sentThisMonth || 0,
          failedCount: failedCount || 0,
        });

      } catch (error) {
        console.error('Error loading communications data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadData();
    }
  }, [organizationId, authLoading]);

  // Refresh stats when tab changes to library (in case templates were modified)
  const refreshStats = async () => {
    if (!organizationId) return;
    
    const { count: templateCount } = await supabase
      .from('email_templates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { count: activeCount } = await supabase
      .from('email_templates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    setStats(prev => ({
      ...prev,
      templateCount: templateCount || 0,
      activeCount: activeCount || 0,
    }));
  };

  // Tab configuration
  const tabs: TabConfig[] = [
    { id: 'library', label: 'Library', icon: Library, color: 'primary' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'green' },
    // Future: { id: 'store', label: 'Store', icon: Store, color: 'amber' },
  ];

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading communications..." />
      </div>
    );
  }

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/admin/components/sections/Communications/Communications.tsx
        </div>
      )}

      {/* ========================================================================
       * HEADER CARD - Following Team Performance gold standard
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Communications
              </h1>
              <p className="text-gray-400 text-sm">
                Email templates, broadcasts, and notifications
              </p>
            </div>
          </div>

          {/* Platform Status Banner */}
          {!platformConfigured ? (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-300">
                  Platform email not configured — emails cannot be sent until this is set up in{' '}
                  <button
                    onClick={() => navigate('/admin/dev-management')}
                    className="text-amber-200 underline hover:no-underline"
                  >
                    Development Settings
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Email service configured</span>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Templates"
              value={stats.templateCount}
              icon={<FileText className="w-4 h-4" />}
              color="sky"
            />
            <StatCard
              label="Sent This Week"
              value={stats.sentThisWeek}
              icon={<Send className="w-4 h-4" />}
              color="emerald"
            />
            <StatCard
              label="Sent This Month"
              value={stats.sentThisMonth}
              icon={<History className="w-4 h-4" />}
              color="amber"
            />
            <StatCard
              label="Failed (30d)"
              value={stats.failedCount}
              icon={<XCircle className="w-4 h-4" />}
              color="rose"
            />
          </div>
        </div>

        {/* Expandable Info Section */}
        <div className="expandable-info-section mt-4">
          <button
            onClick={(e) => {
              const section = e.currentTarget.closest('.expandable-info-section');
              section?.classList.toggle('expanded');
            }}
            className="expandable-info-header w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About Communications</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-3">
              <p className="text-sm text-gray-400">
                Create email templates with merge fields for personalized team communications.
                Templates can be sent manually or triggered automatically by system events.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Library className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-gray-300">Library</span>
                  </div>
                  <p className="text-xs text-gray-500">Your organization's email templates</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Settings className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-gray-300">Settings</span>
                  </div>
                  <p className="text-xs text-gray-500">Email display name, reply-to, and more</p>
                </div>
                <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30 opacity-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-500">Store</span>
                    <span className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">Coming</span>
                  </div>
                  <p className="text-xs text-gray-600">Pre-built templates to import</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
       * TABS + CONTENT CARD
       * ======================================================================== */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex items-center gap-2 p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`tab ${tab.color} ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'library' && stats.templateCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive
                        ? 'bg-primary-500/20 text-primary-300'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {stats.templateCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'library' && (
            <LibraryTab 
              onTemplateChange={refreshStats}
              platformConfigured={platformConfigured}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab 
              platformConfigured={platformConfigured}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Communications;
