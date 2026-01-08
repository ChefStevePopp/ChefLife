import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePerformanceStore } from "@/stores/performanceStore";
import { useTeamStore } from "@/stores/teamStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Users,
  TrendingUp,
  Award,
  MessageSquare,
  ClipboardCheck,
  Info,
  ChevronUp,
  ChevronDown,
  Calendar,
  AlertTriangle,
  Package,
  Rocket,
  Settings,
  Database,
  ArrowRight,
  Upload,
  FileText,
  History,
} from "lucide-react";
import { SECURITY_LEVELS } from "@/config/security";

// Tab Components
import { OverviewTab } from "./components/OverviewTab";
import { PointsTab } from "./components/PointsTab";
import { TeamTab } from "./components/TeamTab";
import { CoachingTab } from "./components/CoachingTab";
import { PIPsTab } from "./components/PIPsTab";
import { ImportTab } from "../ImportTab";
import { ReportsTab } from "./components/ReportsTab";

type TabType = "overview" | "team" | "points" | "coaching" | "pips" | "reports" | "import";

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ElementType;
  color: string;
  badge?: number | string;
}

type ModuleState = 'loading' | 'not_enabled' | 'setup_required' | 'no_data' | 'ready' | 'error';

export const TeamPerformance: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, securityLevel } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [moduleState, setModuleState] = useState<ModuleState>('loading');
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);
  
  const {
    isLoading,
    error,
    currentCycle,
    cycles,
    teamPerformance,
    fetchCurrentCycle,
    fetchAllCycles,
    fetchTeamPerformance,
    fetchConfig,
  } = usePerformanceStore();

  const { members, fetchTeamMembers } = useTeamStore();

  // Check module enablement first
  useEffect(() => {
    const checkModuleStatus = async () => {
      if (!organizationId) return;
      
      try {
        const { data, error: orgError } = await supabase
          .from('organizations')
          .select('modules')
          .eq('id', organizationId)
          .single();
        
        if (orgError) throw orgError;
        
        const isEnabled = data?.modules?.team_performance?.enabled ?? false;
        setModuleEnabled(isEnabled);
        
        if (!isEnabled) {
          setModuleState('not_enabled');
          return;
        }
        
        // Module is enabled, try to load data
        await loadData();
      } catch (err) {
        console.error('Error checking module status:', err);
        // If we can't even check org, show setup required
        setModuleState('setup_required');
      }
    };

    const loadData = async () => {
      try {
        await fetchConfig();
        await fetchCurrentCycle();
        await fetchAllCycles();
        await fetchTeamMembers();
        await fetchTeamPerformance();
        
        // Check if we have any data
        const performanceArray = Array.from(teamPerformance.values());
        if (performanceArray.length === 0 && members.length === 0) {
          setModuleState('no_data');
        } else {
          setModuleState('ready');
        }
      } catch (err: any) {
        console.error('Error loading performance data:', err);
        // Check if it's a "table doesn't exist" error
        if (err?.message?.includes('does not exist') || 
            err?.code === '42P01' || 
            err?.message?.includes('relation')) {
          setModuleState('setup_required');
        } else {
          setModuleState('error');
        }
      }
    };

    checkModuleStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // Set selected cycle to current when loaded
  useEffect(() => {
    if (currentCycle && !selectedCycleId) {
      setSelectedCycleId(currentCycle.id);
    }
  }, [currentCycle, selectedCycleId]);

  // Re-fetch team performance when selected cycle changes
  useEffect(() => {
    if (selectedCycleId && moduleState === 'ready') {
      console.log('Fetching performance for cycle:', selectedCycleId);
      fetchTeamPerformance(selectedCycleId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCycleId, moduleState]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showCycleDropdown && !(e.target as Element).closest('.cycle-dropdown-container')) {
        setShowCycleDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showCycleDropdown]);

  // Re-check state when data changes - only check for no_data condition
  useEffect(() => {
    if (moduleState === 'no_data') {
      const performanceArray = Array.from(teamPerformance.values());
      if (performanceArray.length > 0) {
        setModuleState('ready');
      }
    }
  }, [teamPerformance, moduleState]);

  // Calculate badge counts
  const performanceArray = Array.from(teamPerformance.values());
  const tier3Count = performanceArray.filter(p => p.tier === 3).length;
  const coachingCount = performanceArray.filter(p => p.coaching_stage && p.coaching_stage >= 1).length;
  const activePIPCount = performanceArray.filter(p => p.active_pip).length;
  // TODO: pendingEventsCount will come from staged_events table
  const pendingEventsCount = 0;

  // Selected cycle info
  const selectedCycle = useMemo(() => {
    if (!selectedCycleId) return currentCycle;
    return cycles.find(c => c.id === selectedCycleId) || currentCycle;
  }, [selectedCycleId, cycles, currentCycle]);

  const isViewingCurrent = selectedCycleId === currentCycle?.id;

  // Format cycle for display (handle timezone correctly)
  const formatCycleName = (cycle: { start_date: string; end_date: string }) => {
    // Parse as local date by appending time component
    const start = new Date(cycle.start_date + 'T00:00:00');
    const end = new Date(cycle.end_date + 'T00:00:00');
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const year = start.getFullYear();
    return `${startMonth}-${endMonth} ${year}`;
  };

  const tabs: TabConfig[] = [
    { id: "overview", label: "Overview", icon: TrendingUp, color: "primary" },
    { 
      id: "team", 
      label: "Team", 
      icon: Users, 
      color: "green",
      badge: pendingEventsCount > 0 ? pendingEventsCount : undefined,
    },
    { id: "points", label: "Points", icon: Award, color: "amber" },
    { 
      id: "coaching", 
      label: "Coaching", 
      icon: MessageSquare, 
      color: "rose",
      badge: coachingCount > 0 ? coachingCount : undefined,
    },
    { 
      id: "pips", 
      label: "PIPs", 
      icon: ClipboardCheck, 
      color: "purple",
      badge: activePIPCount > 0 ? activePIPCount : undefined,
    },
    { id: "reports", label: "Reports", icon: FileText, color: "lime" },
    { id: "import", label: "Import", icon: Upload, color: "cyan" },
  ];

  // Calculate cycle progress
  const getCycleProgress = () => {
    if (!selectedCycle) return { dayNumber: 0, totalDays: 120, percentage: 0 };
    
    // Parse as local dates
    const start = new Date(selectedCycle.start_date + 'T00:00:00');
    const end = new Date(selectedCycle.end_date + 'T00:00:00');
    const now = new Date();
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dayNumber = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const percentage = Math.min(100, Math.max(0, (dayNumber / totalDays) * 100));
    
    return { dayNumber: Math.max(0, dayNumber), totalDays, percentage };
  };

  const cycleProgress = getCycleProgress();

  const formatDate = (dateString: string) => {
    // Parse as local date by appending time component
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ==========================================================================
  // GRACEFUL STATE SCREENS
  // ==========================================================================

  // Loading state
  if (moduleState === 'loading' || isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Team Performance</h1>
              <p className="text-gray-400 text-sm">Professional Excellence & Attendance Management</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mb-4" />
            <p className="text-gray-400">Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Module not enabled
  if (moduleState === 'not_enabled') {
    return (
      <div className="space-y-6">
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Team Performance</h1>
              <p className="text-gray-400 text-sm">Professional Excellence & Attendance Management</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-6">
              <Package className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Module Not Enabled
            </h2>
            <p className="text-gray-400 mb-6">
              Team Performance tracking is an optional add-on module. Enable it in your organization's 
              Feature Modules settings to start tracking attendance, points, and coaching.
            </p>
            
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 mb-6 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200 font-medium mb-1">Compliance Notice</p>
                  <p className="text-xs text-amber-200/80">
                    Point-based attendance systems may not be legal in all jurisdictions. 
                    Review local labor laws before enabling this module.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/admin/modules')}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Go to Feature Modules
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Setup required (database tables don't exist)
  if (moduleState === 'setup_required') {
    return (
      <div className="space-y-6">
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Team Performance</h1>
              <p className="text-gray-400 text-sm">Professional Excellence & Attendance Management</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-6">
              <Database className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Setup Required
            </h2>
            <p className="text-gray-400 mb-6">
              The Team Performance module needs to be set up before you can use it. 
              This is a one-time configuration that creates the necessary data structures.
            </p>
            
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 mb-6 text-left">
              <p className="text-sm text-gray-300 mb-3">What happens during setup:</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  Performance tracking tables are created
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  Default point values are configured
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  Your first 4-month cycle is initialized
                </li>
              </ul>
            </div>
            
            <p className="text-xs text-gray-500 mb-4">
              Contact your administrator or check the deployment documentation to run the database migration.
            </p>
            
            <button
              onClick={() => navigate('/admin/modules')}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Configure in Modules
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data yet (module enabled, tables exist, but empty)
  if (moduleState === 'no_data') {
    return (
      <div className="space-y-6">
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Team Performance</h1>
              <p className="text-gray-400 text-sm">Professional Excellence & Attendance Management</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-6">
              <Rocket className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Ready to Get Started!
            </h2>
            <p className="text-gray-400 mb-6">
              Team Performance is enabled and ready to go. Add team members to The Roster 
              to begin tracking attendance and professional development.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="text-2xl font-bold text-primary-400 mb-1">1</div>
                <p className="text-sm text-gray-400">Add team members to The Roster</p>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="text-2xl font-bold text-primary-400 mb-1">2</div>
                <p className="text-sm text-gray-400">Upload schedules or connect 7shifts</p>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="text-2xl font-bold text-primary-400 mb-1">3</div>
                <p className="text-sm text-gray-400">Track points, tiers & coaching</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/admin/team')}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Go to The Roster
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/admin/modules')}
                className="btn-ghost inline-flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configure Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (moduleState === 'error' || error) {
    return (
      <div className="space-y-6">
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Team Performance</h1>
              <p className="text-gray-400 text-sm">Professional Excellence & Attendance Management</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">
              Something Went Wrong
            </h2>
            <p className="text-gray-400 mb-4">
              We encountered an issue loading performance data. This might be temporary.
            </p>
            {error && (
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 mb-6">
                <p className="text-xs text-gray-500 font-mono">{error}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // READY STATE - FULL MODULE UI
  // ==========================================================================

  const isOmega = securityLevel === SECURITY_LEVELS.OMEGA;

  return (
    <div className="space-y-6">
      {/* Diagnostic Text - Omega only */}
      {isOmega && (
        <div className="text-xs text-gray-500 font-mono">
          src/features/team/components/TeamPerformance/index.tsx
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Icon/Title + Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Team Performance
                </h1>
                <p className="text-gray-400 text-sm">
                  Professional Excellence & Attendance Management
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Team</div>
                <div className="text-lg font-semibold text-white">{performanceArray.length}</div>
              </div>
              {tier3Count > 0 && (
                <div className="px-3 py-2 bg-rose-500/10 rounded-lg border border-rose-500/30">
                  <div className="text-xs text-rose-400 uppercase tracking-wide">Tier 3</div>
                  <div className="text-lg font-semibold text-rose-400">{tier3Count}</div>
                </div>
              )}
            </div>
          </div>

          {/* Cycle Selector */}
          {selectedCycle && (
            <div className="space-y-2">
              {/* Historical Banner - show when not viewing current */}
              {!isViewingCurrent && (
                <div className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-amber-200">
                      Viewing historical cycle: {formatCycleName(selectedCycle)}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (currentCycle?.id) {
                        setSelectedCycleId(currentCycle.id);
                        await fetchTeamPerformance(currentCycle.id);
                      }
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    View Current
                  </button>
                </div>
              )}
              
              <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                  {/* Cycle Dropdown */}
                  <div className="relative cycle-dropdown-container">
                    <button
                      onClick={() => setShowCycleDropdown(!showCycleDropdown)}
                      className="flex items-center gap-2 hover:bg-gray-700/30 rounded-lg px-2 py-1 -ml-2 transition-colors"
                    >
                      <Calendar className="w-4 h-4 text-primary-400" />
                      <span className="text-sm font-medium text-gray-300">
                        {formatCycleName(selectedCycle)}
                      </span>
                      {isViewingCurrent && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                          Current
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showCycleDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showCycleDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50">
                        <div className="p-2 border-b border-gray-700">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Select Cycle</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-1">
                          {cycles.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center">
                              No cycles available
                            </div>
                          ) : (
                            cycles.map((cycle) => {
                              const isCurrent = cycle.id === currentCycle?.id;
                              const isSelected = cycle.id === selectedCycleId;
                              
                              return (
                                <button
                                  key={cycle.id}
                                  onClick={async () => {
                                    console.log('Dropdown click - fetching cycle:', cycle.id);
                                    setSelectedCycleId(cycle.id);
                                    setShowCycleDropdown(false);
                                    // Fetch directly instead of relying on effect
                                    await fetchTeamPerformance(cycle.id);
                                    console.log('Fetch complete for:', cycle.id);
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                                    isSelected 
                                      ? 'bg-primary-500/20 text-white' 
                                      : 'hover:bg-gray-700/50 text-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{formatCycleName(cycle)}</span>
                                    {isCurrent && (
                                      <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-500/20 text-primary-400 rounded">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-primary-400" />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Day counter - only show for current cycle */}
                  {isViewingCurrent && (
                    <span className="text-xs text-gray-500">
                      Day {cycleProgress.dayNumber} of {cycleProgress.totalDays}
                    </span>
                  )}
                </div>
                
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isViewingCurrent ? 'bg-primary-500' : 'bg-gray-500'
                      }`}
                      style={{ width: isViewingCurrent ? `${cycleProgress.percentage}%` : '100%' }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(selectedCycle.start_date)} — {formatDate(selectedCycle.end_date)}
                  </span>
                </div>
              </div>
            </div>
          )}
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
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-300">About Team Performance</span>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
          <div className="expandable-info-content">
            <div className="p-4 pt-2 space-y-4">
              <p className="text-sm text-gray-400">
                Track attendance, professional conduct, and team member development. Points accumulate 
                for attendance issues and reset every 4 months. Team members can earn point reductions 
                through positive actions like covering shifts or staying late.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-400">T1</span>
                    </div>
                    <span className="text-sm font-medium text-green-400">Excellence</span>
                  </div>
                  <p className="text-xs text-gray-500">0-2 points • Priority scheduling</p>
                </div>

                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-400">T2</span>
                    </div>
                    <span className="text-sm font-medium text-amber-400">Strong</span>
                  </div>
                  <p className="text-xs text-gray-500">3-5 points • Standard scheduling</p>
                </div>

                <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-rose-400">T3</span>
                    </div>
                    <span className="text-sm font-medium text-rose-400">Improvement</span>
                  </div>
                  <p className="text-xs text-gray-500">6+ points • Structured support</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">
                  <strong>ESA Protected:</strong> First 3 sick days/year, family emergency leave, 
                  bereavement, approved accommodations, WSIB absences, and jury duty never receive points.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
        {/* Tab Navigation */}
        <div className="border-b border-gray-700">
          <div className="flex items-center gap-2 p-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab ${tab.color} ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive
                        ? `bg-${tab.color}-500/20 text-${tab.color}-300`
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "team" && <TeamTab />}
          {activeTab === "points" && <PointsTab />}
          {activeTab === "coaching" && <CoachingTab />}
          {activeTab === "pips" && <PIPsTab />}
          {activeTab === "reports" && <ReportsTab selectedCycleId={selectedCycleId} />}
          {activeTab === "import" && <ImportTab />}
        </div>
      </div>
    </div>
  );
};

export default TeamPerformance;
