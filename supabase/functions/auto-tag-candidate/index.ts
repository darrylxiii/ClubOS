import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mapping rules: keyword patterns → tag category + name
const SENIORITY_PATTERNS: Record<string, string[]> = {
  "C-Level": ["ceo", "cto", "cfo", "coo", "cmo", "chief", "founder", "co-founder"],
  "VP": ["vice president", "vp of", "svp", "evp"],
  "Director": ["director", "head of"],
  "Lead": ["lead", "principal", "staff", "architect"],
  "Senior": ["senior", "sr.", "sr "],
  "Mid": ["mid-level", "intermediate"],
  "Junior": ["junior", "jr.", "jr ", "associate", "entry", "intern", "trainee", "graduate"],
};

const FUNCTION_PATTERNS: Record<string, string[]> = {
  "Engineering": ["engineer", "developer", "software", "devops", "sre", "backend", "frontend", "full-stack", "fullstack", "ios", "android", "mobile", "qa", "test", "infrastructure"],
  "Product": ["product manager", "product owner", "product lead", "product director"],
  "Design": ["designer", "ux", "ui", "creative director", "art director", "graphic"],
  "Marketing": ["marketing", "growth", "brand", "content", "seo", "sem", "social media", "communications"],
  "Sales": ["sales", "account executive", "business development", "bdr", "sdr", "revenue"],
  "Operations": ["operations", "ops", "supply chain", "logistics", "procurement"],
  "Finance": ["finance", "accounting", "controller", "treasurer", "financial analyst", "fp&a"],
  "HR": ["human resources", "hr ", "people", "talent acquisition", "recruiter", "recruiting"],
  "Legal": ["legal", "counsel", "attorney", "compliance", "regulatory"],
  "Data": ["data scientist", "data analyst", "data engineer", "machine learning", "ml ", "ai "],
};

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  "Fintech": ["fintech", "banking", "payments", "financial services", "insurance", "insurtech"],
  "Fashion": ["fashion", "apparel", "clothing", "luxury", "retail"],
  "Beauty": ["beauty", "cosmetics", "skincare", "wellness"],
  "Tech": ["technology", "saas", "cloud", "platform", "software"],
  "Healthcare": ["healthcare", "health", "medical", "pharma", "biotech", "clinical"],
  "SaaS": ["saas", "subscription", "b2b software"],
  "E-commerce": ["e-commerce", "ecommerce", "marketplace", "online retail", "dtc", "d2c"],
};

function matchPatterns(text: string, patterns: Record<string, string[]>): string | null {
  const lower = text.toLowerCase();
  for (const [tagName, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => lower.includes(kw))) return tagName;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { candidateId, candidateIds } = await req.json();
    const ids = candidateIds || (candidateId ? [candidateId] : []);

    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: "No candidate IDs provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load tag definitions
    const { data: tagDefs } = await supabase
      .from("candidate_tag_definitions")
      .select("id, name, category");

    const tagMap = new Map<string, string>(); // "category:name" → tag id
    for (const t of tagDefs || []) {
      tagMap.set(`${t.category}:${t.name}`, t.id);
    }

    // Load candidate profiles
    const { data: candidates } = await supabase
      .from("candidate_profiles")
      .select("id, current_title, current_company, work_history, skills, ai_enrichment_data")
      .in("id", ids);

    let assigned = 0;
    let skipped = 0;

    for (const c of candidates || []) {
      const textParts: string[] = [];
      if (c.current_title) textParts.push(c.current_title);
      if (c.current_company) textParts.push(c.current_company);

      // Include work history titles/companies
      const wh = c.work_history as any[];
      if (Array.isArray(wh)) {
        for (const entry of wh) {
          if (entry.title) textParts.push(entry.title);
          if (entry.company) textParts.push(entry.company);
          if (entry.industry) textParts.push(entry.industry);
        }
      }

      // Include skills
      const skills = c.skills as any[];
      if (Array.isArray(skills)) {
        for (const s of skills) {
          textParts.push(typeof s === "string" ? s : s.name || "");
        }
      }

      const combinedText = textParts.join(" ");
      if (!combinedText.trim()) { skipped++; continue; }

      const tagsToAssign: string[] = [];

      // Seniority
      const seniority = matchPatterns(combinedText, SENIORITY_PATTERNS);
      if (seniority) {
        const tid = tagMap.get(`seniority:${seniority}`);
        if (tid) tagsToAssign.push(tid);
      }

      // Function
      const func = matchPatterns(combinedText, FUNCTION_PATTERNS);
      if (func) {
        const tid = tagMap.get(`function:${func}`);
        if (tid) tagsToAssign.push(tid);
      }

      // Industry (can match multiple)
      for (const [indName, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        if (keywords.some(kw => combinedText.toLowerCase().includes(kw))) {
          const tid = tagMap.get(`industry:${indName}`);
          if (tid) tagsToAssign.push(tid);
        }
      }

      // Bulk upsert assignments (ignore conflicts)
      if (tagsToAssign.length > 0) {
        const rows = tagsToAssign.map(tagId => ({
          candidate_id: c.id,
          tag_id: tagId,
        }));
        const { error } = await supabase
          .from("candidate_tag_assignments")
          .upsert(rows, { onConflict: "candidate_id,tag_id", ignoreDuplicates: true });
        if (!error) assigned += tagsToAssign.length;
      }
    }

    return new Response(JSON.stringify({ success: true, assigned, skipped, total: ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-tag error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
