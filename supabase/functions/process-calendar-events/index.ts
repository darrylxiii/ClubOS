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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Simulate fetching calendar events from Google/Outlook (would use OAuth tokens in real env)
        // For MVP, we'll accept a "mock" payload, or scan for "recent" test events if we had a table.
        // In production, this would call https://www.googleapis.com/calendar/v3/calendars/primary/events

        // Step 1: Get all "Active" Prospects (not closed)
        const { data: prospects, error: prospectError } = await supabaseClient
            .from('crm_prospects')
            .select('id, email, full_name, stage, owner_id')
            .neq('stage', 'closed_lost')
            .neq('stage', 'closed_won')
            .neq('stage', 'meeting_booked') // Skip if already booked
            .not('email', 'is', null)

        if (prospectError) throw prospectError;

        // Step 2: Simulate "Found Calendar Events" (Mocked for now)
        // In a real scenario, we'd iterate over connected users and pull their events.
        // Here, we'll just log what we *would* do and check if we can Auto-Move a specific test email if provided in body.

        const { test_email } = await req.json().catch(() => ({}))

        const updates = []

        for (const prospect of prospects || []) {
            // Mock Logic: If we find a calendar event with this prospect's email
            // In reality, this check happens against the Google Calendar API response
            const hasMeeting = test_email && prospect.email === test_email;

            if (hasMeeting) {
                console.log(`Found meeting for ${prospect.email}. Moving to meeting_booked.`);

                // Update Stage
                const { error: updateError } = await supabaseClient
                    .from('crm_prospects')
                    .update({
                        stage: 'meeting_booked',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', prospect.id)

                if (updateError) {
                    console.error(`Failed to update ${prospect.email}:`, updateError)
                    continue
                }

                // Create Activity Log
                await supabaseClient.from('crm_activities').insert({
                    prospect_id: prospect.id,
                    activity_type: 'meeting',
                    subject: 'System Detected Meeting',
                    description: 'Auto-moved to Meeting Booked based on calendar event.',
                    owner_id: prospect.owner_id,
                    occurred_at: new Date().toISOString()
                })

                updates.push(prospect.email)
            }
        }

        return new Response(JSON.stringify({
            success: true,
            scanned: prospects?.length || 0,
            moved: updates
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Function error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
