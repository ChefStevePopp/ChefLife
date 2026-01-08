/**
 * Communications Module - Public API
 * 
 * Central entry point for the Communications module.
 * All email sending goes through Edge Functions (API keys never exposed to browser).
 * 
 * Usage:
 * ```typescript
 * import { 
 *   testEmailConnection,
 *   sendTestEmail,
 *   sendEmail,
 * } from '@/lib/communications';
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Template types
  EmailTemplate,
  TemplateCategory,
  RecipientType,
  SendMode,
  TriggerEvent,
  
  // Field mapping types
  TemplateField,
  DataSource,
  FieldTransform,
  
  // Context types
  MergeContext,
  RecipientContext,
  PerformanceContext,
  TimeOffContext,
  PeriodContext,
  OrganizationContext,
  
  // Send types
  SendEmailRequest,
  SendEmailResult,
  EmailSendLog,
  SendStatus,
  
  // Queue types
  EmailQueueItem,
  QueueStatus,
} from './types';

// =============================================================================
// MERGE ENGINE
// =============================================================================

export {
  mergeTemplate,
  detectFields,
  suggestFieldPath,
  getSampleContext,
  type MergeSyntax,
  type MergeOptions,
} from './mergeEngine';

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

export {
  buildMergeContext,
  buildQuickContext,
  getAvailableRecipients,
} from './contextBuilder';

// =============================================================================
// FIELD REGISTRY (Single Source of Truth)
// =============================================================================

export {
  // Registry data
  FIELD_REGISTRY,
  FIELD_CATEGORIES,
  MODULE_DEFINITIONS,
  
  // Module-based functions
  getModuleDefinition,
  getFieldsByModule,
  getFieldsForModules,
  getFieldsGroupedByModule,
  getModulesWithFields,
  isModuleEnabled,
  getEnabledModules,
  getFieldCountByModule,
  searchFields,
  detectFieldsByModule,
  
  // Legacy/general functions
  getFieldsByCategory,
  getFieldByTag,
  getDataPath,
  getCategory,
  buildFieldMap,
  getAllTags,
  isRegisteredTag,
  getSampleValue,
  getDefaultValue,
  detectUnregisteredFields,
  
  // Types
  type ModuleId,
  type ModuleDefinition,
  type FieldDefinition,
  type FieldCategory,
  type FieldSubcategory,
  type CategoryDefinition,
  type FieldType,
  type FieldTransform as RegistryFieldTransform,
} from './fieldRegistry';

// =============================================================================
// DELIVERY (via Edge Function)
// =============================================================================

export {
  // Connection testing
  testEmailConnection,
  sendTestEmail,
  
  // Email delivery
  deliverEmail,
  deliverBatch,
  
  // Types
  type DeliveryOptions,
  type BatchDeliveryOptions,
  type BatchDeliveryResult,
} from './delivery';

// =============================================================================
// HIGH-LEVEL SEND FUNCTION
// =============================================================================

import { supabase } from '@/lib/supabase';
import type { EmailTemplate, TemplateField, MergeContext } from './types';
import { mergeTemplate, type MergeSyntax } from './mergeEngine';
import { deliverEmail } from './delivery';

/**
 * High-level function to send an email using a template
 * 
 * Handles:
 * - Template lookup by ID or name
 * - Field mapping resolution
 * - Merge field replacement
 * - Delivery via Edge Function
 * 
 * @example
 * ```typescript
 * await sendEmail({
 *   organizationId: 'org-123',
 *   templateName: 'weekly-roundup',
 *   recipientEmail: 'team@example.com',
 *   context: {
 *     recipient: { first_name: 'Jane' },
 *     performance: { points_this_period: 2 },
 *   },
 * });
 * ```
 */
export async function sendEmail(options: {
  organizationId: string;
  templateId?: string;
  templateName?: string;
  recipientEmail: string;
  recipientName?: string;
  recipientId?: string;
  context: Partial<MergeContext>;
  triggeredBy?: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string; logId?: string }> {
  const {
    organizationId,
    templateId,
    templateName,
    recipientEmail,
    recipientName,
    recipientId,
    context,
    triggeredBy = 'manual',
  } = options;

  try {
    // Fetch template
    let template: EmailTemplate | null = null;
    
    if (templateId) {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) throw new Error(`Template not found: ${templateId}`);
      template = data;
    } else if (templateName) {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('name', templateName)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) throw new Error(`Template not found: ${templateName}`);
      template = data;
    } else {
      throw new Error('Either templateId or templateName is required');
    }

    // Fetch field mappings
    const { data: fields } = await supabase
      .from('email_template_fields')
      .select('*')
      .eq('template_id', template.id);

    // Build field mapping map
    const fieldMappings = new Map<string, TemplateField>();
    if (fields) {
      for (const field of fields) {
        fieldMappings.set(field.field_tag, field);
      }
    }

    // Fetch org config for email settings
    const { data: org } = await supabase
      .from('organizations')
      .select('name, modules')
      .eq('id', organizationId)
      .single();

    const commsConfig = org?.modules?.communications?.config;
    const fromName = commsConfig?.email?.fromName || org?.name || 'ChefLife';
    const replyTo = commsConfig?.email?.replyTo;
    const mergeSyntax: MergeSyntax = commsConfig?.mergeSyntax || 'guillemets';

    // Build full context with recipient
    const fullContext: MergeContext = {
      recipient: {
        id: recipientId || '',
        first_name: recipientName?.split(' ')[0] || '',
        last_name: recipientName?.split(' ').slice(1).join(' ') || '',
        email: recipientEmail,
        ...context.recipient,
      },
      organization: context.organization || {
        name: org?.name || '',
        timezone: commsConfig?.timezone || 'America/Toronto',
      },
      performance: context.performance,
      time_off: context.time_off,
      period: context.period,
      custom: context.custom,
    };

    // Merge subject and body
    const subject = mergeTemplate(template.subject_template, fullContext, { 
      syntax: mergeSyntax, 
      fieldMappings,
      missingFieldBehavior: 'blank',
    });
    
    const html = mergeTemplate(template.html_template, fullContext, { 
      syntax: mergeSyntax, 
      fieldMappings,
      missingFieldBehavior: 'blank',
    });

    // Send via Edge Function
    const result = await deliverEmail({
      organizationId,
      templateId: template.id,
      templateName: template.name,
      recipientEmail,
      recipientName,
      recipientId,
      subject,
      html,
      fromName,
      replyTo,
      mergeContext: fullContext,
      triggeredBy,
    });

    return {
      success: result.success,
      error: result.error,
      logId: result.log_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
