import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Save,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Award,
  TrendingDown,
  Users,
  Calendar,
  Briefcase,
  Info,
  ChevronUp,
  Loader2,
  RotateCcw,
  Database,
  FileSpreadsheet,
  Timer,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { nexus } from "@/lib/nexus";
import toast from "react-hot-toast";
import { LoadingLogo } from "@/features/shared/components";
import { DEFAULT_PERFORMANCE_CONFIG, type PerformanceConfig } from "@/features/team/types";

// =============================================================================
// TYPES
// =============================================================================

interface ProbationConfig {
  enabled: boolean;
  length_days: number;
  points_apply: boolean;              // Does point system apply at all?
  reduced_threshold: boolean;         // If points apply, use lower thresholds?
  probation_tier1_max: number;        // Tier 1 max during probation
  probation_tier2_max: number;        // Tier 2 max during probation  
  can_earn_reductions: boolean;       // Can they reduce points during probation?
  auto_review_at_end: boolean;        // Flag for review when probation ends
}

interface TimeOffConfig {
  enabled: boolean;
  accrual_method: 'percentage_of_wages' | 'hours_per_worked' | 'days_per_period' | 'annual_grant';
  display_unit: 'hours' | 'days' | 'weeks';
  hours_per_day: number;
  hours_per_week: number;
  require_full_units: boolean;
  
  // Percentage of Wages settings (Canada)
  wage_percentage: number;           // e.g., 4 for 4%
  wage_percentage_5yr: number;       // e.g., 6 for 6% after 5 years
  
  // Hours per Hours Worked settings (US)
  accrual_rate: number;              // hours earned per accrual_per_hours worked
  accrual_per_hours: number;         // e.g., 1 hr per 30 hrs worked
  accrual_cap: number;               // max hours that can be banked
  
  // Days per Period settings (UK/EU)
  days_per_year: number;             // e.g., 28 statutory days
  includes_bank_holidays: boolean;
  
  // Annual Grant settings (some US employers)
  annual_grant_hours: number;        // flat hours granted each year
  annual_grant_5yr_hours: number;    // after 5 years service
  
  // Common settings
  reset_period: 'calendar_year' | 'anniversary' | 'fiscal_year';
  carryover_allowed: boolean;
  max_carryover_hours: number;
  
  // Sick days (separate from vacation)
  protected_sick_days: number;
  sick_reset_period: 'calendar_year' | 'anniversary' | 'fiscal_year';
}

// Column mapping for CSV imports
interface ColumnMapping {
  employee_id: string;
  date: string;
  first_name: string;
  last_name: string;
  in_time: string;
  out_time: string;
  role: string;
  location?: string;
}

// Known scheduling services with preset mappings
type SchedulingService = 
  | '7shifts' 
  | 'hotschedules' 
  | 'deputy' 
  | 'wheniwork' 
  | 'homebase'
  | 'sling'
  | 'custom';

interface DataSourceConfig {
  service: SchedulingService;
  // Column mappings (auto-set for known services, manual for custom)
  scheduled_columns: ColumnMapping;
  worked_columns: ColumnMapping;
  // Service-specific settings
  time_format: '12h' | '24h';           // "10:00AM" vs "10:00"
  date_format: 'yyyy-mm-dd' | 'mm/dd/yyyy' | 'dd/mm/yyyy';
  has_header_row: boolean;
}

interface FullPerformanceConfig extends PerformanceConfig {
  probation: ProbationConfig;
  cycle_start: 'calendar_year' | 'custom';
  cycle_start_date?: string;
  time_off: TimeOffConfig;
  data_source: DataSourceConfig;
}

const DEFAULT_PROBATION: ProbationConfig = {
  enabled: true,
  length_days: 90,
  points_apply: true,                 // Points do apply
  reduced_threshold: true,            // But with tighter thresholds
  probation_tier1_max: 1,             // 0-1 pts = Tier 1 (vs normal 0-2)
  probation_tier2_max: 3,             // 2-3 pts = Tier 2 (vs normal 3-5)
  can_earn_reductions: true,          // Yes, let them prove themselves
  auto_review_at_end: true,           // Remind manager to review
};

const DEFAULT_TIME_OFF: TimeOffConfig = {
  enabled: true,
  accrual_method: 'percentage_of_wages',  // Canada default
  display_unit: 'hours',
  hours_per_day: 8,
  hours_per_week: 40,
  require_full_units: false,
  
  // Canada defaults (Ontario)
  wage_percentage: 4,           // 4% of gross = ~2 weeks
  wage_percentage_5yr: 6,       // 6% of gross = ~3 weeks after 5 years
  
  // US defaults
  accrual_rate: 1,
  accrual_per_hours: 30,        // 1 hr per 30 hrs worked
  accrual_cap: 120,             // max bankable
  
  // UK defaults
  days_per_year: 28,            // 5.6 weeks statutory
  includes_bank_holidays: true,
  
  // Annual grant defaults
  annual_grant_hours: 80,
  annual_grant_5yr_hours: 120,
  
  // Common
  reset_period: 'calendar_year',
  carryover_allowed: false,
  max_carryover_hours: 40,
  
  // Sick days
  protected_sick_days: 3,       // Ontario ESA
  sick_reset_period: 'calendar_year',
};

