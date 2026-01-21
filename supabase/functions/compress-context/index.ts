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
    const { context, targetRatio = 0.3, experimentName } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const originalTokens = Math.ceil(context.length / 4); // Rough token estimate
    const targetTokens = Math.ceil(originalTokens * targetRatio);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `Compress the following context to ~${Math.round(targetRatio * 100)}% of its length while preserving ALL key facts, names, numbers, dates, and relationships. Output only the compressed text.`
          },
          { role: 'user', content: context }
        ],
      }),
    });

    const result = await response.json();
    const compressed = result.choices?.[0]?.message?.content || context;
    const compressedTokens = Math.ceil(compressed.length / 4);
    const actualRatio = compressedTokens / originalTokens;
    const costSavings = (originalTokens - compressedTokens) * 0.00001; // Approximate cost per token

    // Log experiment
    if (experimentName) {
      await supabase.from('compression_experiments').insert({
        experiment_name: experimentName,
        original_context: context.substring(0, 50000),
        compressed_context: compressed,
        compression_ratio: actualRatio,
        compression_model: 'gemini-2.5-flash-lite',
        token_count_original: originalTokens,
        token_count_compressed: compressedTokens,
        cost_savings_usd: costSavings,
      });
    }

    return new Response(JSON.stringify({
      compressed,
      original_tokens: originalTokens,
      compressed_tokens: compressedTokens,
      compression_ratio: actualRatio,
      cost_savings_usd: costSavings,
      savings_percentage: Math.round((1 - actualRatio) * 100)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Context compression error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
