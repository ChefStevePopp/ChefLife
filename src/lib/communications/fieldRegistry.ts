/**
 * Field Registry - Single Source of Truth for Merge Fields
 * 
 * L5 Architecture: Module-driven field organization.
 * Fields are grouped by the ChefLife module they belong to.
 * Communications module auto-discovers fields based on enabled modules.
 * 
 * To add fields for a new module:
 * 1. Add module to ModuleId type
 * 2. Add module definition to MODULE_DEFINITIONS
 * 3. Add fields with module property set
 * 4. That's it - UI auto-discovers based on org's enabled modules
 */

// =============================================================================
// MODULE TYPES
// =============================================================================

/**
 * Module identifiers - matches ChefLife module system
 */
export type ModuleId = 
  | 'core'              // Always on - Recipient, Organization
  | 'schedule'          // The Schedule - week/day info
  | 'team_performance'  // Team Performance add-on
  | 'nexus'             // NEXUS activity tracking
  | 'recipe_manager'    // Recipe Manager (future)
  | 'task_manager'      // Task Manager (future)
  | 'haccp';            // HACCP (future)

/**
 * Module definition for UI display
 */
export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  icon: string;           // Lucide icon name
  color: string;          // Tailwind color class
  isCore: boolean;        // Core modules always shown
  dbKey?: string;         // Key in organizations.modules (e.g., 'team_performance')
  description?: string;   // Short description for UI
}

// =============================================================================
// FIELD TYPES
// =============================================================================

/**
 * Subcategory within a module for additional organization
 */
export type FieldSubcategory = 
  | 'recipient'
  | 'organization'
  | 'performance'
  | 'time_off'
  | 'cycle_history'
  | 'week'
  | 'activity'
  | 'recipe'
  | 'task'
  | 'food_safety';

export type FieldType = 
  | 'string'
  | 'number'
  | 'date'
  | 'percentage'
  | 'currency'
  | 'email';

export type FieldTransform = 
  | 'none'
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'date_short'
  | 'date_long'
  | 'percentage'
  | 'currency';

export interface FieldDefinition {
  /** The merge tag (without delimiters): "First_Name" */
  tag: string;
  
  /** Module this field belongs to */
  module: ModuleId;
  
  /** Subcategory within the module for grouping */
  subcategory?: FieldSubcategory;
  
  /** Dot-path to data in MergeContext: "recipient.first_name" */
  dataPath: string;
  
  /** Data type for validation and formatting */
  type: FieldType;
  
  /** Human-readable description for UI */
  description: string;
  
  /** Example value shown in UI */
  sampleValue: string;
  
  /** Optional transform to apply */
  transform?: FieldTransform;
  
  /** Default value if data is missing */
  defaultValue?: string;
}

// =============================================================================
// LEGACY TYPE ALIAS (for backwards compatibility)
// =============================================================================

export type FieldCategory = FieldSubcategory;

// =============================================================================
// MODULE DEFINITIONS
// =============================================================================

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'core',
    label: 'Core',
    icon: 'User',
    color: 'text-sky-400',
    isCore: true,
    description: 'Recipient and organization info',
  },
  {
    id: 'schedule',
    label: 'The Schedule',
    icon: 'Calendar',
    color: 'text-purple-400',
    isCore: true,
    dbKey: 'schedule',
    description: 'Week dates, day info, shifts',
  },
  {
    id: 'team_performance',
    label: 'Team Performance',
    icon: 'TrendingUp',
    color: 'text-amber-400',
    isCore: false,
    dbKey: 'team_performance',
    description: 'Points, tiers, attendance, time off',
  },
  {
    id: 'nexus',
    label: 'NEXUS',
    icon: 'Activity',
    color: 'text-cyan-400',
    isCore: true,
    description: 'Activity tracking and history',
  },
  {
    id: 'recipe_manager',
    label: 'Recipe Manager',
    icon: 'ChefHat',
    color: 'text-orange-400',
    isCore: true,
    dbKey: 'recipe_manager',
    description: 'Recipe and ingredient data',
  },
  {
    id: 'task_manager',
    label: 'Task Manager',
    icon: 'ClipboardCheck',
    color: 'text-green-400',
    isCore: true,
    dbKey: 'task_manager',
    description: 'Task and checklist data',
  },
  {
    id: 'haccp',
    label: 'HACCP',
    icon: 'Thermometer',
    color: 'text-rose-400',
    isCore: true,
    dbKey: 'haccp',
    description: 'Food safety and compliance',
  },
];

