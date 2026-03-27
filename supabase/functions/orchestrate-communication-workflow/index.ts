import { createHandler } from '../_shared/handler.ts';
import { resilientFetch } from '../_shared/resilient-fetch.ts';
import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

interface OrchestrationRequest {
  trigger_type: string;
  entity_type: string;
  entity_id: string;
  trigger_event?: Record<string, unknown>;
}

Deno.serve(createHandler(async (req, ctx) => {
    const supabase = ctx.supabase;
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
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[orchestrate-workflow] Found ${workflows.length} applicable workflows`);

    const executionResults: Array<{ workflow_id: string; workflow_name: string; execution_id: string; actions_count: number; status: string }> = [];

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
      const actionsExecuted: Array<{ action: unknown; result?: unknown; error?: string; status: string }> = [];
      let hasError = false;
      let errorMessage = '';

      for (const action of workflow.actions || []) {
        try {
          const actionResult = await executeAction(supabase, action, entity_type, entity_id, trigger_event);
          actionsExecuted.push({ action, result: actionResult, status: 'success' });
        } catch (actionError: unknown) {
          console.error(`[orchestrate-workflow] Action error:`, actionError);
          const msg = actionError instanceof Error ? actionError.message : String(actionError);
          actionsExecuted.push({ action, error: msg, status: 'failed' });
          hasError = true;
          errorMessage = msg;
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
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));

function evaluateConditions(conditions: Record<string, unknown> | null, event: Record<string, unknown> | undefined): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

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

async function getEntityContact(supabase: SupabaseClient, entityType: string, entityId: string) {
  if (entityType === 'candidate') {
    const { data } = await supabase
      .from('candidate_profiles')
      .select('id, first_name, last_name, email, phone, assigned_strategist')
      .eq('id', entityId)
      .single();
    return data;
  }
  if (entityType === 'prospect') {
    const { data } = await supabase
      .from('crm_prospects')
      .select('id, first_name, last_name, email, phone')
      .eq('id', entityId)
      .single();
    return data;
  }
  return null;
}

async function executeAction(supabase: SupabaseClient, action: Record<string, unknown>, entityType: string, entityId: string, event: Record<string, unknown> | undefined): Promise<Record<string, unknown>> {
  const actionType = action.type as string;
  const config = (action.config || {}) as Record<string, unknown>;

  switch (actionType) {
    case 'create_task': {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (config.due_days || 3));

      const { data, error } = await supabase
        .from('unified_tasks')
        .insert({
          title: config.title || `Follow up with ${entityType}`,
          description: config.description || `Auto-generated task based on workflow trigger`,
          priority: config.priority || 'medium',
          status: 'pending',
          due_date: dueDate.toISOString(),
          source: 'workflow_automation',
          metadata: {
            entity_type: entityType,
            entity_id: entityId,
            auto_generated: true,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return { task_id: data.id };
    }

    case 'alert_admin': {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: config.message || `Workflow alert for ${entityType}`,
          message: `Entity: ${entityId}\nTrigger: ${JSON.stringify(event)}`,
          type: config.severity || 'warning',
          category: 'workflow_alert',
        });

      if (error) throw error;
      return { alert_created: true };
    }

    case 'assign_strategist': {
      const { data: strategists } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'strategist')
        .limit(1);

      if (strategists && strategists.length > 0 && entityType === 'candidate') {
        const { error } = await supabase
          .from('candidate_profiles')
          .update({ assigned_strategist: strategists[0].id })
          .eq('id', entityId);

        if (error) throw error;
        return { assigned_to: strategists[0].id };
      }
      return { skipped: true, reason: 'No strategist available' };
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
      const contact = await getEntityContact(supabase, entityType, entityId);
      if (contact?.phone) {
        const { sendWhatsAppMessage } = await import('../_shared/whatsapp-client.ts');
        const result = await sendWhatsAppMessage({
          type: 'text',
          to: contact.phone,
          text: { body: config.message || `Following up regarding your application` },
        });
        return { message_sent: true, messageId: result.messageId };
      }
      return { skipped: true, reason: 'No phone number found' };
    }

    case 'send_email': {
      const contact = await getEntityContact(supabase, entityType, entityId);
      if (contact?.email) {
        const { sendEmail } = await import('../_shared/resend-client.ts');
        const result = await sendEmail({
          from: 'QUIN <quin@os.thequantumclub.com>',
          to: [contact.email],
          subject: config.subject || 'Following Up',
          html: config.html || `<p>${config.message || 'We wanted to follow up with you.'}</p>`,
        });
        return { email_sent: true, emailId: result.id };
      }
      return { skipped: true, reason: 'No email found' };
    }

    case 'add_tag': {
      console.log(`[action] Would add tag ${config.tag} to ${entityType}:${entityId}`);
      return { tag_added: config.tag };
    }

    case 'webhook': {
      if (config.url) {
        const { response } = await resilientFetch(
          config.url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity_type: entityType, entity_id: entityId, event }),
          },
          { timeoutMs: 10_000, maxRetries: 1, service: 'workflow-webhook', operation: 'outbound' }
        );
        return { webhook_sent: true, status: response.status };
      }
      return { skipped: true, reason: 'No webhook URL' };
    }

    default:
      return { skipped: true, reason: `Unknown action type: ${actionType}` };
  }
}
