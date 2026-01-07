/**
 * MergeFieldsReference - Available Merge Fields for Email Templates
 * 
 * Click-to-copy field tags organized by category.
 * Shows sample values so users know what data looks like.
 */

import React, { useState } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";

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

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    id: 'recipient',
    label: 'Recipient',
    icon: User,
    color: 'text-sky-400',
    fields: [
      { tag: 'First_Name', description: 'First name', sample: 'Jane' },
      { tag: 'Last_Name', description: 'Last name', sample: 'Smith' },
      { tag: 'Email', description: 'Email address', sample: 'jane@example.com' },
      { tag: 'Hire_Date', description: 'Hire date', sample: '2023-06-15' },
      { tag: 'Position', description: 'Job position', sample: 'Line Cook' },
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
      { tag: 'Attend_Points_This_Week', description: 'Points added this week', sample: '1' },
      { tag: 'Total_Attendance_Points', description: 'Points this period', sample: '2' },
      { tag: 'Attend__Period', description: 'Attendance % this period', sample: '96.5' },
      { tag: 'Attend__YTD', description: 'Attendance % year-to-date', sample: '94.2' },
    ],
  },
  {
    id: 'history',
    label: 'Period History',
    icon: History,
    color: 'text-violet-400',
    fields: [
      { tag: 'Current_Period_Label', description: 'Active period name', sample: 'Winter/Spring 2026' },
      { tag: 'Current_Period_Late', description: 'Late count this period', sample: '1' },
      { tag: 'Current_Period_Absences', description: 'Absences this period', sample: '0' },
      { tag: 'Current_Period_Points', description: 'Points this period', sample: '2' },
      { tag: 'Prev1_Period_Label', description: 'Previous period name', sample: 'Fall/Winter 2025' },
      { tag: 'Prev1_Period_Late', description: 'Late count prev period', sample: '1' },
      { tag: 'Prev1_Period_Absences', description: 'Absences prev period', sample: '0' },
      { tag: 'Prev1_Period_Points', description: 'Points prev period', sample: '3' },
      { tag: 'Prev2_Period_Label', description: '2 periods ago name', sample: 'Spring/Summer 2025' },
      { tag: 'Prev2_Period_Late', description: 'Late count 2 periods ago', sample: '2' },
      { tag: 'Prev2_Period_Absences', description: 'Absences 2 periods ago', sample: '1' },
      { tag: 'Prev3_Period_Label', description: '3 periods ago name', sample: 'Winter/Spring 2025' },
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
      { tag: 'Vacation_Hours_Used', description: 'Vacation hours used', sample: '16' },
      { tag: 'Vacation_Hours_Remaining', description: 'Vacation hours left', sample: '64' },
      { tag: 'Status_Level', description: 'Seniority status', sample: 'Standard' },
    ],
  },
  {
    id: 'period',
    label: 'Reporting Period',
    icon: Calendar,
    color: 'text-purple-400',
    fields: [
      { tag: 'Reporting_Start', description: 'Period start date', sample: '2026-01-06' },
      { tag: 'Reporting_End', description: 'Period end date', sample: '2026-01-12' },
      { tag: 'Week_Label', description: 'Week description', sample: 'Week of January 6, 2026' },
      { tag: 'Period_Label', description: 'Period name', sample: 'Winter/Spring 2026' },
      { tag: 'Day_1', description: 'Monday date', sample: '2026-01-06' },
      { tag: 'Day_1_Info', description: 'Monday info', sample: 'Worked 8hrs' },
      { tag: 'Day_2', description: 'Tuesday date', sample: '2026-01-07' },
      { tag: 'Day_2_Info', description: 'Tuesday info', sample: 'Worked 8hrs' },
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['recipient']) // Start with recipient expanded
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  return (
    <div className="space-y-2">
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
                    <span className="text-xs text-gray-600 truncate max-w-[80px]" title={field.sample}>
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
