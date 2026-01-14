import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

interface DetectionInput {
  query_id: string;
  response_text: string;
  source_chunks: SourceChunk[];
  conversation_id?: string;
}

interface SourceChunk {
  id: string;
  content: string;
  source_type: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id || null;
    }

    const input: DetectionInput = await req.json();

    if (!input.response_text || !input.source_chunks) {
      return new Response(JSON.stringify({ error: 'response_text and source_chunks are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare context for the LLM
    const contextText = input.source_chunks
      .map((c, i) => `[Chunk ${i + 1}] (${c.metadata?.type || 'general'}): ${c.content}`)
      .join('\n\n');

    const systemPrompt = `You are a strict Hallucination Judge for an AI Agent.
    Your job is to verify if the claims in the 'Response' are fully supported by the provided 'Source Context'.
    
    Rules:
    1. If a claim is not explicitly found in the Context, it is a HALLUCINATION (Main Exception: General knowledge like 1+1=2 is allowed, but specific company facts must be in context).
    2. Be especially strict with Names, Numbers, Dates, and specific Terminology.
    3. Output in JSON format only.

    Return JSON format:
    {
      "hallucination_score": number, // 0.0 (Perfect) to 1.0 (Completely Fabricated)
      "claims": [
        {
          "text": "Exact claim from response",
          "verified": boolean,
          "reason": "Found in Chunk 1" or "Not found in context",
          "supporting_chunk_indices": [1] // indices of chunks that support this (1-based)
        }
      ],
      "flagged_segments": [
        {
          "text": "The problematic segment",
          "reason": "Explanation why this is a hallucination",
          "severity": "low" | "medium" | "high"
        }
      ],
      "recommendation": "Short advice on whether to use this response or regenerate."
    }`;

    const userMessage = `Source Context:\n${contextText}\n\nResponse to Verify:\n${input.response_text}`;

    // Call LLM for Verification
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Capable enough for verification, faster/cheaper than gpt-4
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Gateway Error: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const verificationResult = JSON.parse(aiData.choices[0].message.content);

    // Normalize result keys if necessary (robustness)
    const normalizedResult = {
      hallucination_score: verificationResult.hallucination_score ?? 0,
      claims: verificationResult.claims || [],
      verified_claims: (verificationResult.claims || []).filter((c: any) => c.verified).length,
      unverified_claims: (verificationResult.claims || []).filter((c: any) => !c.verified).length,
      flagged_segments: verificationResult.flagged_segments || [],
      recommendation: verificationResult.recommendation || "No recommendation."
    };

    // Log the detection
    // Note: unverified_claims and other fields might not exist on the table if it was designed for the old structure.
    // We'll stick to the core fields we know usually exist or map them to the closest JSONB field.
    // Assuming 'claims_extracted' is a JSONB column.
    await supabase
      .from('hallucination_detection_log')
      .insert({
        query_id: input.query_id || crypto.randomUUID(),
        conversation_id: input.conversation_id,
        user_id: userId,
        response_text: input.response_text,
        source_chunks: input.source_chunks,
        claims_extracted: normalizedResult.claims,
        hallucination_score: normalizedResult.hallucination_score,
        flagged_segments: normalizedResult.flagged_segments,
      });

    return new Response(JSON.stringify(normalizedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Hallucination detection error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
