import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "strategist"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { raw_content, job_id, dump_id } = await req.json();

    if (!raw_content || !job_id) {
      return new Response(JSON.stringify({ error: "raw_content and job_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI to extract candidates
    const aiResponse = await fetch("https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/ai-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert recruiter assistant that extracts candidate information from emails.

RULES:
- Extract ALL people mentioned as CANDIDATES (not email senders, recruiters, or hiring managers)
- For each candidate extract: full_name, email, phone, current_title, current_company, linkedin_url, notes
- Normalize LinkedIn URLs to https://linkedin.com/in/username format
- Parse phone numbers with country codes when possible
- If information is missing, leave the field as empty string
- Set confidence between 0 and 1 based on how complete/clear the extraction is
- Extract from forwarded email chains - only candidates, not email metadata people
- Handle multiple emails pasted together
- Return valid JSON only`
          },
          {
            role: "user",
            content: `Extract all candidate information from the following email content. Return a JSON object with a "candidates" array where each candidate has: full_name (required), email, phone, current_title, current_company, linkedin_url, notes, confidence (0-1).

EMAIL CONTENT:
${raw_content}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI proxy error:", status, errText);
      throw new Error(`AI extraction failed: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI returned invalid JSON");
    }

    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];

    // Validate and normalize candidates
    const normalizedCandidates = candidates
      .filter((c: any) => c.full_name && c.full_name.trim().length > 0)
      .map((c: any, index: number) => ({
        id: crypto.randomUUID(),
        full_name: (c.full_name || "").trim(),
        email: (c.email || "").trim().toLowerCase(),
        phone: (c.phone || "").trim(),
        current_title: (c.current_title || "").trim(),
        current_company: (c.current_company || "").trim(),
        linkedin_url: normalizeLinkedIn(c.linkedin_url || ""),
        notes: (c.notes || "").trim(),
        confidence: typeof c.confidence === "number" ? Math.min(1, Math.max(0, c.confidence)) : 0.5,
        selected: true,
        duplicate_of: null,
      }));

    // Update the dump record if dump_id provided
    if (dump_id) {
      await supabase
        .from("job_email_dumps")
        .update({
          extracted_candidates: normalizedCandidates,
          processed_at: new Date().toISOString(),
          import_status: normalizedCandidates.length > 0 ? "pending" : "failed",
        })
        .eq("id", dump_id);
    }

    return new Response(
      JSON.stringify({ candidates: normalizedCandidates, count: normalizedCandidates.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-email-candidates error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function normalizeLinkedIn(url: string): string {
  if (!url) return "";
  url = url.trim();
  // Extract username from various LinkedIn URL formats
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    return `https://linkedin.com/in/${match[1]}`;
  }
  // If it looks like just a username
  if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 2) {
    return `https://linkedin.com/in/${url}`;
  }
  return url;
}
