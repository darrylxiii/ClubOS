import { createAuthenticatedHandler } from '../_shared/handler.ts';

interface FunnelStep {
  step_name: string;
  event_type: string;
  page_path?: string;
  element_id?: string;
  completion?: number;
}

interface StepMetrics {
  entered: number;
  completed: number;
  drop_off: number;
  drop_off_rate: number;
  avg_time_to_next: number;
}

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    // Verify admin role
    const { data: roles } = await ctx.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', ctx.user.id)
      .single();

    if (roles?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { funnelId, dateRangeStart, dateRangeEnd, cohortType } = await req.json();

    console.log(`Calculating funnel metrics for ${funnelId}`);

    // Fetch funnel definition
    const { data: funnel, error: funnelError } = await ctx.supabase
      .from('custom_funnels')
      .select('*')
      .eq('id', funnelId)
      .single();

    if (funnelError || !funnel) {
      throw new Error('Funnel not found');
    }

    const steps: FunnelStep[] = funnel.steps;
    const stepMetrics: Record<number, StepMetrics> = {};

    // Calculate metrics for each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const nextStep = steps[i + 1];

      const metrics = await calculateStepMetrics(
        ctx.supabase,
        step,
        nextStep,
        dateRangeStart,
        dateRangeEnd,
        cohortType
      );

      stepMetrics[i] = metrics;
    }

    // Calculate overall conversion
    const firstStepEntered = stepMetrics[0]?.entered || 0;
    const lastStepCompleted = stepMetrics[steps.length - 1]?.completed || 0;
    const overallConversion = firstStepEntered > 0
      ? (lastStepCompleted / firstStepEntered) * 100
      : 0;

    // Cache results
    await ctx.supabase.from('funnel_analytics_cache').insert({
      funnel_id: funnelId,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      cohort_type: cohortType || 'all',
      step_metrics: stepMetrics,
      overall_conversion: overallConversion,
    });

    console.log(`Funnel metrics calculated: ${overallConversion.toFixed(2)}% conversion`);

    return new Response(
      JSON.stringify({
        success: true,
        funnelId,
        steps: steps.map((s, i) => ({
          ...s,
          metrics: stepMetrics[i],
        })),
        overallConversion: Math.round(overallConversion * 100) / 100,
      }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));

async function calculateStepMetrics(
  supabase: any,
  step: FunnelStep,
  nextStep: FunnelStep | undefined,
  startDate: string,
  endDate: string,
  cohortType?: string
): Promise<StepMetrics> {

  // Query events for this step
  let query = supabase
    .from('user_session_events')
    .select('user_id, created_at')
    .eq('event_type', step.event_type)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Apply step-specific filters
  if (step.page_path) {
    query = query.eq('event_data->>page_path', step.page_path);
  }
  if (step.element_id) {
    query = query.eq('event_data->>element_id', step.element_id);
  }

  const { data: stepEvents } = await query;

  if (!stepEvents || stepEvents.length === 0) {
    return {
      entered: 0,
      completed: 0,
      drop_off: 0,
      drop_off_rate: 0,
      avg_time_to_next: 0,
    };
  }

  const entered = new Set(stepEvents.map((e: any) => e.user_id)).size;
  let completed = 0;
  let totalTimeToNext = 0;

  if (nextStep) {
    // Query next step events
    let nextQuery = supabase
      .from('user_session_events')
      .select('user_id, created_at')
      .eq('event_type', nextStep.event_type)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (nextStep.page_path) {
      nextQuery = nextQuery.eq('event_data->>page_path', nextStep.page_path);
    }

    const { data: nextEvents } = await nextQuery;

    if (nextEvents) {
      const usersWhoCompleted = new Set<string>();

      for (const stepEvent of stepEvents) {
        const nextEvent = nextEvents.find((ne: any) =>
          ne.user_id === stepEvent.user_id &&
          new Date(ne.created_at) > new Date(stepEvent.created_at)
        );

        if (nextEvent) {
          usersWhoCompleted.add(stepEvent.user_id);
          const timeDiff = new Date(nextEvent.created_at).getTime() -
                          new Date(stepEvent.created_at).getTime();
          totalTimeToNext += timeDiff;
        }
      }

      completed = usersWhoCompleted.size;
    }
  } else {
    // Last step - count as completed
    completed = entered;
  }

  const dropOff = entered - completed;
  const dropOffRate = entered > 0 ? (dropOff / entered) * 100 : 0;
  const avgTimeToNext = completed > 0 ? totalTimeToNext / completed / 1000 : 0;

  return {
    entered,
    completed,
    drop_off: dropOff,
    drop_off_rate: Math.round(dropOffRate * 100) / 100,
    avg_time_to_next: Math.round(avgTimeToNext),
  };
}
