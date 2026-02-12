import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { candidateId } = await req.json();
    if (!candidateId) throw new Error('candidateId is required');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: candidate, error: fetchErr } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (fetchErr || !candidate) throw new Error('Candidate not found');

    // Build comprehensive context
    const context: string[] = [];
    context.push(`Name: ${candidate.full_name || 'Unknown'}`);
    context.push(`Title: ${candidate.current_title || 'N/A'}`);
    context.push(`Company: ${candidate.current_company || 'N/A'}`);
    context.push(`Experience: ${candidate.years_of_experience || 'N/A'} years`);

    if (candidate.skills?.length) {
      context.push(`Skills: ${(candidate.skills as string[]).join(', ')}`);
    }
    if (candidate.work_history) {
      context.push(`Work History: ${JSON.stringify(candidate.work_history).slice(0, 2000)}`);
    }
    if (candidate.education) {
      context.push(`Education: ${JSON.stringify(candidate.education).slice(0, 500)}`);
    }
    if (candidate.github_profile_data) {
      const gh = candidate.github_profile_data as any;
      if (gh.found) {
        context.push(`GitHub: ${gh.public_repos} repos, ${gh.followers} followers, top languages: ${(gh.top_languages || []).join(', ')}`);
        if (gh.pinned_repos?.length) {
          context.push(`Notable repos: ${gh.pinned_repos.map((r: any) => `${r.name} (${r.stars}★)`).join(', ')}`);
        }
      }
    }
    if (candidate.public_mentions) {
      const pm = candidate.public_mentions as any;
      if (pm.articles?.length) {
        context.push(`Published articles: ${pm.articles.slice(0, 5).map((a: any) => a.title).join('; ')}`);
      }
      if (pm.talks?.length) {
        context.push(`Talks/appearances: ${pm.talks.slice(0, 5).map((t: any) => t.title).join('; ')}`);
      }
    }
    if (candidate.ai_summary) {
      context.push(`Existing AI summary: ${candidate.ai_summary}`);
    }
    if (candidate.notice_period) {
      context.push(`Notice period: ${candidate.notice_period}`);
    }

    const systemPrompt = `You are QUIN, the AI intelligence engine for The Quantum Club, a luxury talent platform. 
You produce concise, executive-grade candidate intelligence briefs. Be direct and substantive. Never fabricate credentials.

You MUST respond with a valid JSON object using this exact structure:
{
  "executive_summary": "3-sentence summary of the candidate's profile, strengths, and potential",
  "differentiators": ["Top 3-5 unique differentiators that set this candidate apart"],
  "risk_factors": ["Any concerns: job hopping patterns, skill gaps, notice period issues, etc."],
  "interview_angles": ["3-4 recommended interview topics based on their background"],
  "skill_verification": [
    {"skill": "SkillName", "confidence": 0.0-1.0, "evidence_count": 0, "evidence_summary": "brief explanation"}
  ],
  "overall_confidence": 0.0-1.0,
  "talent_signals": ["Notable positive signals from public presence, GitHub, etc."]
}`;

    const userPrompt = `Generate a 360-degree intelligence brief for this candidate:\n\n${context.join('\n')}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error('[generate-brief] AI error:', errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let brief: any;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      brief = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.warn('[generate-brief] Failed to parse AI JSON, using raw content');
      brief = {
        executive_summary: content.slice(0, 500),
        differentiators: [],
        risk_factors: [],
        interview_angles: [],
        skill_verification: [],
        overall_confidence: 0.5,
        talent_signals: [],
        raw_response: true,
      };
    }

    brief.generated_at = new Date().toISOString();
    brief.model = 'google/gemini-3-flash-preview';

    // Build skill verification from brief
    const skillVerification = (brief.skill_verification || []).reduce((acc: any, sv: any) => {
      acc[sv.skill] = {
        confidence: sv.confidence,
        evidence_count: sv.evidence_count,
        evidence_summary: sv.evidence_summary,
      };
      return acc;
    }, {});

    // Update candidate
    await supabase
      .from('candidate_profiles')
      .update({
        candidate_brief: brief,
        skill_verification: Object.keys(skillVerification).length > 0 ? skillVerification : null,
        enrichment_sources: [...(candidate.enrichment_sources || []).filter((s: string) => s !== 'ai_brief'), 'ai_brief'],
      })
      .eq('id', candidateId);

    // Audit log
    await supabase.from('audit_logs').insert({
      action: 'enrichment.candidate_brief',
      entity_type: 'candidate_profile',
      entity_id: candidateId,
      details: { confidence: brief.overall_confidence, differentiators: brief.differentiators?.length },
    }).catch(() => {});

    console.log(`[generate-brief] Brief generated for ${candidate.full_name}, confidence: ${brief.overall_confidence}`);

    return new Response(JSON.stringify({
      success: true,
      data: brief,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[generate-brief] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
