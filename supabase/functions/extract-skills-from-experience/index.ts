import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { candidate_id, batch_mode = false, limit = 20 } = await req.json();

    let candidatesToProcess: any[] = [];

    if (batch_mode) {
      // Find candidates with work_history or education but empty/null skills
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id, skills, work_history, education, current_job_title, desired_job_title')
        .or('skills.is.null,skills.eq.[]')
        .not('work_history', 'is', null)
        .limit(limit);

      if (error) throw error;
      candidatesToProcess = (data || []).filter(
        (c: any) => c.work_history && Array.isArray(c.work_history) && c.work_history.length > 0
      );
    } else if (candidate_id) {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id, skills, work_history, education, current_job_title, desired_job_title')
        .eq('id', candidate_id)
        .single();

      if (error) throw error;
      if (data) candidatesToProcess = [data];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either candidate_id or batch_mode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: any[] = [];

    for (const candidate of candidatesToProcess) {
      try {
        // Build context from work history and education
        const workHistory = Array.isArray(candidate.work_history) ? candidate.work_history : [];
        const education = Array.isArray(candidate.education) ? candidate.education : [];

        if (workHistory.length === 0 && education.length === 0) continue;

        const workEntries = workHistory.map((w: any) => {
          const parts = [w.title || w.job_title || '', w.company || '', w.description || ''];
          return parts.filter(Boolean).join(' at ');
        }).join('\n');

        const eduEntries = education.map((e: any) => {
          const parts = [e.degree || '', e.field_of_study || e.field || '', e.institution || e.school || ''];
          return parts.filter(Boolean).join(', ');
        }).join('\n');

        const prompt = `Extract all professional skills from the following work history and education of a candidate.

Current/Desired Title: ${candidate.current_job_title || ''} / ${candidate.desired_job_title || ''}

Work History:
${workEntries || 'None'}

Education:
${eduEntries || 'None'}

Return a JSON object with this exact structure:
{
  "skills": [
    { "name": "Skill Name", "proficiency": "beginner|intermediate|advanced|expert", "category": "technical|soft|domain|tool|language" }
  ]
}

Rules:
- Extract SPECIFIC skills, not vague ones like "good communicator"
- Include tools, technologies, methodologies, domain expertise, and languages
- Infer proficiency from seniority and years in role (senior roles = advanced/expert)
- Include soft skills only if clearly evidenced (e.g., "team lead" → Leadership)
- Maximum 30 skills
- Return ONLY valid JSON, no markdown`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: 'You are a talent intelligence system that extracts professional skills from career histories. Return only valid JSON.' },
              { role: 'user', content: prompt }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'extract_skills',
                description: 'Extract professional skills from work history and education',
                parameters: {
                  type: 'object',
                  properties: {
                    skills: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          proficiency: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
                          category: { type: 'string', enum: ['technical', 'soft', 'domain', 'tool', 'language'] }
                        },
                        required: ['name', 'proficiency', 'category'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['skills'],
                  additionalProperties: false
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'extract_skills' } }
          }),
        });

        if (!aiResponse.ok) {
          const status = aiResponse.status;
          if (status === 429) {
            console.warn('Rate limited, stopping batch');
            break;
          }
          console.warn(`AI extraction failed for ${candidate.id}: ${status}`);
          continue;
        }

        const aiData = await aiResponse.json();

        // Parse tool call response
        let extractedSkills: any[] = [];
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          extractedSkills = parsed.skills || [];
        }

        if (extractedSkills.length === 0) continue;

        // Build skills array for candidate_profiles.skills
        const skillNames = extractedSkills.map((s: any) => s.name);

        // Merge with existing skills if any
        const existingSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
        const existingNames = new Set(existingSkills.map((s: any) =>
          (typeof s === 'string' ? s : s?.name || '').toLowerCase()
        ));
        const newSkills = extractedSkills.filter(
          (s: any) => !existingNames.has(s.name.toLowerCase())
        );
        const mergedSkillNames = [
          ...existingSkills.map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean),
          ...newSkills.map((s: any) => s.name)
        ];

        // Update candidate_profiles.skills
        await supabase
          .from('candidate_profiles')
          .update({ skills: mergedSkillNames })
          .eq('id', candidate.id);

        // Upsert into profile_skills
        for (const skill of newSkills) {
          await supabase.from('profile_skills').upsert({
            user_id: candidate.id,
            skill_name: skill.name,
            proficiency_level: skill.proficiency,
            category: skill.category,
            source: 'ai_extraction',
          }, { onConflict: 'user_id,skill_name', ignoreDuplicates: true });
        }

        results.push({
          candidate_id: candidate.id,
          skills_extracted: newSkills.length,
          total_skills: mergedSkillNames.length,
        });

      } catch (parseError) {
        console.warn(`Failed to process ${candidate.id}:`, parseError);
        results.push({ candidate_id: candidate.id, error: String(parseError) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidates_processed: candidatesToProcess.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-skills-from-experience:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
