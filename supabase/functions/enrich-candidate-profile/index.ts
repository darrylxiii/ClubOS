/**
 * Enrich Candidate Profile Edge Function
 * Generates AI summary, calculates talent tier, move probability,
 * and generates embedding — all in one call.
 */
import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { candidate_id, batch_ids } = await req.json();

  const ids = batch_ids || (candidate_id ? [candidate_id] : []);
  if (ids.length === 0) {
    return new Response(
      JSON.stringify({ error: 'candidate_id or batch_ids required' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')!;
  const supabase = ctx.supabase;

    const results: Record<string, unknown>[] = [];

    for (const cid of ids) {
      try {
        console.log(`Enriching candidate: ${cid}`);

        // 1. Fetch full candidate data
        const { data: candidate, error: fetchError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', cid)
          .single();

        if (fetchError || !candidate) {
          results.push({ id: cid, error: 'Not found' });
          continue;
        }

        // --- CACHE GUARD: Skip if enriched within last 24 hours ---
        if (candidate.ai_enrichment_data?.enriched_at) {
          const enrichedAt = new Date(candidate.ai_enrichment_data.enriched_at).getTime();
          const hoursSinceEnrichment = (Date.now() - enrichedAt) / (1000 * 60 * 60);
          if (hoursSinceEnrichment < 24) {
            console.log(`⏭️ Skipping ${candidate.full_name} — enriched ${hoursSinceEnrichment.toFixed(1)}h ago`);
            results.push({ id: cid, success: true, skipped: true, reason: 'recently_enriched' });
            continue;
          }
        }

        // Fetch related data in parallel
        const [skillsRes, experienceRes, educationRes, tagsRes, applicationsRes] = await Promise.all([
          supabase.from('profile_skills').select('skill_name, proficiency_level, years_of_experience').eq('profile_id', cid),
          supabase.from('profile_experience').select('company, title, description, start_date, end_date, is_current').eq('profile_id', cid).order('start_date', { ascending: false }),
          supabase.from('profile_education').select('institution, degree, field_of_study').eq('profile_id', cid),
          supabase.from('candidate_tag_assignments').select('tag:candidate_tag_definitions(name, category)').eq('candidate_id', cid),
          supabase.from('applications').select('id, status, created_at').eq('candidate_id', cid),
        ]);

        const skills = skillsRes.data || [];
        const experience = experienceRes.data || [];
        const education = educationRes.data || [];
        const tags = (tagsRes.data || []).map((t: Record<string, unknown>) => t.tag);
        const applications = applicationsRes.data || [];

        // 2. Build profile text for AI summary
        const profileText = buildProfileText(candidate, skills, experience, education, tags);

        // 3. Generate AI summary using Google Gemini
        const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GOOGLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash-lite',
            messages: [
              {
                role: 'system',
              content: `You are QUIN, an AI assistant for The Quantum Club — a luxury talent platform. 
Generate a concise professional summary (2-3 sentences) for a candidate profile. 
Focus on: key strengths, experience level, domain expertise, and what makes them stand out.
Also determine their talent_tier and move_probability.

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "talent_tier": "hot|warm|strategic|pool|dormant|excluded",
  "move_probability": 0.0-1.0,
  "key_strengths": ["strength1", "strength2", "strength3"],
  "recommended_roles": ["role1", "role2"]
}

Tier criteria:
- hot: Exceptional profile, strong skills, complete data, actively looking, proven track record
- warm: Good profile with relevant experience, somewhat open to opportunities
- strategic: High-value candidate for specific niches, not actively looking but worth tracking
- pool: Adequate but needs more data or less relevant experience
- dormant: Inactive for 60+ days, incomplete profile, disengaged
- excluded: Not a fit, opted out, or does not meet minimum criteria`,
              },
              { role: 'user', content: profileText },
            ],
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            console.warn('Rate limited, stopping batch');
            results.push({ id: cid, error: 'Rate limited' });
            break;
          }
          throw new Error(`AI error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '';

        // Parse AI response
        let enrichment: Record<string, unknown> = {};
        try {
          // Extract JSON from possible markdown code blocks
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            enrichment = JSON.parse(jsonMatch[0]);
          }
        } catch {
          console.warn('Failed to parse AI response, using defaults');
          enrichment = {
            summary: aiContent.slice(0, 500),
            talent_tier: 'pool',
            move_probability: 0.5,
            key_strengths: [],
            recommended_roles: [],
          };
        }

        // Validate tier against allowed values
        const VALID_TIERS = ['hot', 'warm', 'strategic', 'pool', 'dormant', 'excluded'];
        const tierMap: Record<string, string> = { star: 'hot', strong: 'warm', archive: 'dormant' };
        let tier = enrichment.talent_tier || 'pool';
        if (!VALID_TIERS.includes(tier)) {
          tier = tierMap[tier] || 'pool';
        }
        enrichment.talent_tier = tier;

        // 4. Calculate move probability from data signals
        const calculatedMoveProbability = calculateMoveProbability(candidate, applications);
        const finalMoveProbability = (enrichment.move_probability + calculatedMoveProbability) / 2;

        // 5. Generate embedding from enriched profile
        const embeddingText = [
          candidate.full_name,
          candidate.current_title,
          candidate.current_company ? `at ${candidate.current_company}` : '',
          enrichment.summary || '',
          skills.map((s: Record<string, unknown>) => s.skill_name).join(', '),
          candidate.location || '',
          enrichment.key_strengths?.join(', ') || '',
        ].filter(Boolean).join('. ');

        let embeddingVector: number[] | null = null;
        try {
          const embResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GOOGLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: embeddingText.trim(),
              encoding_format: 'float',
            }),
          });

          if (embResponse.ok) {
            const embData = await embResponse.json();
            embeddingVector = embData.data[0].embedding;
          }
        } catch (e) {
          console.warn('Embedding generation failed:', e);
        }

        // 6. Update candidate profile
        const updateData: Record<string, unknown> = {
          ai_summary: enrichment.summary || null,
          talent_tier: enrichment.talent_tier || 'pool',
          move_probability: finalMoveProbability,
          ai_enrichment_data: {
            key_strengths: enrichment.key_strengths || [],
            recommended_roles: enrichment.recommended_roles || [],
            enriched_at: new Date().toISOString(),
            model: 'gemini-2.5-flash-lite',
          },
          updated_at: new Date().toISOString(),
        };

        if (embeddingVector) {
          updateData.profile_embedding = `[${embeddingVector.join(',')}]`;
          updateData.embedding_generated_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update(updateData)
          .eq('id', cid);

        if (updateError) {
          console.error(`Update error for ${cid}:`, updateError.message);
          results.push({ id: cid, error: updateError.message });
        } else {
          results.push({
            id: cid,
            success: true,
            tier: enrichment.talent_tier,
            move_probability: finalMoveProbability,
            embedding_generated: !!embeddingVector,
            summary_length: (enrichment.summary || '').length,
          });
          console.log(`✓ Enriched ${candidate.full_name}: tier=${enrichment.talent_tier}, move=${finalMoveProbability.toFixed(2)}`);
        }

        // Rate limit protection between candidates
        if (ids.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

      } catch (e) {
        console.error(`Error enriching ${cid}:`, e);
        results.push({ id: cid, error: e instanceof Error ? e.message : 'Unknown' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => r.error).length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        enriched: successCount,
        errors: errorCount,
        results,
      }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );

}));

function buildProfileText(
  candidate: Record<string, unknown>,
  skills: Record<string, unknown>[],
  experience: Record<string, unknown>[],
  education: Record<string, unknown>[],
  tags: Record<string, unknown>[]
): string {
  const parts: string[] = [];

  parts.push(`Name: ${candidate.full_name || 'Unknown'}`);
  if (candidate.current_title) parts.push(`Title: ${candidate.current_title}`);
  if (candidate.current_company) parts.push(`Company: ${candidate.current_company}`);
  if (candidate.location) parts.push(`Location: ${candidate.location}`);
  if (candidate.bio) parts.push(`Bio: ${candidate.bio}`);
  if (candidate.years_of_experience) parts.push(`Years of experience: ${candidate.years_of_experience}`);

  if (skills.length > 0) {
    parts.push(`Skills: ${skills.map(s => `${s.skill_name} (${s.proficiency_level || 'unknown'}, ${s.years_of_experience || '?'}y)`).join(', ')}`);
  }

  if (experience.length > 0) {
    parts.push('Experience:');
    experience.forEach(e => {
      parts.push(`- ${e.title} at ${e.company}${e.is_current ? ' (current)' : ''}`);
    });
  }

  if (education.length > 0) {
    parts.push('Education:');
    education.forEach(e => {
      parts.push(`- ${e.degree || ''} ${e.field_of_study || ''} at ${e.institution || ''}`);
    });
  }

  if (tags.length > 0) {
    const tagsByCategory = tags.reduce((acc: Record<string, string[]>, t: Record<string, unknown>) => {
      if (!t) return acc;
      const cat = (t.category as string) || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t.name as string);
      return acc;
    }, {});
    Object.entries(tagsByCategory).forEach(([cat, names]) => {
      parts.push(`${cat}: ${(names as string[]).join(', ')}`);
    });
  }

  if (candidate.salary_expectation) {
    parts.push(`Salary expectation: ${candidate.salary_currency || 'EUR'} ${candidate.salary_expectation}`);
  }
  if (candidate.notice_period) parts.push(`Notice period: ${candidate.notice_period}`);
  if (candidate.actively_looking !== null) parts.push(`Actively looking: ${candidate.actively_looking ? 'Yes' : 'No'}`);
  if (candidate.profile_completeness) parts.push(`Profile completeness: ${candidate.profile_completeness}%`);

  return parts.join('\n');
}

function calculateMoveProbability(candidate: Record<string, unknown>, applications: Record<string, unknown>[]): number {
  let probability = 0.3; // base

  // Actively looking is the strongest signal
  if (candidate.actively_looking) probability += 0.3;

  // Notice period signals
  if (candidate.notice_period) {
    const notice = (candidate.notice_period as string).toLowerCase();
    if (notice.includes('immediate') || notice.includes('0')) probability += 0.2;
    else if (notice.includes('1 month') || notice.includes('2 week')) probability += 0.1;
    else if (notice.includes('3 month')) probability -= 0.05;
  }

  // Recent activity
  if (candidate.last_activity_at) {
    const daysSince = (Date.now() - new Date(candidate.last_activity_at as string).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) probability += 0.1;
    else if (daysSince < 30) probability += 0.05;
    else if (daysSince > 90) probability -= 0.1;
  }

  // Recent applications suggest interest
  const recentApps = applications.filter(a => {
    const daysAgo = (Date.now() - new Date(a.created_at as string).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo < 30;
  });
  if (recentApps.length > 0) probability += 0.1;

  return Math.min(1, Math.max(0, probability));
}
