import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildEmbeddingText(candidate: any): string {
  const parts: string[] = [];

  if (candidate.current_title) parts.push(`Title: ${candidate.current_title}`);
  if (candidate.current_company) parts.push(`Company: ${candidate.current_company}`);
  if (candidate.ai_summary) parts.push(`Summary: ${candidate.ai_summary}`);

  // Skills
  const skills = candidate.skills as any[];
  if (Array.isArray(skills) && skills.length > 0) {
    const skillNames = skills.map((s: any) => typeof s === "string" ? s : s.name).filter(Boolean);
    parts.push(`Skills: ${skillNames.join(", ")}`);
  }

  // Work history (recent 3)
  const wh = candidate.work_history as any[];
  if (Array.isArray(wh)) {
    const recent = wh.slice(0, 3);
    for (const entry of recent) {
      const line = [entry.title, entry.company, entry.description].filter(Boolean).join(" at ");
      if (line) parts.push(line);
    }
  }

  // Industry preferences
  if (candidate.industry_preference) {
    const prefs = Array.isArray(candidate.industry_preference)
      ? candidate.industry_preference.join(", ")
      : candidate.industry_preference;
    parts.push(`Industry: ${prefs}`);
  }

  return parts.join(". ").slice(0, 8000); // Keep under token limits
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { candidateId, candidateIds, batchSize = 10 } = await req.json();
    const ids = candidateIds || (candidateId ? [candidateId] : []);

    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: "No candidate IDs provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process in batches
    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);

      const { data: candidates } = await supabase
        .from("candidate_profiles")
        .select("id, current_title, current_company, ai_summary, skills, work_history, industry_preference")
        .in("id", batch);

      for (const c of candidates || []) {
        const text = buildEmbeddingText(c);
        if (text.length < 20) { skipped++; continue; }

        try {
          // Use Lovable AI to generate a condensed representation, then store as text
          // Since we don't have a vector embedding model, we store the text for future
          // similarity matching via the AI gateway
          if (!lovableKey) {
            // Fallback: store the text itself as a searchable representation
            await supabase
              .from("candidate_profiles")
              .update({
                ai_enrichment_data: {
                  ...(c as any).ai_enrichment_data,
                  embedding_text: text,
                  embedding_generated_at: new Date().toISOString(),
                },
              })
              .eq("id", c.id);
            generated++;
            continue;
          }

          // Use AI to generate a structured embedding-ready summary
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: "Extract key matching attributes from this candidate profile. Return a single dense paragraph optimized for semantic similarity matching against job descriptions. Include: core competencies, industry expertise, seniority level, technical skills, and domain knowledge. Be factual and concise.",
                },
                { role: "user", content: text },
              ],
            }),
          });

          if (!aiResp.ok) {
            if (aiResp.status === 429 || aiResp.status === 402) {
              errors.push(`Rate limited at candidate ${c.id}`);
              break; // Stop processing on rate limit
            }
            errors.push(`AI error for ${c.id}: ${aiResp.status}`);
            continue;
          }

          const aiData = await aiResp.json();
          const embeddingText = aiData.choices?.[0]?.message?.content || text;

          await supabase
            .from("candidate_profiles")
            .update({
              ai_enrichment_data: {
                ...(c as any).ai_enrichment_data,
                embedding_text: embeddingText,
                embedding_generated_at: new Date().toISOString(),
              },
            })
            .eq("id", c.id);

          generated++;
        } catch (err) {
          errors.push(`Error for ${c.id}: ${err.message}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, generated, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embedding error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