// =============================================================================
// LEGACY CATEGORY DEFINITIONS (for backwards compatibility)
// =============================================================================

export interface CategoryDefinition {
  id: FieldSubcategory;
  label: string;
  icon: string;
  color: string;
}

export const FIELD_CATEGORIES: CategoryDefinition[] = [
  { id: 'recipient', label: 'Recipient', icon: 'User', color: 'text-sky-400' },
  { id: 'organization', label: 'Organization', icon: 'Building2', color: 'text-emerald-400' },
  { id: 'performance', label: 'Performance', icon: 'TrendingUp', color: 'text-amber-400' },
  { id: 'time_off', label: 'Time Off', icon: 'Thermometer', color: 'text-rose-400' },
  { id: 'cycle_history', label: 'Cycle History', icon: 'History', color: 'text-violet-400' },
  { id: 'week', label: 'Reporting Period', icon: 'Calendar', color: 'text-purple-400' },
  { id: 'activity', label: 'Activity', icon: 'Activity', color: 'text-cyan-400' },
];

// =============================================================================
// FIELD DEFINITIONS - THE SINGLE SOURCE OF TRUTH
// =============================================================================

export const FIELD_REGISTRY: FieldDefinition[] = [
  // ===========================================================================
  // CORE MODULE - Always available
  // ===========================================================================
  
  // Recipient Fields
  {
    tag: 'First_Name',
    module: 'core',
    subcategory: 'recipient',
    dataPath: 'recipient.first_name',
    type: 'string',
    description: 'First name',
    sampleValue: 'Marcus',
  },
  {
    tag: 'Last_Name',
    module: 'core',
    subcategory: 'recipient',
    dataPath: 'recipient.last_name',
    type: 'string',
    description: 'Last name',
    sampleValue: 'Chen',
  },
  {
    tag: 'Email',
    module: 'core',
    subcategory: 'recipient',
    dataPath: 'recipient.email',
    type: 'email',
    description: 'Email address',
    sampleValue: 'marcus.chen@gmail.com',
  },
  {
    tag: 'Hire_Date',
    module: 'core',
    subcategory: 'recipient',
    dataPath: 'recipient.hire_date',
    type: 'date',
    description: 'Hire date',
    sampleValue: 'Mar 15, 2023',
    transform: 'date_short',
  },
  {
    tag: 'Position',
    module: 'core',
    subcategory: 'recipient',
    dataPath: 'recipient.position',
    type: 'string',
    description: 'Job position',
    sampleValue: 'Grill Lead',
  },
  
  // Organization Fields
  {
    tag: 'Org_Name',
    module: 'core',
    subcategory: 'organization',
    dataPath: 'organization.name',
    type: 'string',
    description: 'Organization name',
    sampleValue: 'Memphis Fire BBQ',
  },
  {
    tag: 'Company_Name',
    module: 'core',
    subcategory: 'organization',
    dataPath: 'organization.name',
    type: 'string',
    description: 'Company name (alias)',
    sampleValue: 'Memphis Fire BBQ',
  },

  // ===========================================================================
  // SCHEDULE MODULE - The Schedule (Core)
  // ===========================================================================
  
  {
    tag: 'Reporting_Start',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.start_date',
    type: 'date',
    description: 'Period start date',
    sampleValue: '2026-01-06',
  },
  {
    tag: 'Reporting_End',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.end_date',
    type: 'date',
    description: 'Period end date',
    sampleValue: '2026-01-12',
  },
  {
    tag: 'Week_Label',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.week_label',
    type: 'string',
    description: 'Week description',
    sampleValue: 'Week of January 6, 2026',
  },
  {
    tag: 'Period_Label',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.period_label',
    type: 'string',
    description: 'Period name',
    sampleValue: 'Jan-Apr 2026',
  },
  {
    tag: 'Day_1',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.0.date',
    type: 'date',
    description: 'Monday date',
    sampleValue: 'Mon Jan 6',
  },
  {
    tag: 'Day_1_Info',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.0.info',
    type: 'string',
    description: 'Monday info',
    sampleValue: '4pm-10pm',
  },
  {
    tag: 'Day_2',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.1.date',
    type: 'date',
    description: 'Tuesday date',
    sampleValue: 'Tue Jan 7',
  },
  {
    tag: 'Day_2_Info',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.1.info',
    type: 'string',
    description: 'Tuesday info',
    sampleValue: 'Off',
  },
  {
    tag: 'Day_3',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.2.date',
    type: 'date',
    description: 'Wednesday date',
    sampleValue: 'Wed Jan 8',
  },
  {
    tag: 'Day_3_Info',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.2.info',
    type: 'string',
    description: 'Wednesday info',
    sampleValue: '4pm-10pm',
  },
  {
    tag: 'Day_4',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.3.date',
    type: 'date',
    description: 'Thursday date',
    sampleValue: 'Thu Jan 9',
  },
  {
    tag: 'Day_4_Info',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.3.info',
    type: 'string',
    description: 'Thursday info',
    sampleValue: '4pm-10pm',
  },
  {
    tag: 'Day_5',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.4.date',
    type: 'date',
    description: 'Friday date',
    sampleValue: 'Fri Jan 10',
  },
  {
    tag: 'Day_5_Info',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.4.info',
    type: 'string',
    description: 'Friday info',
    sampleValue: '4pm-10pm',
  },
  {
    tag: 'Day_6',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.5.date',
    type: 'date',
    description: 'Saturday date',
    sampleValue: 'Sat Jan 11',
  },
  {
    tag: 'Day_6_Info',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.5.info',
    type: 'string',
    description: 'Saturday info',
    sampleValue: '11am-10pm',
  },
  {
    tag: 'Day_7',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.6.date',
    type: 'date',
    description: 'Sunday date',
    sampleValue: 'Sun Jan 12',
  },
  {
    tag: 'Day_7_Info',
    module: 'schedule',
    subcategory: 'week',
    dataPath: 'period.days.6.info',
    type: 'string',
    description: 'Sunday info',
    sampleValue: 'Off',
  },

  // ===========================================================================
  // TEAM PERFORMANCE MODULE - Add-on
  // ===========================================================================
  
  // Performance Fields
  {
    tag: 'Current_Points',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.current_points',
    type: 'number',
    description: 'Current attendance points',
    sampleValue: '2',
    defaultValue: '0',
  },
  {
    tag: 'Current_Tier',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.tier',
    type: 'number',
    description: 'Tier number (1-3)',
    sampleValue: '1',
    defaultValue: '1',
  },
  {
    tag: 'Tier_Label',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.tier_label',
    type: 'string',
    description: 'Tier name',
    sampleValue: 'Priority',
    defaultValue: 'Priority',
  },
  {
    tag: 'Attend_Points_This_Week',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.points_this_week',
    type: 'number',
    description: 'Net points change this week',
    sampleValue: '0',
    defaultValue: '0',
  },
  {
    tag: 'Points_Gained_This_Week',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.points_gained_this_week',
    type: 'number',
    description: 'Points added this week (events)',
    sampleValue: '1',
    defaultValue: '0',
  },
  {
    tag: 'Points_Lost_This_Week',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.points_lost_this_week',
    type: 'number',
    description: 'Points reduced this week (credits)',
    sampleValue: '1',
    defaultValue: '0',
  },
  {
    tag: 'Total_Attendance_Points',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.points_this_period',
    type: 'number',
    description: 'Points this period',
    sampleValue: '2',
    defaultValue: '0',
  },
  {
    tag: 'Attend__Period',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.attendance_period_pct',
    type: 'percentage',
    description: 'Attendance % this period',
    sampleValue: '97.8',
    transform: 'percentage',
  },
  {
    tag: 'Attend__YTD',
    module: 'team_performance',
    subcategory: 'performance',
    dataPath: 'performance.attendance_ytd_pct',
    type: 'percentage',
    description: 'Attendance % year-to-date',
    sampleValue: '96.2',
    transform: 'percentage',
  },

  // Time Off Fields
  {
    tag: 'Avail_Sick_Days',
    module: 'team_performance',
    subcategory: 'time_off',
    dataPath: 'time_off.sick_days_available',
    type: 'number',
    description: 'Sick days available',
    sampleValue: '3',
    defaultValue: '3',
  },
  {
    tag: 'Sick_Used',
    module: 'team_performance',
    subcategory: 'time_off',
    dataPath: 'time_off.sick_days_used',
    type: 'number',
    description: 'Sick days used',
    sampleValue: '1',
    defaultValue: '0',
  },
  {
    tag: 'Sick_Remain',
    module: 'team_performance',
    subcategory: 'time_off',
    dataPath: 'time_off.sick_days_remaining',
    type: 'number',
    description: 'Sick days remaining',
    sampleValue: '2',
    defaultValue: '3',
  },
  {
    tag: 'Vacation_Hours_Benefit',
    module: 'team_performance',
    subcategory: 'time_off',
    dataPath: 'time_off.vacation_hours_benefit',
    type: 'number',
    description: 'Total vacation hours',
    sampleValue: '80',
    defaultValue: '0',
  },
  {
    tag: 'Vacation_Hours_Used',
    module: 'team_performance',
    subcategory: 'time_off',
    dataPath: 'time_off.vacation_hours_used',
    type: 'number',
    description: 'Vacation hours used',
    sampleValue: '24',
    defaultValue: '0',
  },
  {
    tag: 'Vacation_Hours_Remaining',
    module: 'team_performance',
    subcategory: 'time_off',
    dataPath: 'time_off.vacation_hours_remaining',
    type: 'number',
    description: 'Vacation hours left',
    sampleValue: '56',
    defaultValue: '0',
  },
  {
    tag: 'Status_Level',
    module: 'team_performance',
    subcategory: 'time_off',
    dataPath: 'time_off.seniority_status',
    type: 'string',
    description: 'Seniority status',
    sampleValue: 'Core Team',
    defaultValue: 'Standard',
  },

  // Cycle History Fields
  {
    tag: 'Current_Period_Label',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.current.label',
    type: 'string',
    description: 'Active cycle name',
    sampleValue: 'Jan-Apr 2026',
  },
  {
    tag: 'Current_Period_Late',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.current.late',
    type: 'number',
    description: 'Late count this cycle',
    sampleValue: '1',
    defaultValue: '0',
  },
  {
    tag: 'Current_Period_Absences',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.current.absences',
    type: 'number',
    description: 'Absences this cycle',
    sampleValue: '0',
    defaultValue: '0',
  },
  {
    tag: 'Current_Period_Points',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.current.points',
    type: 'number',
    description: 'Points this cycle',
    sampleValue: '2',
    defaultValue: '0',
  },
  {
    tag: 'Prev1_Period_Label',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev1.label',
    type: 'string',
    description: 'Previous cycle name',
    sampleValue: 'Sep-Dec 2025',
  },
  {
    tag: 'Prev1_Period_Late',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev1.late',
    type: 'number',
    description: 'Late count prev cycle',
    sampleValue: '1',
    defaultValue: '0',
  },
  {
    tag: 'Prev1_Period_Absences',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev1.absences',
    type: 'number',
    description: 'Absences prev cycle',
    sampleValue: '0',
    defaultValue: '0',
  },
  {
    tag: 'Prev1_Period_Points',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev1.points',
    type: 'number',
    description: 'Points prev cycle',
    sampleValue: '2',
    defaultValue: '0',
  },
  {
    tag: 'Prev2_Period_Label',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev2.label',
    type: 'string',
    description: '2 cycles ago name',
    sampleValue: 'May-Aug 2025',
  },
  {
    tag: 'Prev2_Period_Late',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev2.late',
    type: 'number',
    description: 'Late count 2 cycles ago',
    sampleValue: '2',
    defaultValue: '0',
  },
  {
    tag: 'Prev2_Period_Absences',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev2.absences',
    type: 'number',
    description: 'Absences 2 cycles ago',
    sampleValue: '1',
    defaultValue: '0',
  },
  {
    tag: 'Prev3_Period_Label',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev3.label',
    type: 'string',
    description: '3 cycles ago name',
    sampleValue: 'Jan-Apr 2025',
  },
  {
    tag: 'Prev3_Period_Late',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev3.late',
    type: 'number',
    description: 'Late count 3 cycles ago',
    sampleValue: '0',
    defaultValue: '0',
  },
  {
    tag: 'Prev3_Period_Absences',
    module: 'team_performance',
    subcategory: 'cycle_history',
    dataPath: 'periods.prev3.absences',
    type: 'number',
    description: 'Absences 3 cycles ago',
    sampleValue: '0',
    defaultValue: '0',
  },

  // ===========================================================================
  // NEXUS MODULE - Activity Tracking (Future)
  // ===========================================================================
  
  {
    tag: 'Last_Login',
    module: 'nexus',
    subcategory: 'activity',
    dataPath: 'activity.last_login',
    type: 'date',
    description: 'Last login date',
    sampleValue: 'Jan 5, 2026',
  },
  {
    tag: 'Days_Since_Login',
    module: 'nexus',
    subcategory: 'activity',
    dataPath: 'activity.days_since_login',
    type: 'number',
    description: 'Days since last login',
    sampleValue: '2',
    defaultValue: '0',
  },
  {
    tag: 'Recent_Activity_Count',
    module: 'nexus',
    subcategory: 'activity',
    dataPath: 'activity.recent_count',
    type: 'number',
    description: 'Actions this week',
    sampleValue: '12',
    defaultValue: '0',
  },

  // ===========================================================================
  // RECIPE MANAGER MODULE (Future - Placeholder)
  // ===========================================================================
  
  // Fields to be added when module is built

  // ===========================================================================
  // TASK MANAGER MODULE (Future - Placeholder)
  // ===========================================================================
  
  // Fields to be added when module is built

  // ===========================================================================
  // HACCP MODULE (Future - Placeholder)
  // ===========================================================================
  
  // Fields to be added when module is built
];

