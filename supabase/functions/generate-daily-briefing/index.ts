import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (_req, ctx) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // --- ONCE-PER-DAY GUARD: Check if briefing already exists for today ---
    const { data: existingBriefing } = await ctx.supabase
      .from("daily_briefings")
      .select("id")
      .eq("briefing_date", today)
      .limit(1)
      .maybeSingle();

    if (existingBriefing) {
      console.log(`[Daily Briefing] Already generated for ${today} — skipping`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_generated_today", date: today }),
        { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all admin users
    const { data: adminRoles } = await ctx.supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles?.length) {
      return new Response(JSON.stringify({ success: true, briefings: 0, reason: "No admins" }), {
        headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminIds = adminRoles.map((r) => r.user_id);

    // Gather briefing data in parallel
    const [
      { data: activeSignals },
      { data: stalledApps },
      { data: agentDecisions },
      { data: newApplications },
      { data: todayMeetings },
      { data: heartbeats },
    ] = await Promise.all([
      ctx.supabase
        .from("predictive_signals")
        .select("id, signal_type, entity_type, entity_id, signal_strength, recommended_actions, contributing_factors")
        .eq("is_active", true)
        .order("signal_strength", { ascending: false })
        .limit(10),
      ctx.supabase
        .from("applications")
        .select("id, candidate_full_name, position, company_name, updated_at")
        .lt("updated_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not("status", "in", '("rejected","hired","archived","withdrawn")')
        .limit(20),
      ctx.supabase
        .from("agent_decision_log")
        .select("id, agent_name, decision_type, decision_made, confidence_score, created_at")
        .gte("created_at", yesterday)
        .order("created_at", { ascending: false })
        .limit(20),
      ctx.supabase
        .from("applications")
        .select("id")
        .gte("created_at", yesterday),
      ctx.supabase
        .from("quantum_meetings")
        .select("id, title, scheduled_start, participant_count")
        .gte("scheduled_start", `${today}T00:00:00`)
        .lte("scheduled_start", `${today}T23:59:59`)
        .order("scheduled_start", { ascending: true })
        .limit(10),
      ctx.supabase
        .from("agentic_heartbeat_log")
        .select("events_processed, signals_detected, tasks_created, errors")
        .gte("run_at", yesterday),
    ]);

    // Aggregate heartbeat stats
    const totalHeartbeatEvents = heartbeats?.reduce((s, h) => s + (h.events_processed || 0), 0) || 0;
    const totalHeartbeatSignals = heartbeats?.reduce((s, h) => s + (h.signals_detected || 0), 0) || 0;
    const totalHeartbeatTasks = heartbeats?.reduce((s, h) => s + (h.tasks_created || 0), 0) || 0;
    const totalHeartbeatErrors = heartbeats?.reduce((s, h) => {
      const errs = Array.isArray(h.errors) ? h.errors.length : 0;
      return s + errs;
    }, 0) || 0;

    // Build top recommended actions
    const topActions: string[] = [];
    if ((stalledApps?.length || 0) > 3) {
      topActions.push(`Review ${stalledApps?.length} stalled candidates — revenue at risk`);
    }
    const urgentSignals = activeSignals?.filter((s) => s.signal_strength >= 0.7) || [];
    if (urgentSignals.length > 0) {
      topActions.push(`${urgentSignals.length} high-strength signals need attention`);
    }
    if ((todayMeetings?.length || 0) > 0) {
      topActions.push(`${todayMeetings?.length} meetings scheduled today`);
    }

    const briefingContent = {
      generated_at: now.toISOString(),
      summary: {
        active_signals: activeSignals?.length || 0,
        stalled_candidates: stalledApps?.length || 0,
        agent_decisions_24h: agentDecisions?.length || 0,
        new_applications_24h: newApplications?.length || 0,
        meetings_today: todayMeetings?.length || 0,
      },
      agentic_stats: {
        heartbeat_runs: heartbeats?.length || 0,
        events_processed: totalHeartbeatEvents,
        signals_detected: totalHeartbeatSignals,
        tasks_auto_created: totalHeartbeatTasks,
        errors: totalHeartbeatErrors,
      },
      top_signals: (activeSignals || []).slice(0, 5).map((s) => ({
        type: s.signal_type,
        entity: `${s.entity_type}:${s.entity_id}`,
        strength: s.signal_strength,
        action: s.recommended_actions?.[0] || "Review signal",
      })),
      top_actions: topActions.slice(0, 3),
      meetings: (todayMeetings || []).map((m) => ({
        title: m.title,
        time: m.scheduled_start,
        participants: m.participant_count,
      })),
      recent_agent_actions: (agentDecisions || []).slice(0, 5).map((d) => ({
        agent: d.agent_name,
        action: d.decision_made,
        confidence: d.confidence_score,
      })),
    };

    // Create briefing for each admin
    let briefingsCreated = 0;
    for (const adminId of adminIds) {
      const { error } = await ctx.supabase
        .from("daily_briefings")
        .upsert(
          {
            user_id: adminId,
            briefing_date: today,
            content: briefingContent,
            is_dismissed: false,
          },
          { onConflict: "user_id,briefing_date" }
        );

      if (!error) briefingsCreated++;
    }

    console.log(`[Daily Briefing] Created ${briefingsCreated} briefings for ${today}`);

    return new Response(
      JSON.stringify({
        success: true,
        briefings_created: briefingsCreated,
        date: today,
        summary: briefingContent.summary,
      }),
      { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
}));
