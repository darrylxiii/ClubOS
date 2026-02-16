import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FATHOM_API_BASE = 'https://api.fathom.video/v2';

interface FathomCall {
  id: string;
  title: string;
  started_at: string;
  duration: number; // seconds
  summary?: string;
  attendees?: Array<{ name: string; email?: string }>;
}

interface FathomListResponse {
  calls: FathomCall[];
  has_more: boolean;
  next_cursor?: string;
}

async function fathomFetch(path: string, apiKey: string): Promise<Response> {
  const res = await fetch(`${FATHOM_API_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Fathom API ${path} returned ${res.status}: ${body}`);
  }
  return res;
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

    // Get the calling user from JWT
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

    const body = await req.json().catch(() => ({}));
    const { afterDate, beforeDate } = body;

    console.log(`[sync-fathom] Starting sync for user ${user.id}`);

    // Fetch all meetings from Fathom with pagination
    let allCalls: FathomCall[] = [];
    let cursor: string | undefined;
    let page = 0;

    do {
      let path = '/calls?limit=50';
      if (cursor) path += `&cursor=${cursor}`;
      if (afterDate) path += `&after=${afterDate}`;
      if (beforeDate) path += `&before=${beforeDate}`;

      const res = await fathomFetch(path, fathomApiKey);
      const data: FathomListResponse = await res.json();

      allCalls = allCalls.concat(data.calls || []);
      cursor = data.has_more ? data.next_cursor : undefined;
      page++;

      console.log(`[sync-fathom] Page ${page}: fetched ${data.calls?.length || 0} calls`);
    } while (cursor && page < 20); // Safety limit

    console.log(`[sync-fathom] Total Fathom calls found: ${allCalls.length}`);

    // Check which ones are already imported
    const fathomIds = allCalls.map(c => c.id);
    const { data: existingRecords } = await supabaseAdmin
      .from('meeting_recordings_extended')
      .select('external_source_id')
      .eq('source_type', 'fathom')
      .in('external_source_id', fathomIds);

    const existingIds = new Set((existingRecords || []).map(r => r.external_source_id));
    const newCalls = allCalls.filter(c => !existingIds.has(c.id));

    console.log(`[sync-fathom] New calls to import: ${newCalls.length} (${existingIds.size} already imported)`);

    let imported = 0;
    let errors = 0;

    for (const call of newCalls) {
      try {
        // Fetch transcript
        let transcript: string | null = null;
        let transcriptJson: any = null;
        try {
          const transcriptRes = await fathomFetch(`/calls/${call.id}/transcript`, fathomApiKey);
          const transcriptData = await transcriptRes.json();
          
          // Build plain text transcript from segments
          if (transcriptData.segments && Array.isArray(transcriptData.segments)) {
            transcriptJson = transcriptData;
            transcript = transcriptData.segments
              .map((s: any) => `${s.speaker || 'Unknown'}: ${s.text}`)
              .join('\n');
          } else if (typeof transcriptData === 'string') {
            transcript = transcriptData;
          }
        } catch (e) {
          console.warn(`[sync-fathom] Could not fetch transcript for ${call.id}:`, e);
        }

        // Build participants array
        const participants = (call.attendees || []).map(a => ({
          name: a.name,
          email: a.email || null,
        }));

        // Insert into meeting_recordings_extended
        const { error: insertError } = await supabaseAdmin
          .from('meeting_recordings_extended')
          .insert({
            host_id: user.id,
            title: call.title || 'Fathom Recording',
            source_type: 'fathom',
            external_source_id: call.id,
            recorded_at: call.started_at,
            duration_seconds: call.duration || null,
            transcript: transcript,
            transcript_json: transcriptJson,
            executive_summary: call.summary || null,
            participants: participants.length > 0 ? participants : null,
            processing_status: transcript ? 'analyzing' : 'completed',
            recording_consent_at: new Date().toISOString(),
            is_private: false,
          });

        if (insertError) {
          // Skip duplicates silently (unique index constraint)
          if (insertError.code === '23505') {
            console.log(`[sync-fathom] Skipping duplicate: ${call.id}`);
            continue;
          }
          throw insertError;
        }

        imported++;

        // If we have a transcript, trigger analysis
        if (transcript) {
          try {
            // Find the just-inserted record to get its ID
            const { data: inserted } = await supabaseAdmin
              .from('meeting_recordings_extended')
              .select('id')
              .eq('external_source_id', call.id)
              .eq('source_type', 'fathom')
              .single();

            if (inserted) {
              await supabaseAdmin.functions.invoke('analyze-meeting-recording-advanced', {
                body: { recordingId: inserted.id }
              });
            }
          } catch (analysisErr) {
            console.warn(`[sync-fathom] Analysis trigger failed for ${call.id}:`, analysisErr);
            // Non-fatal -- the recording is still imported
          }
        }

      } catch (callErr) {
        console.error(`[sync-fathom] Error importing call ${call.id}:`, callErr);
        errors++;
      }
    }

    const result = {
      total_found: allCalls.length,
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
