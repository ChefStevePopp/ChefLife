/**
 * Communications Module - Email Delivery via Edge Function
 * 
 * Client-side wrapper that calls the send-email Edge Function.
 * All API keys stay server-side - never exposed to browser.
 */

import type { SendEmailResult, EmailSendLog } from './types';
import { supabase } from '@/lib/supabase';

// =============================================================================
// EDGE FUNCTION CLIENT
// =============================================================================

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

interface EdgeFunctionResponse {
  success: boolean;
  error?: string;
  messageId?: string;
  logId?: string;
  id?: string;
}

/**
 * Call the send-email Edge Function
 */
async function callEdgeFunction(body: Record<string, unknown>): Promise<EdgeFunctionResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Test the platform email connection
 */
export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  return callEdgeFunction({ action: 'test' });
}

/**
 * Send a test email to the current user
 */
export async function sendTestEmail(toEmail?: string): Promise<{ success: boolean; error?: string; id?: string }> {
  return callEdgeFunction({ action: 'send-test', toEmail });
}

/**
 * Send an email through the Edge Function
 */
export interface DeliveryOptions {
  organizationId: string;
  templateId?: string;
  templateName?: string;
  recipientEmail: string;
  recipientName?: string;
  recipientId?: string;
  subject: string;
  html: string;
  fromName: string;
  replyTo?: string;
  mergeContext?: Record<string, unknown>;
  triggeredBy?: string;
}

export async function deliverEmail(options: DeliveryOptions): Promise<SendEmailResult> {
  const result = await callEdgeFunction({
    action: 'send',
    ...options,
  });

  return {
    success: result.success,
    message_id: result.messageId || result.id,
    error: result.error,
    log_id: result.logId,
  };
}

/**
 * Send emails to multiple recipients
 */
export interface BatchDeliveryOptions {
  organizationId: string;
  templateId?: string;
  templateName?: string;
  recipients: Array<{
    email: string;
    name?: string;
    id?: string;
    subject: string;
    html: string;
    mergeContext?: Record<string, unknown>;
  }>;
  fromName: string;
  replyTo?: string;
  triggeredBy?: string;
  delayBetweenSends?: number;
}

export interface BatchDeliveryResult {
  total: number;
  sent: number;
  failed: number;
  results: SendEmailResult[];
}

export async function deliverBatch(options: BatchDeliveryOptions): Promise<BatchDeliveryResult> {
  const {
    organizationId,
    templateId,
    templateName,
    recipients,
    fromName,
    replyTo,
    triggeredBy,
    delayBetweenSends = 100,
  } = options;

  const results: SendEmailResult[] = [];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    const result = await deliverEmail({
      organizationId,
      templateId,
      templateName,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientId: recipient.id,
      subject: recipient.subject,
      html: recipient.html,
      fromName,
      replyTo,
      mergeContext: recipient.mergeContext,
      triggeredBy,
    });

    results.push(result);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Rate limiting delay (skip on last item)
    if (i < recipients.length - 1 && delayBetweenSends > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenSends));
    }
  }

  return {
    total: recipients.length,
    sent,
    failed,
    results,
  };
}

// =============================================================================
// DEPRECATED - Keep for backwards compatibility
// =============================================================================

/** @deprecated Use testEmailConnection() instead */
export async function testResendConnection(_apiKey: string): Promise<{ success: boolean; error?: string }> {
  console.warn('testResendConnection is deprecated. Use testEmailConnection() instead.');
  return testEmailConnection();
}

/** @deprecated Use sendTestEmail() instead */
export async function sendPlatformTestEmail(toEmail: string): Promise<{ success: boolean; id?: string; error?: string }> {
  console.warn('sendPlatformTestEmail is deprecated. Use sendTestEmail() instead.');
  return sendTestEmail(toEmail);
}

/** @deprecated Platform config is now server-side only */
export async function getPlatformEmailConfig(): Promise<null> {
  console.warn('getPlatformEmailConfig is deprecated. Platform config is now server-side only.');
  return null;
}
