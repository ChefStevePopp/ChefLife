/**
 * DisableModuleModal - Confirmation for Disabling Add-On Modules
 * 
 * L5 Design: Safe, intentional module management
 * 
 * Features:
 * - Dependency checking (counts templates using module fields)
 * - Clear warning about consequences
 * - Checkbox acknowledgment required
 * - NEXUS logging of the decision
 */

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  X,
  Mail,
  Users,
  Clock,
  Database,
  Shield,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  detectFieldsByModule,
  getFieldsByModule,
  type ModuleId,
} from "@/lib/communications/fieldRegistry";

// =============================================================================
// TYPES
// =============================================================================

interface DependencyInfo {
  templateCount: number;
  templateNames: string[];
  fieldCount: number;
  hasScheduledAutomations: boolean;
}

interface DisableModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  moduleId: ModuleId;
  moduleLabel: string;
  organizationId: string;
  isProcessing?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const DisableModuleModal: React.FC<DisableModuleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  moduleId,
  moduleLabel,
  organizationId,
  isProcessing = false,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [dependencies, setDependencies] = useState<DependencyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dependency information when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setAcknowledged(false);
      setDependencies(null);
      setIsLoading(true);
      return;
    }

    const fetchDependencies = async () => {
      setIsLoading(true);
      
      try {
        // Get all templates for this org
        const { data: templates, error } = await supabase
          .from('email_templates')
          .select('id, name, html_template, is_active')
          .eq('organization_id', organizationId);

        if (error) throw error;

        // Get fields for this module
        const moduleFields = getFieldsByModule(moduleId);
        const moduleFieldTags = new Set(moduleFields.map(f => f.tag));

        // Check each template for module field usage
        const affectedTemplates: string[] = [];
        
        for (const template of templates || []) {
          if (!template.html_template) continue;
          
          const fieldsUsed = detectFieldsByModule(template.html_template);
          const moduleFieldsUsed = fieldsUsed.get(moduleId);
          
          if (moduleFieldsUsed && moduleFieldsUsed.length > 0) {
            affectedTemplates.push(template.name);
          }
        }

        // Check for scheduled automations (future - placeholder)
        // For now, check if any active templates use this module
        const hasScheduled = affectedTemplates.length > 0;

        setDependencies({
          templateCount: affectedTemplates.length,
          templateNames: affectedTemplates.slice(0, 5), // Show max 5
          fieldCount: moduleFields.length,
          hasScheduledAutomations: hasScheduled,
        });
      } catch (error) {
        console.error('Error fetching dependencies:', error);
        // Set empty dependencies on error - still allow disable
        setDependencies({
          templateCount: 0,
          templateNames: [],
          fieldCount: getFieldsByModule(moduleId).length,
          hasScheduledAutomations: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDependencies();
  }, [isOpen, organizationId, moduleId]);

  if (!isOpen) return null;

  const hasImpact = dependencies && (
    dependencies.templateCount > 0 || 
    dependencies.hasScheduledAutomations
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#1a1f2b] rounded-lg shadow-2xl border border-gray-700/50 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Disable {moduleLabel}?
              </h2>
              <p className="text-xs text-gray-500">
                This action requires confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
              <span className="ml-2 text-gray-400">Checking dependencies...</span>
            </div>
          ) : (
            <>
              {/* Impact Warning */}
              {hasImpact && (
                <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/30">
                  <p className="text-sm text-rose-300 font-medium mb-2">
                    This will affect:
                  </p>
                  <ul className="space-y-2">
                    {dependencies.templateCount > 0 && (
                      <li className="flex items-start gap-2 text-sm text-rose-200/80">
                        <Mail className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{dependencies.templateCount} email template{dependencies.templateCount !== 1 ? 's' : ''}</span>
                          {' '}use fields from this module
                          {dependencies.templateNames.length > 0 && (
                            <div className="text-xs text-rose-300/60 mt-1">
                              {dependencies.templateNames.join(', ')}
                              {dependencies.templateCount > 5 && ` +${dependencies.templateCount - 5} more`}
                            </div>
                          )}
                        </div>
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-sm text-rose-200/80">
                      <Users className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      All users will lose access immediately
                    </li>
                    {dependencies.hasScheduledAutomations && (
                      <li className="flex items-center gap-2 text-sm text-rose-200/80">
                        <Clock className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        Scheduled automations may fail
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Data Preservation Notice */}
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div className="flex items-start gap-2">
                  <Database className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-300 font-medium">
                      Your data will be preserved
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Disabling hides the module but keeps all your data intact. 
                      You can re-enable at any time to restore access.
                    </p>
                  </div>
                </div>
              </div>

              {/* Field Count Info */}
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>
                    <span className="text-amber-400 font-medium">{dependencies?.fieldCount || 0}</span>
                    {' '}merge fields will become unavailable
                  </span>
                </div>
              </div>

              {/* Acknowledgment Checkbox */}
              <label className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30 cursor-pointer hover:bg-gray-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300">
                  I understand the consequences of disabling this module
                </span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700/50 bg-gray-800/30">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!acknowledged || isLoading || isProcessing}
            className="px-4 py-2 text-sm font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Disabling...
              </>
            ) : (
              'Disable Module'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisableModuleModal;
