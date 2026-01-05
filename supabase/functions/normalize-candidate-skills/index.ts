import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { candidate_id, skills_to_normalize } = await req.json();

    console.log(`[normalize-candidate-skills] Processing candidate: ${candidate_id}`);

    // Get candidate's current skills
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, skills')
      .eq('id', candidate_id)
      .single();

    if (candidateError || !candidate) {
      throw new Error(`Candidate not found: ${candidate_id}`);
    }

    const rawSkills = skills_to_normalize || candidate.skills || [];
    if (rawSkills.length === 0) {
      return new Response(
        JSON.stringify({ success: true, normalized: 0, message: 'No skills to normalize' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[normalize-candidate-skills] Processing ${rawSkills.length} skills`);

    // Get all skills from taxonomy
    const { data: taxonomy, error: taxError } = await supabase
      .from('skills_taxonomy')
      .select('id, canonical_name, display_name, synonyms, category');

    if (taxError) {
      throw taxError;
    }

    const normalizedSkills = [];
    const unmatchedSkills = [];

    for (const rawSkill of rawSkills) {
      const skillName = typeof rawSkill === 'string' ? rawSkill : rawSkill.name || rawSkill.skill;
      if (!skillName) continue;

      const normalizedSkillName = skillName.toLowerCase().trim();
      
      // Try to find a match in taxonomy
      let matchedTaxonomy = null;
      let matchConfidence = 0;

      for (const tax of taxonomy || []) {
        // Exact match on canonical name
        if (tax.canonical_name.toLowerCase() === normalizedSkillName) {
          matchedTaxonomy = tax;
          matchConfidence = 1.0;
          break;
        }

        // Check synonyms
        const synonyms = tax.synonyms || [];
        if (synonyms.some((s: string) => s.toLowerCase() === normalizedSkillName)) {
          matchedTaxonomy = tax;
          matchConfidence = 0.95;
          break;
        }

        // Fuzzy match on display name
        if (tax.display_name.toLowerCase().includes(normalizedSkillName) ||
            normalizedSkillName.includes(tax.display_name.toLowerCase())) {
          if (!matchedTaxonomy || matchConfidence < 0.7) {
            matchedTaxonomy = tax;
            matchConfidence = 0.7;
          }
        }
      }

      if (matchedTaxonomy) {
        normalizedSkills.push({
          skill_id: matchedTaxonomy.id,
          original_name: skillName,
          canonical_name: matchedTaxonomy.canonical_name,
          category: matchedTaxonomy.category,
          confidence: matchConfidence,
          proficiency_level: rawSkill.proficiency || rawSkill.level || 3,
          source: 'ai_normalized'
        });

        // Increment usage count using raw update
        await supabase
          .from('skills_taxonomy')
          .update({ usage_count: 1 })
          .eq('id', matchedTaxonomy.id);

      } else {
        unmatchedSkills.push({
          original_name: skillName,
          reason: 'No match found in taxonomy'
        });

        // Consider adding to taxonomy if it appears frequently
        // For now, just log it
        console.log(`[normalize-candidate-skills] Unmatched skill: ${skillName}`);
      }
    }

    // Store normalized skills in profile_skills table if it exists
    for (const skill of normalizedSkills) {
      const { error: insertError } = await supabase
        .from('profile_skills')
        .upsert({
          profile_id: candidate_id,
          skill_name: skill.canonical_name,
          skill_category: skill.category,
          proficiency_level: skill.proficiency_level,
          source: skill.source,
          is_verified: false,
          metadata: {
            taxonomy_id: skill.skill_id,
            original_name: skill.original_name,
            confidence: skill.confidence
          }
        }, {
          onConflict: 'profile_id,skill_name'
        });

      if (insertError) {
        console.error(`[normalize-candidate-skills] Error inserting skill:`, insertError);
      }
    }

    console.log(`[normalize-candidate-skills] Normalized ${normalizedSkills.length} skills, ${unmatchedSkills.length} unmatched`);

    return new Response(
      JSON.stringify({
        success: true,
        normalized: normalizedSkills.length,
        unmatched: unmatchedSkills.length,
        skills: normalizedSkills,
        unmatched_skills: unmatchedSkills
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[normalize-candidate-skills] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
