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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { messageId } = await req.json();

    if (!messageId) {
      throw new Error('messageId is required');
    }

    console.log('Processing WhatsApp message:', messageId);

    // Get the message with conversation context
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .select(`
        *,
        whatsapp_conversations!inner(
          id,
          candidate_id,
          candidate_name,
          candidate_phone,
          assigned_strategist_id
        )
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      throw new Error('Message not found');
    }

    // Skip if not an inbound text message
    if (message.direction !== 'inbound' || !message.content) {
      console.log('Skipping non-inbound or non-text message');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get recent conversation history for context
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('direction, content, message_type, created_at')
      .eq('conversation_id', message.conversation_id)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = (recentMessages || [])
      .reverse()
      .map(m => `${m.direction === 'inbound' ? 'Candidate' : 'Recruiter'}: ${m.content}`)
      .join('\n');

    // AI Analysis using OpenAI
    let aiAnalysis = null;
    let sentimentScore = null;
    let intentClassification = 'other';

    if (openaiKey) {
      try {
        const analysisPrompt = `Analyze this WhatsApp message from a job candidate and provide insights:

Conversation history:
${conversationHistory}

Latest message from candidate: "${message.content}"

Provide analysis in JSON format:
{
  "sentiment_score": <number from -1 (very negative) to 1 (very positive)>,
  "intent": "<one of: interested, not_interested, question, reschedule, confirm, availability, salary_inquiry, counter_offer, other>",
  "confidence": <number from 0 to 1>,
  "key_topics": ["<topic1>", "<topic2>"],
  "urgency_level": "<low|medium|high>",
  "suggested_response": "<brief suggested response>",
  "action_items": ["<action1>", "<action2>"],
  "buying_signals": ["<signal1>", "<signal2>"] or [],
  "objections": ["<objection1>"] or [],
  "follow_up_recommended": <true|false>,
  "follow_up_timing": "<immediate|within_hour|within_day|within_week|none>"
}`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant helping recruiters analyze candidate messages. Provide accurate sentiment analysis and intent classification to help with recruitment workflows. Always respond with valid JSON.'
              },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        if (openaiResponse.ok) {
          const openaiResult = await openaiResponse.json();
          const analysisText = openaiResult.choices?.[0]?.message?.content;
          
          try {
            // Extract JSON from response
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiAnalysis = JSON.parse(jsonMatch[0]);
              sentimentScore = aiAnalysis.sentiment_score;
              intentClassification = aiAnalysis.intent;
            }
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
          }
        }
      } catch (aiError) {
        console.error('Error calling OpenAI:', aiError);
      }
    } else {
      // Basic keyword-based analysis as fallback
      const content = message.content.toLowerCase();
      
      if (content.includes('yes') || content.includes('interested') || content.includes('sounds good') || content.includes('tell me more')) {
        intentClassification = 'interested';
        sentimentScore = 0.7;
      } else if (content.includes('no') || content.includes('not interested') || content.includes('remove') || content.includes('stop')) {
        intentClassification = 'not_interested';
        sentimentScore = -0.5;
      } else if (content.includes('?') || content.includes('what') || content.includes('how') || content.includes('when')) {
        intentClassification = 'question';
        sentimentScore = 0.2;
      } else if (content.includes('reschedule') || content.includes('different time') || content.includes('change')) {
        intentClassification = 'reschedule';
        sentimentScore = 0.1;
      } else if (content.includes('confirm') || content.includes('see you') || content.includes('looking forward')) {
        intentClassification = 'confirm';
        sentimentScore = 0.8;
      }

      aiAnalysis = {
        intent: intentClassification,
        sentiment_score: sentimentScore,
        method: 'keyword_based'
      };
    }

    // Update the message with analysis
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({
        sentiment_score: sentimentScore,
        intent_classification: intentClassification,
        ai_analysis: aiAnalysis
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message with analysis:', updateError);
    }

    // Create Club Pilot task if follow-up recommended
    if (aiAnalysis?.follow_up_recommended && message.whatsapp_conversations?.assigned_strategist_id) {
      const taskPriority = aiAnalysis.urgency_level === 'high' ? 9 : 
                          aiAnalysis.urgency_level === 'medium' ? 7 : 5;

      await supabase
        .from('unified_tasks')
        .insert({
          user_id: message.whatsapp_conversations.assigned_strategist_id,
          title: `WhatsApp: Follow up with ${message.whatsapp_conversations.candidate_name || 'candidate'}`,
          description: `Candidate sent: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"\n\nIntent: ${intentClassification}\nSuggested response: ${aiAnalysis.suggested_response || 'Review and respond'}`,
          task_type: 'whatsapp_followup',
          priority_score: taskPriority,
          status: 'pending',
          due_date: aiAnalysis.follow_up_timing === 'immediate' ? new Date().toISOString() :
                   aiAnalysis.follow_up_timing === 'within_hour' ? new Date(Date.now() + 60 * 60 * 1000).toISOString() :
                   aiAnalysis.follow_up_timing === 'within_day' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() :
                   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            conversation_id: message.conversation_id,
            message_id: messageId,
            candidate_phone: message.whatsapp_conversations.candidate_phone,
            ai_analysis: aiAnalysis
          }
        });

      console.log('Club Pilot task created for follow-up');
    }

    console.log('Message processed successfully:', {
      messageId,
      sentiment: sentimentScore,
      intent: intentClassification
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          sentiment_score: sentimentScore,
          intent: intentClassification,
          ai_analysis: aiAnalysis
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing message:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
