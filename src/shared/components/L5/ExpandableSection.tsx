import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

/**
 * =============================================================================
 * EXPANDABLE SECTION - Collapsible Content Panel
 * =============================================================================
 * A reusable section component with:
 * - Icon + title header
 * - Collapsible content
 * - Optional help tooltip
 * - L5 styling with subtle content tint
 * 
 * Usage:
 *   <ExpandableSection
 *     icon={DollarSign}
 *     iconColor="text-green-400"
 *     iconBg="bg-green-500/20"
 *     title="Purchase Information"
 *     subtitle="Invoice details and pricing"
 *     helpText="Enter purchase details as they appear on your invoice."
 *   >
 *     <Field label="Price">...</Field>
 *   </ExpandableSection>
 * =============================================================================
 */

interface ExpandableSectionProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  helpText?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  helpText,
  defaultExpanded = true,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-[#1a1f2b] rounded-lg shadow-lg">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors text-left rounded-t-lg"
      >
        <div
          className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-300">{title}</h2>
            <span className="text-xs text-gray-500">{subtitle}</span>
          </div>
        </div>
        {helpText && (
          <div
            className="group relative"
            onClick={(e) => e.stopPropagation()}
          >
            <HelpCircle className="w-4 h-4 text-gray-600 hover:text-gray-400 transition-colors" />
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 border border-gray-700">
              <p className="text-xs text-gray-300 leading-relaxed">{helpText}</p>
            </div>
          </div>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Section Content - with border separator and subtle tint like header */}
      {isExpanded && (
        <div className="border-t border-gray-700/50">
          <div className="px-4 py-4 bg-primary-800/10 rounded-b-lg">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandableSection;
