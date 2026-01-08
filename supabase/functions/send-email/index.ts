/**
 * send-email Edge Function
 * 
 * Server-side email delivery via Resend.
 * Reads API key from platform_settings (not env vars).
 * 
 * Endpoints:
 * - POST /send-email { action: 'test' } - Test API connection
 * - POST /send-email { action: 'send', ... } - Send email
 * - POST /send-email { action: 'send-test', toEmail } - Send test email
 * 
 * Required:
 * - Authorization header with valid Supabase JWT
 * - platform_settings.email_service configured
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// TYPES
// =============================================================================

interface PlatformEmailConfig {
  provider: 'resend' | 'sendgrid' | 'none';
  api_key: string;
  from_email: string;
  verified_domain: string;
}

interface SendEmailRequest {
  action: 'test' | 'send' | 'send-test';
  // For 'send-test'
  toEmail?: string;
  // For 'send'
  organizationId?: string;
  templateId?: string;
  templateName?: string;
  recipientEmail?: string;
  recipientName?: string;
  recipientId?: string;
  subject?: string;
  html?: string;
  fromName?: string;
  replyTo?: string;
  mergeContext?: Record<string, unknown>;
  triggeredBy?: string;
}

// =============================================================================
// HELPER: Get Platform Email Config
// =============================================================================

async function getPlatformConfig(supabase: any): Promise<PlatformEmailConfig | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'email_service')
    .single();

  if (error || !data?.value) {
    console.error('Failed to load platform email config:', error);
    return null;
  }

  return data.value as PlatformEmailConfig;
}

// =============================================================================
// HELPER: Send via Resend
// =============================================================================

async function sendViaResend(
  apiKey: string,
  options: {
    from: string;
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
    tags?: Array<{ name: string; value: string }>;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
        tags: options.tags,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `Resend API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      id: data.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// =============================================================================
// HELPER: Test Resend Connection
// =============================================================================

async function testConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { success: true };
    }

    const error = await response.json();
    return {
      success: false,
      error: error.message || `API error: ${response.status}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection failed',
    };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client (for reading platform_settings)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request
    const body: SendEmailRequest = await req.json();
    const { action } = body;

    // Get platform email config
    const platformConfig = await getPlatformConfig(supabaseAdmin);
    if (!platformConfig || platformConfig.provider === 'none' || !platformConfig.api_key) {
      throw new Error("Platform email service not configured");
    }

    // ==========================================================================
    // ACTION: TEST CONNECTION
    // ==========================================================================
    if (action === 'test') {
      const result = await testConnection(platformConfig.api_key);
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: result.success ? 200 : 400,
        }
      );
    }

    // ==========================================================================
    // ACTION: SEND TEST EMAIL
    // ==========================================================================
    if (action === 'send-test') {
      const toEmail = body.toEmail || user.email;
      if (!toEmail) {
        throw new Error("No recipient email");
      }

      const result = await sendViaResend(platformConfig.api_key, {
        from: `ChefLife <${platformConfig.from_email}>`,
        to: toEmail,
        subject: 'ChefLife Platform Email Test',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #021320 0%, #0a1929 100%); border-radius: 16px; padding: 40px; text-align: center;">
              <h1 style="color: #f7a200; margin: 0 0 20px 0; font-size: 32px;">✅ Connection Successful!</h1>
              <p style="color: #fafafa; font-size: 16px; margin: 0 0 30px 0;">
                Your ChefLife platform email service is properly configured.
              </p>
              <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; text-align: left;">
                <p style="color: #7292a1; font-size: 14px; margin: 0 0 8px 0;">
                  <strong style="color: #fafafa;">Provider:</strong> ${platformConfig.provider}
                </p>
                <p style="color: #7292a1; font-size: 14px; margin: 0 0 8px 0;">
                  <strong style="color: #fafafa;">From:</strong> ${platformConfig.from_email}
                </p>
                <p style="color: #7292a1; font-size: 14px; margin: 0 0 8px 0;">
                  <strong style="color: #fafafa;">Domain:</strong> ${platformConfig.verified_domain}
                </p>
                <p style="color: #7292a1; font-size: 14px; margin: 0;">
                  <strong style="color: #fafafa;">Sent:</strong> ${new Date().toLocaleString()}
                </p>
              </div>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
              Powered by ChefLife® Platform
            </p>
          </div>
        `,
      });

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: result.success ? 200 : 400,
        }
      );
    }

    // ==========================================================================
    // ACTION: SEND EMAIL
    // ==========================================================================
    if (action === 'send') {
      const {
        organizationId,
        templateId,
        templateName,
        recipientEmail,
        recipientName,
        recipientId,
        subject,
        html,
        fromName,
        replyTo,
        mergeContext,
        triggeredBy,
      } = body;

      if (!recipientEmail || !subject || !html) {
        throw new Error("Missing required fields: recipientEmail, subject, html");
      }

      // Create send log entry
      let logEntry: any = null;
      if (organizationId) {
        const { data, error } = await supabaseAdmin
          .from('email_send_log')
          .insert({
            organization_id: organizationId,
            template_id: templateId,
            recipient_email: recipientEmail,
            recipient_name: recipientName,
            recipient_id: recipientId,
            template_name: templateName || 'direct',
            subject,
            status: 'queued',
            merge_context: mergeContext,
            triggered_by: triggeredBy || 'manual',
            triggered_by_user: user.id,
          })
          .select()
          .single();

        if (!error) {
          logEntry = data;
        }
      }

      // Build from address
      const fromAddress = fromName 
        ? `${fromName} <${platformConfig.from_email}>`
        : `ChefLife <${platformConfig.from_email}>`;

      // Send via Resend
      const result = await sendViaResend(platformConfig.api_key, {
        from: fromAddress,
        to: recipientEmail,
        subject,
        html,
        replyTo,
        tags: organizationId ? [
          { name: 'organization', value: organizationId },
          { name: 'template', value: (templateName || 'direct').replace(/[^a-zA-Z0-9_-]/g, '_') },
        ] : undefined,
      });

      // Update send log
      if (logEntry) {
        await supabaseAdmin
          .from('email_send_log')
          .update({
            status: result.success ? 'sent' : 'failed',
            provider_message_id: result.id,
            sent_at: result.success ? new Date().toISOString() : null,
            error_message: result.error,
          })
          .eq('id', logEntry.id);
      }

      return new Response(
        JSON.stringify({
          success: result.success,
          messageId: result.id,
          error: result.error,
          logId: logEntry?.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: result.success ? 200 : 400,
        }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
