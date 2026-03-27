import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resilientFetch } from '../_shared/resilient-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

interface FirefliesSentence {
  speaker_name: string;
  text: string;
  raw_text: string;
  start_time: number;
  end_time: number;
}

interface FirefliesAttendee {
  displayName: string;
  email: string;
}

interface FirefliesTranscript {
  id: string;
  title: string;
  dateString: string;
  duration: number;
  transcript_url: string | null;
  audio_url: string | null;
  sentences: FirefliesSentence[] | null;
  meeting_attendees: FirefliesAttendee[] | null;
  summary: { overview: string | null; action_items: string[] | null } | null;
  organizer_email: string | null;
}

async function fetchFirefliesTranscripts(apiKey: string, skip: number, limit: number): Promise<FirefliesTranscript[]> {
  const query = `
    query Transcripts($skip: Int, $limit: Int) {
      transcripts(skip: $skip, limit: $limit) {
        id
        title
        dateString
        duration
        transcript_url
        audio_url
        sentences {
          speaker_name
          text
          raw_text
          start_time
          end_time
        }
        meeting_attendees {
          displayName
          email
        }
        summary {
          overview
          action_items
        }
        organizer_email
      }
    }
  `;

  const { response: res } = await resilientFetch(FIREFLIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables: { skip, limit } }),
  }, {
    timeoutMs: 30_000,
    maxRetries: 1,
    retryNonIdempotent: true,
    service: 'fireflies',
    operation: 'fetch-transcripts',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Fireflies API returned ${res.status}: ${body}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Fireflies GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data?.transcripts || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firefliesApiKey = Deno.env.get('FIREFLIES_API_KEY');

    if (!firefliesApiKey) {
      return new Response(
        JSON.stringify({ error: 'FIREFLIES_API_KEY not configured' }),
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

    console.log(`[sync-fireflies] Starting sync for user ${user.id}`);

    // Fetch all transcripts with pagination
    let allTranscripts: FirefliesTranscript[] = [];
    let page = 0;

    do {
      const batch = await fetchFirefliesTranscripts(firefliesApiKey, page * PAGE_SIZE, PAGE_SIZE);
      allTranscripts = allTranscripts.concat(batch);
      page++;
      console.log(`[sync-fireflies] Page ${page}: fetched ${batch.length} transcripts`);
      if (batch.length < PAGE_SIZE) break;
    } while (page < MAX_PAGES);

    console.log(`[sync-fireflies] Total Fireflies transcripts found: ${allTranscripts.length}`);

    // Deduplicate -- batch .in() queries in chunks of 200 to avoid truncation
    const externalIds = allTranscripts.map(t => t.id).filter(Boolean);
    const DEDUP_BATCH = 200;
    const existingIds = new Set<string>();
    for (let i = 0; i < externalIds.length; i += DEDUP_BATCH) {
      const chunk = externalIds.slice(i, i + DEDUP_BATCH);
      const { data: existingRecords } = await supabaseAdmin
        .from('meeting_recordings_extended')
        .select('external_source_id')
        .eq('source_type', 'fireflies')
        .in('external_source_id', chunk);
      (existingRecords || []).forEach(r => existingIds.add(r.external_source_id));
    }
    const newTranscripts = allTranscripts.filter(t => !existingIds.has(t.id));

    console.log(`[sync-fireflies] New transcripts to import: ${newTranscripts.length} (${existingIds.size} already imported)`);

    let imported = 0;
    let errors = 0;

    for (const transcript of newTranscripts) {
      try {
        // Build transcript text
        let transcriptText: string | null = null;
        let transcriptJson: any = null;
        if (transcript.sentences && Array.isArray(transcript.sentences) && transcript.sentences.length > 0) {
          transcriptJson = transcript.sentences;
          transcriptText = transcript.sentences
            .map(s => `${s.speaker_name || 'Unknown'}: ${s.text}`)
            .join('\n');
        }

        // Build participants
        const participants = (transcript.meeting_attendees || []).map(a => ({
          name: a.displayName,
          email: a.email || null,
        }));

        // Summary
        const summary = transcript.summary?.overview || null;

        // Duration (Fireflies returns seconds)
        const duration = transcript.duration > 0 ? Math.round(transcript.duration) : null;

        // Parse date
        let recordedAt: string;
        try {
          recordedAt = new Date(transcript.dateString).toISOString();
        } catch {
          recordedAt = new Date().toISOString();
        }

        const { error: insertError } = await supabaseAdmin
          .from('meeting_recordings_extended')
          .insert({
            host_id: user.id,
            title: transcript.title || 'Fireflies Recording',
            source_type: 'fireflies',
            external_source_id: transcript.id,
            recorded_at: recordedAt,
            duration_seconds: duration,
            transcript: transcriptText,
            transcript_json: transcriptJson,
            executive_summary: summary,
            participants: participants.length > 0 ? participants : null,
            processing_status: transcriptText ? 'analyzing' : 'completed',
            recording_consent_at: new Date().toISOString(),
            is_private: false,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`[sync-fireflies] Skipping duplicate: ${transcript.id}`);
            continue;
          }
          throw insertError;
        }

        imported++;

        // Trigger analysis if we have a transcript
        if (transcriptText) {
          try {
            const { data: inserted } = await supabaseAdmin
              .from('meeting_recordings_extended')
              .select('id')
              .eq('external_source_id', transcript.id)
              .eq('source_type', 'fireflies')
              .single();

            if (inserted) {
              await supabaseAdmin.functions.invoke('analyze-meeting-recording-advanced', {
                body: { recordingId: inserted.id }
              });
            }
          } catch (analysisErr) {
            console.warn(`[sync-fireflies] Analysis trigger failed for ${transcript.id}:`, analysisErr);
          }
        }
      } catch (callErr) {
        console.error(`[sync-fireflies] Error importing transcript:`, callErr);
        errors++;
      }
    }

    const result = {
      total_found: allTranscripts.length,
      already_imported: existingIds.size,
      newly_imported: imported,
      errors,
    };

    console.log(`[sync-fireflies] Sync complete:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[sync-fireflies] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