// Preset column mappings for known services
const SERVICE_PRESETS: Record<SchedulingService, { columns: ColumnMapping; time_format: '12h' | '24h'; date_format: DataSourceConfig['date_format'] }> = {
  '7shifts': {
    columns: {
      employee_id: 'Employee ID',
      date: 'Date',
      first_name: 'First',
      last_name: 'Last',
      in_time: 'In Time',
      out_time: 'Out Time',
      role: 'Role',
      location: 'Location',
    },
    time_format: '12h',
    date_format: 'yyyy-mm-dd',
  },
  'hotschedules': {
    columns: {
      employee_id: 'EmployeeId',
      date: 'ShiftDate',
      first_name: 'FirstName',
      last_name: 'LastName',
      in_time: 'StartTime',
      out_time: 'EndTime',
      role: 'JobCode',
      location: 'Location',
    },
    time_format: '24h',
    date_format: 'mm/dd/yyyy',
  },
  'deputy': {
    columns: {
      employee_id: 'Employee Id',
      date: 'Date',
      first_name: 'First Name',
      last_name: 'Last Name',
      in_time: 'Start',
      out_time: 'End',
      role: 'Area',
      location: 'Location',
    },
    time_format: '24h',
    date_format: 'yyyy-mm-dd',
  },
  'wheniwork': {
    columns: {
      employee_id: 'User ID',
      date: 'Date',
      first_name: 'First Name',
      last_name: 'Last Name',
      in_time: 'Start Time',
      out_time: 'End Time',
      role: 'Position',
      location: 'Location',
    },
    time_format: '12h',
    date_format: 'mm/dd/yyyy',
  },
  'homebase': {
    columns: {
      employee_id: 'employee_id',
      date: 'date',
      first_name: 'first_name',
      last_name: 'last_name',
      in_time: 'clock_in',
      out_time: 'clock_out',
      role: 'role',
      location: 'location',
    },
    time_format: '12h',
    date_format: 'yyyy-mm-dd',
  },
  'sling': {
    columns: {
      employee_id: 'Employee ID',
      date: 'Date',
      first_name: 'First name',
      last_name: 'Last name',
      in_time: 'Shift start',
      out_time: 'Shift end',
      role: 'Position',
      location: 'Location',
    },
    time_format: '12h',
    date_format: 'mm/dd/yyyy',
  },
  'custom': {
    columns: {
      employee_id: '',
      date: '',
      first_name: '',
      last_name: '',
      in_time: '',
      out_time: '',
      role: '',
      location: '',
    },
    time_format: '12h',
    date_format: 'yyyy-mm-dd',
  },
};

const DEFAULT_DATA_SOURCE: DataSourceConfig = {
  service: '7shifts',
  scheduled_columns: SERVICE_PRESETS['7shifts'].columns,
  worked_columns: SERVICE_PRESETS['7shifts'].columns,
  time_format: '12h',
  date_format: 'yyyy-mm-dd',
  has_header_row: true,
};

const DEFAULT_FULL_CONFIG: FullPerformanceConfig = {
  ...DEFAULT_PERFORMANCE_CONFIG,
  probation: DEFAULT_PROBATION,
  cycle_start: 'calendar_year',
  time_off: DEFAULT_TIME_OFF,
  data_source: DEFAULT_DATA_SOURCE,
};

// =============================================================================
// TOGGLE COMPONENT - L5 consistent styling
// =============================================================================

const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled = false }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-gray-700/60 rounded-full peer 
      peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/30
      peer-checked:after:translate-x-full peer-checked:after:border-white 
      after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
      after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all 
      peer-checked:bg-primary-500/80 peer-checked:after:bg-white
      peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
      transition-colors duration-200"></div>
  </label>
);

// =============================================================================
// SECTION HEADER COMPONENT
// =============================================================================

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

// =============================================================================
// INPUT ROW COMPONENT
// =============================================================================

