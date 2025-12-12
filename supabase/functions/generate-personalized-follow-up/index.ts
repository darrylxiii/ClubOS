import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FollowUpRequest {
  reply_id?: string;
  prospect_id?: string;
  original_email: string;
  reply_content: string;
  prospect_name?: string;
  prospect_company?: string;
  classification?: string;
  tone?: 'professional' | 'friendly' | 'direct';
  context?: {
    thread_history?: string[];
    campaign_name?: string;
    previous_interactions?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const input: FollowUpRequest = await req.json();
    
    if (!input.reply_content) {
      return new Response(
        JSON.stringify({ error: 'Reply content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tone = input.tone || 'professional';
    const prospectName = input.prospect_name || 'there';
    const prospectCompany = input.prospect_company || '';
    
    const toneInstructions = {
      professional: 'Maintain a formal, business-appropriate tone. Be concise and respectful of their time.',
      friendly: 'Use a warm, personable tone while remaining professional. Show genuine interest.',
      direct: 'Be brief and to the point. Focus on the key ask or next step.'
    };

    const classificationContext = {
      hot_lead: 'This is a hot lead showing strong interest. Strike while the iron is hot - be enthusiastic and facilitate next steps.',
      warm_lead: 'This prospect shows interest but may need more nurturing. Provide value and address any implicit concerns.',
      interested: 'They are curious. Expand on benefits and offer to answer specific questions.',
      objection: 'They have raised objections. Address concerns directly but dont be pushy. Acknowledge their perspective.',
      question: 'They have questions. Provide helpful, complete answers. Position yourself as a valuable resource.',
      referral: 'They suggested someone else. Thank them graciously and ask for a warm introduction if appropriate.',
      not_interested: 'They declined. Respect their decision gracefully. Leave the door open for future.',
      out_of_office: 'They are away. Acknowledge their OOO and indicate you will follow up when they return.'
    };

    const contextInstruction = input.classification && classificationContext[input.classification as keyof typeof classificationContext]
      ? classificationContext[input.classification as keyof typeof classificationContext]
      : 'Respond appropriately based on the content and sentiment of their reply.';

    const threadContext = input.context?.thread_history?.length 
      ? `\n\nPREVIOUS THREAD CONTEXT:\n${input.context.thread_history.join('\n---\n')}`
      : '';

    const prompt = `You are an expert sales email writer for The Quantum Club, a premium talent platform.

Generate a personalized follow-up email response based on the prospect's reply.

PROSPECT: ${prospectName}${prospectCompany ? ` at ${prospectCompany}` : ''}
CLASSIFICATION: ${input.classification || 'unknown'}
TONE: ${tone}

${contextInstruction}

ORIGINAL OUTREACH EMAIL:
${input.original_email || 'Initial outreach about our services.'}

PROSPECT'S REPLY:
${input.reply_content}
${threadContext}

INSTRUCTIONS:
1. ${toneInstructions[tone]}
2. Address any specific questions or concerns they raised.
3. If appropriate, suggest a clear next step (call, demo, meeting).
4. Keep the email concise - max 150 words.
5. Sign off as "Best, [Your Name]" - the sender's name will be filled in.

Generate THREE versions of the follow-up:
1. PROFESSIONAL - Formal business tone
2. FRIENDLY - Warm and personable  
3. CONCISE - Brief and direct

Return ONLY valid JSON with this structure:
{
  "professional": "Professional version of the email",
  "friendly": "Friendly version of the email",
  "concise": "Concise/direct version of the email",
  "subject_line": "Suggested subject line for follow-up",
  "best_send_time": "Recommendation for when to send (e.g., 'within 2 hours', 'tomorrow morning')",
  "key_points_addressed": ["list of key points from their reply that you addressed"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert sales email writer. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || '{}';
    
    let followUp;
    try {
      const cleanedContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      followUp = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      followUp = {
        professional: 'Thank you for your response. I would love to discuss this further at your convenience.',
        friendly: 'Thanks so much for getting back to me! Would love to chat more whenever works for you.',
        concise: 'Thanks for the reply. Let me know if you would like to schedule a call.',
        subject_line: `Re: Following up`,
        best_send_time: 'within 24 hours',
        key_points_addressed: []
      };
    }

    // Store the generated follow-ups if we have a reply_id
    if (input.reply_id) {
      await supabase
        .from('crm_reply_intelligence')
        .upsert({
          reply_id: input.reply_id,
          prospect_id: input.prospect_id,
          smart_replies: {
            professional: followUp.professional,
            friendly: followUp.friendly,
            decline: followUp.concise
          },
          follow_up_timing: followUp.best_send_time,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'reply_id'
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        followUp,
        reply_id: input.reply_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-personalized-follow-up:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
