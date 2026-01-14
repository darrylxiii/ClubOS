import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

interface WorkflowTrigger {
  type: 'pattern_detected' | 'communication_received' | 'inactivity' | 'manual';
  pattern_type?: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
}

interface WorkflowAction {
  action_type: 'create_task' | 'send_notification' | 'update_stage' | 'schedule_followup' | 'assign_strategist';
  parameters: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trigger, actions } = await req.json() as { 
      trigger: WorkflowTrigger; 
      actions?: WorkflowAction[];
    };

    console.log('Executing workflow', { trigger });

    const results: { action: string; success: boolean; result?: unknown; error?: string }[] = [];

    // Get default actions based on trigger type if not provided
    const workflowActions = actions || getDefaultActions(trigger);

    for (const action of workflowActions) {
      try {
        const result = await executeAction(supabase, action, trigger);
        results.push({ action: action.action_type, success: true, result });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Action ${action.action_type} failed:`, errorMessage);
        results.push({ action: action.action_type, success: false, error: errorMessage });
      }
    }

    // Log workflow execution
    await supabase.from('workflow_execution_logs').insert({
      trigger_type: trigger.type,
      trigger_pattern: trigger.pattern_type,
      entity_type: trigger.entity_type,
      entity_id: trigger.entity_id,
      actions_executed: results,
      executed_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ 
      success: true,
      results,
      actions_executed: results.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Workflow execution error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDefaultActions(trigger: WorkflowTrigger): WorkflowAction[] {
  const actions: WorkflowAction[] = [];

  switch (trigger.pattern_type) {
    case 'going_cold':
      actions.push({
        action_type: 'create_task',
        parameters: {
          title: 'Re-engage inactive relationship',
          description: `Relationship going cold - schedule check-in`,
          priority: 'high',
          due_days: 1
        }
      });
      actions.push({
        action_type: 'send_notification',
        parameters: {
          title: 'Relationship Alert',
          message: 'A relationship is going cold and needs attention',
          type: 'warning'
        }
      });
      break;

    case 'highly_engaged':
      actions.push({
        action_type: 'create_task',
        parameters: {
          title: 'Capitalize on high engagement',
          description: 'High engagement detected - consider advancing relationship',
          priority: 'medium',
          due_days: 2
        }
      });
      break;

    case 'ready_to_convert':
      actions.push({
        action_type: 'create_task',
        parameters: {
          title: 'Close opportunity',
          description: 'Strong conversion signals - present offer now',
          priority: 'urgent',
          due_days: 0
        }
      });
      actions.push({
        action_type: 'send_notification',
        parameters: {
          title: 'Hot Lead Alert',
          message: 'Candidate/Contact ready for conversion!',
          type: 'success'
        }
      });
      break;

    case 'needs_escalation':
      actions.push({
        action_type: 'assign_strategist',
        parameters: {
          reason: 'Multiple unanswered outreach attempts',
          escalation_level: 'senior'
        }
      });
      actions.push({
        action_type: 'create_task',
        parameters: {
          title: 'Escalated: Review approach',
          description: 'Multiple unanswered attempts - review and adjust strategy',
          priority: 'high',
          due_days: 1
        }
      });
      break;

    default:
      // For unknown patterns, create a generic task
      actions.push({
        action_type: 'create_task',
        parameters: {
          title: 'Review detected pattern',
          description: `Pattern detected: ${trigger.pattern_type || 'unknown'}`,
          priority: 'medium',
          due_days: 3
        }
      });
  }

  return actions;
}

async function executeAction(
  supabase: any,
  action: WorkflowAction,
  trigger: WorkflowTrigger
): Promise<unknown> {
  switch (action.action_type) {
    case 'create_task': {
      const params = action.parameters;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (params.due_days as number || 3));

      // Get owner from entity
      let ownerId: string | null = null;
      if (trigger.entity_type === 'candidate') {
        const { data: candidate } = await supabase
          .from('candidate_profiles')
          .select('assigned_strategist')
          .eq('id', trigger.entity_id)
          .single();
        ownerId = candidate?.assigned_strategist;
      }

      const { data, error } = await supabase.from('pilot_tasks').insert({
        title: params.title,
        description: params.description,
        priority_score: getPriorityScore(params.priority as string),
        due_date: dueDate.toISOString(),
        status: 'pending',
        task_type: 'communication_followup',
        related_entity_type: trigger.entity_type,
        related_entity_id: trigger.entity_id,
        user_id: ownerId,
        auto_generated: true,
        source: 'workflow_automation'
      }).select().single();

      if (error) throw error;
      return data;
    }

    case 'send_notification': {
      const params = action.parameters;
      
      // Get relevant user to notify
      let userId: string | null = null;
      if (trigger.entity_type === 'candidate') {
        const { data: candidate } = await supabase
          .from('candidate_profiles')
          .select('assigned_strategist')
          .eq('id', trigger.entity_id)
          .single();
        userId = candidate?.assigned_strategist;
      }

      if (userId) {
        const { data, error } = await supabase.from('notifications').insert({
          user_id: userId,
          title: params.title,
          message: params.message,
          type: params.type || 'info',
          category: 'communication_intelligence',
          related_entity_type: trigger.entity_type,
          related_entity_id: trigger.entity_id,
          is_read: false
        }).select().single();

        if (error) throw error;
        return data;
      }
      return { skipped: true, reason: 'No user to notify' };
    }

    case 'update_stage': {
      const params = action.parameters;
      
      if (trigger.entity_type === 'candidate') {
        const { data, error } = await supabase
          .from('candidate_profiles')
          .update({ pipeline_stage: params.new_stage })
          .eq('id', trigger.entity_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
      return { skipped: true, reason: 'Stage update not applicable' };
    }

    case 'schedule_followup': {
      const params = action.parameters;
      const followupDate = new Date();
      followupDate.setDate(followupDate.getDate() + (params.days_from_now as number || 7));

      const { data, error } = await supabase.from('scheduled_followups').insert({
        entity_type: trigger.entity_type,
        entity_id: trigger.entity_id,
        scheduled_date: followupDate.toISOString(),
        followup_type: params.followup_type || 'general',
        notes: params.notes,
        status: 'scheduled'
      }).select().single();

      if (error) throw error;
      return data;
    }

    case 'assign_strategist': {
      const params = action.parameters;
      
      // Find available strategist (simplified logic)
      const { data: strategists } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'strategist')
        .limit(1);

      if (strategists && strategists.length > 0 && trigger.entity_type === 'candidate') {
        const { data, error } = await supabase
          .from('candidate_profiles')
          .update({ 
            assigned_strategist: strategists[0].id,
            escalation_reason: params.reason
          })
          .eq('id', trigger.entity_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
      return { skipped: true, reason: 'No strategist available or not applicable' };
    }

    default:
      return { skipped: true, reason: `Unknown action type: ${action.action_type}` };
  }
}

function getPriorityScore(priority: string): number {
  switch (priority) {
    case 'urgent': return 100;
    case 'high': return 80;
    case 'medium': return 50;
    case 'low': return 20;
    default: return 50;
  }
}
