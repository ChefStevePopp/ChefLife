/**
 * ModuleMergeFields - Display Available Merge Fields for a Module
 * 
 * L5 Design: Self-documenting module capabilities
 * 
 * Drop this component into any module's config/settings page
 * to show users what merge fields are available from that module.
 * 
 * Usage:
 * ```tsx
 * <ModuleMergeFields moduleId="team_performance" />
 * ```
 */

import React, { useState, useMemo } from "react";
import {
  Mail,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Info,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getFieldsByModule,
  getModuleDefinition,
  type ModuleId,
  type FieldDefinition,
} from "@/lib/communications/fieldRegistry";

// =============================================================================
// TYPES
// =============================================================================

interface ModuleMergeFieldsProps {
  moduleId: ModuleId;
  /** Show as expanded by default */
  defaultExpanded?: boolean;
  /** Custom title override */
  title?: string;
  /** Show search bar */
  showSearch?: boolean;
  /** Compact mode - less padding */
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ModuleMergeFields: React.FC<ModuleMergeFieldsProps> = ({
  moduleId,
  defaultExpanded = false,
  title,
  showSearch = true,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Get module info and fields
  const moduleInfo = useMemo(() => getModuleDefinition(moduleId), [moduleId]);
  const allFields = useMemo(() => getFieldsByModule(moduleId), [moduleId]);

  // Filter fields by search
  const fields = useMemo(() => {
    if (!searchQuery.trim()) return allFields;
    
    const lower = searchQuery.toLowerCase();
    return allFields.filter(f => 
      f.tag.toLowerCase().includes(lower) ||
      f.description.toLowerCase().includes(lower)
    );
  }, [allFields, searchQuery]);

  // Group fields by subcategory
  const groupedFields = useMemo(() => {
    const groups = new Map<string, FieldDefinition[]>();
    
    for (const field of fields) {
      const subcat = field.subcategory || 'general';
      const existing = groups.get(subcat) || [];
      existing.push(field);
      groups.set(subcat, existing);
    }
    
    return groups;
  }, [fields]);

  // Copy field tag
  const handleCopyField = async (tag: string) => {
    const fieldTag = `«${tag}»`;
    
    try {
      await navigator.clipboard.writeText(fieldTag);
      setCopiedField(tag);
      toast.success(`Copied ${fieldTag}`, { duration: 1500 });
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  // Render a single field row
  const renderField = (field: FieldDefinition) => (
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
      <span className="text-xs text-gray-600 truncate max-w-[80px]" title={field.sampleValue}>
        {field.sampleValue}
      </span>
      {copiedField === field.tag ? (
        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </button>
  );

  const displayTitle = title || `Available Merge Fields`;

  if (allFields.length === 0) {
    return null; // Don't show if no fields
  }

  return (
    <div className={`expandable-info-section ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="expandable-info-header w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-300">{displayTitle}</span>
          <span className="text-xs text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
            {allFields.length}
          </span>
        </div>
        <ChevronUp className="w-4 h-4 text-gray-500" />
      </button>

      {/* Content */}
      <div className="expandable-info-content">
        <div className={compact ? 'p-3 pt-2' : 'p-4 pt-2'}>
          {/* Info text */}
          <p className="text-xs text-gray-500 mb-3">
            These fields can be used in email templates via the{' '}
            <span className="text-primary-400">Communications</span> module. 
            Click to copy, then paste into your template HTML.
          </p>

          {/* Search (if enabled) */}
          {showSearch && allFields.length > 5 && (
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fields..."
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Fields */}
          {fields.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              No fields match "{searchQuery}"
            </p>
          ) : groupedFields.size === 1 ? (
            // Single group - no headers needed
            <div className="space-y-1">
              {fields.map(field => renderField(field))}
            </div>
          ) : (
            // Multiple groups - show subcategory headers
            <div className="space-y-3">
              {Array.from(groupedFields.entries()).map(([subcat, subcatFields]) => (
                <div key={subcat}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider px-2 pb-1 border-b border-gray-700/30">
                    {subcat.replace(/_/g, ' ')}
                  </p>
                  <div className="space-y-1 mt-1">
                    {subcatFields.map(field => renderField(field))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-gray-700/30 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {fields.length} field{fields.length !== 1 ? 's' : ''} available
            </span>
            <a 
              href="/admin/modules/communications/templates"
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Manage Templates →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleMergeFields;