// =============================================================================
// HELPER FUNCTIONS - MODULE-BASED
// =============================================================================

/**
 * Get module definition by ID
 */
export function getModuleDefinition(moduleId: ModuleId): ModuleDefinition | undefined {
  return MODULE_DEFINITIONS.find(m => m.id === moduleId);
}

/**
 * Get all fields for a module
 */
export function getFieldsByModule(moduleId: ModuleId): FieldDefinition[] {
  return FIELD_REGISTRY.filter(f => f.module === moduleId);
}

/**
 * Get fields for multiple modules (for enabled modules filtering)
 */
export function getFieldsForModules(moduleIds: ModuleId[]): FieldDefinition[] {
  return FIELD_REGISTRY.filter(f => moduleIds.includes(f.module));
}

/**
 * Get fields grouped by module
 */
export function getFieldsGroupedByModule(): Map<ModuleId, FieldDefinition[]> {
  const grouped = new Map<ModuleId, FieldDefinition[]>();
  
  for (const field of FIELD_REGISTRY) {
    const existing = grouped.get(field.module) || [];
    existing.push(field);
    grouped.set(field.module, existing);
  }
  
  return grouped;
}

/**
 * Get modules that have fields (not empty placeholders)
 */
export function getModulesWithFields(): ModuleDefinition[] {
  const modulesWithFields = new Set<ModuleId>();
  
  for (const field of FIELD_REGISTRY) {
    modulesWithFields.add(field.module);
  }
  
  return MODULE_DEFINITIONS.filter(m => modulesWithFields.has(m.id));
}

