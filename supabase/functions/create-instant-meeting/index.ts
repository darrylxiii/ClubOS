import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { templateId, pmrCode, title, duration = 60 } = await req.json();

    // Get user profile for timezone
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, time_zone')
      .eq('id', user.id)
      .single();

    const timezone = profile?.time_zone || 'UTC';
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60000);

    let meetingData: any = {
      host_id: user.id,
      title: title || `Quick Meeting`,
      scheduled_start: now.toISOString(),
      scheduled_end: endTime.toISOString(),
      timezone: timezone,
      access_type: 'public',
      allow_guests: true,
      require_approval: false,
      enable_notetaker: true,
      enable_recording: false,
      status: 'active',
      created_via: 'instant',
    };

    // If creating from template
    if (templateId) {
      const { data: template } = await supabase
        .from('meeting_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (template) {
        meetingData = {
          ...meetingData,
          title: template.default_title || meetingData.title,
          enable_notetaker: template.enable_notetaker,
          enable_recording: template.enable_recording,
          access_type: template.access_type,
          allow_guests: template.allow_guests,
          require_approval: template.require_approval,
          compliance_mode: template.compliance_mode,
          template_id: templateId,
          created_via: 'template',
        };

        // Update template usage count
        await supabase
          .from('meeting_templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', templateId);
      }
    }

    // If creating from PMR
    if (pmrCode) {
      const { data: pmr } = await supabase
        .from('personal_meeting_rooms')
        .select('*')
        .eq('room_code', pmrCode)
        .eq('user_id', user.id)
        .single();

      if (pmr) {
        meetingData = {
          ...meetingData,
          title: `${pmr.display_name} - ${now.toLocaleDateString()}`,
          allow_guests: pmr.allow_guests,
          require_approval: pmr.require_approval,
          pmr_id: pmr.id,
          created_via: 'pmr',
        };

        // Update PMR stats
        await supabase
          .from('personal_meeting_rooms')
          .update({ total_meetings: (pmr.total_meetings || 0) + 1 })
          .eq('id', pmr.id);
      }
    }

    // Create meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Add host as participant
    await supabase
      .from('meeting_participants')
      .insert({
        meeting_id: meeting.id,
        user_id: user.id,
        role: 'host',
        status: 'accepted',
      });

    // Create analytics entry
    await supabase
      .from('meeting_analytics')
      .insert({
        meeting_id: meeting.id,
        created_via: meetingData.created_via,
      });

    console.log(`✅ Instant meeting created: ${meeting.id} (${meeting.meeting_code})`);

    return new Response(
      JSON.stringify({
        success: true,
        meeting: {
          id: meeting.id,
          meeting_code: meeting.meeting_code,
          meeting_url: `${Deno.env.get('APP_URL') || 'https://bytqc.com'}/meeting/${meeting.meeting_code}`,
          title: meeting.title,
          scheduled_start: meeting.scheduled_start,
          scheduled_end: meeting.scheduled_end,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error creating instant meeting:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});