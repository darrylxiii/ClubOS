import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: number;
  duration: number;
}

interface EngagementSample {
  participant_id: string;
  engagement_score: number;
  sentiment_score: number;
  speaking_detected: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { meetingId, transcriptSegments, participants } = await req.json();

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: 'Meeting ID required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get or create meeting intelligence record
    let { data: intelligence } = await supabase
      .from('meeting_intelligence')
      .select('*')
      .eq('meeting_id', meetingId)
      .single();

    if (!intelligence) {
      const { data: newIntel, error: createError } = await supabase
        .from('meeting_intelligence')
        .insert({ meeting_id: meetingId })
        .select()
        .single();

      if (createError) {
        console.error('[analyze-meeting-live-enhanced] Failed to create intelligence:', createError);
      }
      intelligence = newIntel;
    }

    // Analyze transcript segments for sentiment and engagement
    const analysis = await analyzeTranscript(transcriptSegments || [], participants || []);

    // Calculate speaking ratios
    const speakingRatios = calculateSpeakingRatios(transcriptSegments || []);

    // Detect topic transitions
    const topicTransitions = await detectTopicTransitions(transcriptSegments || []);

    // Detect confusion and agreement markers
    const confusionMarkers = detectConfusionMarkers(transcriptSegments || []);
    const agreementMarkers = detectAgreementMarkers(transcriptSegments || []);

    // Score answer quality (for interview contexts)
    const answerQualityScores = scoreAnswerQuality(transcriptSegments || []);

    // Calculate engagement timeline
    const engagementTimeline = calculateEngagementTimeline(
      analysis.sentimentByTime, 
      speakingRatios
    );

    // Update meeting intelligence
    const { error: updateError } = await supabase
      .from('meeting_intelligence')
      .upsert({
        meeting_id: meetingId,
        engagement_timeline: engagementTimeline,
        speaking_ratio_per_participant: speakingRatios,
        topic_transitions: topicTransitions,
        confusion_markers: confusionMarkers,
        agreement_markers: agreementMarkers,
        answer_quality_scores: answerQualityScores,
        overall_sentiment: analysis.overallSentiment,
        engagement_score: analysis.engagementScore,
        meeting_effectiveness: calculateEffectiveness(analysis),
        updated_at: new Date().toISOString()
      }, { onConflict: 'meeting_id' });

    if (updateError) {
      console.error('[analyze-meeting-live-enhanced] Update error:', updateError);
    }

    // Store engagement samples for real-time display
    if (participants && participants.length > 0) {
      const samples = participants.map((p: any) => ({
        meeting_id: meetingId,
        participant_id: p.id || p.name,
        engagement_score: p.engagementScore || 50,
        sentiment_score: p.sentimentScore || 0,
        speaking_detected: p.isSpeaking || false,
        attention_indicator: p.attentionLevel || 'unknown'
      }));

      await supabase
        .from('meeting_engagement_samples')
        .insert(samples);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          overallSentiment: analysis.overallSentiment,
          engagementScore: analysis.engagementScore,
          speakingRatios,
          topicTransitions: topicTransitions.length,
          confusionCount: confusionMarkers.length,
          agreementCount: agreementMarkers.length,
          answerQualityAvg: answerQualityScores.length > 0 
            ? answerQualityScores.reduce((a: number, b: any) => a + b.score, 0) / answerQualityScores.length 
            : null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[analyze-meeting-live-enhanced] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function analyzeTranscript(segments: TranscriptSegment[], participants: any[]) {
  if (segments.length === 0) {
    return {
      overallSentiment: 0,
      engagementScore: 50,
      sentimentByTime: []
    };
  }

  // Simple sentiment analysis based on keywords
  const positiveWords = ['great', 'excellent', 'good', 'amazing', 'wonderful', 'agree', 'yes', 'absolutely', 'perfect', 'love'];
  const negativeWords = ['bad', 'terrible', 'wrong', 'disagree', 'no', 'unfortunately', 'problem', 'issue', 'concern', 'difficult'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  let totalWords = 0;
  const sentimentByTime: Array<{ timestamp: number; sentiment: number }> = [];

  for (const segment of segments) {
    const words = segment.text.toLowerCase().split(/\s+/);
    totalWords += words.length;
    
    let segmentPositive = 0;
    let segmentNegative = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) {
        positiveCount++;
        segmentPositive++;
      }
      if (negativeWords.includes(word)) {
        negativeCount++;
        segmentNegative++;
      }
    }

    const segmentSentiment = (segmentPositive - segmentNegative) / Math.max(words.length, 1);
    sentimentByTime.push({
      timestamp: segment.timestamp,
      sentiment: Math.max(-1, Math.min(1, segmentSentiment * 10))
    });
  }

  const overallSentiment = totalWords > 0 
    ? (positiveCount - negativeCount) / totalWords * 10 
    : 0;

  // Calculate engagement based on speaking patterns
  const uniqueSpeakers = new Set(segments.map(s => s.speaker)).size;
  const avgSegmentLength = segments.reduce((a, s) => a + s.duration, 0) / segments.length;
  const engagementScore = Math.min(100, Math.max(0, 
    (uniqueSpeakers * 20) + (avgSegmentLength > 10 ? 30 : 50) + (segments.length > 10 ? 20 : 10)
  ));

  return {
    overallSentiment: Math.max(-1, Math.min(1, overallSentiment)),
    engagementScore: Math.round(engagementScore),
    sentimentByTime
  };
}

function calculateSpeakingRatios(segments: TranscriptSegment[]) {
  const speakerDurations: Record<string, number> = {};
  let totalDuration = 0;

  for (const segment of segments) {
    speakerDurations[segment.speaker] = (speakerDurations[segment.speaker] || 0) + segment.duration;
    totalDuration += segment.duration;
  }

  const ratios: Record<string, number> = {};
  for (const [speaker, duration] of Object.entries(speakerDurations)) {
    ratios[speaker] = totalDuration > 0 ? Math.round((duration / totalDuration) * 100) : 0;
  }

  return ratios;
}

async function detectTopicTransitions(segments: TranscriptSegment[]) {
  const transitions: Array<{ timestamp: number; fromTopic: string; toTopic: string }> = [];
  
  // Simple topic detection based on keyword clusters
  const topicKeywords: Record<string, string[]> = {
    'introduction': ['hello', 'introduce', 'meeting', 'today', 'agenda'],
    'background': ['experience', 'worked', 'previously', 'background', 'history'],
    'technical': ['code', 'system', 'architecture', 'technology', 'implement'],
    'culture': ['team', 'culture', 'values', 'work-life', 'environment'],
    'questions': ['questions', 'ask', 'curious', 'wonder', 'clarify'],
    'closing': ['thank', 'next steps', 'follow up', 'contact', 'goodbye']
  };

  let currentTopic = 'introduction';

  for (let i = 0; i < segments.length; i++) {
    const text = segments[i].text.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (topic !== currentTopic && keywords.some(k => text.includes(k))) {
        transitions.push({
          timestamp: segments[i].timestamp,
          fromTopic: currentTopic,
          toTopic: topic
        });
        currentTopic = topic;
        break;
      }
    }
  }