/**
 * Check if a module is enabled for an organization
 * Pass the org's modules object from database
 */
export function isModuleEnabled(moduleId: ModuleId, orgModules: Record<string, any> | null): boolean {
  const moduleDef = getModuleDefinition(moduleId);
  
  // Core modules always enabled
  if (moduleDef?.isCore) return true;
  
  // Check database key if exists
  if (moduleDef?.dbKey && orgModules) {
    return orgModules[moduleDef.dbKey]?.enabled === true;
  }
  
  return false;
}

/**
 * Get enabled modules for an organization
 */
export function getEnabledModules(orgModules: Record<string, any> | null): ModuleId[] {
  return MODULE_DEFINITIONS
    .filter(m => isModuleEnabled(m.id, orgModules))
    .map(m => m.id);
}

/**
 * Get field count per module
 */
export function getFieldCountByModule(): Record<ModuleId, number> {
  const counts: Partial<Record<ModuleId, number>> = {};
  
  for (const field of FIELD_REGISTRY) {
    counts[field.module] = (counts[field.module] || 0) + 1;
  }
  
  return counts as Record<ModuleId, number>;
}

// =============================================================================
// HELPER FUNCTIONS - LEGACY (for backwards compatibility)
// =============================================================================

/**
 * Get all fields in a category (legacy - use getFieldsByModule instead)
 * @deprecated Use getFieldsByModule or filter by subcategory
 */
