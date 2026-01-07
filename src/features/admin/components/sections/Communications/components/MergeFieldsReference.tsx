/**
 * MergeFieldsReference - Available Merge Fields for Email Templates
 * 
 * L5 Design: Click-to-copy field tags organized by category
 * Shows professional sample values that demonstrate real data patterns.
 * 
 * Includes editable Period Labels for when auto-calculation needs override.
 */

import React, { useState, useEffect } from "react";
import {
  User,
  TrendingUp,
  Calendar,
  Building2,
  Thermometer,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  History,
  Settings,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// =============================================================================
// PERIOD LABEL UTILITIES
// =============================================================================

/**
 * Calculate period labels based on current date
 * Periods are 4-month cycles:
 *   - Jan-Apr: Winter/Spring
 *   - May-Aug: Summer
 *   - Sep-Dec: Fall/Winter
 */
function calculatePeriodLabels(): { current: string; prev1: string; prev2: string; prev3: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // Determine current period
  let currentPeriod: number;
  let currentYear = year;
  
  if (month >= 1 && month <= 4) {
    currentPeriod = 1; // Winter/Spring
  } else if (month >= 5 && month <= 8) {
    currentPeriod = 2; // Summer
  } else {
    currentPeriod = 3; // Fall/Winter
  }
  
  // Generate labels going backwards
  const labels: string[] = [];
  let period = currentPeriod;
  let labelYear = currentYear;
  
  for (let i = 0; i < 4; i++) {
    labels.push(getPeriodName(period, labelYear));
    period--;
    if (period < 1) {
      period = 3;
      labelYear--;
    }
  }
  
  return {
    current: labels[0],
    prev1: labels[1],
    prev2: labels[2],
    prev3: labels[3],
  };
}

function getPeriodName(period: number, year: number): string {
  switch (period) {
    case 1: return `Winter/Spring ${year}`;
    case 2: return `Summer ${year}`;
    case 3: return `Fall/Winter ${year}`;
    default: return `Period ${period} ${year}`;
  }
}

// =============================================================================
// FIELD DEFINITIONS
// =============================================================================

interface MergeField {
  tag: string;
  description: string;
  sample: string;
}

interface FieldCategory {
  id: string;
  label: string;
  icon: typeof User;
  color: string;
  fields: MergeField[];
}

// Dynamic period labels - will be updated by component state
const getFieldCategories = (periodLabels: { current: string; prev1: string; prev2: string; prev3: string }): FieldCategory[] => [
  {
    id: 'recipient',
    label: 'Recipient',
    icon: User,
    color: 'text-sky-400',
    fields: [
      { tag: 'First_Name', description: 'First name', sample: 'Marcus' },
      { tag: 'Last_Name', description: 'Last name', sample: 'Chen' },
      { tag: 'Email', description: 'Email address', sample: 'marcus.chen@gmail.com' },
      { tag: 'Hire_Date', description: 'Hire date', sample: 'Mar 15, 2023' },
      { tag: 'Position', description: 'Job position', sample: 'Grill Lead' },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: TrendingUp,
    color: 'text-amber-400',
    fields: [
      { tag: 'Current_Points', description: 'Current attendance points', sample: '2' },
      { tag: 'Current_Tier', description: 'Tier number (1-3)', sample: '1' },
      { tag: 'Tier_Label', description: 'Tier name', sample: 'Priority' },
      { tag: 'Attend_Points_This_Week', description: 'Points added this week', sample: '0' },
      { tag: 'Total_Attendance_Points', description: 'Points this period', sample: '2' },
      { tag: 'Attend__Period', description: 'Attendance % this period', sample: '97.8' },
      { tag: 'Attend__YTD', description: 'Attendance % year-to-date', sample: '96.2' },
    ],
  },
  {
    id: 'history',
    label: 'Period History',
    icon: History,
    color: 'text-violet-400',
    fields: [
      { tag: 'Current_Period_Label', description: 'Active period name', sample: periodLabels.current },
      { tag: 'Current_Period_Late', description: 'Late count this period', sample: '1' },
      { tag: 'Current_Period_Absences', description: 'Absences this period', sample: '0' },
      { tag: 'Current_Period_Points', description: 'Points this period', sample: '2' },
      { tag: 'Prev1_Period_Label', description: 'Previous period name', sample: periodLabels.prev1 },
      { tag: 'Prev1_Period_Late', description: 'Late count prev period', sample: '1' },
      { tag: 'Prev1_Period_Absences', description: 'Absences prev period', sample: '0' },
      { tag: 'Prev1_Period_Points', description: 'Points prev period', sample: '2' },
      { tag: 'Prev2_Period_Label', description: '2 periods ago name', sample: periodLabels.prev2 },
      { tag: 'Prev2_Period_Late', description: 'Late count 2 periods ago', sample: '2' },
      { tag: 'Prev2_Period_Absences', description: 'Absences 2 periods ago', sample: '1' },
      { tag: 'Prev3_Period_Label', description: '3 periods ago name', sample: periodLabels.prev3 },
      { tag: 'Prev3_Period_Late', description: 'Late count 3 periods ago', sample: '0' },
      { tag: 'Prev3_Period_Absences', description: 'Absences 3 periods ago', sample: '0' },
    ],
  },
  {
    id: 'time_off',
    label: 'Time Off',
    icon: Thermometer,
    color: 'text-rose-400',
    fields: [
      { tag: 'Avail_Sick_Days', description: 'Sick days available', sample: '3' },
      { tag: 'Sick_Used', description: 'Sick days used', sample: '1' },
      { tag: 'Sick_Remain', description: 'Sick days remaining', sample: '2' },
      { tag: 'Vacation_Hours_Benefit', description: 'Total vacation hours', sample: '80' },
      { tag: 'Vacation_Hours_Used', description: 'Vacation hours used', sample: '24' },
      { tag: 'Vacation_Hours_Remaining', description: 'Vacation hours left', sample: '56' },
      { tag: 'Status_Level', description: 'Seniority status', sample: 'Core Team' },
    ],
  },
  {
    id: 'period',
    label: 'Reporting Period',
    icon: Calendar,
    color: 'text-purple-400',
    fields: [
      { tag: 'Reporting_Start', description: 'Period start date', sample: 'Jan 6, 2026' },
      { tag: 'Reporting_End', description: 'Period end date', sample: 'Jan 12, 2026' },
      { tag: 'Week_Label', description: 'Week description', sample: 'Week of January 6, 2026' },
      { tag: 'Period_Label', description: 'Period name', sample: periodLabels.current },
      { tag: 'Day_1', description: 'Monday date', sample: 'Mon Jan 6' },
      { tag: 'Day_1_Info', description: 'Monday info', sample: '4pm-10pm' },
      { tag: 'Day_2', description: 'Tuesday date', sample: 'Tue Jan 7' },
      { tag: 'Day_2_Info', description: 'Tuesday info', sample: 'Off' },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    color: 'text-emerald-400',
    fields: [
      { tag: 'Org_Name', description: 'Organization name', sample: 'Memphis Fire BBQ' },
      { tag: 'Company_Name', description: 'Company name (alias)', sample: 'Memphis Fire BBQ' },
    ],
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

interface MergeFieldsReferenceProps {
  onInsertField?: (tag: string) => void;
}

export const MergeFieldsReference: React.FC<MergeFieldsReferenceProps> = ({ 
  onInsertField 
}) => {
  // Period labels with auto-calculation and override capability
  const [periodLabels, setPeriodLabels] = useState(calculatePeriodLabels);
  const [showPeriodSettings, setShowPeriodSettings] = useState(false);
  const [editingLabels, setEditingLabels] = useState(periodLabels);
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['recipient']) // Start with recipient expanded
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Get categories with current period labels
  const FIELD_CATEGORIES = getFieldCategories(periodLabels);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCopyField = async (tag: string) => {
    const fieldTag = `«${tag}»`;
    
    try {
      await navigator.clipboard.writeText(fieldTag);
      setCopiedField(tag);
      toast.success(`Copied ${fieldTag}`, { duration: 1500 });
      
      // Also call the insert callback if provided
      onInsertField?.(fieldTag);
      
      // Reset copied state after animation
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleResetPeriodLabels = () => {
    const calculated = calculatePeriodLabels();
    setEditingLabels(calculated);
    setPeriodLabels(calculated);
    toast.success('Period labels reset to auto-calculated values');
  };

  const handleApplyPeriodLabels = () => {
    setPeriodLabels(editingLabels);
    setShowPeriodSettings(false);
    toast.success('Period labels updated');
  };

  return (
    <div className="space-y-2">
      {/* Period Labels Settings */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
        <button
          onClick={() => setShowPeriodSettings(!showPeriodSettings)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/30 transition-colors"
        >
          {showPeriodSettings ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <Settings className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-gray-300">Period Labels</span>
          <span className="text-xs text-gray-500 ml-auto">Override</span>
        </button>

        {showPeriodSettings && (
          <div className="px-3 pb-3 space-y-2">
            <p className="text-xs text-gray-500 mb-2">
              Override auto-calculated period labels if needed.
            </p>
            
            {/* Current Period */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Current Period</label>
              <input
                type="text"
                value={editingLabels.current}
                onChange={(e) => setEditingLabels(prev => ({ ...prev, current: e.target.value }))}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1.5 text-xs text-white"
              />
            </div>
            
            {/* Previous 1 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Previous Period (Prev1)</label>
              <input
                type="text"
                value={editingLabels.prev1}
                onChange={(e) => setEditingLabels(prev => ({ ...prev, prev1: e.target.value }))}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1.5 text-xs text-white"
              />
            </div>
            
            {/* Previous 2 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">2 Periods Ago (Prev2)</label>
              <input
                type="text"
                value={editingLabels.prev2}
                onChange={(e) => setEditingLabels(prev => ({ ...prev, prev2: e.target.value }))}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1.5 text-xs text-white"
              />
            </div>
            
            {/* Previous 3 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">3 Periods Ago (Prev3)</label>
              <input
                type="text"
                value={editingLabels.prev3}
                onChange={(e) => setEditingLabels(prev => ({ ...prev, prev3: e.target.value }))}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded px-2 py-1.5 text-xs text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleResetPeriodLabels}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Auto-Calculate
              </button>
              <button
                onClick={handleApplyPeriodLabels}
                className="flex items-center gap-1 px-3 py-1 rounded text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors ml-auto"
              >
                <Check className="w-3 h-3" />
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Field Categories */}
      {FIELD_CATEGORIES.map(category => {
        const Icon = category.icon;
        const isExpanded = expandedCategories.has(category.id);
        
        return (
          <div 
            key={category.id}
            className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/30 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <Icon className={`w-4 h-4 ${category.color}`} />
              <span className="text-sm font-medium text-gray-300">{category.label}</span>
              <span className="text-xs text-gray-500 ml-auto">{category.fields.length}</span>
            </button>

            {/* Fields List */}
            {isExpanded && (
              <div className="px-2 pb-2 space-y-1">
                {category.fields.map(field => (
                  <button
                    key={field.tag}
                    onClick={() => handleCopyField(field.tag)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 transition-colors group text-left"
                  >
                    <code className="text-xs text-amber-400 font-mono bg-gray-900/50 px-1.5 py-0.5 rounded flex-shrink-0">
                      «{field.tag}»
                    </code>
                    <span className="text-xs text-gray-500 truncate flex-1">
                      {field.description}
                    </span>
                    <span className="text-xs text-gray-600 truncate max-w-[100px]" title={field.sample}>
                      {field.sample}
                    </span>
                    {copiedField === field.tag ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Tip */}
      <p className="text-xs text-gray-500 px-1">
        Click any field to copy. Paste into your HTML where you want the data to appear.
      </p>
    </div>
  );
};

export default MergeFieldsReference;
