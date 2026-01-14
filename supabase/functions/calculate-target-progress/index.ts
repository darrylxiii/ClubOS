import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active targets (current period)
    const now = new Date().toISOString().split('T')[0];
    const { data: targets, error: targetsError } = await supabase
      .from("employee_targets")
      .select("*, employee_profiles!inner(user_id)")
      .lte("period_start", now)
      .gte("period_end", now);

    if (targetsError) {
      throw new Error(`Failed to fetch targets: ${targetsError.message}`);
    }

    console.log(`Processing ${targets?.length || 0} active targets`);

    const results = [];

    for (const target of targets || []) {
      const userId = target.employee_profiles.user_id;
      const periodStart = target.period_start;
      const periodEnd = target.period_end;

      try {
        // Calculate candidates sourced
        const { count: candidatesSourced } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("sourced_by", userId)
          .gte("created_at", periodStart)
          .lte("created_at", periodEnd);

        // Calculate placements (hired)
        const { count: placements } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("sourced_by", userId)
          .eq("status", "hired")
          .gte("updated_at", periodStart)
          .lte("updated_at", periodEnd);

        // Calculate interviews (applications that reached interview stage)
        const { data: apps } = await supabase
          .from("applications")
          .select("stages")
          .eq("sourced_by", userId)
          .gte("created_at", periodStart)
          .lte("created_at", periodEnd);

        let interviews = 0;
        if (apps) {
          for (const app of apps) {
            const stages = app.stages as any[];
            if (stages?.some((s: any) => s.name?.toLowerCase().includes("interview"))) {
              interviews++;
            }
          }
        }

        // Calculate hours worked
        const { data: timeEntries } = await supabase
          .from("time_entries")
          .select("duration_seconds")
          .eq("user_id", userId)
          .gte("start_time", periodStart)
          .lte("start_time", periodEnd);

        const hoursWorked = (timeEntries || []).reduce(
          (sum: number, t: any) => sum + (t.duration_seconds || 0),
          0
        ) / 3600;

        // Calculate revenue from commissions
        const { data: commissions } = await supabase
          .from("employee_commissions")
          .select("gross_amount")
          .eq("employee_id", target.employee_id)
          .gte("period_date", periodStart)
          .lte("period_date", periodEnd);

        const revenue = (commissions || []).reduce(
          (sum: number, c: any) => sum + c.gross_amount,
          0
        );

        // Update target with achieved values
        const { error: updateError } = await supabase
          .from("employee_targets")
          .update({
            candidates_sourced_achieved: candidatesSourced || 0,
            placements_achieved: placements || 0,
            interviews_achieved: interviews,
            hours_achieved: Math.round(hoursWorked),
            revenue_achieved: revenue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", target.id);

        if (updateError) {
          console.error(`Failed to update target ${target.id}:`, updateError);
          results.push({ id: target.id, status: "error", error: updateError.message });
        } else {
          results.push({
            id: target.id,
            status: "updated",
            metrics: {
              candidates_sourced: candidatesSourced || 0,
              placements: placements || 0,
              interviews,
              hours: Math.round(hoursWorked),
              revenue,
            },
          });
        }
      } catch (err: any) {
        console.error(`Error processing target ${target.id}:`, err);
        results.push({ id: target.id, status: "error", error: err.message });
      }
    }

    const successCount = results.filter((r) => r.status === "updated").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    console.log(`Completed: ${successCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: targets?.length || 0,
        updated: successCount,
        errors: errorCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in calculate-target-progress:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
