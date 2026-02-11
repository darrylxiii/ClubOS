import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
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
      return new Response(
        JSON.stringify({ error: "raw_content and job_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI Gateway with tool calling for structured extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
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
- Extract from forwarded email chains — only candidates, not email metadata people
- Handle multiple emails pasted together

HYPERLINKS SECTION:
The user message may contain a "DETECTED HYPERLINKS" section at the end. These are URLs extracted from the HTML version of the pasted email. Names in emails are often hyperlinked to their LinkedIn profiles. Match these hyperlinks to candidate names to populate linkedin_url.
For example if the hyperlink says text="John Smith" url="https://linkedin.com/in/johnsmith", then John Smith's linkedin_url should be "https://linkedin.com/in/johnsmith".`,
            },
            {
              role: "user",
              content: `Extract all candidate information from the following email content:\n\n${raw_content}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_candidates",
                description:
                  "Extract structured candidate information from email content",
                parameters: {
                  type: "object",
                  properties: {
                    candidates: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          full_name: { type: "string", description: "Candidate full name" },
                          email: { type: "string", description: "Email address" },
                          phone: { type: "string", description: "Phone number with country code" },
                          current_title: { type: "string", description: "Current job title" },
                          current_company: { type: "string", description: "Current company" },
                          linkedin_url: { type: "string", description: "LinkedIn profile URL" },
                          notes: { type: "string", description: "Extra context from email" },
                          confidence: {
                            type: "number",
                            description: "Extraction confidence 0-1",
                          },
                        },
                        required: ["full_name"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["candidates"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_candidates" },
          },
          temperature: 0.1,
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI extraction failed: ${status}`);
    }

    const aiData = await aiResponse.json();

    // Parse tool-call response
    let candidates: any[] = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
      } catch {
        console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      }
    }

    // Fallback: try message content (in case model didn't use tool calling)
    if (candidates.length === 0) {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
        } catch {
          console.error("Fallback parse also failed");
        }
      }
    }

    // Validate and normalize candidates
    const normalizedCandidates = candidates
      .filter((c: any) => c.full_name && c.full_name.trim().length > 0)
      .map((c: any) => ({
        id: crypto.randomUUID(),
        full_name: (c.full_name || "").trim(),
        email: (c.email || "").trim().toLowerCase(),
        phone: (c.phone || "").trim(),
        current_title: (c.current_title || "").trim(),
        current_company: (c.current_company || "").trim(),
        linkedin_url: normalizeLinkedIn(c.linkedin_url || ""),
        notes: (c.notes || "").trim(),
        confidence:
          typeof c.confidence === "number"
            ? Math.min(1, Math.max(0, c.confidence))
            : 0.5,
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
      JSON.stringify({
        candidates: normalizedCandidates,
        count: normalizedCandidates.length,
      }),
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
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    return `https://linkedin.com/in/${match[1]}`;
  }
  if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 2) {
    return `https://linkedin.com/in/${url}`;
  }
  return url;
}
