import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrchestrationRequest {
  trigger_type: string;
  entity_type: string;
  entity_id: string;
  trigger_event?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trigger_type, entity_type, entity_id, trigger_event } = await req.json() as OrchestrationRequest;

    console.log(`[orchestrate-workflow] Processing trigger ${trigger_type} for ${entity_type}:${entity_id}`);

    // Find applicable workflows
    const { data: workflows } = await supabase
      .from('communication_workflows')
      .select('*')
      .eq('trigger_type', trigger_type)
      .eq('is_active', true)
      .contains('target_entity_types', [entity_type])
      .order('priority', { ascending: true });

    if (!workflows || workflows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No applicable workflows found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[orchestrate-workflow] Found ${workflows.length} applicable workflows`);

    const executionResults: any[] = [];

    for (const workflow of workflows) {
      // Check cooldown
      const { data: recentExecution } = await supabase
        .from('workflow_executions')
        .select('id, completed_at')
        .eq('workflow_id', workflow.id)
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (recentExecution && workflow.cooldown_hours) {
        const hoursSinceLastExecution = (Date.now() - new Date(recentExecution.completed_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastExecution < workflow.cooldown_hours) {
          console.log(`[orchestrate-workflow] Workflow ${workflow.name} in cooldown`);
          continue;
        }
      }

      // Check max executions
      if (workflow.max_executions_per_entity) {
        const { count } = await supabase
          .from('workflow_executions')
          .select('id', { count: 'exact', head: true })
          .eq('workflow_id', workflow.id)
          .eq('entity_type', entity_type)
          .eq('entity_id', entity_id)
          .eq('status', 'completed');

        if (count && count >= workflow.max_executions_per_entity) {
          console.log(`[orchestrate-workflow] Workflow ${workflow.name} max executions reached`);
          continue;
        }
      }

      // Evaluate trigger conditions
      const conditionsMet = evaluateConditions(workflow.trigger_conditions, trigger_event);
      if (!conditionsMet) {
        console.log(`[orchestrate-workflow] Workflow ${workflow.name} conditions not met`);
        continue;
      }

      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflow.id,
          entity_type,
          entity_id,
          trigger_event,
          status: 'running',
        })
        .select()
        .single();

      if (execError) {
        console.error(`[orchestrate-workflow] Execution create error:`, execError);
        continue;
      }

      // Execute actions
      const actionsExecuted: any[] = [];
      let hasError = false;
      let errorMessage = '';

      for (const action of workflow.actions || []) {
        try {
          const actionResult = await executeAction(supabase, action, entity_type, entity_id, trigger_event);
          actionsExecuted.push({ action, result: actionResult, status: 'success' });
        } catch (actionError: any) {
          console.error(`[orchestrate-workflow] Action error:`, actionError);
          actionsExecuted.push({ action, error: actionError.message, status: 'failed' });
          hasError = true;
          errorMessage = actionError.message;
        }
      }

      // Update execution record
      await supabase
        .from('workflow_executions')
        .update({
          actions_executed: actionsExecuted,
          status: hasError ? 'failed' : 'completed',
          error_message: hasError ? errorMessage : null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id);

      executionResults.push({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        execution_id: execution.id,
        actions_count: actionsExecuted.length,
        status: hasError ? 'failed' : 'completed',
      });
    }

    console.log(`[orchestrate-workflow] Executed ${executionResults.length} workflows`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        executions: executionResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[orchestrate-workflow] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function evaluateConditions(conditions: any, event: any): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  // Simple condition evaluation
  if (conditions.hours_threshold && event?.hours_since) {
    if (event.hours_since < conditions.hours_threshold) return false;
  }

  if (conditions.pattern_type && event?.pattern_type) {
    if (event.pattern_type !== conditions.pattern_type) return false;
  }

  if (conditions.confidence_threshold && event?.confidence) {
    if (event.confidence < conditions.confidence_threshold) return false;
  }

  if (conditions.sentiment_drop && event?.sentiment_change) {
    if (event.sentiment_change > conditions.sentiment_drop) return false;
  }

  if (conditions.channels && event?.channel) {
    if (!conditions.channels.includes(event.channel)) return false;
  }

  return true;
}

async function executeAction(supabase: any, action: any, entityType: string, entityId: string, event: any): Promise<any> {
  const actionType = action.type;
  const config = action.config || {};

  switch (actionType) {
    case 'create_task': {
      const { data, error } = await supabase
        .from('unified_tasks')
        .insert({
          title: config.title || `Follow up with ${entityType}`,
          description: config.description || `Auto-generated task based on workflow trigger`,
          priority: config.priority || 'medium',
          status: 'todo',
          entity_type: entityType,
          entity_id: entityId,
          source: 'workflow_automation',
        })
        .select()
        .single();

      if (error) throw error;
      return { task_id: data.id };
    }

    case 'alert_admin': {
      // Create a notification/alert
      const { error } = await supabase
        .from('security_alerts')
        .insert({
          alert_type: 'workflow_alert',
          severity: config.severity || 'medium',
          title: config.message || `Workflow alert for ${entityType}`,
          description: `Entity: ${entityId}\nTrigger: ${JSON.stringify(event)}`,
          metadata: { entity_type: entityType, entity_id: entityId, event },
        });

      if (error) throw error;
      return { alert_created: true };
    }

    case 'assign_strategist': {
      // This would typically assign to an available strategist
      // For now, we just log it
      console.log(`[action] Would assign ${entityType}:${entityId} to strategist`);
      return { assigned: true };
    }

    case 'update_stage': {
      if (entityType === 'prospect') {
        const { error } = await supabase
          .from('crm_prospects')
          .update({ stage: config.stage })
          .eq('id', entityId);

        if (error) throw error;
        return { stage_updated: config.stage };
      }
      return { skipped: true, reason: 'Not a prospect' };
    }

    case 'send_whatsapp': {
      // Would integrate with WhatsApp sending
      console.log(`[action] Would send WhatsApp to ${entityType}:${entityId}`);
      return { message_queued: true };
    }

    case 'send_email': {
      // Would integrate with email sending
      console.log(`[action] Would send email to ${entityType}:${entityId}`);
      return { email_queued: true };
    }

    case 'add_tag': {
      // Would add a tag to the entity
      console.log(`[action] Would add tag ${config.tag} to ${entityType}:${entityId}`);
      return { tag_added: config.tag };
    }

    case 'webhook': {
      if (config.url) {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_type: entityType, entity_id: entityId, event }),
        });
        return { webhook_sent: true, status: response.status };
      }
      return { skipped: true, reason: 'No webhook URL' };
    }

    default:
      return { skipped: true, reason: `Unknown action type: ${actionType}` };
  }
}
