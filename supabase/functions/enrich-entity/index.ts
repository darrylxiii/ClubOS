import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            // Supabase API injected via Deno environment variables
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { prospect_id, force_update } = await req.json()

        if (!prospect_id) {
            throw new Error('prospect_id is required')
        }

        // 1. Fetch Prospect
        const { data: prospect, error: fetchError } = await supabaseClient
            .from('crm_prospects')
            .select('*')
            .eq('id', prospect_id)
            .single()

        if (fetchError || !prospect) {
            throw new Error('Prospect not found')
        }

        console.log(`Enriching prospect: ${prospect.email} (${prospect.id})`)

        // 2. MOCK: Call External Provider (Clearbit/Apollo/PeopleDataLabs)
        // In production, fetch(providerUrl, { headers: { Authorization: API_KEY } })

        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock Response based on email domain or random
        const isTech = prospect.email.includes('tech') || Math.random() > 0.5;
        const enrichedData = {
            job_title: prospect.job_title || (isTech ? 'CTO' : 'VP of Sales'),
            location: prospect.location || (isTech ? 'San Francisco, CA' : 'New York, NY'),
            company_name: prospect.company_name || 'Acme Corp',
            linkedin_url: prospect.linkedin_url || `https://linkedin.com/in/${prospect.first_name}-${prospect.last_name}`,
            tags: [...(prospect.tags || []), isTech ? 'Tech' : 'Enterprise', 'Enriched'],
            custom_fields: {
                ...(typeof prospect.custom_fields === 'object' ? prospect.custom_fields : {}),
                "tech_stack": isTech ? ["React", "Node.js", "Supabase"] : ["Salesforce", "Outreach"],
                "funding_round": "Series B",
                "estimated_arr": "$10M - $50M"
            }
        };

        // 3. Update Prospect
        const { error: updateError } = await supabaseClient
            .from('crm_prospects')
            .update({
                ...enrichedData,
                last_enriched_at: new Date().toISOString()
            })
            .eq('id', prospect_id)

        if (updateError) {
            throw updateError
        }

        return new Response(
            JSON.stringify({ success: true, enriched: enrichedData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
