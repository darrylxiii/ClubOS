import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { import_id, company_id, interaction_id, participant_names } = await req.json();

    if (!company_id || !participant_names || !Array.isArray(participant_names)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Entity Resolution] Resolving ${participant_names.length} participants for company ${company_id}`);

    // Get existing stakeholders for this company
    const { data: existingStakeholders } = await supabaseClient
      .from('company_stakeholders')
      .select('*')
      .eq('company_id', company_id);

    const matched: Array<{ name: string; stakeholder_id: string; confidence: number }> = [];
    const created: Array<{ name: string; stakeholder_id: string }> = [];

    for (const name of participant_names) {
      const cleanName = name.trim();
      if (!cleanName) continue;

      // Try to find exact or fuzzy match
      let bestMatch = null;
      let bestScore = 0;

      for (const stakeholder of existingStakeholders || []) {
        const score = calculateNameSimilarity(cleanName, stakeholder.full_name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = stakeholder;
        }
      }

      // If confidence is high enough (>80), use existing stakeholder
      if (bestMatch && bestScore > 80) {
        matched.push({
          name: cleanName,
          stakeholder_id: bestMatch.id,
          confidence: bestScore,
        });

        // Link messages to this stakeholder
        await supabaseClient
          .from('interaction_messages')
          .update({ sender_stakeholder_id: bestMatch.id })
          .eq('interaction_id', interaction_id)
          .eq('sender_name', cleanName);

        // Add as participant
        const { error: participantError } = await supabaseClient
          .from('interaction_participants')
          .insert({
            interaction_id,
            stakeholder_id: bestMatch.id,
            participation_type: 'sender',
          });

        // Ignore if already exists
        if (participantError && !participantError.message.includes('duplicate')) {
          console.error('[Entity Resolution] Error adding participant:', participantError);
        }

      } else {
        // Create new stakeholder
        const { data: newStakeholder, error: createError } = await supabaseClient
          .from('company_stakeholders')
          .insert({
            company_id,
            full_name: cleanName,
            role_type: 'unknown',
            first_contacted_at: new Date().toISOString(),
            last_contacted_at: new Date().toISOString(),
            total_interactions: 1,
          })
          .select()
          .single();

        if (createError) {
          console.error('[Entity Resolution] Error creating stakeholder:', createError);
          continue;
        }

        created.push({
          name: cleanName,
          stakeholder_id: newStakeholder.id,
        });

        // Link messages to new stakeholder
        await supabaseClient
          .from('interaction_messages')
          .update({ sender_stakeholder_id: newStakeholder.id })
          .eq('interaction_id', interaction_id)
          .eq('sender_name', cleanName);

        // Add as participant
        const { error: participantError } = await supabaseClient
          .from('interaction_participants')
          .insert({
            interaction_id,
            stakeholder_id: newStakeholder.id,
            participation_type: 'sender',
          });

        // Ignore if already exists
        if (participantError && !participantError.message.includes('duplicate')) {
          console.error('[Entity Resolution] Error adding participant:', participantError);
        }
      }
    }

    // Update import with resolution results
    if (import_id) {
      await supabaseClient
        .from('whatsapp_imports')
        .update({
          stakeholders_matched: matched.length,
          stakeholders_created: created.length,
        })
        .eq('id', import_id);
    }

    console.log(`[Entity Resolution] Matched: ${matched.length}, Created: ${created.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        matched,
        created,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Entity Resolution] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to calculate name similarity
function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  // Exact match
  if (n1 === n2) return 100;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 90;

  // Remove special characters and compare
  const clean1 = n1.replace(/[^a-z0-9]/g, '');
  const clean2 = n2.replace(/[^a-z0-9]/g, '');
  if (clean1 === clean2) return 95;

  // Split into words and check overlap
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  const overlap = words1.filter(w => words2.includes(w)).length;
  const maxWords = Math.max(words1.length, words2.length);
  
  if (overlap > 0) {
    return Math.round((overlap / maxWords) * 85);
  }

  // Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  const similarity = (1 - distance / maxLength) * 70;

  return Math.round(similarity);
}

// Levenshtein distance algorithm
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}
