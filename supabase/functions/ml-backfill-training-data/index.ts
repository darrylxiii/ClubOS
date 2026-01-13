/**
 * ML Backfill Training Data Edge Function
 * 
 * Populates ml_training_data table with historical application outcomes.
 * This builds the training dataset for ML model training.
 * 
 * Usage:
 * POST /ml-backfill-training-data
 * Body: { days_back?, limit?, company_id? }
 * 
 * Returns: { success, records_created, errors }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  days_back?: number;
  limit?: number;
  company_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      days_back = 180,
      limit = 1000,
      company_id
    }: BackfillRequest = await req.json();

    console.log(`[ML Backfill] Starting backfill: ${days_back} days, limit ${limit}`);

    // Get historical applications with outcomes
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_back);

    let query = supabase
      .from('applications')
      .select(`
        id,
        candidate_id,
        job_id,
        user_id,
        company_name,
        status,
        match_score,
        applied_at,
        updated_at,
        stages,
        jobs!inner(company_id)
      `)
      .gte('applied_at', cutoffDate.toISOString())
      .not('candidate_id', 'is', null)
      .not('job_id', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(limit);

    if (company_id) {
      query = query.eq('jobs.company_id', company_id);
    }

    const { data: applications, error: applicationsError } = await query;

    if (applicationsError) throw applicationsError;
    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          records_created: 0,
          message: 'No applications found to backfill'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ML Backfill] Processing ${applications.length} applications`);

    const trainingRecords = [];
    const errors = [];
    let processed = 0;

    for (const app of applications) {
      try {
        processed++;
        if (processed % 50 === 0) {
          console.log(`[ML Backfill] Processed ${processed}/${applications.length}`);
        }

        // Skip if already in training data
        const { data: existing } = await supabase
          .from('ml_training_data')
          .select('id')
          .eq('application_id', app.id)
          .maybeSingle();

        if (existing) {
          continue;
        }

        // Generate features for this application
        const { data: featureData, error: featureError } = await supabase.functions.invoke(
          'ai-integration',
          {
            body: {
              action: 'generate-ml-features',
              payload: {
                candidate_id: app.candidate_id,
                job_id: app.job_id,
                application_id: app.id,
                use_cache: false, // Don't cache for backfill
              },
            }
          }
        );

        if (featureError) {
          errors.push({ application_id: app.id, error: featureError.message });
          continue;
        }

        // Determine labels from application status and stages
        const labels = determineLabels(app);

        // Calculate time metrics
        const appliedAt = new Date(app.applied_at);
        const updatedAt = new Date(app.updated_at);
        const totalDays = Math.floor((updatedAt.getTime() - appliedAt.getTime()) / (1000 * 60 * 60 * 24));

        trainingRecords.push({
          candidate_id: app.candidate_id,
          job_id: app.job_id,
          application_id: app.id,
          company_id: (app.jobs as any)?.company_id || null,
          features: featureData.features,
          label_hired: labels.hired,
          label_interviewed: labels.interviewed,
          label_rejected: labels.rejected,
          time_to_hire_days: labels.hired ? totalDays : null,
          time_to_interview_days: labels.interviewed ? calculateInterviewTime(app.stages) : null,
          rejection_stage: labels.rejected ? app.status : null,
          match_score_at_time: app.match_score,
        });

        // Batch insert every 100 records
        if (trainingRecords.length >= 100) {
          const { error: insertError } = await supabase
            .from('ml_training_data')
            .insert(trainingRecords);

          if (insertError) {
            console.error('[ML Backfill] Batch insert error:', insertError);
            errors.push({ batch: trainingRecords.length, error: insertError.message });
          }

          trainingRecords.length = 0; // Clear array
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ application_id: app.id, error: errorMsg });
        console.error(`[ML Backfill] Error processing application ${app.id}:`, error);
      }
    }

    // Insert remaining records
    if (trainingRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('ml_training_data')
        .insert(trainingRecords);

      if (insertError) {
        console.error('[ML Backfill] Final batch insert error:', insertError);
        errors.push({ batch: trainingRecords.length, error: insertError.message });
      }
    }

    const totalCreated = processed - errors.length;

    console.log(`[ML Backfill] Complete: ${totalCreated} records created, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        records_created: totalCreated,
        errors: errors.slice(0, 10), // Return first 10 errors only
        total_errors: errors.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ML Backfill] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Determine training labels from application data
function determineLabels(application: any): {
  hired: boolean;
  interviewed: boolean;
  rejected: boolean;
} {
  const status = application.status?.toLowerCase() || '';
  const stages = application.stages || [];

  // Check if hired
  const hired = status === 'hired' || status === 'offer_accepted';

  // Check if interviewed (reached interview stage)
  const interviewed =
    status === 'interviewed' ||
    status === 'interview' ||
    hired ||
    stages.some((stage: any) =>
      stage.name?.toLowerCase().includes('interview') &&
      stage.completed_at
    );

  // Check if rejected
  const rejected =
    status === 'rejected' ||
    status === 'declined' ||
    status === 'not_selected' ||
    status === 'withdrawn';

  return { hired, interviewed, rejected };
}

// Calculate days to interview from stages
function calculateInterviewTime(stages: any[]): number | null {
  if (!stages || stages.length === 0) return null;

  const appliedStage = stages.find((s: any) => s.name?.toLowerCase().includes('applied'));
  const interviewStage = stages.find((s: any) =>
    s.name?.toLowerCase().includes('interview') && s.completed_at
  );

  if (!appliedStage || !interviewStage) return null;

  const appliedAt = new Date(appliedStage.completed_at || appliedStage.created_at);
  const interviewAt = new Date(interviewStage.completed_at);

  const days = Math.floor((interviewAt.getTime() - appliedAt.getTime()) / (1000 * 60 * 60 * 24));

  return days > 0 ? days : null;
}
