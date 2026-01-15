
interface ActionContext {
    supabase: any;
    payload: any;
    userId: string | null;
}

export async function handleGenerateExecutiveBriefing({ supabase, payload, userId }: ActionContext) {
    const { candidateId, jobId } = payload;

    if (!userId) throw new Error('Unauthorized');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Fetch candidate and application data
    const { data: candidate, error: candError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();

    if (candError) throw new Error(`Candidate not found`);

    const { data: application } = await supabase
        .from('applications')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('job_id', jobId)
        .maybeSingle();

    const { data: feedback } = await supabase
        .from('interview_feedback')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

    const prompt = `Generate a one-page executive briefing for quick decision-making (30-second read).

CANDIDATE: ${candidate?.full_name} - ${candidate?.current_title}
MATCH SCORE: ${application?.match_score || 'N/A'}%
INTERVIEW ROUNDS: ${feedback?.length || 0}

FEEDBACK SUMMARY:
${feedback?.map((f: any) => `- ${f.recommendation}: Tech ${f.technical_rating}/5, Culture ${f.culture_fit_rating}/5`).join('\n') || 'No feedback yet'}

Generate a JSON response:
{
  "headline": "One sentence summary (max 15 words)",
  "topThreeStrengths": ["strength 1", "strength 2", "strength 3"],
  "topThreeConcerns": ["concern 1", "concern 2", "concern 3"],
  "teamConsensus": {
    "score": 85,
    "confidence": "high|medium|low",
    "alignment": "strong|moderate|weak"
  },
  "aiRecommendation": "hire|no_hire|need_more_info",
  "aiRecommendationReasoning": "One sentence why (max 20 words)",
  "nextStep": "Specific action to take next",
  "riskFactors": ["risk 1", "risk 2"],
  "opportunityCost": "What we lose if we don't hire (one sentence)",
  "readTime": "30 seconds"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: 'You are an executive briefing AI. Be concise, clear, and actionable. Always respond with valid JSON.' },
                { role: 'user', content: prompt }
            ],
        }),
    });

    if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';

    let briefing;
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        briefing = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
        // Fallback if parsing fails
        briefing = {
            headline: `${candidate?.full_name} - Analysis unavailable`,
            topThreeStrengths: [],
            topThreeConcerns: [],
            teamConsensus: { score: 0, confidence: "low", alignment: "weak" },
            aiRecommendation: "need_more_info",
            aiRecommendationReasoning: "AI parsing error",
            nextStep: "Manual review required",
            riskFactors: [],
            opportunityCost: "",
            readTime: "0 seconds"
        };
    }

    return { briefing };
}
