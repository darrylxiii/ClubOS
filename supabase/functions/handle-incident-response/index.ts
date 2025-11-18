import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncidentResponseRequest {
  incident_id?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  incident_type?: string;
  auto_escalate?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { incident_id, severity, incident_type, auto_escalate = true } = 
      await req.json() as IncidentResponseRequest;

    console.log(`[Incident Response] Processing incident: ${incident_id}, severity: ${severity}`);

    let incident: any;
    
    // Get or create incident
    if (incident_id) {
      const { data } = await supabaseAdmin
        .from('incident_logs')
        .select('*')
        .eq('id', incident_id)
        .single();
      incident = data;
    } else {
      // Create new incident from alert
      const { data: latestAlert } = await supabaseAdmin
        .from('platform_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestAlert) {
        const { data: newIncident } = await supabaseAdmin
          .from('incident_logs')
          .insert({
            incident_id: `INC-${Date.now()}`,
            title: latestAlert.alert_type,
            severity: severity || latestAlert.severity,
            description: latestAlert.message,
            status: 'active',
            detected_at: latestAlert.created_at,
            metadata: latestAlert.metadata
          })
          .select()
          .single();
        incident = newIncident;
      }
    }

    if (!incident) {
      return new Response(
        JSON.stringify({ success: false, error: 'No incident found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const responses: any[] = [];

    // 1. Log detection action
    await supabaseAdmin.from('incident_response_actions').insert({
      incident_id: incident.id,
      action_type: 'detected',
      action_details: { automated: true, source: 'edge_function' },
      automated: true
    });

    // 2. Determine escalation level based on severity
    let escalationLevel = 1;
    if (incident.severity === 'critical') escalationLevel = 1;
    else if (incident.severity === 'error') escalationLevel = 2;
    else if (incident.severity === 'warning') escalationLevel = 3;
    else escalationLevel = 4;

    // 3. Get appropriate contacts
    const { data: contacts } = await supabaseAdmin
      .from('dr_contacts')
      .select('*')
      .eq('is_active', true)
      .lte('escalation_level', escalationLevel)
      .order('escalation_level');

    console.log(`[Incident Response] Found ${contacts?.length || 0} contacts to notify`);

    // 4. Notify contacts (simulation - would integrate with email/SMS service)
    if (contacts && contacts.length > 0) {
      for (const contact of contacts.slice(0, 3)) { // Notify top 3
        responses.push({
          contact: contact.contact_name,
          email: contact.email,
          role: contact.role,
          notification: 'queued' // In production: send actual email/SMS
        });
      }

      await supabaseAdmin.from('incident_response_actions').insert({
        incident_id: incident.id,
        action_type: 'notified',
        action_details: { 
          contacts_notified: contacts.slice(0, 3).map(c => c.contact_name),
          notification_method: 'email'
        },
        automated: true
      });
    }

    // 5. Find applicable playbook
    const { data: playbook } = await supabaseAdmin
      .from('recovery_playbooks')
      .select('*')
      .eq('is_active', true)
      .eq('scenario_type', incident.title)
      .single();

    if (playbook) {
      console.log(`[Incident Response] Found playbook: ${playbook.playbook_name}`);
      
      // Update incident with playbook reference
      await supabaseAdmin
        .from('incident_logs')
        .update({ metadata: { ...incident.metadata, playbook_id: playbook.id } })
        .eq('id', incident.id);

      responses.push({
        playbook: playbook.playbook_name,
        estimated_rto: playbook.estimated_rto_minutes,
        steps: playbook.steps
      });
    }

    // 6. Auto-escalate for critical incidents
    if (auto_escalate && incident.severity === 'critical') {
      await supabaseAdmin.from('incident_response_actions').insert({
        incident_id: incident.id,
        action_type: 'escalated',
        action_details: { 
          reason: 'automatic_critical_escalation',
          escalation_level: 1
        },
        automated: true
      });

      console.log(`[Incident Response] Auto-escalated critical incident`);
    }

    // 7. Check for similar recent incidents
    const { data: recentIncidents } = await supabaseAdmin
      .from('incident_logs')
      .select('id, title, created_at')
      .eq('title', incident.title)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq('id', incident.id);

    if (recentIncidents && recentIncidents.length > 2) {
      console.warn(`[Incident Response] ⚠️ Pattern detected: ${recentIncidents.length} similar incidents in 24h`);
      
      await supabaseAdmin.from('platform_alerts').insert({
        alert_type: 'incident_pattern_detected',
        severity: 'warning',
        message: `Pattern alert: ${recentIncidents.length} ${incident.title} incidents in 24 hours`,
        metadata: { incident_ids: recentIncidents.map(i => i.id) }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        incident_id: incident.id,
        actions_taken: [
          'incident_detected',
          contacts?.length ? 'contacts_notified' : 'no_contacts_configured',
          playbook ? 'playbook_identified' : 'no_playbook_found',
          incident.severity === 'critical' ? 'auto_escalated' : 'no_escalation_needed'
        ],
        responses,
        next_steps: playbook ? playbook.steps : ['Manual intervention required']
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Incident Response] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
