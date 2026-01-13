import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptSegment {
    timestamp_ms: number;
    speaker?: string;
    speaker_id?: string;
    text: string;
    duration_ms?: number;
}

function calculateMetrics(segments: TranscriptSegment[], totalDurationSeconds: number) {
    const speakingTime: Record<string, number> = {};
    const interruptionCount: Record<string, number> = {};
    const questionsAsked: Record<string, number> = {};
    const responseTimes: Record<string, number[]> = {};

    let previousSpeaker: string | null = null;
    let previousEndTime = 0;
    let longestMonologue = { speaker: '', durationSeconds: 0 };
    let currentMonologueDuration = 0;
    let currentMonologueSpeaker = '';
    let silenceMs = 0;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const speaker = segment.speaker || segment.speaker_id || 'Unknown';

        // Estimate segment duration (use next segment's timestamp or default)
        const nextSegment = segments[i + 1];
        const segmentDurationMs = segment.duration_ms ||
            (nextSegment ? nextSegment.timestamp_ms - segment.timestamp_ms : 5000);

        // Track speaking time
        speakingTime[speaker] = (speakingTime[speaker] || 0) + Math.round(segmentDurationMs / 1000);

        // Track silence (gaps > 2 seconds between segments)
        if (previousEndTime > 0) {
            const gap = segment.timestamp_ms - previousEndTime;
            if (gap > 2000) {
                silenceMs += gap;
            }
        }

        // Track interruptions (new speaker starts while previous was still speaking)
        if (previousSpeaker && previousSpeaker !== speaker) {
            const gap = segment.timestamp_ms - previousEndTime;
            if (gap < 500) { // Less than 500ms gap = interruption
                interruptionCount[speaker] = (interruptionCount[speaker] || 0) + 1;
            }

            // Track response time
            if (!responseTimes[speaker]) responseTimes[speaker] = [];
            responseTimes[speaker].push(gap);

            // Reset monologue tracking
            if (currentMonologueDuration > longestMonologue.durationSeconds) {
                longestMonologue = {
                    speaker: currentMonologueSpeaker,
                    durationSeconds: currentMonologueDuration
                };
            }
            currentMonologueDuration = Math.round(segmentDurationMs / 1000);
            currentMonologueSpeaker = speaker;
        } else {
            // Same speaker continues
            currentMonologueDuration += Math.round(segmentDurationMs / 1000);
        }

        // Track questions (simple heuristic: ends with ?)
        if (segment.text.trim().endsWith('?')) {
            questionsAsked[speaker] = (questionsAsked[speaker] || 0) + 1;
        }

        previousSpeaker = speaker;
        previousEndTime = segment.timestamp_ms + segmentDurationMs;
    }

    // Check final monologue
    if (currentMonologueDuration > longestMonologue.durationSeconds) {
        longestMonologue = {
            speaker: currentMonologueSpeaker,
            durationSeconds: currentMonologueDuration
        };
    }

    // Calculate averages and ratios
    const totalTalkTime = Object.values(speakingTime).reduce((a, b) => a + b, 0);
    const talkRatio: Record<string, number> = {};
    const averageResponseTimeMs: Record<string, number> = {};

    for (const speaker of Object.keys(speakingTime)) {
        talkRatio[speaker] = totalTalkTime > 0
            ? Math.round((speakingTime[speaker] / totalTalkTime) * 100)
            : 0;

        if (responseTimes[speaker] && responseTimes[speaker].length > 0) {
            averageResponseTimeMs[speaker] = Math.round(
                responseTimes[speaker].reduce((a, b) => a + b, 0) / responseTimes[speaker].length
            );
        }
    }

    // Initialize missing speakers in counts
    for (const speaker of Object.keys(speakingTime)) {
        if (!interruptionCount[speaker]) interruptionCount[speaker] = 0;
        if (!questionsAsked[speaker]) questionsAsked[speaker] = 0;
        if (!averageResponseTimeMs[speaker]) averageResponseTimeMs[speaker] = 0;
    }

    return {
        totalDurationSeconds,
        speakingTime,
        interruptionCount,
        averageResponseTimeMs,
        questionsAsked,
        talkRatio,
        longestMonologue,
        silencePercentage: totalDurationSeconds > 0
            ? Math.round((silenceMs / 1000 / totalDurationSeconds) * 100)
            : 0,
        speakerRoles: {} as Record<string, string>
    };
}

export const speakingMetricsHandler = async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { recordingId } = await req.json();

        if (!recordingId) {
            throw new Error('recordingId is required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch recording with transcript_json
        const { data: recording, error: recordingError } = await supabase
            .from('meeting_recordings_extended')
            .select('id, duration_seconds, transcript_json, host_id, meeting_id')
            .eq('id', recordingId)
            .single();

        if (recordingError) throw recordingError;

        const transcriptJson = recording.transcript_json as TranscriptSegment[] | null;

        if (!transcriptJson || transcriptJson.length === 0) {
            console.log('No transcript_json available for recording:', recordingId);
            return new Response(
                JSON.stringify({ success: false, message: 'No transcript data' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get participant info
        const { data: participants } = await supabase
            .from('meeting_participants')
            .select('user_id, role, status')
            .eq('meeting_id', recording.meeting_id);

        // Calculate metrics
        const metrics = calculateMetrics(transcriptJson, recording.duration_seconds);

        // Map speaker IDs to roles if available
        if (participants) {
            const hostId = recording.host_id;
            metrics.speakerRoles = {};

            for (const p of participants) {
                if (p.user_id === hostId) {
                    metrics.speakerRoles[p.user_id] = 'host';
                } else {
                    metrics.speakerRoles[p.user_id] = p.role || 'participant';
                }
            }
        }

        // Update recording with metrics
        await supabase
            .from('meeting_recordings_extended')
            .update({ speaking_metrics: metrics })
            .eq('id', recordingId);

        console.log('✅ Speaking metrics calculated for recording:', recordingId);

        return new Response(
            JSON.stringify({ success: true, metrics }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Error calculating speaking metrics:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
};
