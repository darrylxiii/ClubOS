import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingId, meetingId, candidateId, options = {} } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`Generating dossier for recording: ${recordingId}`);

    // Fetch recording with AI analysis
    const { data: recording, error: recError } = await supabase
      .from("meeting_recordings_extended")
      .select("*")
      .eq("id", recordingId)
      .single();

    if (recError || !recording) {
      throw new Error("Recording not found");
    }

    // Fetch meeting details
    let meeting = null;
    if (recording.meeting_id) {
      const { data } = await supabase
        .from("meetings")
        .select("*, host:profiles!meetings_host_id_fkey(full_name, email)")
        .eq("id", recording.meeting_id)
        .single();
      meeting = data;
    }

    // Fetch candidate details if provided
    let candidate = null;
    if (candidateId) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", candidateId)
        .single();
      candidate = data;
    }

    // Fetch existing insights
    const { data: insights } = await supabase
      .from("meeting_insights")
      .select("*")
      .eq("recording_id", recordingId);

    // Fetch scorecards
    const { data: scorecards } = await supabase
      .from("interview_scores")
      .select("*, interviewer:profiles!interview_scores_interviewer_id_fkey(full_name)")
      .eq("meeting_id", recording.meeting_id || meetingId);

    // Build dossier content
    const aiSummary = recording.ai_summary || {};
    const candidateEval = aiSummary.candidateEvaluation || {};
    const decisionGuidance = aiSummary.decisionGuidance || {};
    
    const dossierContent = {
      generatedAt: new Date().toISOString(),
      recording: {
        id: recording.id,
        title: recording.title || meeting?.title,
        duration: recording.duration_seconds,
        date: recording.created_at,
        participants: recording.participants || []
      },
      meeting: meeting ? {
        id: meeting.id,
        title: meeting.title,
        type: meeting.meeting_type,
        host: meeting.host?.full_name
      } : null,
      candidate: candidate ? {
        id: candidate.id,
        name: candidate.full_name,
        email: candidate.email,
        headline: candidate.headline,
        current_company: candidate.current_company,
        current_title: candidate.current_title
      } : null,
      analysis: {
        executiveSummary: aiSummary.executiveSummary || recording.executive_summary,
        overallFit: candidateEval.overallFit,
        strengths: candidateEval.strengths || [],
        areasForGrowth: candidateEval.areasForGrowth || [],
        recommendation: decisionGuidance.recommendation,
        confidenceLevel: decisionGuidance.confidenceLevel,
        keyInsights: decisionGuidance.keyInsights || [],
        suggestedNextSteps: decisionGuidance.suggestedNextSteps || []
      },
      insights: (insights || []).map((i: any) => ({
        type: i.insight_type,
        title: i.title,
        content: i.content,
        sentiment: i.sentiment,
        priority: i.priority
      })),
      scorecards: (scorecards || []).map((s: any) => ({
        interviewer: s.interviewer?.full_name,
        technicalScore: s.technical_score,
        communicationScore: s.communication_score,
        problemSolvingScore: s.problem_solving_score,
        cultureFitScore: s.culture_fit_score,
        overallRating: s.overall_rating,
        notes: s.notes
      })),
      keyMoments: aiSummary.keyMoments || [],
      actionItems: aiSummary.actionItems || []
    };

    // Generate share token
    const shareToken = crypto.randomUUID().replace(/-/g, '');
    
    // Set expiry (default 72 hours)
    const expiryHours = options.expiryHours || 72;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Create dossier record
    const { data: dossier, error: dossierError } = await supabase
      .from("meeting_dossiers")
      .insert({
        meeting_id: recording.meeting_id || meetingId,
        recording_id: recordingId,
        candidate_id: candidateId,
        generated_by: user.id,
        title: `Interview Dossier - ${candidate?.full_name || recording.title || 'Unknown'}`,
        content: dossierContent,
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
        watermark_text: `Confidential - ${new Date().toLocaleDateString()} - The Quantum Club`
      })
      .select()
      .single();

    if (dossierError) {
      console.error("Error creating dossier:", dossierError);
      throw dossierError;
    }

    console.log(`Dossier created: ${dossier.id}`);

    // Generate shareable URL
    const shareUrl = `${supabaseUrl.replace('.supabase.co', '')}/dossier/${shareToken}`;

    return new Response(
      JSON.stringify({
        success: true,
        dossier: {
          id: dossier.id,
          shareToken,
          shareUrl,
          expiresAt: expiresAt.toISOString(),
          content: dossierContent
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating dossier:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
