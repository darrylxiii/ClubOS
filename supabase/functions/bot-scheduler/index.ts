
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

        // 1. Fetch pending jobs
        const { data: jobs, error: fetchError } = await supabaseClient
            .from('meeting_bot_jobs')
            .select('*')
            .eq('status', 'pending')
            .limit(1)

        if (fetchError) throw fetchError

        if (!jobs || jobs.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No pending jobs found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const job = jobs[0]
        console.log(`Processing Job ID: ${job.id} for URL: ${job.target_url}`)

        // 2. Simulate Provisioning (Spinning up Container)
        await updateStatus(supabaseClient, job.id, 'provisioning', { step: 'Container Starting...' })
        await new Promise(r => setTimeout(r, 2000))

        // 3. Simulate Joining
        await updateStatus(supabaseClient, job.id, 'joining', { step: 'Playwright Launching...' })
        await new Promise(r => setTimeout(r, 3000))

        // 4. Simulate Recording
        await updateStatus(supabaseClient, job.id, 'recording', { step: 'Connected to Meeting' })
        await new Promise(r => setTimeout(r, 5000)) // Fake recording time

        // 5. Simulate Upload/Complete
        await updateStatus(supabaseClient, job.id, 'uploading', { step: 'Uploading Artifacts...' })
        await new Promise(r => setTimeout(r, 2000))

        // 6. Complete
        const mockRecordingPath = `recordings/${job.id}/simulated_recording.mp4`
        const { error: completeError } = await supabaseClient
            .from('meeting_bot_jobs')
            .update({
                status: 'completed',
                recording_path: mockRecordingPath,
                updated_at: new Date().toISOString(),
                logs: [...(job.logs as any[] || []), { timestamp: new Date(), message: 'Job Finished Successfully' }]
            })
            .eq('id', job.id)

        if (completeError) throw completeError

        return new Response(
            JSON.stringify({ message: `Job ${job.id} processed successfully`, recording: mockRecordingPath }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

async function updateStatus(client: any, id: string, status: string, logMessage: any) {
    // Try to fetch current logs first to append? Or just overwrite/append via Postgres if supported.
    // For simplicity, we just push a new log object if we fetch it, but to avoid race, we might just update status.
    // Actually, let's just update status for the simulation to be fast.
    await client
        .from('meeting_bot_jobs')
        .update({
            status: status,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
}