const InputRow: React.FC<{
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  negative?: boolean;
}> = ({ label, description, value, onChange, min = 0, max = 99, suffix = "pts", negative = false }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-700/30 last:border-0">
    <div className="flex-1">
      <span className="text-sm text-gray-300">{label}</span>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
    <div className="flex items-center gap-2">
      {negative && <span className="text-gray-500">−</span>}
      <input
        type="number"
        value={Math.abs(value)}
        onChange={(e) => {
          const num = parseInt(e.target.value) || 0;
          onChange(negative ? -Math.abs(num) : num);
        }}
        min={min}
        max={max}
        className="input w-16 text-center text-sm"
      />
      <span className="text-xs text-gray-500 w-8">{suffix}</span>
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TeamPerformanceConfig: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, user, securityLevel } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<FullPerformanceConfig>(DEFAULT_FULL_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<FullPerformanceConfig>(DEFAULT_FULL_CONFIG);
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  // Load config from organization
  useEffect(() => {
    const loadConfig = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('modules')
          .eq('id', organizationId)
          .single();

        if (error) throw error;

        const moduleConfig = data?.modules?.team_performance?.config;
        if (moduleConfig) {
          // Deep merge with defaults to handle new/missing nested objects
          const loadedConfig: FullPerformanceConfig = {
            ...DEFAULT_FULL_CONFIG,
            ...moduleConfig,
            detection_thresholds: { ...DEFAULT_PERFORMANCE_CONFIG.detection_thresholds, ...moduleConfig.detection_thresholds },
            tracking_rules: { ...DEFAULT_PERFORMANCE_CONFIG.tracking_rules, ...moduleConfig.tracking_rules },
            probation: { ...DEFAULT_PROBATION, ...moduleConfig.probation },
            time_off: { ...DEFAULT_TIME_OFF, ...moduleConfig.time_off },
            data_source: { ...DEFAULT_DATA_SOURCE, ...moduleConfig.data_source },
          };
          setConfig(loadedConfig);
          setOriginalConfig(loadedConfig);
        }
      } catch (error) {
        console.error('Error loading config:', error);
        toast.error('Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [organizationId]);

  // Check for changes
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // Save config
  const handleSave = async () => {
    if (!organizationId || !user) return;

    setIsSaving(true);
    try {
      // First get current modules
      const { data: orgData, error: fetchError } = await supabase
        .from('organizations')
        .select('modules')
        .eq('id', organizationId)
        .single();

      if (fetchError) throw fetchError;

      // Update the team_performance config
      const updatedModules = {
        ...orgData.modules,
        team_performance: {
          ...orgData.modules?.team_performance,
          config: config,
        },
      };

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      // Log via Nexus
      await nexus({
        organization_id: organizationId,
        user_id: user.id,
        activity_type: 'settings_changed',
        details: {
          module: 'team_performance',
          action: 'config_updated',
        },
      });

      setOriginalConfig(config);
      toast.success('Configuration saved');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setConfig(DEFAULT_FULL_CONFIG);
    toast('Reset to Memphis Fire defaults', { icon: '🔄' });
  };

  // Update nested config
  const updatePointValues = (key: keyof FullPerformanceConfig['point_values'], value: number) => {
    setConfig(prev => ({
      ...prev,
      point_values: { ...prev.point_values, [key]: value },
    }));
  };

  const updateReductionValues = (key: keyof FullPerformanceConfig['reduction_values'], value: number) => {
    setConfig(prev => ({
      ...prev,
      reduction_values: { ...prev.reduction_values, [key]: value },
    }));
  };

  const updateTierThresholds = (key: keyof FullPerformanceConfig['tier_thresholds'], value: number) => {
    setConfig(prev => ({
      ...prev,
      tier_thresholds: { ...prev.tier_thresholds, [key]: value },
    }));
  };

  const updateCoachingThresholds = (key: keyof FullPerformanceConfig['coaching_thresholds'], value: number) => {
    setConfig(prev => ({
      ...prev,
      coaching_thresholds: { ...prev.coaching_thresholds, [key]: value },
    }));
  };

  const updateDetectionThresholds = (key: keyof FullPerformanceConfig['detection_thresholds'], value: number) => {
    setConfig(prev => ({
      ...prev,
      detection_thresholds: { ...prev.detection_thresholds, [key]: value },
    }));
  };

  const updateTrackingRules = (updates: Partial<PerformanceConfig['tracking_rules']>) => {
    setConfig(prev => ({
      ...prev,
      tracking_rules: { ...prev.tracking_rules, ...updates },
    }));
  };

  const updateTimeOff = (updates: Partial<TimeOffConfig>) => {
    setConfig(prev => ({
      ...prev,
      time_off: { ...prev.time_off, ...updates },
    }));
  };

  const updateProbation = (updates: Partial<ProbationConfig>) => {
    setConfig(prev => ({
      ...prev,
      probation: { ...prev.probation, ...updates },
    }));
  };

  const updateDataSource = (updates: Partial<DataSourceConfig>) => {
    setConfig(prev => ({
      ...prev,
      data_source: { ...prev.data_source, ...updates },
    }));
  };

  // Handle service change - auto-apply presets
  const handleServiceChange = (service: SchedulingService) => {
    const preset = SERVICE_PRESETS[service];
    updateDataSource({
      service,
      scheduled_columns: preset.columns,
      worked_columns: preset.columns,
      time_format: preset.time_format,
      date_format: preset.date_format,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingLogo message="Loading configuration..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* L5 Header */}
      <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/modules')}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Team Performance Configuration
              </h1>
              <p className="text-gray-400 text-sm">
                Define point values, thresholds, and policies
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="btn-ghost text-sm flex items-center gap-2"
              disabled={isSaving}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset to Defaults</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200 font-medium">Important</p>
            <p className="text-sm text-amber-200/80 mt-1">
              These settings reflect YOUR company's policies and YOUR jurisdiction's requirements. 
              You are responsible for ensuring compliance with applicable employment standards legislation. 
              ChefLife is a tracking tool, not legal advice.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DATA SOURCE */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={Database}
            iconColor="text-purple-400"
            bgColor="bg-purple-500/20"
            title="Data Source"
            subtitle="Where your schedule data comes from"
          />
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Scheduling System
              </label>
              <select
                value={config.data_source.service}
                onChange={(e) => handleServiceChange(e.target.value as SchedulingService)}
                className="input w-full"
              >
                <option value="7shifts">7shifts</option>
                <option value="hotschedules">HotSchedules</option>
                <option value="deputy">Deputy</option>
                <option value="wheniwork">When I Work</option>
                <option value="homebase">Homebase</option>
                <option value="sling">Sling</option>
                <option value="custom">Custom CSV (manual mapping)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Column mappings are auto-configured for known services
              </p>
            </div>

            {/* Show column preview for known services */}
            {config.data_source.service !== 'custom' && (
              <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Expected Columns</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="text-gray-500">Employee ID:</div>
                  <div className="text-gray-300 font-mono">{config.data_source.scheduled_columns.employee_id}</div>
                  <div className="text-gray-500">Date:</div>
                  <div className="text-gray-300 font-mono">{config.data_source.scheduled_columns.date}</div>
                  <div className="text-gray-500">In Time:</div>
                  <div className="text-gray-300 font-mono">{config.data_source.scheduled_columns.in_time}</div>
                  <div className="text-gray-500">Out Time:</div>
                  <div className="text-gray-300 font-mono">{config.data_source.scheduled_columns.out_time}</div>
                </div>
              </div>
            )}

            {/* Custom mapping UI */}
            {config.data_source.service === 'custom' && (
              <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30 space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Custom Column Mapping</p>
                <p className="text-xs text-gray-500">Enter the exact column header names from your CSV</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Employee ID</label>
                    <input
                      type="text"
                      value={config.data_source.scheduled_columns.employee_id}
                      onChange={(e) => updateDataSource({
                        scheduled_columns: { ...config.data_source.scheduled_columns, employee_id: e.target.value },
                        worked_columns: { ...config.data_source.worked_columns, employee_id: e.target.value },
                      })}
                      placeholder="e.g., EmployeeID"
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Date</label>
                    <input
                      type="text"
                      value={config.data_source.scheduled_columns.date}
                      onChange={(e) => updateDataSource({
                        scheduled_columns: { ...config.data_source.scheduled_columns, date: e.target.value },
                        worked_columns: { ...config.data_source.worked_columns, date: e.target.value },
                      })}
                      placeholder="e.g., ShiftDate"
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">First Name</label>
                    <input
                      type="text"
                      value={config.data_source.scheduled_columns.first_name}
                      onChange={(e) => updateDataSource({
                        scheduled_columns: { ...config.data_source.scheduled_columns, first_name: e.target.value },
                        worked_columns: { ...config.data_source.worked_columns, first_name: e.target.value },
                      })}
                      placeholder="e.g., FirstName"
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Last Name</label>
                    <input
                      type="text"
                      value={config.data_source.scheduled_columns.last_name}
                      onChange={(e) => updateDataSource({
                        scheduled_columns: { ...config.data_source.scheduled_columns, last_name: e.target.value },
                        worked_columns: { ...config.data_source.worked_columns, last_name: e.target.value },
                      })}
                      placeholder="e.g., LastName"
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">In Time</label>
                    <input
                      type="text"
                      value={config.data_source.scheduled_columns.in_time}
                      onChange={(e) => updateDataSource({
                        scheduled_columns: { ...config.data_source.scheduled_columns, in_time: e.target.value },
                        worked_columns: { ...config.data_source.worked_columns, in_time: e.target.value },
                      })}
                      placeholder="e.g., StartTime"
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Out Time</label>
                    <input
                      type="text"
                      value={config.data_source.scheduled_columns.out_time}
                      onChange={(e) => updateDataSource({
                        scheduled_columns: { ...config.data_source.scheduled_columns, out_time: e.target.value },
                        worked_columns: { ...config.data_source.worked_columns, out_time: e.target.value },
                      })}
                      placeholder="e.g., EndTime"
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Role</label>
                    <input
                      type="text"
                      value={config.data_source.scheduled_columns.role}
                      onChange={(e) => updateDataSource({
                        scheduled_columns: { ...config.data_source.scheduled_columns, role: e.target.value },
                        worked_columns: { ...config.data_source.worked_columns, role: e.target.value },
                      })}
                      placeholder="e.g., Position"
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Location (optional)</label>
                    <input
                      type="text"
                      value={config.data_source.scheduled_columns.location || ''}
                      onChange={(e) => updateDataSource({
                        scheduled_columns: { ...config.data_source.scheduled_columns, location: e.target.value || undefined },
                        worked_columns: { ...config.data_source.worked_columns, location: e.target.value || undefined },
                      })}
                      placeholder="e.g., Location"
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Format settings */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700/30">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Time Format</label>
                <select
                  value={config.data_source.time_format}
                  onChange={(e) => updateDataSource({ time_format: e.target.value as '12h' | '24h' })}
                  className="input w-full text-sm"
                >
                  <option value="12h">12-hour (10:00AM)</option>
                  <option value="24h">24-hour (10:00)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date Format</label>
                <select
                  value={config.data_source.date_format}
                  onChange={(e) => updateDataSource({ date_format: e.target.value as DataSourceConfig['date_format'] })}
                  className="input w-full text-sm"
                >
                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE CYCLE */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={Calendar}
            iconColor="text-primary-400"
            bgColor="bg-primary-500/20"
            title="Performance Cycle"
            subtitle="When points reset"
          />
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Cycle Length
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.cycle_length_months}
                  onChange={(e) => setConfig(prev => ({ ...prev, cycle_length_months: parseInt(e.target.value) || 4 }))}
                  min={1}
                  max={12}
                  className="input w-20 text-center"
                />
                <span className="text-sm text-gray-400">months (quadmester = 4)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Cycle Start
              </label>
              <select
                value={config.cycle_start}
                onChange={(e) => setConfig(prev => ({ ...prev, cycle_start: e.target.value as 'calendar_year' | 'custom' }))}
                className="input w-full"
              >
                <option value="calendar_year">Calendar Year (Jan 1, May 1, Sep 1)</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* PROBATIONARY PERIOD */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={Users}
            iconColor="text-cyan-400"
            bgColor="bg-cyan-500/20"
            title="Probationary Period"
            subtitle="Rules for new hires"
          />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Track probationary status?</span>
              <Toggle
                checked={config.probation.enabled}
                onChange={(checked) => updateProbation({ enabled: checked })}
              />
            </div>

            {config.probation.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Probation Length
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.probation.length_days}
                      onChange={(e) => updateProbation({ length_days: parseInt(e.target.value) || 90 })}
                      min={0}
                      max={365}
                      className="input w-20 text-center"
                    />
                    <span className="text-sm text-gray-400">days from hire date</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-300">Point system applies?</span>
                    <p className="text-xs text-gray-500">If no, any issue goes straight to review</p>
                  </div>
                  <Toggle
                    checked={config.probation.points_apply}
                    onChange={(checked) => updateProbation({ points_apply: checked })}
                  />
                </div>

                {config.probation.points_apply && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-300">Use tighter thresholds?</span>
                        <p className="text-xs text-gray-500">Lower point limits during probation</p>
                      </div>
                      <Toggle
                        checked={config.probation.reduced_threshold}
                        onChange={(checked) => updateProbation({ reduced_threshold: checked })}
                      />
                    </div>

                    {config.probation.reduced_threshold && (
                      <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30 space-y-3">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Probation Tier Limits</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Tier 1 max:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={config.probation.probation_tier1_max}
                              onChange={(e) => updateProbation({ probation_tier1_max: parseInt(e.target.value) || 1 })}
                              min={0}
                              max={config.probation.probation_tier2_max - 1}
                              className="input w-14 text-center text-sm"
                            />
                            <span className="text-xs text-gray-500">pts</span>
                            <span className="text-xs text-gray-600">(normal: {config.tier_thresholds.tier1_max})</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Tier 2 max:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={config.probation.probation_tier2_max}
                              onChange={(e) => updateProbation({ probation_tier2_max: parseInt(e.target.value) || 3 })}
                              min={config.probation.probation_tier1_max + 1}
                              max={config.tier_thresholds.tier2_max}
                              className="input w-14 text-center text-sm"
                            />
                            <span className="text-xs text-gray-500">pts</span>
                            <span className="text-xs text-gray-600">(normal: {config.tier_thresholds.tier2_max})</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-300">Can earn point reductions?</span>
                        <p className="text-xs text-gray-500">Cover shifts, stay late, etc.</p>
                      </div>
                      <Toggle
                        checked={config.probation.can_earn_reductions}
                        onChange={(checked) => updateProbation({ can_earn_reductions: checked })}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-700/30">
                  <div>
                    <span className="text-sm text-gray-300">Auto-flag for review at end?</span>
                    <p className="text-xs text-gray-500">Reminder when probation ends</p>
                  </div>
                  <Toggle
                    checked={config.probation.auto_review_at_end}
                    onChange={(checked) => updateProbation({ auto_review_at_end: checked })}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* TIER THRESHOLDS */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={Award}
            iconColor="text-emerald-400"
            bgColor="bg-emerald-500/20"
            title="Tier Thresholds"
            subtitle="Point ranges that determine scheduling priority"
          />

          {/* Expandable Info */}
          <div className={`expandable-info-section mb-4 ${expandedInfo === 'tiers' ? 'expanded' : ''}`}>
            <button
              onClick={() => setExpandedInfo(expandedInfo === 'tiers' ? null : 'tiers')}
              className="expandable-info-header"
            >
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-400">How tiers affect scheduling</span>
              <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
            </button>
            <div className="expandable-info-content">
              <div className="px-4 pb-4 pt-2 text-sm text-gray-400">
                Tier 1 employees get first pick of preferred shifts and are prioritized during slow periods. 
                Tier 2 maintains regular scheduling. Tier 3 may see reduced hours until performance improves. 
                This creates a fair, transparent incentive for reliability.
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
              <div>
                <span className="text-sm font-medium text-emerald-400">Tier 1 — Excellence</span>
                <p className="text-xs text-gray-500">"You're The Gold Standard"</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">0 –</span>
                <input
                  type="number"
                  value={config.tier_thresholds.tier1_max}
                  onChange={(e) => updateTierThresholds('tier1_max', parseInt(e.target.value) || 2)}
                  min={0}
                  max={config.tier_thresholds.tier2_max - 1}
                  className="input w-16 text-center text-sm"
                />
                <span className="text-xs text-gray-500">pts</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
              <div>
                <span className="text-sm font-medium text-amber-400">Tier 2 — Strong Performance</span>
                <p className="text-xs text-gray-500">"Let Your Star Burn Brighter"</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{config.tier_thresholds.tier1_max + 1} –</span>
                <input
                  type="number"
                  value={config.tier_thresholds.tier2_max}
                  onChange={(e) => updateTierThresholds('tier2_max', parseInt(e.target.value) || 5)}
                  min={config.tier_thresholds.tier1_max + 1}
                  max={config.coaching_thresholds.stage1 - 1}
                  className="input w-16 text-center text-sm"
                />
                <span className="text-xs text-gray-500">pts</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
              <div>
                <span className="text-sm font-medium text-rose-400">Tier 3 — Improvement Focus</span>
                <p className="text-xs text-gray-500">Coaching stages apply</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{config.tier_thresholds.tier2_max + 1}+</span>
                <span className="text-xs text-gray-500">pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* POINT VALUES (DEMERITS) */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={AlertTriangle}
            iconColor="text-rose-400"
            bgColor="bg-rose-500/20"
            title="Point Values"
            subtitle="Attendance and professional standards demerits"
          />

          {/* Expandable Info */}
          <div className={`expandable-info-section mb-4 ${expandedInfo === 'demerits' ? 'expanded' : ''}`}>
            <button
              onClick={() => setExpandedInfo(expandedInfo === 'demerits' ? null : 'demerits')}
              className="expandable-info-header"
            >
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-400">About point values</span>
              <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
            </button>
            <div className="expandable-info-content">
              <div className="px-4 pb-4 pt-2 text-sm text-gray-400">
                These values are added to a team member's point balance when events occur. 
                Higher values indicate more serious infractions. ESA-protected leave (like sick days) 
                should not incur points — use the manual override when logging events.
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Attendance</p>
            <InputRow
              label="No-call/no-show"
              description="Failed to show with little/no communication"
              value={config.point_values.no_call_no_show}
              onChange={(v) => updatePointValues('no_call_no_show', v)}
            />
            <InputRow
              label="Dropped shift (no coverage)"
              description="Advance notice but didn't secure replacement"
              value={config.point_values.dropped_shift_no_coverage}
              onChange={(v) => updatePointValues('dropped_shift_no_coverage', v)}
            />
            <InputRow
              label="Unexcused absence"
              description="Advance notice, not ESA protected"
              value={config.point_values.unexcused_absence}
              onChange={(v) => updatePointValues('unexcused_absence', v)}
            />
            <InputRow
              label="Tardiness (15+ min)"
              value={config.point_values.tardiness_major}
              onChange={(v) => updatePointValues('tardiness_major', v)}
            />
            <InputRow
              label="Tardiness (5-15 min)"
              value={config.point_values.tardiness_minor}
              onChange={(v) => updatePointValues('tardiness_minor', v)}
            />
            <InputRow
              label="Early departure"
              description="Leaving before end time without approval"
              value={config.point_values.early_departure}
              onChange={(v) => updatePointValues('early_departure', v)}
            />
            <InputRow
              label="Late notification"
              description="Modifier: <4hrs notice OR outside waking hours"
              value={config.point_values.late_notification}
              onChange={(v) => updatePointValues('late_notification', v)}
              suffix="+pts"
            />

            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 mt-4">Professional Standards</p>
            <InputRow
              label="Food safety violation"
              description="Cross-contamination, temps, sanitation"
              value={config.point_values.food_safety_violation}
              onChange={(v) => updatePointValues('food_safety_violation', v)}
            />
            <InputRow
              label="Insubordination"
              description="Refusing instructions, arguing with management"
              value={config.point_values.insubordination}
              onChange={(v) => updatePointValues('insubordination', v)}
            />
          </div>
        </div>

        {/* DETECTION THRESHOLDS */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={Timer}
            iconColor="text-cyan-400"
            bgColor="bg-cyan-500/20"
            title="Detection Thresholds"
            subtitle="When attendance events are triggered (in minutes)"
          />

          {/* Expandable Info */}
          <div className={`expandable-info-section mb-4 ${expandedInfo === 'detection' ? 'expanded' : ''}`}>
            <button
              onClick={() => setExpandedInfo(expandedInfo === 'detection' ? null : 'detection')}
              className="expandable-info-header"
            >
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-400">How detection works</span>
              <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
            </button>
            <div className="expandable-info-content">
              <div className="px-4 pb-4 pt-2 text-sm text-gray-400">
                These thresholds define when the Delta Engine flags events during CSV import. 
                For example, if "Minor Tardiness" is set to 5 minutes, arriving 4 minutes late 
                won't trigger an event, but 5+ minutes will. Adjust based on your operation's 
                needs — a busy kitchen might need tighter thresholds than a casual cafe.
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tardiness Detection</p>
            <InputRow
              label="Minor tardiness starts at"
              description="5-14 min late (configurable upper bound)"
              value={config.detection_thresholds.tardiness_minor_min}
              onChange={(v) => updateDetectionThresholds('tardiness_minor_min', v)}
              suffix="min"
              min={1}
              max={30}
            />
            <InputRow
              label="Major tardiness starts at"
              description="Triggers higher point value"
              value={config.detection_thresholds.tardiness_major_min}
              onChange={(v) => updateDetectionThresholds('tardiness_major_min', v)}
              suffix="min"
              min={5}
              max={60}
            />

            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 mt-4">Departure Detection</p>
            <InputRow
              label="Early departure threshold"
              description="Left X+ minutes before scheduled end"
              value={config.detection_thresholds.early_departure_min}
              onChange={(v) => updateDetectionThresholds('early_departure_min', v)}
              suffix="min"
              min={10}
              max={120}
            />

            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 mt-4">Reduction Detection</p>
            <InputRow
              label="Arrived early threshold"
              description="Arrived X+ min early (earns reduction)"
              value={config.detection_thresholds.arrived_early_min}
              onChange={(v) => updateDetectionThresholds('arrived_early_min', v)}
              suffix="min"
              min={15}
              max={120}
            />
            <InputRow
              label="Stayed late threshold"
              description="Stayed X+ min late (earns reduction)"
              value={config.detection_thresholds.stayed_late_min}
              onChange={(v) => updateDetectionThresholds('stayed_late_min', v)}
              suffix="min"
              min={30}
              max={180}
            />
          </div>
        </div>

        {/* TRACKING RULES */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={Shield}
            iconColor="text-amber-400"
            bgColor="bg-amber-500/20"
            title="Tracking Rules"
            subtitle="Who gets tracked and when"
          />

          {/* Expandable Info */}
          <div className={`expandable-info-section mb-4 ${expandedInfo === 'tracking' ? 'expanded' : ''}`}>
            <button
              onClick={() => setExpandedInfo(expandedInfo === 'tracking' ? null : 'tracking')}
              className="expandable-info-header"
            >
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-400">Why exempt certain roles?</span>
              <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
            </button>
            <div className="expandable-info-content">
              <div className="px-4 pb-4 pt-2 text-sm text-gray-400">
                Owners, executive chefs, and managers often work irregular hours, come in 
                without being scheduled, or stay late by choice. Tracking their "attendance" 
                against a schedule doesn't make sense — they ARE the schedule. Similarly, 
                salaried leadership working unscheduled shifts shouldn't trigger no-show alerts.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Exempt from tracking entirely */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Exempt from attendance tracking
              </label>
              <p className="text-xs text-gray-500 mb-2">
                These security levels won't generate attendance events at all
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { level: 0, name: 'Ω Omega (System)' },
                  { level: 1, name: 'α Alpha (Owner)' },
                  { level: 2, name: 'β Bravo (Manager)' },
                  { level: 3, name: 'γ Charlie (Asst Mgr)' },
                  { level: 4, name: 'δ Delta (Supervisor)' },
                  { level: 5, name: 'ε Echo (Team Member)' },
                ].map(({ level, name }) => (
                  <label key={level} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.tracking_rules.exempt_security_levels.includes(level)}
                      onChange={(e) => {
                        const current = config.tracking_rules.exempt_security_levels;
                        const updated = e.target.checked
                          ? [...current, level].sort()
                          : current.filter(l => l !== level);
                        updateTrackingRules({ exempt_security_levels: updated });
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500/30"
                    />
                    <span className="text-sm text-gray-300">{name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Unscheduled work handling */}
            <div className="pt-4 border-t border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm text-gray-300">Flag unscheduled work?</span>
                  <p className="text-xs text-gray-500">When someone clocks in but wasn't scheduled</p>
                </div>
                <Toggle
                  checked={config.tracking_rules.track_unscheduled_shifts}
                  onChange={(checked) => updateTrackingRules({ track_unscheduled_shifts: checked })}
                />
              </div>

              {config.tracking_rules.track_unscheduled_shifts && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Exempt from unscheduled flags
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    These roles can work without being scheduled (owners, chefs who come in to prep)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { level: 0, name: 'Ω Omega (System)' },
                      { level: 1, name: 'α Alpha (Owner)' },
                      { level: 2, name: 'β Bravo (Manager)' },
                      { level: 3, name: 'γ Charlie (Asst Mgr)' },
                      { level: 4, name: 'δ Delta (Supervisor)' },
                      { level: 5, name: 'ε Echo (Team Member)' },
                    ].map(({ level, name }) => (
                      <label key={level} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.tracking_rules.unscheduled_exempt_levels.includes(level)}
                          onChange={(e) => {
                            const current = config.tracking_rules.unscheduled_exempt_levels;
                            const updated = e.target.checked
                              ? [...current, level].sort()
                              : current.filter(l => l !== level);
                            updateTrackingRules({ unscheduled_exempt_levels: updated });
                          }}
                          className="rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500/30"
                        />
                        <span className="text-sm text-gray-300">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* POINT REDUCTIONS */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={TrendingDown}
            iconColor="text-green-400"
            bgColor="bg-green-500/20"
            title="Point Reductions"
            subtitle="Opportunities to reduce point balance"
          />

          {/* Expandable Info */}
          <div className={`expandable-info-section mb-4 ${expandedInfo === 'reductions' ? 'expanded' : ''}`}>
            <button
              onClick={() => setExpandedInfo(expandedInfo === 'reductions' ? null : 'reductions')}
              className="expandable-info-header"
            >
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-400">The "earn back" philosophy</span>
              <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
            </button>
            <div className="expandable-info-content">
              <div className="px-4 pb-4 pt-2 text-sm text-gray-400">
                Everyone has bad days. Point reductions give team members a path back to Tier 1 through 
                positive actions — covering shifts, staying late when needed, mentoring others. 
                The 30-day cap prevents gaming while still rewarding genuine team players.
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <InputRow
              label="Cover shift (<24hr notice)"
              description="Last-minute coverage"
              value={config.reduction_values.cover_shift_urgent}
              onChange={(v) => updateReductionValues('cover_shift_urgent', v)}
              negative
            />
            <InputRow
              label="Cover shift (24-48hr notice)"
              description="Short-notice coverage"
              value={config.reduction_values.cover_shift_standard}
              onChange={(v) => updateReductionValues('cover_shift_standard', v)}
              negative
            />
            <InputRow
              label="Stay late (2+ hrs)"
              description="Extended service when needed"
              value={config.reduction_values.stay_late}
              onChange={(v) => updateReductionValues('stay_late', v)}
              negative
            />
            <InputRow
              label="Arrive early (2+ hrs)"
              description="Early arrival when requested"
              value={config.reduction_values.arrive_early}
              onChange={(v) => updateReductionValues('arrive_early', v)}
              negative
            />
            <InputRow
              label="Training/Mentoring"
              description="Development outside regular shifts"
              value={config.reduction_values.training_mentoring}
              onChange={(v) => updateReductionValues('training_mentoring', v)}
              negative
            />
            <InputRow
              label="Special events/catering"
              description="Catering or event support"
              value={config.reduction_values.special_event}
              onChange={(v) => updateReductionValues('special_event', v)}
              negative
            />

            <div className="mt-4 pt-4 border-t border-gray-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-300">Max reduction per 30 days</span>
                  <p className="text-xs text-gray-500">Prevents gaming the system</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.max_reduction_per_30_days}
                    onChange={(e) => setConfig(prev => ({ ...prev, max_reduction_per_30_days: parseInt(e.target.value) || 3 }))}
                    min={1}
                    max={10}
                    className="input w-16 text-center text-sm"
                  />
                  <span className="text-xs text-gray-500">pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COACHING THRESHOLDS */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={Users}
            iconColor="text-amber-400"
            bgColor="bg-amber-500/20"
            title="Coaching Thresholds"
            subtitle="Progressive support stages within Tier 3"
          />

          {/* Expandable Info */}
          <div className={`expandable-info-section mb-4 ${expandedInfo === 'coaching' ? 'expanded' : ''}`}>
            <button
              onClick={() => setExpandedInfo(expandedInfo === 'coaching' ? null : 'coaching')}
              className="expandable-info-header"
            >
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-400">Progressive support, not punishment</span>
              <ChevronUp className="w-4 h-4 text-gray-500 ml-auto" />
            </button>
            <div className="expandable-info-content">
              <div className="px-4 pb-4 pt-2 text-sm text-gray-400">
                Coaching stages are designed to help struggling team members succeed, not to build 
                a termination case. Each stage increases support and check-ins. Only after multiple 
                stages with no improvement does termination become an option — and by then, everyone 
                knows it was thoroughly documented and fair.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/30">
              <div>
                <span className="text-sm text-gray-300">Stage 1 — Building Support Network</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.coaching_thresholds.stage1}
                  onChange={(e) => updateCoachingThresholds('stage1', parseInt(e.target.value) || 6)}
                  className="input w-16 text-center text-sm"
                />
                <span className="text-xs text-gray-500">pts</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/30">
              <div>
                <span className="text-sm text-gray-300">Stage 2 — Strengthening Support</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.coaching_thresholds.stage2}
                  onChange={(e) => updateCoachingThresholds('stage2', parseInt(e.target.value) || 8)}
                  className="input w-16 text-center text-sm"
                />
                <span className="text-xs text-gray-500">pts</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/30">
              <div>
                <span className="text-sm text-gray-300">Stage 3 — Professional Development</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.coaching_thresholds.stage3}
                  onChange={(e) => updateCoachingThresholds('stage3', parseInt(e.target.value) || 10)}
                  className="input w-16 text-center text-sm"
                />
                <span className="text-xs text-gray-500">pts</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
              <div>
                <span className="text-sm text-amber-400">Stage 4 — Employment Review</span>
                <p className="text-xs text-gray-500">Team Impact Assessment</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.coaching_thresholds.stage4}
                  onChange={(e) => updateCoachingThresholds('stage4', parseInt(e.target.value) || 12)}
                  className="input w-16 text-center text-sm"
                />
                <span className="text-xs text-gray-500">pts</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
              <div>
                <span className="text-sm text-rose-400">Stage 5 — Termination Threshold</span>
                <p className="text-xs text-gray-500">Based on reliability and performance</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.coaching_thresholds.stage5}
                  onChange={(e) => updateCoachingThresholds('stage5', parseInt(e.target.value) || 15)}
                  className="input w-16 text-center text-sm"
                />
                <span className="text-xs text-gray-500">pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* TIME-OFF TRACKING */}
        <div className="bg-[#1a1f2b] rounded-lg shadow-lg p-5">
          <SectionHeader
            icon={Briefcase}
            iconColor="text-violet-400"
            bgColor="bg-violet-500/20"
            title="Time-Off Tracking"
            subtitle="Sick days, vacation, and leave policies"
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Track time-off in this system?</span>
              <Toggle
                checked={config.time_off.enabled}
                onChange={(checked) => updateTimeOff({ enabled: checked })}
              />
            </div>

            {config.time_off.enabled && (
              <>
                {/* ACCRUAL METHOD - THE KEY QUESTION */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    How is vacation time earned?
                  </label>
                  <select
                    value={config.time_off.accrual_method}
                    onChange={(e) => updateTimeOff({ accrual_method: e.target.value as TimeOffConfig['accrual_method'] })}
                    className="input w-full"
                  >
                    <option value="percentage_of_wages">Percentage of Wages (Canada)</option>
                    <option value="hours_per_worked">Hours per Hours Worked (US common)</option>
                    <option value="days_per_period">Statutory Days per Year (UK/EU)</option>
                    <option value="annual_grant">Annual Grant (US corporate)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {config.time_off.accrual_method === 'percentage_of_wages' && '4% of gross wages = ~2 weeks (Ontario ESA). Resets calendar year.'}
                    {config.time_off.accrual_method === 'hours_per_worked' && 'Earn PTO hours based on hours worked (e.g., 1 hr per 30 hrs).'}
                    {config.time_off.accrual_method === 'days_per_period' && 'Statutory entitlement accrued monthly (5.6 weeks = 28 days UK).'}
                    {config.time_off.accrual_method === 'annual_grant' && 'Fixed hours granted at start of each year or anniversary.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Unit of measurement
                  </label>
                  <select
                    value={config.time_off.display_unit}
                    onChange={(e) => updateTimeOff({ display_unit: e.target.value as 'hours' | 'days' | 'weeks' })}
                    className="input w-full"
                  >
                    <option value="hours">Hours (most flexible)</option>
                    <option value="days">Days (traditional)</option>
                    <option value="weeks">Weeks (some jurisdictions require)</option>
                  </select>
                </div>

                {config.time_off.display_unit !== 'hours' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Must take in full units?</span>
                    <Toggle
                      checked={config.time_off.require_full_units}
                      onChange={(checked) => updateTimeOff({ require_full_units: checked })}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Hours per standard day (for conversion)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.time_off.hours_per_day}
                      onChange={(e) => updateTimeOff({ hours_per_day: parseInt(e.target.value) || 8 })}
                      min={4}
                      max={12}
                      className="input w-20 text-center"
                    />
                    <span className="text-sm text-gray-400">hours</span>
                  </div>
                </div>

                {/* PERCENTAGE OF WAGES (Canada) */}
                {config.time_off.accrual_method === 'percentage_of_wages' && (
                  <div className="pt-4 border-t border-gray-700/30">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Vacation Pay Percentage</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-300">0-5 years service</span>
                          <p className="text-xs text-gray-500">Ontario minimum: 4%</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={config.time_off.wage_percentage}
                            onChange={(e) => updateTimeOff({ wage_percentage: parseInt(e.target.value) || 4 })}
                            min={0}
                            max={20}
                            className="input w-16 text-center text-sm"
                          />
                          <span className="text-sm text-gray-400">%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-300">5+ years service</span>
                          <p className="text-xs text-gray-500">Ontario minimum: 6%</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={config.time_off.wage_percentage_5yr}
                            onChange={(e) => updateTimeOff({ wage_percentage_5yr: parseInt(e.target.value) || 6 })}
                            min={0}
                            max={20}
                            className="input w-16 text-center text-sm"
                          />
                          <span className="text-sm text-gray-400">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* HOURS PER HOURS WORKED (US) */}
                {config.time_off.accrual_method === 'hours_per_worked' && (
                  <div className="pt-4 border-t border-gray-700/30">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Accrual Rate</p>
                    
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-sm text-gray-300">Earn</span>
                      <input
                        type="number"
                        value={config.time_off.accrual_rate}
                        onChange={(e) => updateTimeOff({ accrual_rate: parseInt(e.target.value) || 1 })}
                        min={1}
                        max={10}
                        className="input w-16 text-center text-sm"
                      />
                      <span className="text-sm text-gray-300">hour(s) per</span>
                      <input
                        type="number"
                        value={config.time_off.accrual_per_hours}
                        onChange={(e) => updateTimeOff({ accrual_per_hours: parseInt(e.target.value) || 30 })}
                        min={1}
                        max={100}
                        className="input w-16 text-center text-sm"
                      />
                      <span className="text-sm text-gray-300">hours worked</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-300">Maximum accrual cap</span>
                        <p className="text-xs text-gray-500">Max hours that can be banked</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={config.time_off.accrual_cap}
                          onChange={(e) => updateTimeOff({ accrual_cap: parseInt(e.target.value) || 120 })}
                          min={0}
                          max={500}
                          className="input w-20 text-center"
                        />
                        <span className="text-sm text-gray-400">hours</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* DAYS PER PERIOD (UK/EU) */}
                {config.time_off.accrual_method === 'days_per_period' && (
                  <div className="pt-4 border-t border-gray-700/30">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Statutory Entitlement</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-300">Annual entitlement</span>
                          <p className="text-xs text-gray-500">UK statutory: 28 days (5.6 weeks)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={config.time_off.days_per_year}
                            onChange={(e) => updateTimeOff({ days_per_year: parseInt(e.target.value) || 28 })}
                            min={0}
                            max={60}
                            className="input w-16 text-center text-sm"
                          />
                          <span className="text-sm text-gray-400">days</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Includes bank holidays?</span>
                        <Toggle
                          checked={config.time_off.includes_bank_holidays}
                          onChange={(checked) => updateTimeOff({ includes_bank_holidays: checked })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ANNUAL GRANT (US Corporate) */}
                {config.time_off.accrual_method === 'annual_grant' && (
                  <div className="pt-4 border-t border-gray-700/30">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Annual Grant</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-300">0-5 years service</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={config.time_off.annual_grant_hours}
                            onChange={(e) => updateTimeOff({ annual_grant_hours: parseInt(e.target.value) || 80 })}
                            min={0}
                            max={500}
                            className="input w-20 text-center text-sm"
                          />
                          <span className="text-sm text-gray-400">hours/year</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-300">5+ years service</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={config.time_off.annual_grant_5yr_hours}
                            onChange={(e) => updateTimeOff({ annual_grant_5yr_hours: parseInt(e.target.value) || 120 })}
                            min={0}
                            max={500}
                            className="input w-20 text-center text-sm"
                          />
                          <span className="text-sm text-gray-400">hours/year</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* COMMON SETTINGS */}
                <div className="pt-4 border-t border-gray-700/30">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Reset & Carryover</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1.5">
                        Vacation resets
                      </label>
                      <select
                        value={config.time_off.reset_period}
                        onChange={(e) => updateTimeOff({ reset_period: e.target.value as 'calendar_year' | 'anniversary' | 'fiscal_year' })}
                        className="input w-full"
                      >
                        <option value="calendar_year">Calendar Year (Jan 1)</option>
                        <option value="anniversary">Hire Anniversary</option>
                        <option value="fiscal_year">Fiscal Year</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Allow carryover?</span>
                      <Toggle
                        checked={config.time_off.carryover_allowed}
                        onChange={(checked) => updateTimeOff({ carryover_allowed: checked })}
                      />
                    </div>

                    {config.time_off.carryover_allowed && (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-gray-300">Max carryover</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={config.time_off.max_carryover_hours}
                            onChange={(e) => updateTimeOff({ max_carryover_hours: parseInt(e.target.value) || 40 })}
                            min={0}
                            max={200}
                            className="input w-20 text-center text-sm"
                          />
                          <span className="text-sm text-gray-400">hours</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SICK DAYS */}
                <div className="pt-4 border-t border-gray-700/30">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Sick Days</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-300">Protected sick days per year</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={config.time_off.protected_sick_days}
                        onChange={(e) => updateTimeOff({ protected_sick_days: parseInt(e.target.value) || 3 })}
                        min={0}
                        max={30}
                        className="input w-16 text-center"
                      />
                      <span className="text-sm text-gray-400">days</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">
                      Sick days reset
                    </label>
                    <select
                      value={config.time_off.sick_reset_period}
                      onChange={(e) => updateTimeOff({ sick_reset_period: e.target.value as 'calendar_year' | 'anniversary' | 'fiscal_year' })}
                      className="input w-full"
                    >
                      <option value="calendar_year">Calendar Year (Jan 1)</option>
                      <option value="anniversary">Hire Anniversary</option>
                      <option value="fiscal_year">Fiscal Year</option>
                    </select>
                  </div>
                </div>


              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="floating-action-bar warning">
          <div className="floating-action-bar-inner">
            <div className="floating-action-bar-content">
              <span className="text-sm text-gray-300">Unsaved changes</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setConfig(originalConfig);
                    toast('Changes reverted', { icon: '↩️' });
                  }} 
                  disabled={isSaving} 
                  className="btn-ghost text-sm flex items-center gap-1.5 px-3 py-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo
                </button>
                <button onClick={handleSave} disabled={isSaving} className="btn-primary text-sm flex items-center gap-1.5 px-3 py-1.5">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
