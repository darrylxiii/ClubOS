import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { sendWhatsAppMessage, sendSMS, sendEmail, getCandidateContact, logAgentCommunication } from "../_shared/communication-utils.ts";
import { publicCorsHeaders } from '../_shared/cors-config.ts';

const corsHeaders = publicCorsHeaders;

interface EventProcessorRequest {
  operation: 'process_events' | 'publish_event' | 'check_autonomy' | 'execute_autonomous_action';
  userId?: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, userId, data } = await req.json() as EventProcessorRequest;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any;

    switch (operation) {
      case 'process_events':
        result = await processEvents(supabase);
        break;
      case 'publish_event':
        result = await publishEvent(supabase, userId!, data);
        break;
      case 'check_autonomy':
        result = await checkAutonomy(supabase, userId!, data);
        break;
      case 'execute_autonomous_action':
        result = await executeAutonomousAction(supabase, userId!, data);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Agent Event Processor error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Process unprocessed events
async function processEvents(supabase: any) {
  // Get unprocessed events
  const { data: events, error } = await supabase
    .from('agent_events')
    .select('*')
    .eq('processed', false)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;

  const results = [];

  for (const event of events || []) {
    try {
      const processingResult = await processEvent(supabase, event);
      results.push({ eventId: event.id, success: true, ...processingResult });
    } catch (err: any) {
      results.push({ eventId: event.id, success: false, error: err.message });
    }
  }

  return { success: true, processedCount: results.length, results };
}

// Process a single event
async function processEvent(supabase: any, event: any) {
  const respondingAgents: string[] = [];
  const processingResults: any[] = [];

  // Determine which agents should respond based on event type
  const agentMappings: Record<string, string[]> = {
    'INSERT_applications': ['quin', 'analytics_agent', 'engagement_agent'],
    'UPDATE_applications': ['quin', 'interview_agent', 'analytics_agent'],
    'INSERT_pilot_tasks': ['quin'],
    'UPDATE_pilot_tasks': ['analytics_agent'],
    'INSERT_quantum_meetings': ['interview_agent', 'quin'],
    'UPDATE_quantum_meetings': ['interview_agent'],
    'user_action_job_view': ['sourcing_agent'],
    'user_action_profile_update': ['quin'],
    'external_webhook_email': ['engagement_agent'],
    'system_deadline_approaching': ['quin', 'engagement_agent'],
  };

  const agents = agentMappings[event.event_type] || ['quin'];
  respondingAgents.push(...agents);

  // Check autonomy settings for the user
  if (event.user_id) {
    for (const agent of agents) {
      const autonomy = await checkAgentAutonomy(supabase, event.user_id, agent, event.event_type);
      
      if (autonomy.level === 'autonomous') {
        // Execute autonomous action
        const actionResult = await executeAgentAction(supabase, event, agent, autonomy);
        processingResults.push({ agent, action: 'executed', result: actionResult });
      } else if (autonomy.level === 'suggest') {
        // Create a suggestion for the user
        await createSuggestion(supabase, event, agent);
        processingResults.push({ agent, action: 'suggested' });
      } else {
        processingResults.push({ agent, action: 'skipped', reason: `Autonomy level: ${autonomy.level}` });
      }
    }
  }

  // Mark event as processed
  await supabase
    .from('agent_events')
    .update({
      processed: true,
      processed_by: respondingAgents,
      processing_results: processingResults
    })
    .eq('id', event.id);

  return { respondingAgents, processingResults };
}

// Check autonomy level for an agent action
async function checkAgentAutonomy(supabase: any, userId: string, agentName: string, eventType: string) {
  // Map event types to action types
  const eventToAction: Record<string, string> = {
    'INSERT_applications': 'send_follow_up',
    'UPDATE_applications': 'update_status',
    'INSERT_quantum_meetings': 'prepare_briefing',
    'system_deadline_approaching': 'send_reminder',
  };

  const actionType = eventToAction[eventType] || 'general_action';

  const { data: settings } = await supabase
    .from('agent_autonomy_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .single();

  return {
    level: settings?.autonomy_level || 'suggest',
    conditions: settings?.conditions || {},
    notificationPreference: settings?.notification_preference || 'summary'
  };
}

// Execute an agent action
async function executeAgentAction(supabase: any, event: any, agentName: string, autonomy: any) {
  // Log the decision before execution
  await supabase.from('agent_decision_log').insert({
    agent_name: agentName,
    user_id: event.user_id,
    decision_type: 'autonomous_action',
    decision_made: `Autonomous action for ${event.event_type}`,
    reasoning: {
      event_type: event.event_type,
      autonomy_level: autonomy.level,
      conditions_met: true
    },
    confidence_score: 0.8,
    context_used: { event_data: event.event_data }
  });

  // Execute based on event type
  switch (event.event_type) {
    case 'INSERT_applications':
      return await handleNewApplication(supabase, event);
    case 'system_deadline_approaching':
      return await handleDeadlineApproaching(supabase, event);
    default:
      return { action: 'acknowledged', details: 'No specific action defined' };
  }
}

// Handle new application event
async function handleNewApplication(supabase: any, event: any) {
  const applicationData = event.event_data?.new;
  if (!applicationData) return { action: 'skipped', reason: 'No application data' };

  // Create a follow-up task
  await supabase.from('unified_tasks').insert({
    title: `Review application: ${applicationData.position || 'New Role'}`,
    description: `New application received for ${applicationData.company_name}`,
    status: 'pending',
    priority: 'high',
    source: 'agent_autonomous'
  });

  // Store memory of this application
  await supabase.from('ai_memory').insert({
    user_id: event.user_id,
    memory_type: 'fact',
    content: `Applied to ${applicationData.position} at ${applicationData.company_name}`,
    context: { application_id: applicationData.id },
    source: 'autonomous_action',
    importance_score: 0.7,
    relevance_score: 0.7
  });

  // Send confirmation email if candidate has email
  if (applicationData.candidate_id) {
    const contact = await getCandidateContact(supabase, applicationData.candidate_id);
    
    if (contact?.email) {
      const emailResult = await sendEmail({
        to: contact.email,
        subject: `Application Received: ${applicationData.position} at ${applicationData.company_name}`,
        body: `Hi ${contact.name || 'there'},\n\nThank you for applying to ${applicationData.position} at ${applicationData.company_name}. Your application has been received and is now being reviewed.\n\nWe'll be in touch soon with next steps.\n\nBest regards,\nThe Quantum Club Team`,
        html: `
          <h2>Application Received</h2>
          <p>Hi ${contact.name || 'there'},</p>
          <p>Thank you for applying to <strong>${applicationData.position}</strong> at <strong>${applicationData.company_name}</strong>.</p>
          <p>Your application has been received and is now being reviewed. We'll be in touch soon with next steps.</p>
          <p>Best regards,<br>The Quantum Club Team</p>
        `
      });
      
      await logAgentCommunication(supabase, {
        agentName: 'quin',
        userId: event.user_id,
        candidateId: applicationData.candidate_id,
        channel: 'email',
        action: 'application_confirmation',
        success: emailResult.success,
        metadata: { application_id: applicationData.id, position: applicationData.position }
      });
    }
  }

  return { action: 'task_created', position: applicationData.position, emailSent: true };
}

// Handle deadline approaching event
async function handleDeadlineApproaching(supabase: any, event: any) {
  // Create in-app reminder notification
  await supabase.from('notifications').insert({
    user_id: event.user_id,
    type: 'reminder',
    title: 'Deadline Approaching',
    message: event.event_data?.message || 'You have an upcoming deadline',
    is_read: false
  });

  // If candidate-related, send WhatsApp/SMS reminder
  if (event.event_data?.candidate_id) {
    const contact = await getCandidateContact(supabase, event.event_data.candidate_id);
    
    if (contact?.phone) {
      const reminderMessage = `Hi ${contact.name || 'there'}! This is a friendly reminder from The Quantum Club: ${event.event_data?.message || 'You have an upcoming deadline.'}`;
      
      // Try WhatsApp first, fall back to SMS
      let sent = await sendWhatsAppMessage(supabase, {
        phone: contact.phone,
        message: reminderMessage,
        candidateId: event.event_data.candidate_id,
        userId: event.user_id
      });
      
      if (!sent.success) {
        sent = await sendSMS({ phone: contact.phone, message: reminderMessage });
      }
      
      await logAgentCommunication(supabase, {
        agentName: 'engagement_agent',
        userId: event.user_id,
        candidateId: event.event_data.candidate_id,
        channel: sent.messageId ? 'whatsapp' : 'sms',
        action: 'deadline_reminder',
        success: sent.success,
        metadata: { deadline: event.event_data?.deadline }
      });
    }
  }

  return { action: 'reminder_sent', channels: ['in_app', 'whatsapp_or_sms'] };
}

// Create a suggestion for the user
async function createSuggestion(supabase: any, event: any, agentName: string) {
  await supabase.from('ai_suggestions').insert({
    user_id: event.user_id,
    suggestion_type: 'agent_recommendation',
    title: `Recommended action from ${agentName}`,
    description: `Based on: ${event.event_type}`,
    action_data: { event_id: event.id, agent: agentName, event_type: event.event_type },
    priority: 'medium',
    dismissed: false
  });
}

// Publish a new event
async function publishEvent(supabase: any, userId: string, data: any) {
  const { eventType, eventSource, entityType, entityId, eventData, priority = 5 } = data;

  const { data: event, error } = await supabase
    .from('agent_events')
    .insert({
      event_type: eventType,
      event_source: eventSource,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      event_data: eventData || {},
      priority
    })
    .select()
    .single();

  if (error) throw error;

  return { success: true, event };
}

// Check autonomy settings for a user
async function checkAutonomy(supabase: any, userId: string, data: any) {
  const { actionType } = data;

  const { data: settings, error } = await supabase
    .from('agent_autonomy_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return {
    success: true,
    settings: settings || { autonomy_level: 'suggest', notification_preference: 'summary' }
  };
}

// Execute an autonomous action
async function executeAutonomousAction(supabase: any, userId: string, data: any) {
  const { actionType, actionData } = data;

  // Verify autonomy is allowed
  const autonomyCheck = await checkAutonomy(supabase, userId, { actionType });
  if (autonomyCheck.settings.autonomy_level !== 'autonomous') {
    return { success: false, reason: 'Autonomy not enabled for this action type' };
  }

  // Log the decision
  await supabase.from('agent_decision_log').insert({
    agent_name: 'quin',
    user_id: userId,
    decision_type: 'autonomous_execution',
    decision_made: `Executed ${actionType}`,
    reasoning: { actionData, autonomy_verified: true },
    confidence_score: 0.9
  });

  return { success: true, executed: true, actionType };
}
