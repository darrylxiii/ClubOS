import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';
import { fetchAI, handleAIError, createTimeoutResponse, AITimeoutError } from '../_shared/ai-fetch.ts';
import { CommonErrors } from '../_shared/error-responses.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    console.log('[generate-interview-report] Processing request');
    
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[generate-interview-report] No auth header');
      return CommonErrors.unauthorized(publicCorsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.log('[generate-interview-report] Auth failed:', authError?.message);
      return CommonErrors.unauthorized(publicCorsHeaders);
    }

    userId = user.id;

    // Rate limiting: 10 reports per hour (expensive operation)
    const rateLimit = await checkUserRateLimit(userId, 'generate-interview-report', 10);
    if (!rateLimit.allowed) {
      console.log('[generate-interview-report] Rate limit exceeded for user:', userId);
      await logAIUsage({
        userId,
        functionName: 'generate-interview-report',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, publicCorsHeaders);
    }

    const { meetingId, candidateId, roleTitle, companyName } = await req.json();

    // Fetch meeting transcript
    const { data: transcripts } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('timestamp_ms', { ascending: true });

    const fullTranscript = transcripts?.map(t => t.text).join(' ') || '';

    // Fetch real-time intelligence if available
    const { data: intelligence } = await supabase
      .from('interview_intelligence')
      .select('*')
      .eq('meeting_id', meetingId)
      .single();

    console.log('[generate-interview-report] Calling Lovable AI for meeting:', meetingId);

    // Generate AI report with 45s timeout (longer for complex analysis)
    const response = await fetchAI({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an expert interview analyst. Generate a comprehensive post-interview report.

Your response must be valid JSON in this exact format:
{
  "executive_summary": "2-3 paragraph summary",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "key_weaknesses": ["weakness 1", "weakness 2"],
  "technical_assessment": "Detailed paragraph",
  "cultural_fit_assessment": "Detailed paragraph",
  "communication_assessment": "Detailed paragraph",
  "highlights": [
    {"timestamp": "00:00", "description": "highlight description", "type": "strength|weakness|neutral"}
  ],
  "recommendation": "advance|reject|reconsider",
  "recommendation_confidence": 0-100,
  "recommendation_reasoning": "Detailed reasoning for recommendation"
}`
        },
        {
          role: "user",
          content: `Generate a post-interview report for:

Role: ${roleTitle}
Company: ${companyName}

Full Interview Transcript:
${fullTranscript.substring(0, 8000)}

${intelligence ? `Real-time Scores:
- Communication: ${intelligence.communication_clarity_score}/100
- Technical: ${intelligence.technical_depth_score}/100
- Culture Fit: ${intelligence.culture_fit_score}/100
- Overall: ${intelligence.overall_score}/100` : ''}

Generate a comprehensive interview report with all required fields.`
        }
      ],
      temperature: 0.7,
    }, { timeoutMs: 45000 });

    // Handle AI errors consistently
    const errorResponse = handleAIError(response, publicCorsHeaders);
    if (errorResponse) {
      await logAIUsage({
        userId,
        functionName: 'generate-interview-report',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage: `AI error: ${response.status}`
      });
      return errorResponse;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-interview-report] AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse JSON response
    let report;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[generate-interview-report] Failed to parse AI response:", analysisText);
      report = {
        executive_summary: "Interview completed. Review transcript for detailed assessment.",
        key_strengths: ["Engaged with interviewer"],
        key_weaknesses: [],
        technical_assessment: "Review required.",
        cultural_fit_assessment: "Review required.",
        communication_assessment: "Review required.",
        highlights: [],
        recommendation: "reconsider",
        recommendation_confidence: 50,
        recommendation_reasoning: "Manual review recommended."
      };
    }

    // Store report in database
    const { data: reportData, error: insertError } = await supabase
      .from('interview_reports')
      .insert({
        meeting_id: meetingId,
        candidate_id: candidateId,
        executive_summary: report.executive_summary,
        key_strengths: report.key_strengths,
        key_weaknesses: report.key_weaknesses,
        technical_assessment: report.technical_assessment,
        cultural_fit_assessment: report.cultural_fit_assessment,
        communication_assessment: report.communication_assessment,
        highlights: report.highlights,
        recommendation: report.recommendation,
        recommendation_confidence: report.recommendation_confidence,
        recommendation_reasoning: report.recommendation_reasoning,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-interview-report] Error inserting report:', insertError);
      throw insertError;
    }

    await logAIUsage({
      userId,
      functionName: 'generate-interview-report',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    console.log('[generate-interview-report] Report generated successfully for meeting:', meetingId);

    return new Response(
      JSON.stringify({ report: reportData }),
      { headers: { ...publicCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-interview-report] Error:", error);
    
    // Handle timeout errors specifically
    if (error instanceof AITimeoutError) {
      await logAIUsage({
        userId,
        functionName: 'generate-interview-report',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage: 'Request timed out'
      });
      return createTimeoutResponse(publicCorsHeaders);
    }

    await logAIUsage({
      userId,
      functionName: 'generate-interview-report',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });
    return CommonErrors.internalError(publicCorsHeaders, error instanceof Error ? error.message : "Unknown error");
  }
});