import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders } from '../_shared/cors-config.ts';

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, contextPage, userRole } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: applications } = await supabase
      .from('applications')
      .select('*, jobs(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const contextPrompts = {
      'dashboard': 'Provide actionable tips for dashboard navigation and next best actions.',
      'applications': 'Suggest ways to improve application strategy and follow-up timing.',
      'jobs': 'Recommend job search optimization and matching strategies.',
      'profile': 'Suggest profile improvements to increase visibility and match quality.',
      'messages': 'Provide communication best practices and response strategies.',
      'interview': 'Offer interview preparation tips and follow-up strategies.'
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_tips',
              description: 'Generate 1-3 contextual tips for the user',
              parameters: {
                type: 'object',
                properties: {
                  tips: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        tip_type: { type: 'string' },
                        tip_content: { type: 'string' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                      },
                      required: ['tip_type', 'tip_content', 'priority'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['tips'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_tips' } },
        messages: [
          {
            role: 'system',
            content: `You are an AI copilot for The Quantum Club. Generate 1-3 brief, actionable tips (max 50 words each).

User context:
- Role: ${userRole}
- Page: ${contextPage}
- Profile: ${profile?.title || 'Not set'}
- Recent activity: ${applications?.length || 0} applications

${contextPrompts[contextPage as keyof typeof contextPrompts] || 'Provide helpful tips for this context.'}`
          },
          {
            role: 'user',
            content: `Generate tips for ${contextPage} page`
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (toolCall) {
      const tips = JSON.parse(toolCall.function.arguments).tips;
      
      // Save tips to database
      for (const tip of tips) {
        await supabase.from('ai_copilot_tips').insert({
          user_id: userId,
          tip_type: tip.tip_type,
          tip_content: tip.tip_content,
          context_page: contextPage
        });
      }

      return new Response(
        JSON.stringify({ tips }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('No tips generated');

  } catch (error) {
    console.error('Error in ai-copilot-tips:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate tips' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
