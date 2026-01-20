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
    const { postId, content } = await req.json();
    
    if (!postId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing postId or content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-post-summary] Generating summary for post:', postId);

    // Call Lovable AI to generate summary
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating concise, engaging summaries of social media posts. Provide a 1-2 sentence summary that captures the key message and tone. Be professional yet personable.' 
          },
          { 
            role: 'user', 
            content: `Summarize this post in 1-2 sentences:\n\n${content.substring(0, 2000)}` 
          }
        ],
        max_completion_tokens: 100,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-post-summary] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error('No summary generated from AI');
    }

    console.log('[generate-post-summary] Summary generated:', summary.substring(0, 100));

    // Update post with summary
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        ai_summary: summary,
        summary_generated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      console.error('[generate-post-summary] Database error:', updateError);
      throw updateError;
    }

    console.log('[generate-post-summary] Post updated successfully');

    return new Response(
      JSON.stringify({ summary, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-post-summary] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});