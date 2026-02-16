import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FATHOM_API_BASE = 'https://api.fathom.ai/external/v1';

interface FathomMeeting {
  title: string;
  meeting_title?: string;
  url?: string;
  created_at: string;
  recording_start_time?: string;
  recording_end_time?: string;
  calendar_invitees?: Array<{ name: string; email?: string; is_external?: boolean }>;
  recorded_by?: { name: string; email?: string };
  transcript?: Array<{ speaker?: { display_name?: string }; text: string; timestamp?: string }>;
  default_summary?: { markdown_formatted?: string };
  action_items?: Array<{ description: string }>;
}

interface FathomListResponse {
  items: FathomMeeting[];
  next_cursor?: string;
}

async function fathomFetch(path: string, apiKey: string, params?: Record<string, string>): Promise<Response> {
  const url = new URL(`${FATHOM_API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      'X-Api-Key': apiKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Fathom API ${path} returned ${res.status}: ${body}`);
  }
  return res;
}

function computeDuration(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms > 0 ? Math.round(ms / 1000) : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fathomApiKey = Deno.env.get('FATHOM_API_KEY');

    if (!fathomApiKey) {
      return new Response(
        JSON.stringify({ error: 'FATHOM_API_KEY not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-fathom] Starting sync for user ${user.id}`);

    // Fetch meetings from Fathom with pagination
    let allMeetings: FathomMeeting[] = [];
    let cursor: string | undefined;
    let page = 0;

    do {
      const params: Record<string, string> = { include_transcript: 'true' };
      if (cursor) params.cursor = cursor;

      const res = await fathomFetch('/meetings', fathomApiKey, params);
      const data: FathomListResponse = await res.json();

      allMeetings = allMeetings.concat(data.items || []);
      cursor = data.next_cursor || undefined;
      page++;

      console.log(`[sync-fathom] Page ${page}: fetched ${data.items?.length || 0} meetings`);
    } while (cursor && page < 20);

    console.log(`[sync-fathom] Total Fathom meetings found: ${allMeetings.length}`);

    // Use the meeting URL as a stable external ID
    const meetingIds = allMeetings.map(m => m.url || m.title).filter(Boolean);
    const { data: existingRecords } = await supabaseAdmin
      .from('meeting_recordings_extended')
      .select('external_source_id')
      .eq('source_type', 'fathom')
      .in('external_source_id', meetingIds);

    const existingIds = new Set((existingRecords || []).map(r => r.external_source_id));
    const newMeetings = allMeetings.filter(m => !existingIds.has(m.url || m.title));

    console.log(`[sync-fathom] New meetings to import: ${newMeetings.length} (${existingIds.size} already imported)`);

    let imported = 0;
    let errors = 0;

    for (const meeting of newMeetings) {
      try {
        const externalId = meeting.url || meeting.title;

        // Build transcript text
        let transcript: string | null = null;
        let transcriptJson: any = null;
        if (meeting.transcript && Array.isArray(meeting.transcript)) {
          transcriptJson = meeting.transcript;
          transcript = meeting.transcript
            .map(s => `${s.speaker?.display_name || 'Unknown'}: ${s.text}`)
            .join('\n');
        }

        // Build participants
        const participants = (meeting.calendar_invitees || []).map(a => ({
          name: a.name,
          email: a.email || null,
        }));

        // Summary
        const summary = meeting.default_summary?.markdown_formatted || null;

        // Duration
        const duration = computeDuration(meeting.recording_start_time, meeting.recording_end_time);

        const { error: insertError } = await supabaseAdmin
          .from('meeting_recordings_extended')
          .insert({
            host_id: user.id,
            title: meeting.meeting_title || meeting.title || 'Fathom Recording',
            source_type: 'fathom',
            external_source_id: externalId,
            recorded_at: meeting.recording_start_time || meeting.created_at,
            duration_seconds: duration,
            transcript,
            transcript_json: transcriptJson,
            executive_summary: summary,
            participants: participants.length > 0 ? participants : null,
            processing_status: transcript ? 'analyzing' : 'completed',
            recording_consent_at: new Date().toISOString(),
            is_private: false,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`[sync-fathom] Skipping duplicate: ${externalId}`);
            continue;
          }
          throw insertError;
        }

        imported++;

        // Trigger analysis if we have a transcript
        if (transcript) {
          try {
            const { data: inserted } = await supabaseAdmin
              .from('meeting_recordings_extended')
              .select('id')
              .eq('external_source_id', externalId)
              .eq('source_type', 'fathom')
              .single();

            if (inserted) {
              await supabaseAdmin.functions.invoke('analyze-meeting-recording-advanced', {
                body: { recordingId: inserted.id }
              });
            }
          } catch (analysisErr) {
            console.warn(`[sync-fathom] Analysis trigger failed for ${externalId}:`, analysisErr);
          }
        }
      } catch (callErr) {
        console.error(`[sync-fathom] Error importing meeting:`, callErr);
        errors++;
      }
    }

    const result = {
      total_found: allMeetings.length,
      already_imported: existingIds.size,
      newly_imported: imported,
      errors,
    };

    console.log(`[sync-fathom] Sync complete:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[sync-fathom] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
