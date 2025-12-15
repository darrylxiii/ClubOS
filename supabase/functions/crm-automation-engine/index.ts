
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const payload = await req.json();
        console.log("Automation Engine triggered:", JSON.stringify(payload));

        // We expect payload from Database Webhook or direct invocation
        const { type, record, old_record, table, schema } = payload;

        // 1. Handle "Stage Change" on crm_prospects
        if (table === 'crm_prospects' && (type === 'UPDATE' || type === 'INSERT')) {
            const newStage = record.stage;
            // For INSERT, old_record is null, so treat oldStage as null or empty
            const oldStage = old_record ? old_record.stage : null;

            if (oldStage !== newStage) {
                console.log(`Stage changed from ${oldStage} to ${newStage} for prospect ${record.id}`);

                // Find active automations
                const { data: automations, error: fetchError } = await supabaseClient
                    .from('crm_automations')
                    .select('*')
                    .eq('is_active', true)
                    .eq('trigger_type', 'stage_change');

                if (fetchError) throw fetchError;

                console.log(`Found ${automations?.length || 0} candidate automations`);

                for (const automation of automations || []) {
                    const config = automation.trigger_config || {};

                    // Check "from" condition (if specified)
                    // If "from" is "*", it matches any previous stage.
                    const matchesFrom = !config.from || config.from === '*' || config.from === oldStage;

                    // Check "to" condition (if specified)
                    const matchesTo = !config.to || config.to === '*' || config.to === newStage;

                    if (matchesFrom && matchesTo) {
                        console.log(`Executing automation: ${automation.name}`);
                        await executeActions(supabaseClient, automation, record);
                    }
                }
            }
        }

        return new Response(JSON.stringify({ message: "Processed" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        console.error("Error in automation engine:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});

async function executeActions(supabase: any, automation: any, record: any) {
    const actions = automation.actions || [];
    const logs = [];
    let status = 'success';

    try {
        for (const action of actions) {
            console.log(`Running action: ${action.type}`, action);

            if (action.type === 'create_task') {
                const { error } = await supabase.from('crm_activities').insert({
                    prospect_id: record.id,
                    activity_type: 'task',
                    subject: action.config?.subject || 'Automated Task',
                    description: action.config?.description || `Triggered by automation: ${automation.name}`,
                    priority: action.config?.priority === 'high' ? 1 : 2,
                    due_date: new Date().toISOString(), // Due today
                    owner_id: record.owner_id // Assign to prospect owner
                });
                if (error) throw error;
            }
            else if (action.type === 'notify_user') {
                // For now, just log or maybe create a notification record if a table existed
                // We'll create a system activity
                const { error } = await supabase.from('crm_activities').insert({
                    prospect_id: record.id,
                    activity_type: 'note', // Using note as a notification equivalent for now
                    subject: `🔔 ALERT: ${action.config?.message}`,
                    description: `Automation Alert for ${record.full_name}`,
                    owner_id: record.owner_id
                });
                if (error) throw error;
            }
            else if (action.type === 'update_field') {
                // e.g. set potential value
                if (action.config?.field && action.config?.value) {
                    const updatePaths: any = {};
                    updatePaths[action.config.field] = action.config.value;
                    await supabase.from('crm_prospects').update(updatePaths).eq('id', record.id);
                }
            }

            logs.push({ action: action.type, status: 'success' });
        }
    } catch (err: any) {
        console.error(`Action failed:`, err);
        status = 'failed';
        logs.push({ error: err.message });
    }

    // unexpected error logging?

    // Log execution
    await supabase.from('crm_automation_logs').insert({
        automation_id: automation.id,
        status: status,
        triggered_by_record_id: record.id,
        details: { logs }
    });
}
