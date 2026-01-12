import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { deal } = await req.json()
        const openAiKey = Deno.env.get('OPENAI_API_KEY')

        if (!openAiKey) {
            throw new Error('OPENAI_API_KEY is not set')
        }

        if (!deal) {
            throw new Error('No deal data provided')
        }

        // Construct the prompt
        const prompt = `
      You are a world-class sales strategist and deal coach. Analyze this CRM deal/prospect and predict the probability of closing (0-100%).
      
      Deal Data:
      - Name: ${deal.full_name || deal.name || 'Unknown'}
      - Stage: ${deal.stage || 'Unknown'}
      - Value: ${deal.deal_value || deal.value || 0}
      - Lead Score: ${deal.lead_score || 0}
      - Engagement Score: ${deal.engagement_score || 0}
      - Title: ${deal.job_title || 'Unknown'}
      - Company: ${deal.company_name || 'Unknown'}
      
      Output strictly valid JSON with this structure (no markdown formatting):
      {
        "score": number, // 0-100
        "risk_level": "low" | "medium" | "high",
        "factors": [
          { "name": "Factor Description", "type": "positive" | "negative" }
        ],
        "recommendation": "Short 1-sentence advice"
      }
    `

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a sales intelligence engine. Output only JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
            }),
        })

        const data = await response.json()

        if (data.error) {
            console.error('OpenAI Error:', data.error)
            throw new Error(data.error.message)
        }

        const aiContent = data.choices[0].message.content
        let analysis
        try {
            // Clean up markdown code blocks if present
            const cleanContent = aiContent.replace(/```json\n?|\n?```/g, '')
            analysis = JSON.parse(cleanContent)
        } catch (e) {
            console.error('Failed to parse AI response:', aiContent)
            // Fallback
            analysis = {
                score: deal.lead_score || 50,
                risk_level: 'medium',
                factors: [{ name: 'Analysis failed, using lead score', type: 'negative' }],
                recommendation: 'Please review manually.'
            }
        }

        return new Response(JSON.stringify(analysis), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Function error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
