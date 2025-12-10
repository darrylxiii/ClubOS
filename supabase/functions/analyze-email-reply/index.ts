import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailReplyInput {
  reply_id?: string;
  prospect_id?: string;
  from_email: string;
  from_name?: string;
  subject?: string;
  body_text: string;
  body_html?: string;
  received_at?: string;
}

interface AnalysisResult {
  classification: string;
  sentiment_score: number;
  confidence_score: number;
  urgency: string;
  suggested_action: string;
  suggested_reply?: string;
  ai_summary: string;
  extracted_data: {
    mentioned_names?: string[];
    mentioned_dates?: string[];
    mentioned_companies?: string[];
    objections?: string[];
    questions?: string[];
    referral_contact?: {
      name?: string;
      email?: string;
      title?: string;
    };
    meeting_interest?: boolean;
    budget_mentioned?: boolean;
    timeline_mentioned?: string;
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

    const input: EmailReplyInput = await req.json();
    
    if (!input.body_text && !input.body_html) {
      return new Response(
        JSON.stringify({ error: 'Email body is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailContent = input.body_text || input.body_html || '';
    const subject = input.subject || '';

    // Call AI to analyze the email reply
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are an expert sales email analyst. Analyze this email reply from a sales outreach campaign and provide a detailed classification.

EMAIL SUBJECT: ${subject}
EMAIL FROM: ${input.from_name || ''} <${input.from_email}>
EMAIL BODY:
${emailContent}

Analyze this reply and provide a JSON response with the following structure:
{
  "classification": "one of: hot_lead, warm_lead, interested, objection, not_interested, out_of_office, auto_reply, bounce, unsubscribe, referral, question, spam",
  "sentiment_score": "number from -1 (very negative) to 1 (very positive)",
  "confidence_score": "number from 0 to 1 indicating confidence in classification",
  "urgency": "one of: high, medium, low",
  "suggested_action": "brief description of recommended next action",
  "suggested_reply": "if appropriate, a brief suggested reply template",
  "ai_summary": "2-3 sentence summary of the email and its implications",
  "extracted_data": {
    "mentioned_names": ["array of people names mentioned"],
    "mentioned_dates": ["array of dates or timeframes mentioned"],
    "mentioned_companies": ["array of company names mentioned"],
    "objections": ["array of objections or concerns raised"],
    "questions": ["array of questions asked"],
    "referral_contact": {"name": "", "email": "", "title": ""} or null,
    "meeting_interest": true/false,
    "budget_mentioned": true/false,
    "timeline_mentioned": "any timeline mentioned or null"
  }
}

Classification guidelines:
- hot_lead: Explicitly interested, wants to schedule a meeting or demo
- warm_lead: Positive response, interested but not ready for meeting
- interested: Shows interest, asks questions about offering
- objection: Raises concerns or objections that need addressing
- not_interested: Clear rejection or lack of interest
- out_of_office: Auto-reply indicating person is away
- auto_reply: Generic auto-reply (not out of office)
- bounce: Email delivery failure notification
- unsubscribe: Request to stop receiving emails
- referral: Suggests contacting someone else
- question: Asks questions without clear interest signal
- spam: Spam or irrelevant reply

Respond ONLY with valid JSON, no additional text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert email analyst. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content || '{}';
    
    // Parse the AI response
    let analysis: AnalysisResult;
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanedContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      // Return a default analysis if parsing fails
      analysis = {
        classification: 'unclassified',
        sentiment_score: 0,
        confidence_score: 0.5,
        urgency: 'medium',
        suggested_action: 'Review manually - AI analysis failed to parse',
        ai_summary: 'Unable to analyze this email automatically. Please review manually.',
        extracted_data: {},
      };
    }

    // If we have a reply_id, update the record in the database
    if (input.reply_id) {
      const { error: updateError } = await supabase
        .from('crm_email_replies')
        .update({
          classification: analysis.classification,
          sentiment_score: analysis.sentiment_score,
          confidence_score: analysis.confidence_score,
          urgency: analysis.urgency,
          suggested_action: analysis.suggested_action,
          suggested_reply: analysis.suggested_reply,
          ai_summary: analysis.ai_summary,
          extracted_data: analysis.extracted_data,
          ai_analysis: {
            raw_response: aiContent,
            analyzed_at: new Date().toISOString(),
            model: 'gemini-2.5-flash',
          },
          analyzed_at: new Date().toISOString(),
          priority: analysis.urgency === 'high' ? 3 : analysis.urgency === 'medium' ? 2 : 1,
        })
        .eq('id', input.reply_id);

      if (updateError) {
        console.error('Failed to update reply record:', updateError);
      }

      // Also update the prospect's reply sentiment
      if (input.prospect_id) {
        const { error: prospectError } = await supabase
          .from('crm_prospects')
          .update({
            reply_sentiment: analysis.classification === 'hot_lead' ? 'hot' :
                           analysis.classification === 'warm_lead' ? 'warm' :
                           analysis.classification === 'interested' ? 'warm' :
                           analysis.classification === 'objection' ? 'objection' :
                           analysis.classification === 'not_interested' ? 'negative' :
                           analysis.classification === 'out_of_office' ? 'out_of_office' :
                           analysis.classification === 'referral' ? 'referral' :
                           analysis.classification === 'unsubscribe' ? 'unsubscribe' :
                           'neutral',
            stage: analysis.classification === 'hot_lead' ? 'qualified' :
                   analysis.classification === 'unsubscribe' ? 'unsubscribed' :
                   undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.prospect_id);

        if (prospectError) {
          console.error('Failed to update prospect record:', prospectError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        reply_id: input.reply_id,
        prospect_id: input.prospect_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-email-reply:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
