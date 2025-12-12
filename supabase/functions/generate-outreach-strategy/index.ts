import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      industry, 
      target_persona, 
      company_size, 
      goal,
      existing_campaigns 
    } = await req.json();

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI API key not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get performance benchmarks
    const { data: benchmarks } = await supabase
      .from('crm_campaign_benchmarks')
      .select('*')
      .ilike('industry', `%${industry || 'Technology'}%`)
      .limit(1);

    // Get top performing campaigns for context
    const { data: topCampaigns } = await supabase
      .from('crm_campaigns')
      .select('*, crm_email_replies(count)')
      .order('total_replied', { ascending: false })
      .limit(3);

    const systemPrompt = `You are an expert cold outreach strategist for The Quantum Club, a premium talent platform. Generate a comprehensive outreach strategy.

Industry Context:
- Target Industry: ${industry || 'Technology'}
- Target Persona: ${target_persona || 'Decision Makers'}
- Company Size: ${company_size || 'All sizes'}
- Campaign Goal: ${goal || 'Generate qualified meetings'}

Industry Benchmarks:
${JSON.stringify(benchmarks?.[0] || { avg_open_rate: 25, avg_reply_rate: 4 }, null, 2)}

Top Performing Campaign Patterns:
${JSON.stringify(topCampaigns?.slice(0, 2) || [], null, 2)}

Generate a complete outreach strategy including:
1. Recommended sequence structure (number of emails, timing)
2. Subject line templates for each email
3. Email body frameworks
4. Personalization recommendations
5. Optimal send times
6. Follow-up triggers
7. Success metrics to track

Respond with a JSON object:
{
  "strategy_name": "string",
  "sequence_length": number,
  "emails": [
    {
      "step": number,
      "delay_days": number,
      "subject_template": "string",
      "body_framework": "string",
      "personalization_tokens": ["string"],
      "purpose": "string"
    }
  ],
  "timing": {
    "best_days": ["string"],
    "best_hours": "string",
    "timezone_strategy": "string"
  },
  "personalization": {
    "required_data_points": ["string"],
    "research_sources": ["string"],
    "customization_level": "string"
  },
  "success_metrics": {
    "target_open_rate": number,
    "target_reply_rate": number,
    "target_meeting_rate": number
  },
  "key_recommendations": ["string"]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create an outreach strategy for ${industry || 'technology companies'} targeting ${target_persona || 'decision makers'}. Goal: ${goal || 'book meetings'}.` },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let strategy;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        strategy = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      strategy = generateFallbackStrategy(industry, target_persona);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      strategy,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Outreach strategy generation error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackStrategy(industry?: string, target?: string) {
  return {
    strategy_name: `${industry || 'Technology'} Outreach Strategy`,
    sequence_length: 5,
    emails: [
      {
        step: 1,
        delay_days: 0,
        subject_template: "Quick question about {{company}}'s {{department}}",
        body_framework: "Hook → Pain Point → Soft CTA",
        personalization_tokens: ["first_name", "company", "industry"],
        purpose: "Initial contact - establish relevance"
      },
      {
        step: 2,
        delay_days: 3,
        subject_template: "Re: {{company}} + The Quantum Club",
        body_framework: "Reference → Value Add → Question",
        personalization_tokens: ["first_name", "pain_point"],
        purpose: "Follow-up with value"
      },
      {
        step: 3,
        delay_days: 4,
        subject_template: "Thought you'd find this relevant",
        body_framework: "Case Study → Similar Result → Interest Check",
        personalization_tokens: ["industry", "competitor_insight"],
        purpose: "Social proof"
      },
      {
        step: 4,
        delay_days: 5,
        subject_template: "One more thing, {{first_name}}",
        body_framework: "New Angle → Quick Win → Easy CTA",
        personalization_tokens: ["first_name", "recent_news"],
        purpose: "Different approach"
      },
      {
        step: 5,
        delay_days: 7,
        subject_template: "Closing the loop",
        body_framework: "Last Touch → Summary → Future Option",
        personalization_tokens: ["first_name"],
        purpose: "Breakup email"
      }
    ],
    timing: {
      best_days: ["Tuesday", "Wednesday", "Thursday"],
      best_hours: "9:00 AM - 11:00 AM local time",
      timezone_strategy: "Send based on prospect's timezone"
    },
    personalization: {
      required_data_points: ["Company name", "Job title", "Industry", "Company size"],
      research_sources: ["LinkedIn", "Company website", "Recent news"],
      customization_level: "High - every email should feel 1:1"
    },
    success_metrics: {
      target_open_rate: 35,
      target_reply_rate: 5,
      target_meeting_rate: 2
    },
    key_recommendations: [
      "Personalize the first line with recent company news or LinkedIn activity",
      "Keep emails under 100 words",
      "Use 'you' 3x more than 'we'",
      "Test different subject lines with A/B testing",
      "Follow up quickly when you get a response"
    ]
  };
}
