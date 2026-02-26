import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash for change detection
function simpleHash(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, jobId, force } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate data
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    // Fetch application and interview data in parallel
    const [{ data: application }, { data: feedback }, { data: meetings }, { data: experience }, { data: skills }] = await Promise.all([
      supabase.from('applications').select('*, stages').eq('candidate_id', candidateId).eq('job_id', jobId).single(),
      supabase.from('interview_feedback').select('*, bookings(*)').eq('candidate_id', candidateId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, meeting_transcripts(*)').eq('guest_email', candidate?.email).order('scheduled_start', { ascending: false }),
      supabase.from('experience').select('*').eq('candidate_id', candidateId),
      supabase.from('skills').select('*').eq('candidate_id', candidateId),
    ]);

    // Compute data hash for change detection
    const dataHash = simpleHash({
      appStatus: application?.status,
      stageIndex: application?.current_stage_index,
      matchScore: application?.match_score,
      feedbackCount: feedback?.length || 0,
      feedbackRecs: feedback?.map(f => f.recommendation),
      skillCount: skills?.length || 0,
    });

    // === DB CACHE CHECK ===
    if (!force) {
      const { data: cachedRow } = await supabase
        .from('ai_generated_content')
        .select('content, metadata')
        .eq('content_type', 'candidate_dossier')
        .eq('entity_id', `${candidateId}:${jobId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedRow) {
        const cachedMeta = cachedRow.metadata as any;
        const cachedAt = cachedMeta?.cached_at ? new Date(cachedMeta.cached_at).getTime() : 0;
        const isFresh = Date.now() - cachedAt < CACHE_TTL_MS;
        const hashMatches = cachedMeta?.data_hash === dataHash;

        if (isFresh || hashMatches) {
          console.log(`[generate-dossier] Cache HIT (fresh=${isFresh}, hashMatch=${hashMatches})`);
          return new Response(JSON.stringify({ dossier: cachedRow.content, cached: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Generate AI dossier
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Generate a comprehensive candidate intelligence dossier for hiring decisions.

CANDIDATE PROFILE:
Name: ${candidate?.full_name}
Current Title: ${candidate?.current_title}
Location: ${candidate?.location}
Email: ${candidate?.email}

EXPERIENCE:
${experience?.map(e => `- ${e.title} at ${e.company} (${e.start_date} - ${e.end_date || 'Present'})`).join('\n')}

SKILLS:
${skills?.map(s => `- ${s.skill_name} (${s.proficiency_level})`).join('\n')}

APPLICATION STATUS:
- Stage: ${application?.stages?.[application?.current_stage_index]?.name}
- Match Score: ${application?.match_score}%
- Applied: ${new Date(application?.applied_at).toLocaleDateString()}

INTERVIEW FEEDBACK (${feedback?.length || 0} rounds):
${feedback?.map(f => `
Round: ${f.bookings?.title}
Recommendation: ${f.recommendation}
Ratings: Technical ${f.technical_rating}/5, Culture ${f.culture_fit_rating}/5, Communication ${f.communication_rating}/5
Strengths: ${f.key_strengths?.join(', ')}
Concerns: ${f.areas_for_improvement?.join(', ')}
Notes: ${f.notes}
`).join('\n---\n')}

MEETING INSIGHTS:
${meetings?.map(m => `
Meeting: ${m.title}
Date: ${new Date(m.scheduled_start).toLocaleDateString()}
Transcript available: ${m.meeting_transcripts?.length > 0 ? 'Yes' : 'No'}
`).join('\n')}

Generate a JSON response with this exact structure:
{
  "executiveSummary": "2-3 sentence overview of candidate's profile and fit",
  "topStrengths": ["strength 1", "strength 2", "strength 3"],
  "topConcerns": ["concern 1", "concern 2", "concern 3"],
  "sentimentAnalysis": {
    "overall": "positive|neutral|negative",
    "confidence": 0.85,
    "keyIndicators": ["indicator 1", "indicator 2"]
  },
  "redFlags": [
    {
      "flag": "description of concern",
      "severity": "low|medium|high",
      "evidence": "supporting evidence",
      "confidence": 0.75
    }
  ],
  "cultureFitScore": 85,
  "technicalScore": 90,
  "communicationScore": 88,
  "overallFitScore": 88,
  "recommendation": "strong_hire|hire|maybe|no_hire",
  "recommendationReasoning": "2-3 sentence explanation",
  "nextBestAction": "specific actionable recommendation",
  "interviewConsensus": {
    "aligned": true,
    "dissenting": 0,
    "keyDebates": ["topic 1 if any"]
  },
  "comparisonToOtherCandidates": "brief comparison if multiple candidates",
  "predictedOfferAcceptance": 0.85,
  "retentionRisk": "low|medium|high",
  "timeToProductivity": "fast|average|slow"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are a talent intelligence AI that generates comprehensive hiring insights. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    let dossier;

    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      dossier = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      dossier = {
        executiveSummary: "Unable to generate summary at this time.",
        topStrengths: ["Data analysis in progress"],
        topConcerns: ["More data needed"],
        sentimentAnalysis: { overall: "neutral", confidence: 0.5, keyIndicators: [] },
        redFlags: [],
        cultureFitScore: 75,
        technicalScore: 75,
        communicationScore: 75,
        overallFitScore: 75,
        recommendation: "maybe",
        recommendationReasoning: "Insufficient data for comprehensive analysis.",
        nextBestAction: "Schedule additional interviews",
        interviewConsensus: { aligned: true, dissenting: 0, keyDebates: [] },
        predictedOfferAcceptance: 0.7,
        retentionRisk: "medium",
        timeToProductivity: "average"
      };
    }

    // Store in DB cache
    await supabase.from('ai_generated_content').upsert({
      content_type: 'candidate_dossier',
      entity_id: `${candidateId}:${jobId}`,
      content: dossier,
      metadata: { data_hash: dataHash, cached_at: new Date().toISOString() },
    }, { onConflict: 'content_type,entity_id' }).then(() => {});

    return new Response(JSON.stringify({ dossier }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating dossier:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