export function getFieldsByCategory(category: FieldSubcategory): FieldDefinition[] {
  return FIELD_REGISTRY.filter(f => f.subcategory === category);
}

/**
 * Get a field by its tag
 */
export function getFieldByTag(tag: string): FieldDefinition | undefined {
  // Strip delimiters if present
  const cleanTag = tag.replace(/[«»{}]/g, '').trim();
  return FIELD_REGISTRY.find(f => f.tag === cleanTag);
}

/**
 * Get the data path for a tag
 */
export function getDataPath(tag: string): string | undefined {
  const field = getFieldByTag(tag);
  return field?.dataPath;
}

/**
 * Get category definition (legacy)
 */
export function getCategory(id: FieldSubcategory): CategoryDefinition | undefined {
  return FIELD_CATEGORIES.find(c => c.id === id);
}

/**
 * Build a tag-to-path map for the merge engine
 */
export function buildFieldMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of FIELD_REGISTRY) {
    map[field.tag] = field.dataPath;
  }
  return map;
}

/**
 * Get all field tags
 */
export function getAllTags(): string[] {
  return FIELD_REGISTRY.map(f => f.tag);
}

/**
 * Check if a tag is registered
 */
export function isRegisteredTag(tag: string): boolean {
  return getFieldByTag(tag) !== undefined;
}

