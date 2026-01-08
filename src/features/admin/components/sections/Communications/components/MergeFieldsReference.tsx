/**
 * MergeFieldsReference - Module-Based Merge Fields for Email Templates
 * 
 * L5 Architecture: 
 * - Fields grouped by ChefLife module
 * - Auto-discovers enabled modules
 * - Search across all fields
 * - Uses expandable-info-section styling
 * 
 * Click-to-copy field tags organized by module.
 */

import React, { useState, useMemo } from "react";
import {
  User,
  TrendingUp,
  Calendar,
  Building2,
  Thermometer,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Activity,
  ChefHat,
  ClipboardCheck,
  Search,
  X,
  Lock,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  FIELD_REGISTRY,
  MODULE_DEFINITIONS,
  getFieldsByModule,
  getModulesWithFields,
  isModuleEnabled,
  getFieldCountByModule,
  searchFields,
  type FieldDefinition,
  type ModuleId,
} from "@/lib/communications/fieldRegistry";

// =============================================================================
// ICON MAP
// =============================================================================

const ICON_MAP: Record<string, typeof User> = {
  User,
  TrendingUp,
  Calendar,
  Building2,
  Thermometer,
  Activity,
  ChefHat,
  ClipboardCheck,
};

// =============================================================================
// COMPONENT
// =============================================================================

interface MergeFieldsReferenceProps {
  onInsertField?: (tag: string) => void;
  orgModules?: Record<string, any> | null; // Pass from parent or fetch
}

export const MergeFieldsReference: React.FC<MergeFieldsReferenceProps> = ({ 
  onInsertField,
  orgModules: propOrgModules,
}) => {
  const { organizationId } = useAuth();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<ModuleId>>(
    new Set(['core']) // Core expanded by default
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Use passed modules or default to showing all
  const orgModules = propOrgModules ?? null;

  // Get modules that have fields and their enabled status
  const modulesWithFields = useMemo(() => {
    const modules = getModulesWithFields();
    const fieldCounts = getFieldCountByModule();
    
    return modules.map(mod => ({
      ...mod,
      icon: ICON_MAP[mod.icon] || User,
      fieldCount: fieldCounts[mod.id] || 0,
      isEnabled: isModuleEnabled(mod.id, orgModules),
      fields: getFieldsByModule(mod.id),
    }));
  }, [orgModules]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const enabledModuleIds = modulesWithFields
      .filter(m => m.isEnabled)
      .map(m => m.id);
    
    return searchFields(searchQuery, enabledModuleIds);
  }, [searchQuery, modulesWithFields]);

  // Toggle module expansion
  const toggleModule = (moduleId: ModuleId) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Copy field tag
  const handleCopyField = async (tag: string) => {
    const fieldTag = `«${tag}»`;
    
    try {
      await navigator.clipboard.writeText(fieldTag);
      setCopiedField(tag);
      toast.success(`Copied ${fieldTag}`, { duration: 1500 });
      
      onInsertField?.(fieldTag);
      
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  // Render a field row
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

  // Count enabled fields
  const enabledFieldCount = modulesWithFields
    .filter(m => m.isEnabled)
    .reduce((sum, m) => sum + m.fieldCount, 0);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-white">Merge Fields</span>
      </div>
      
      <p className="text-xs text-gray-500">
        Click to copy, paste into HTML
      </p>

      {/* Search Bar */}
      <div className="relative">
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

      {/* Search Results */}
      {searchResults && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-2">
          <p className="text-xs text-gray-400 mb-2 px-1">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
          {searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map(field => renderField(field))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">
              No fields match your search
            </p>
          )}
        </div>
      )}

      {/* Module-Based Field Categories */}
      {!searchResults && (
        <div className="space-y-1">
          {modulesWithFields.map(module => {
            const Icon = module.icon;
            const isExpanded = expandedModules.has(module.id);
            const isEnabled = module.isEnabled;
            
            return (
              <div 
                key={module.id}
                className={`expandable-info-section rounded-lg overflow-hidden ${
                  isExpanded ? 'expanded' : ''
                } ${!isEnabled ? 'opacity-60' : ''}`}
              >
                {/* Module Header */}
                <button
                  onClick={() => isEnabled && toggleModule(module.id)}
                  disabled={!isEnabled}
                  className={`expandable-info-header w-full justify-between ${
                    !isEnabled ? 'cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
                      !isExpanded ? '-rotate-90' : ''
                    }`} />
                    <Icon className={`w-4 h-4 ${module.color}`} />
                    <span className="text-sm font-medium text-gray-300">{module.label}</span>
                    {!isEnabled && (
                      <Lock className="w-3 h-3 text-gray-500 ml-1" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {module.fieldCount}
                  </span>
                </button>

                {/* Module Fields */}
                <div className="expandable-info-content">
                  <div className="px-2 pb-2 space-y-1">
                    {/* Group by subcategory if module has multiple */}
                    {(() => {
                      // Group fields by subcategory
                      const bySubcat = new Map<string, FieldDefinition[]>();
                      for (const field of module.fields) {
                        const subcat = field.subcategory || 'general';
                        const existing = bySubcat.get(subcat) || [];
                        existing.push(field);
                        bySubcat.set(subcat, existing);
                      }
                      
                      // If only one subcategory, don't show headers
                      if (bySubcat.size === 1) {
                        return module.fields.map(field => renderField(field));
                      }
                      
                      // Multiple subcategories - show headers
                      return Array.from(bySubcat.entries()).map(([subcat, fields]) => (
                        <div key={subcat}>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider px-2 py-1 mt-1">
                            {subcat.replace(/_/g, ' ')}
                          </p>
                          {fields.map(field => renderField(field))}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Stats Footer */}
      <p className="text-xs text-gray-500 px-1">
        {enabledFieldCount} fields available • Click to copy
      </p>
    </div>
  );
};

export default MergeFieldsReference;