  return transitions;
}

function detectConfusionMarkers(segments: TranscriptSegment[]) {
  const confusionIndicators = [
    'i don\'t understand', 'what do you mean', 'could you repeat', 
    'not sure', 'confused', 'clarify', 'sorry', 'pardon',
    'um', 'uh', 'hmm', 'let me think'
  ];

  const markers: Array<{ timestamp: number; speaker: string; text: string }> = [];

  for (const segment of segments) {
    const text = segment.text.toLowerCase();
    for (const indicator of confusionIndicators) {
      if (text.includes(indicator)) {
        markers.push({
          timestamp: segment.timestamp,
          speaker: segment.speaker,
          text: segment.text.substring(0, 100)
        });
        break;
      }
    }
  }

  return markers;
}

function detectAgreementMarkers(segments: TranscriptSegment[]) {
  const agreementIndicators = [
    'i agree', 'that\'s right', 'exactly', 'absolutely', 
    'good point', 'yes', 'correct', 'definitely', 'totally'
  ];

  const markers: Array<{ timestamp: number; speaker: string; type: 'agreement' | 'disagreement' }> = [];

  for (const segment of segments) {
    const text = segment.text.toLowerCase();
    for (const indicator of agreementIndicators) {
      if (text.includes(indicator)) {
        markers.push({
          timestamp: segment.timestamp,
          speaker: segment.speaker,
          type: 'agreement'
        });
        break;
      }
    }
  }

  return markers;
}

function scoreAnswerQuality(segments: TranscriptSegment[]) {
  // STAR method scoring (Situation, Task, Action, Result)
  const starKeywords = {
    situation: ['when', 'situation', 'context', 'project', 'challenge'],
    task: ['task', 'responsible', 'goal', 'objective', 'needed to'],
    action: ['i did', 'i implemented', 'i created', 'i led', 'action', 'steps'],
    result: ['result', 'outcome', 'achieved', 'improved', 'increased', 'reduced']
  };

  const scores: Array<{ speaker: string; timestamp: number; score: number; components: string[] }> = [];

  // Group segments by speaker for answer analysis
  const speakerSegments: Record<string, TranscriptSegment[]> = {};
  for (const segment of segments) {
    if (!speakerSegments[segment.speaker]) {
      speakerSegments[segment.speaker] = [];
    }
    speakerSegments[segment.speaker].push(segment);
  }

  for (const [speaker, segs] of Object.entries(speakerSegments)) {
    // Analyze longer responses (likely answers)
    const longResponses = segs.filter(s => s.text.split(' ').length > 20);
    
    for (const response of longResponses) {
      const text = response.text.toLowerCase();
      const components: string[] = [];
      let score = 0;

      for (const [component, keywords] of Object.entries(starKeywords)) {
        if (keywords.some(k => text.includes(k))) {
          components.push(component);
          score += 25;
        }
      }

      if (components.length > 0) {
        scores.push({
          speaker,
          timestamp: response.timestamp,
          score: Math.min(100, score),
          components
        });
      }
    }
  }

  return scores;
}

function calculateEngagementTimeline(
  sentimentByTime: Array<{ timestamp: number; sentiment: number }>,
  speakingRatios: Record<string, number>
) {
  // Combine sentiment and speaking data into engagement timeline
  const timeline: Array<{ timestamp: number; engagement: number; sentiment: number }> = [];
  
  for (const point of sentimentByTime) {
    timeline.push({
      timestamp: point.timestamp,
      engagement: 50 + (point.sentiment * 30), // Base 50, modified by sentiment
      sentiment: point.sentiment
    });
  }

  return timeline;
}

function calculateEffectiveness(analysis: { overallSentiment: number; engagementScore: number }) {
  // Meeting effectiveness is a combination of sentiment and engagement
  const sentimentFactor = (analysis.overallSentiment + 1) / 2 * 100; // Convert -1 to 1 range to 0-100
  const effectiveness = Math.round((analysis.engagementScore * 0.6) + (sentimentFactor * 0.4));
  return Math.max(0, Math.min(100, effectiveness));
}