/**
 * Get sample value for a tag
 */
export function getSampleValue(tag: string): string {
  const field = getFieldByTag(tag);
  return field?.sampleValue ?? '';
}

/**
 * Get default value for a tag
 */
export function getDefaultValue(tag: string): string {
  const field = getFieldByTag(tag);
  return field?.defaultValue ?? '';
}

/**
 * Detect unregistered fields in a template
 */
export function detectUnregisteredFields(template: string): string[] {
  const pattern = /«([^»]+)»/g;
  const unregistered: string[] = [];
  let match;
  
  while ((match = pattern.exec(template)) !== null) {
    const tag = match[1].trim();
    if (!isRegisteredTag(tag) && !unregistered.includes(tag)) {
      unregistered.push(tag);
    }
  }
  
  return unregistered;
}

/**
 * Detect fields used in a template, grouped by module
 */
export function detectFieldsByModule(template: string): Map<ModuleId, string[]> {
  const pattern = /«([^»]+)»/g;
  const byModule = new Map<ModuleId, string[]>();
  let match;
  
  while ((match = pattern.exec(template)) !== null) {
    const tag = match[1].trim();
    const field = getFieldByTag(tag);
    
    if (field) {
      const existing = byModule.get(field.module) || [];
      if (!existing.includes(tag)) {
        existing.push(tag);
        byModule.set(field.module, existing);
      }
    }
  }
  
  return byModule;
}

/**
 * Generate sample context from registry
 */
export function generateSampleContext(): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  
  for (const field of FIELD_REGISTRY) {
    const parts = field.dataPath.split('.');
    let current = context;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      // Handle array notation like "days.0.date"
      if (!isNaN(Number(parts[i + 1]))) {
        if (!current[part]) current[part] = [];
        current = current[part] as Record<string, unknown>;
      } else {
        if (!current[part]) current[part] = {};
        current = current[part] as Record<string, unknown>;
      }
    }
    
    const lastPart = parts[parts.length - 1];
    current[lastPart] = field.sampleValue;
  }
  
  return context;
}

/**
 * Search fields by tag or description
 */
export function searchFields(query: string, moduleIds?: ModuleId[]): FieldDefinition[] {
  const lowerQuery = query.toLowerCase();
  
  return FIELD_REGISTRY.filter(f => {
    // Filter by modules if specified
    if (moduleIds && !moduleIds.includes(f.module)) {
      return false;
    }
    
    // Search in tag and description
    return (
      f.tag.toLowerCase().includes(lowerQuery) ||
      f.description.toLowerCase().includes(lowerQuery)
    );
  });
}
