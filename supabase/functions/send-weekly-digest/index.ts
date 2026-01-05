/**
 * send-weekly-digest Edge Function
 * 
 * Sends personalized weekly performance digests to team members.
 * Uses Resend for email delivery.
 * 
 * ChefLife Default Template - Based on Memphis Fire Mail Merge
 * 
 * Required env vars:
 * - RESEND_API_KEY: Your Resend API key
 * - SUPABASE_URL: Auto-provided
 * - SUPABASE_SERVICE_ROLE_KEY: Auto-provided
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

interface SendRequest {
  organizationId: string;
  cycleId: string;
  recipientIds: string[];
  weekOf: string;
  weekStart: string;
  weekEnd: string;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  hire_date?: string;
  punch_id?: string;
}

interface PointEvent {
  id: string;
  event_date: string;
  event_type: string;
  points: number;
  notes?: string;
}

interface PointReduction {
  id: string;
  event_date: string;
  reduction_type: string;
  points: number;
  notes?: string;
}

interface DayActivity {
  date: string;
  dayName: string;
  shortDate: string;
  events: string[];
}

interface SendResult {
  memberId: string;
  email: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

interface TierConfig {
  tier1_max: number;
  tier2_max: number;
}

// =============================================================================
// BRAND COLORS (ChefLife Default - Memphis Fire Style)
// =============================================================================

const COLORS = {
  background: '#021320',
  cardBg: '#0a1929',
  accent: '#F7A200',      // Memphis Fire Gold
  text: '#FAFAFA',
  textMuted: '#7292A1',
  tier1: '#34d399',       // Emerald
  tier2: '#fbbf24',       // Amber
  tier3: '#fb7185',       // Rose
  success: '#34d399',
  warning: '#fbbf24',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const calculateTier = (points: number, config: TierConfig): 1 | 2 | 3 => {
  if (points <= config.tier1_max) return 1;
  if (points <= config.tier2_max) return 2;
  return 3;
};

const getTierInfo = (tier: 1 | 2 | 3) => {
  switch (tier) {
    case 1: return { color: COLORS.tier1, label: 'Excellence', description: 'Full benefits & priority scheduling' };
    case 2: return { color: COLORS.tier2, label: 'Strong', description: 'Standard benefits' };
    case 3: return { color: COLORS.tier3, label: 'Focus', description: 'Coaching support active' };
  }
};

const formatEventType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

const calculateYearsOfService = (hireDate?: string): number => {
  if (!hireDate) return 0;
  const hire = new Date(hireDate + 'T00:00:00');
  const now = new Date();
  const years = (now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(years * 100) / 100;
};

const getSeniorityStars = (years: number): string => {
  if (years >= 5) return '⭐⭐⭐⭐⭐';
  if (years >= 4) return '⭐⭐⭐⭐';
  if (years >= 3) return '⭐⭐⭐';
  if (years >= 2) return '⭐⭐';
  if (years >= 1) return '⭐';
  return '🌱 New';
};

const getWeekDays = (weekStart: string): DayActivity[] => {
  const days: DayActivity[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart + 'T00:00:00');
    date.setDate(date.getDate() + i);
    
    days.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[i],
      shortDate: date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
      events: [],
    });
  }
  
  return days;
};

// =============================================================================
// EMAIL TEMPLATE - CHEFLIFE DEFAULT
// =============================================================================

const generateEmailHTML = (
  member: TeamMember,
  orgName: string,
  weekOf: string,
  weekStart: string,
  currentPoints: number,
  tier: 1 | 2 | 3,
  pointsThisWeek: number,
  reductionsThisWeek: number,
  weekEvents: PointEvent[],
  weekReductions: PointReduction[],
  mvpCount: number,
): string => {
  const firstName = member.first_name || 'Team Member';
  const tierInfo = getTierInfo(tier);
  const yearsOfService = calculateYearsOfService(member.hire_date);
  const seniorityStars = getSeniorityStars(yearsOfService);
  
  // Build day-by-day activity
  const weekDays = getWeekDays(weekStart);
  
  // Map events to days
  weekEvents.forEach(event => {
    const day = weekDays.find(d => d.date === event.event_date);
    if (day) {
      day.events.push(`+${event.points} pts: ${formatEventType(event.event_type)}`);
    }
  });
  
  // Map reductions to days
  weekReductions.forEach(reduction => {
    const day = weekDays.find(d => d.date === reduction.event_date);
    if (day) {
      day.events.push(`${reduction.points} pts: ${formatEventType(reduction.reduction_type)} 🌟`);
    }
  });

  // Generate day-by-day HTML
  const activityByDayHTML = weekDays.map(day => `
    <tr>
      <td style="padding: 8px 0;">
        <span style="color: ${COLORS.textMuted}; font-weight: bold;">${day.dayName}</span>
        <span style="color: ${COLORS.textMuted}; font-style: italic; margin-left: 8px;">${day.shortDate}</span>
        <br/>
        <span style="color: ${day.events.length > 0 ? COLORS.text : COLORS.textMuted};">
          ${day.events.length > 0 ? day.events.join('<br/>') : '—'}
        </span>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Performance Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  
  <!-- Main Container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 650px;">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 20px 0 30px 0;">
              <span style="font-size: 24px; font-weight: bold; color: ${COLORS.text};">
                ChefLife<sup style="font-size: 12px;">®</sup>
              </span>
              <br/>
              <span style="font-size: 12px; color: ${COLORS.textMuted};">
                Weekly Performance Digest for ${orgName}
              </span>
            </td>
          </tr>

          <!-- Hero Greeting -->
          <tr>
            <td style="padding: 30px 0;">
              <h1 style="margin: 0 0 10px 0; font-size: 42px; font-weight: 900; color: ${COLORS.accent}; text-align: center; letter-spacing: 2px;">
                Hi ${firstName}!
              </h1>
              <p style="margin: 0; font-size: 18px; color: ${COLORS.text}; text-align: center;">
                This is what last week looked like for you at work.
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: ${COLORS.accent}; text-align: center;">
                All the news from the week of ${weekOf}
              </p>
            </td>
          </tr>

          <!-- Two Column Layout: Activity + Stats -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Left Column: Activity By Day -->
                  <td width="48%" valign="top" style="padding-right: 2%;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.cardBg}; border-radius: 12px; padding: 20px;">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 15px 0; font-size: 20px; color: ${COLORS.accent}; text-align: center;">
                            Activity By Day
                          </h2>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            ${activityByDayHTML}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Right Column: Points & Stats -->
                  <td width="48%" valign="top" style="padding-left: 2%;">
                    <!-- Points This Week -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.cardBg}; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
                      <tr>
                        <td align="center">
                          <span style="font-size: 12px; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;">Points This Week</span>
                          <br/>
                          <span style="font-size: 48px; font-weight: bold; color: ${pointsThisWeek > 0 ? COLORS.warning : COLORS.success};">
                            ${pointsThisWeek > 0 ? '+' : ''}${pointsThisWeek}
                          </span>
                          <br/>
                          <span style="font-size: 14px; color: ${COLORS.textMuted};">points</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Points Total -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.cardBg}; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
                      <tr>
                        <td align="center">
                          <span style="font-size: 12px; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;">Cycle Total</span>
                          <br/>
                          <span style="font-size: 48px; font-weight: bold; color: ${COLORS.text};">
                            ${currentPoints}
                          </span>
                          <br/>
                          <span style="font-size: 14px; color: ${COLORS.textMuted};">points</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Current Tier -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.cardBg}; border: 2px solid ${tierInfo.color}; border-radius: 12px; padding: 20px;">
                      <tr>
                        <td align="center">
                          <span style="font-size: 12px; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;">Your Current Tier</span>
                          <br/>
                          <span style="font-size: 42px; font-weight: bold; color: ${tierInfo.color};">
                            Tier ${tier}
                          </span>
                          <br/>
                          <span style="font-size: 14px; color: ${tierInfo.color};">${tierInfo.label}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Being Present Matters -->
          <tr>
            <td style="padding: 30px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.cardBg}; border-radius: 12px; padding: 30px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 15px 0; font-size: 24px; color: ${COLORS.text}; text-align: center;">
                      Being Present Matters
                    </h2>
                    <p style="margin: 0 0 15px 0; font-size: 15px; color: ${COLORS.text}; line-height: 1.7; text-align: center;">
                      Every shift you show up with intention is an investment in your story. 
                      When you're here — truly here, mind and heart engaged — you're not just filling 
                      a position, you're investing in your craft, building your connections, and 
                      contributing to a story worth sharing.
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: ${COLORS.text}; line-height: 1.7; text-align: center;">
                      <strong>It's You... You're the story</strong>
                    </p>
                    <p style="margin: 0 0 15px 0; font-size: 14px; color: ${COLORS.textMuted}; line-height: 1.6; text-align: center;">
                      Don't do it for the restaurant, be here for you. Your personal success, your development, 
                      and your future opportunities all start with this simple truth: showing up consistently 
                      and completely is where excellence begins.
                    </p>
                    <p style="margin: 0; font-size: 16px; color: ${COLORS.accent}; font-style: italic; text-align: center;">
                      Be present. Be purposeful. Be brilliant, never bland.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Team MVP Contributions -->
          <tr>
            <td style="padding: 0 0 30px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.cardBg}; border: 2px solid ${COLORS.success}; border-radius: 12px; padding: 25px;">
                <tr>
                  <td align="center">
                    <h3 style="margin: 0 0 10px 0; font-size: 18px; color: ${COLORS.success};">
                      🌟 Team MVP Contributions
                    </h3>
                    <p style="margin: 0; font-size: 15px; color: ${COLORS.text};">
                      🤝 Thanks for helping the team out <strong style="color: ${COLORS.accent};">${mvpCount} time${mvpCount !== 1 ? 's' : ''}</strong> so far this cycle
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: ${COLORS.textMuted};">
                      Team Assist Points aren't just about reducing your points — they're about proving 
                      you're the kind of teammate others can count on.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick Reminder -->
          <tr>
            <td style="padding: 0 0 30px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.cardBg}; border-radius: 12px; padding: 25px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 10px 0; font-size: 16px; color: ${COLORS.text};">
                      A Quick Reminder About Your Attendance
                    </h3>
                    <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted}; line-height: 1.6;">
                      Your numbers above show where you stand this week. If anything seems unclear — 
                      your points, your tier status, how the reset cycle works, or how to reduce points — 
                      please ask your supervisor, review 7Shifts announcements, or ask Chef Steve directly. 
                      We want you to understand the system so you can succeed within it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Seniority & Service -->
          <tr>
            <td style="padding: 0 0 30px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.cardBg}; border-radius: 12px; padding: 25px;">
                <tr>
                  <td align="center">
                    <span style="font-size: 12px; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 1px;">Your Seniority Status</span>
                    <br/>
                    <span style="font-size: 32px;">${seniorityStars}</span>
                    <br/>
                    <span style="font-size: 14px; color: ${COLORS.text};">
                      ${yearsOfService > 0 ? `${yearsOfService.toFixed(2)} years with us!` : 'Welcome to the team!'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer - Employee Details -->
          <tr>
            <td style="padding: 20px 0; border-top: 1px solid ${COLORS.textMuted}33;">
              <p style="margin: 0 0 5px 0; font-size: 11px; color: ${COLORS.textMuted}; text-align: center;">
                This Report Was Prepared Exclusively For
              </p>
              <p style="margin: 0 0 3px 0; font-size: 13px; color: ${COLORS.text}; text-align: center;">
                <strong>${member.first_name} ${member.last_name}</strong>
                ${member.punch_id ? ` • ID: ${member.punch_id}` : ''}
              </p>
              <p style="margin: 0 0 15px 0; font-size: 12px; color: ${COLORS.textMuted}; text-align: center;">
                ${member.email}
              </p>
              <p style="margin: 0 0 5px 0; font-size: 11px; color: ${COLORS.textMuted}; text-align: center;">
                Copyright © ${new Date().getFullYear()} ${orgName}. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: ${COLORS.accent}; text-align: center;">
                This Weekly Report Brought to You By <strong>ChefLife®</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
};

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { organizationId, cycleId, recipientIds, weekOf, weekStart, weekEnd }: SendRequest = await req.json();

    if (!organizationId || !recipientIds || recipientIds.length === 0) {
      throw new Error("Missing required fields");
    }

    // Get organization details including config
    const { data: org } = await supabase
      .from("organizations")
      .select("name, modules")
      .eq("id", organizationId)
      .single();
    
    const orgName = org?.name || "Your Restaurant";
    const tierConfig: TierConfig = org?.modules?.team_performance?.config?.tier_thresholds || {
      tier1_max: 2,
      tier2_max: 5,
    };

    // Get team members for recipients
    const { data: members, error: membersError } = await supabase
      .from("organization_team_members")
      .select("id, first_name, last_name, email, avatar_url, hire_date, punch_id")
      .eq("organization_id", organizationId)
      .in("id", recipientIds);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      throw new Error("Failed to fetch team members");
    }

    // Get ALL point events for cycle (to calculate current totals)
    const { data: allEvents } = await supabase
      .from("performance_point_events")
      .select("team_member_id, points, event_date, event_type")
      .eq("organization_id", organizationId)
      .eq("cycle_id", cycleId);

    // Get ALL reductions for cycle
    const { data: allReductions } = await supabase
      .from("performance_point_reductions")
      .select("team_member_id, points, event_date, reduction_type")
      .eq("organization_id", organizationId)
      .eq("cycle_id", cycleId);

    const results: SendResult[] = [];

    // Process each recipient
    for (const member of members || []) {
      if (!member.email) {
        results.push({
          memberId: member.id,
          email: '',
          status: 'skipped',
          error: 'No email address',
        });
        continue;
      }

      try {
        // Check if already sent this week
        const { data: existingSend } = await supabase
          .from("digest_sends")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("team_member_id", member.id)
          .eq("week_of", weekStart)
          .maybeSingle();

        if (existingSend) {
          results.push({
            memberId: member.id,
            email: member.email,
            status: 'skipped',
            error: 'Already sent this week',
          });
          continue;
        }

        // Calculate current points for this member
        const memberEvents = allEvents?.filter(e => e.team_member_id === member.id) || [];
        const memberReductions = allReductions?.filter(r => r.team_member_id === member.id) || [];
        
        const totalEventPoints = memberEvents.reduce((sum, e) => sum + e.points, 0);
        const totalReductionPoints = memberReductions.reduce((sum, r) => sum + r.points, 0);
        const currentPoints = Math.max(0, totalEventPoints + totalReductionPoints);
        const tier = calculateTier(currentPoints, tierConfig);

        // Count MVP contributions (reductions)
        const mvpCount = memberReductions.length;

        // Get detailed events for this week only
        const weekEvents = memberEvents.filter(e => e.event_date >= weekStart && e.event_date <= weekEnd) as PointEvent[];
        const weekReductions = memberReductions.filter(r => r.event_date >= weekStart && r.event_date <= weekEnd) as PointReduction[];

        const pointsThisWeek = weekEvents.reduce((sum, e) => sum + e.points, 0);
        const reductionsThisWeek = Math.abs(weekReductions.reduce((sum, r) => sum + r.points, 0));

        // Generate email HTML
        const htmlContent = generateEmailHTML(
          member,
          orgName,
          weekOf,
          weekStart,
          currentPoints,
          tier,
          pointsThisWeek,
          reductionsThisWeek,
          weekEvents,
          weekReductions,
          mvpCount,
        );

        // Send via Resend
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `ChefLife <digests@${Deno.env.get("RESEND_DOMAIN") || "cheflife.app"}>`,
            to: member.email,
            subject: `Your Weekly Performance Digest — ${weekOf}`,
            html: htmlContent,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          throw new Error(`Resend error: ${errorText}`);
        }

        // Log successful send
        await supabase.from("digest_sends").insert({
          organization_id: organizationId,
          cycle_id: cycleId,
          team_member_id: member.id,
          recipient_email: member.email,
          week_of: weekStart,
          status: 'sent',
          created_by: user.id,
        });

        results.push({
          memberId: member.id,
          email: member.email,
          status: 'sent',
        });

      } catch (sendError: any) {
        console.error(`Error sending to ${member.email}:`, sendError);

        // Log failed send
        await supabase.from("digest_sends").upsert({
          organization_id: organizationId,
          cycle_id: cycleId,
          team_member_id: member.id,
          recipient_email: member.email,
          week_of: weekStart,
          status: 'failed',
          error_message: sendError.message,
          created_by: user.id,
        }, {
          onConflict: 'organization_id,team_member_id,week_of',
        });

        results.push({
          memberId: member.id,
          email: member.email,
          status: 'failed',
          error: sendError.message,
        });
      }
    }

    // Summary
    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: { sent, failed, skipped, total: results.length },
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

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
