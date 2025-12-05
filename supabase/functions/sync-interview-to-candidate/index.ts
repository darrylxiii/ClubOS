/**
 * Sync Interview to Candidate Edge Function
 * 
 * Automatically syncs interview report data to candidate profiles.
 * Called after generate-interview-report completes.
 * Updates candidate intelligence scores based on interview performance.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  interview_report_id: string;
  candidate_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interview_report_id, candidate_id }: SyncRequest = await req.json();

    if (!candidate_id) {
      return new Response(
        JSON.stringify({ error: 'candidate_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sync Interview] Syncing interview data for candidate: ${candidate_id}`);

    // Fetch all interview reports for this candidate
    const { data: reports, error: reportsError } = await supabase
      .from('interview_reports')
      .select('*')
      .eq('candidate_id', candidate_id)
      .order('created_at', { ascending: false });

    if (reportsError) throw reportsError;

    if (!reports || reports.length === 0) {
      console.log('[Sync Interview] No interview reports found');
      return new Response(
        JSON.stringify({ success: true, message: 'No reports to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate aggregate metrics
    const avgConfidence = reports.reduce((sum, r) => sum + (r.recommendation_confidence || 0), 0) / reports.length;
    
    // Aggregate strengths and weaknesses (deduplicated)
    const allStrengths = new Set<string>();
    const allWeaknesses = new Set<string>();
    
    reports.forEach(r => {
      (r.key_strengths || []).forEach((s: string) => allStrengths.add(s));
      (r.key_weaknesses || []).forEach((w: string) => allWeaknesses.add(w));
    });

    // Count recommendations
    const recommendationCounts: Record<string, number> = {};
    reports.forEach(r => {
      const rec = r.recommendation || 'unknown';
      recommendationCounts[rec] = (recommendationCounts[rec] || 0) + 1;
    });

    // Determine overall recommendation (most common)
    const overallRecommendation = Object.entries(recommendationCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Calculate interview intelligence score (0-100)
    let interviewScore = 50; // Base score
    
    // Adjust based on recommendation
    if (overallRecommendation === 'advance' || overallRecommendation === 'hire') {
      interviewScore += 25;
    } else if (overallRecommendation === 'reject') {
      interviewScore -= 20;
    } else if (overallRecommendation === 'reconsider') {
      interviewScore += 5;
    }
    
    // Adjust based on confidence
    interviewScore += (avgConfidence - 50) * 0.3;
    
    // Clamp to 0-100
    interviewScore = Math.max(0, Math.min(100, interviewScore));

    // Update candidate profile
    const { error: updateError } = await supabase
      .from('candidate_profiles')
      .update({
        interview_score_avg: Math.round(interviewScore * 100) / 100,
        interview_count: reports.length,
        ai_recommendation: overallRecommendation,
        key_strengths_aggregated: Array.from(allStrengths).slice(0, 10),
        key_weaknesses_aggregated: Array.from(allWeaknesses).slice(0, 10),
        last_interview_at: reports[0].created_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate_id);

    if (updateError) throw updateError;

    // Trigger ML model retraining signal
    try {
      await supabase.from('intelligence_queue').insert({
        entity_type: 'candidate_profiles',
        entity_id: candidate_id,
        processing_type: 'update_ml_features',
        priority: 8,
      });
    } catch (e) {
      console.warn('[Sync Interview] Could not queue ML update:', e);
    }

    // Log activity
    try {
      await supabase.from('activity_feed').insert({
        user_id: null,
        event_type: 'interview_intelligence_synced',
        event_data: {
          candidate_id,
          interview_count: reports.length,
          interview_score: interviewScore,
          recommendation: overallRecommendation,
        },
        visibility: 'admin',
      });
    } catch (e) {
      console.warn('[Sync Interview] Could not log activity:', e);
    }

    console.log(`[Sync Interview] Successfully synced ${reports.length} interviews for candidate ${candidate_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        candidate_id,
        interviews_synced: reports.length,
        interview_score: interviewScore,
        recommendation: overallRecommendation,
        strengths_count: allStrengths.size,
        weaknesses_count: allWeaknesses.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Sync Interview] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
