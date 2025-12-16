import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailToAnalyze {
  id?: string;
  subject: string;
  body: string;
  from_email: string;
  to_emails?: string[];
  email_date?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, save_match = true } = await req.json() as { email: EmailToAnalyze; save_match?: boolean };
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing sentiment for email:', email.subject?.substring(0, 50) + '...');

    // Prepare text for analysis
    const textToAnalyze = `Subject: ${email.subject}\n\nBody: ${email.body?.substring(0, 2000) || ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a business communication sentiment analyzer for a recruitment platform. 
Analyze the email sentiment and provide insights about the business relationship.
Consider tone, urgency, satisfaction signals, and partnership indicators.
Return structured JSON with sentiment analysis.`
          },
          {
            role: 'user',
            content: `Analyze this business email:\n\n${textToAnalyze}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_email_sentiment',
            description: 'Analyze business email sentiment and relationship signals',
            parameters: {
              type: 'object',
              properties: {
                sentiment_score: {
                  type: 'number',
                  description: 'Sentiment score from -1.0 (very negative) to 1.0 (very positive)'
                },
                sentiment_label: {
                  type: 'string',
                  enum: ['positive', 'neutral', 'negative']
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence in analysis from 0.0 to 1.0'
                },
                urgency_level: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical']
                },
                relationship_signals: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key relationship indicators detected (e.g., "satisfaction", "frustration", "interest", "concern")'
                },
                topics: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Main topics discussed in the email'
                },
                action_required: {
                  type: 'boolean',
                  description: 'Whether the email requires action from recipient'
                },
                summary: {
                  type: 'string',
                  description: 'Brief one-sentence summary of the email'
                }
              },
              required: ['sentiment_score', 'sentiment_label', 'confidence', 'summary']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_email_sentiment' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('Sentiment analysis result:', analysis);

    // If save_match is true and we have email data, try to match and save
    if (save_match) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Extract domain from email
      const fromDomain = email.from_email.split('@')[1]?.toLowerCase();
      
      if (fromDomain) {
        // Try to match to a company via domain
        const { data: domainMatch } = await supabase
          .from('company_domains')
          .select('company_id')
          .eq('domain', fromDomain)
          .eq('is_blocked', false)
          .single();

        let companyId = domainMatch?.company_id;

        // If no domain match, try exact email match in contacts
        if (!companyId) {
          const { data: contactMatch } = await supabase
            .from('company_contacts')
            .select('company_id, id')
            .eq('email', email.from_email.toLowerCase())
            .single();
          
          if (contactMatch) {
            companyId = contactMatch.company_id;
          }
        }

        // If we found a company, create the match record
        if (companyId) {
          // Find specific contact if exists
          const { data: contact } = await supabase
            .from('company_contacts')
            .select('id')
            .eq('company_id', companyId)
            .eq('email', email.from_email.toLowerCase())
            .single();

          const matchData = {
            email_address: email.from_email.toLowerCase(),
            message_id: email.id,
            company_id: companyId,
            contact_id: contact?.id || null,
            match_type: domainMatch ? 'domain' : 'exact_email',
            match_confidence: domainMatch ? 0.8 : 1.0,
            direction: 'inbound',
            subject: email.subject,
            sentiment_score: analysis.sentiment_score,
            sentiment_label: analysis.sentiment_label,
            analyzed_at: new Date().toISOString(),
            email_date: email.email_date || new Date().toISOString(),
          };

          const { error: insertError } = await supabase
            .from('email_contact_matches')
            .insert(matchData);

          if (insertError) {
            console.error('Error saving email match:', insertError);
          } else {
            console.log('Email match saved for company:', companyId);
          }
        }
      }
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-email-sentiment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
