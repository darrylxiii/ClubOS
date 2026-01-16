import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCHEDULE-EMAIL-REPORT] ${step}${detailsStr}`);
};

interface ScheduleInput {
  frequency: 'daily' | 'weekly' | 'monthly';
  reportType: string;
  email: string;
  timezone?: string;
  preferredTime?: string; // HH:MM format
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const input: ScheduleInput = await req.json();
    const { frequency, reportType, email, timezone = 'Europe/Amsterdam', preferredTime = '09:00' } = input;

    if (!frequency || !reportType || !email) {
      throw new Error("frequency, reportType, and email are required");
    }

    // Validate frequency
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      throw new Error("frequency must be 'daily', 'weekly', or 'monthly'");
    }

    // Validate report type
    const validReportTypes = [
      'pipeline_summary',
      'applications_overview',
      'interview_schedule',
      'meeting_analytics',
      'messaging_stats',
      'referral_performance',
      'hiring_funnel',
      'team_activity'
    ];

    if (!validReportTypes.includes(reportType)) {
      throw new Error(`Invalid report type. Valid types: ${validReportTypes.join(', ')}`);
    }

    logStep("Input validated", { frequency, reportType, email });

    // Calculate next run time based on frequency
    const now = new Date();
    let nextRunAt: Date;

    const [hours, minutes] = preferredTime.split(':').map(Number);
    
    switch (frequency) {
      case 'daily':
        nextRunAt = new Date(now);
        nextRunAt.setHours(hours, minutes, 0, 0);
        if (nextRunAt <= now) {
          nextRunAt.setDate(nextRunAt.getDate() + 1);
        }
        break;
      case 'weekly': {
        // Next Monday at preferred time
        nextRunAt = new Date(now);
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
        nextRunAt.setDate(now.getDate() + daysUntilMonday);
        nextRunAt.setHours(hours, minutes, 0, 0);
        break;
      }
      case 'monthly':
        // First of next month at preferred time
        nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, 1, hours, minutes, 0, 0);
        break;
      default:
        nextRunAt = new Date(now);
        nextRunAt.setDate(nextRunAt.getDate() + 1);
    }

    logStep("Next run calculated", { nextRunAt: nextRunAt.toISOString() });

    // Check if schedule already exists
    const { data: existingSchedule } = await supabaseClient
      .from('scheduled_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_type', reportType)
      .eq('is_active', true)
      .single();

    if (existingSchedule) {
      // Update existing schedule
      const { error: updateError } = await supabaseClient
        .from('scheduled_reports')
        .update({
          frequency,
          email,
          timezone,
          preferred_time: preferredTime,
          next_run_at: nextRunAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSchedule.id);

      if (updateError) throw updateError;

      logStep("Schedule updated", { scheduleId: existingSchedule.id });

      return new Response(JSON.stringify({
        success: true,
        message: "Report schedule updated successfully",
        scheduleId: existingSchedule.id,
        nextRunAt: nextRunAt.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create new schedule
    const { data: newSchedule, error: insertError } = await supabaseClient
      .from('scheduled_reports')
      .insert({
        user_id: user.id,
        report_type: reportType,
        frequency,
        email,
        timezone,
        preferred_time: preferredTime,
        next_run_at: nextRunAt.toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    logStep("Schedule created", { scheduleId: newSchedule?.id });

    return new Response(JSON.stringify({
      success: true,
      message: "Report scheduled successfully",
      scheduleId: newSchedule?.id,
      frequency,
      reportType,
      email,
      nextRunAt: nextRunAt.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
