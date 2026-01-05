/**
 * ActionLegend - Expandable help panel explaining icons and actions
 * 
 * Reusable across Points, Team, and Import tabs to reduce training burden.
 * Shows different legend items based on the context.
 * 
 * Uses L5 expandable-info-section pattern from index.css
 */

import React, { useState } from 'react';
import {
  ChevronUp,
  HelpCircle,
  // Status icons
  AlertTriangle,
  CheckCircle,
  Clock,
  Flag,
  // Action icons
  Pencil,
  Shield,
  Trash2,
  Check,
  X,
  Send,
  // Event icons
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type LegendContext = 'points' | 'team' | 'import';

interface LegendItem {
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface LegendSection {
  title: string;
  items: LegendItem[];
}

// =============================================================================
// LEGEND DATA
// =============================================================================

const STATUS_ICONS: LegendItem[] = [
  {
    icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
    label: 'Demerit Event',
    description: 'Points added for attendance or policy issues',
  },
  {
    icon: <CheckCircle className="w-4 h-4 text-green-400" />,
    label: 'Merit Reduction',
    description: 'Points reduced for positive contributions',
  },
  {
    icon: <Flag className="w-4 h-4 text-amber-400" />,
    label: 'Possible Duplicate',
    description: 'Same event type on same date — review for accuracy',
  },
  {
    icon: <Clock className="w-4 h-4 text-gray-400" />,
    label: 'Pending Review',
    description: 'Awaiting manager approval or rejection',
  },
];

const MANAGER_ACTIONS: LegendItem[] = [
  {
    icon: <Pencil className="w-4 h-4 text-primary-400" />,
    label: 'Reclassify',
    description: 'Change the event type (e.g., major tardy → minor tardy)',
  },
  {
    icon: <Shield className="w-4 h-4 text-amber-400" />,
    label: 'Excuse',
    description: 'Remove with a logged reason (sick, approved, challenge accepted)',
  },
  {
    icon: <Trash2 className="w-4 h-4 text-rose-400" />,
    label: 'Remove',
    description: 'Delete entry permanently (for data errors)',
  },
];

const STAGED_ACTIONS: LegendItem[] = [
  {
    icon: <Check className="w-4 h-4 text-emerald-400" />,
    label: 'Approve',
    description: 'Accept the event and apply points to the team member',
  },
  {
    icon: <Shield className="w-4 h-4 text-amber-400" />,
    label: 'Excuse',
    description: 'Dismiss with a reason — no points applied',
  },
  {
    icon: <X className="w-4 h-4 text-rose-400" />,
    label: 'Reject',
    description: 'Dismiss without a reason — no points applied',
  },
];

const IMPORT_ICONS: LegendItem[] = [
  {
    icon: <TrendingUp className="w-4 h-4 text-rose-400" />,
    label: 'Point Event',
    description: 'Detected issue that would add points',
  },
  {
    icon: <TrendingDown className="w-4 h-4 text-emerald-400" />,
    label: 'Point Reduction',
    description: 'Positive action that would reduce points',
  },
  {
    icon: <Send className="w-4 h-4 text-primary-400" />,
    label: 'Send to Team',
    description: 'Stage approved events for final review in Team tab',
  },
];

// =============================================================================
// HELPER: BUILD SECTIONS BY CONTEXT
// =============================================================================

function getSectionsForContext(context: LegendContext): LegendSection[] {
  switch (context) {
    case 'points':
      return [
        { title: 'Entry Types', items: STATUS_ICONS.slice(0, 3) },
        { title: 'Manager Actions', items: MANAGER_ACTIONS },
      ];
    
    case 'team':
      return [
        { title: 'Status Icons', items: [STATUS_ICONS[3], STATUS_ICONS[2]] },
        { title: 'Review Actions', items: STAGED_ACTIONS },
      ];
    
    case 'import':
      return [
        { title: 'Event Types', items: IMPORT_ICONS.slice(0, 2) },
        { title: 'Workflow Actions', items: [...STAGED_ACTIONS.slice(0, 2), IMPORT_ICONS[2]] },
      ];
    
    default:
      return [];
  }
}

function getContextTitle(context: LegendContext): string {
  switch (context) {
    case 'points': return 'Point Ledger Guide';
    case 'team': return 'Staged Events Guide';
    case 'import': return 'Import Review Guide';
    default: return 'Quick Reference';
  }
}

function getContextDescription(context: LegendContext): string {
  switch (context) {
    case 'points': 
      return 'Review and manage point events. Managers can reclassify, excuse, or remove entries. All changes are logged for audit purposes.';
    case 'team': 
      return 'Review staged events before they affect team member points. Approve to apply, excuse with a reason, or reject to dismiss.';
    case 'import': 
      return 'Review detected events from CSV import. Stage events for approval, then send to Team tab for final review.';
    default: 
      return '';
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

interface ActionLegendProps {
  context: LegendContext;
  defaultExpanded?: boolean;
}

export const ActionLegend: React.FC<ActionLegendProps> = ({ 
  context, 
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const sections = getSectionsForContext(context);
  const title = getContextTitle(context);
  const description = getContextDescription(context);

  return (
    <div className={`expandable-info-section ${isExpanded ? 'expanded' : ''}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="expandable-info-header"
      >
        <HelpCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium text-primary-300">{title}</span>
          {!isExpanded && (
            <span className="text-xs text-gray-500 ml-2">Click to expand</span>
          )}
        </div>
        <ChevronUp className="w-4 h-4 text-gray-500" />
      </button>

      {/* Expanded Content */}
      <div className="expandable-info-content">
        <div className="px-4 pb-4">
          {/* Description */}
          <p className="text-sm text-gray-400 mb-4">
            {description}
          </p>

          {/* Legend Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  {section.title}
                </h4>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white">{item.label}</span>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Audit Note - for points and team contexts */}
          {(context === 'points' || context === 'team') && (
            <div className="mt-4 pt-4 border-t border-primary-800/30">
              <p className="text-xs text-gray-500">
                <span className="text-primary-400 font-medium">Audit Trail:</span> All actions are logged to NEXUS for compliance and can be reviewed in Reports.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionLegend;
