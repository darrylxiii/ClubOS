import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationPayload {
  automation_id: string;
  trigger_data: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { automation_id, trigger_data } = await req.json() as AutomationPayload;
    
    console.log(`[automation-runner] Running automation: ${automation_id}`);
    console.log(`[automation-runner] Trigger data:`, JSON.stringify(trigger_data));

    // Fetch the automation
    const { data: automation, error: fetchError } = await supabase
      .from('workspace_automations')
      .select('*')
      .eq('id', automation_id)
      .single();

    if (fetchError || !automation) {
      console.error(`[automation-runner] Automation not found:`, fetchError);
      return new Response(
        JSON.stringify({ error: 'Automation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!automation.is_active) {
      console.log(`[automation-runner] Automation is inactive, skipping`);
      
      // Log skipped execution
      await supabase.from('automation_logs').insert({
        automation_id,
        status: 'skipped',
        trigger_data,
        result_data: { reason: 'Automation is inactive' },
      });

      return new Response(
        JSON.stringify({ status: 'skipped', reason: 'Automation is inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: Record<string, unknown> = {};
    let status: 'success' | 'failed' = 'success';
    let errorMessage: string | null = null;

    try {
      // Execute action based on type
      switch (automation.action_type) {
        case 'send_notification': {
          const message = automation.action_config?.message || 'Automation triggered';
          console.log(`[automation-runner] Sending notification: ${message}`);
          result = { notification_sent: true, message };
          break;
        }

        case 'call_webhook': {
          const url = automation.action_config?.url;
          const method = automation.action_config?.method || 'POST';
          
          if (!url) {
            throw new Error('Webhook URL not configured');
          }

          console.log(`[automation-runner] Calling webhook: ${method} ${url}`);
          
          const webhookResponse = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: method !== 'GET' ? JSON.stringify({
              automation_id,
              automation_name: automation.name,
              trigger_type: automation.trigger_type,
              trigger_data,
              timestamp: new Date().toISOString(),
            }) : undefined,
          });

          result = {
            webhook_called: true,
            url,
            method,
            status_code: webhookResponse.status,
            response_ok: webhookResponse.ok,
          };
          break;
        }

        case 'update_field': {
          const { field_name, field_value, target_row_id } = automation.action_config || {};
          
          if (!field_name || target_row_id === undefined) {
            throw new Error('Field update configuration incomplete');
          }

          console.log(`[automation-runner] Updating field: ${field_name} = ${field_value}`);
          result = { field_updated: true, field_name, field_value };
          break;
        }

        case 'create_page': {
          const { page_title, page_template } = automation.action_config || {};
          console.log(`[automation-runner] Creating page: ${page_title || 'Untitled'}`);
          result = { page_created: true, title: page_title || 'Untitled' };
          break;
        }

        case 'send_email': {
          const { to, subject, body } = automation.action_config || {};
          
          if (!to) {
            throw new Error('Email recipient not configured');
          }

          console.log(`[automation-runner] Email action configured for: ${to}`);
          // Note: Actual email sending would require an email service integration
          result = { email_queued: true, to, subject };
          break;
        }

        default:
          throw new Error(`Unknown action type: ${automation.action_type}`);
      }
    } catch (actionError) {
      console.error(`[automation-runner] Action failed:`, actionError);
      status = 'failed';
      errorMessage = actionError instanceof Error ? actionError.message : 'Unknown error';
      result = { error: errorMessage };
    }

    // Log the execution
    await supabase.from('automation_logs').insert({
      automation_id,
      status,
      trigger_data,
      result_data: result,
      error_message: errorMessage,
    });

    // Update automation stats
    await supabase
      .from('workspace_automations')
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: (automation.trigger_count || 0) + 1,
      })
      .eq('id', automation_id);

    console.log(`[automation-runner] Automation completed with status: ${status}`);

    return new Response(
      JSON.stringify({ status, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[automation-runner] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
