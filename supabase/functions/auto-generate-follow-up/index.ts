/**
 * Auto-Generate Meeting Follow-Up Edge Function
 * 
 * Automatically generates follow-up emails, action items, and thank-you messages
 * after a meeting ends. Uses AI to analyze transcript and context.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FollowUpRequest {
  meeting_id: string;
  include_thank_you?: boolean;
  include_action_items?: boolean;
  include_summary?: boolean;
  tone?: 'professional' | 'friendly' | 'formal';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      meeting_id, 
      include_thank_you = true,
      include_action_items = true,
      include_summary = true,
      tone = 'professional'
    }: FollowUpRequest = await req.json();

    if (!meeting_id) {
      return new Response(
        JSON.stringify({ error: 'meeting_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[auto-generate-follow-up] Processing meeting:', meeting_id);

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_links!inner(
          owner_id,
          title,
          profiles:owner_id(full_name, email)
        )
      `)
      .eq('id', meeting_id)
      .single();

    if (meetingError || !meeting) {
      console.error('[auto-generate-follow-up] Meeting not found:', meetingError);
      return new Response(
        JSON.stringify({ error: 'Meeting not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch meeting transcript
    const { data: transcripts } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meeting_id)
      .order('timestamp_ms', { ascending: true });

    const fullTranscript = transcripts?.map(t => `${t.speaker || 'Speaker'}: ${t.text}`).join('\n') || '';

    // Fetch meeting intelligence if available
    const { data: intelligence } = await supabase
      .from('meeting_intelligence')
      .select('*')
      .eq('meeting_id', meeting_id)
      .single();

    // Build context for AI
    const hostName = (meeting.booking_links as any)?.profiles?.full_name || 'Host';
    const guestName = meeting.guest_name || 'Guest';
    const guestEmail = meeting.guest_email;
    const meetingTitle = (meeting.booking_links as any)?.title || 'Meeting';
    const meetingDate = new Date(meeting.scheduled_start).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate follow-up content using AI
    const systemPrompt = `You are Club AI, an AI assistant for The Quantum Club, a luxury talent platform.
Generate professional meeting follow-up content with a ${tone} tone.

Meeting Details:
- Title: ${meetingTitle}
- Date: ${meetingDate}
- Host: ${hostName}
- Guest: ${guestName}

${intelligence ? `
Meeting Intelligence:
- Engagement Level: ${intelligence.engagement_timeline ? 'Available' : 'N/A'}
- Key Topics: ${JSON.stringify(intelligence.topic_transitions || [])}
` : ''}

Based on the transcript and context, generate:
1. A thank-you email subject and body
2. A list of action items with assignees and due dates
3. A meeting summary highlighting key decisions and next steps

Format your response as JSON with this structure:
{
  "thank_you_email": {
    "subject": "string",
    "body": "string"
  },
  "action_items": [
    {
      "title": "string",
      "description": "string",
      "assignee": "host" | "guest" | "both",
      "priority": "low" | "medium" | "high",
      "due_days": number
    }
  ],
  "summary": {
    "key_points": ["string"],
    "decisions": ["string"],
    "next_steps": ["string"]
  }
}`;

    const userPrompt = fullTranscript 
      ? `Meeting Transcript:\n${fullTranscript.substring(0, 15000)}`
      : `No transcript available. Generate generic follow-up content based on meeting context.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      console.error('[auto-generate-follow-up] AI error:', await aiResponse.text());
      throw new Error('AI generation failed');
    }

    const aiResult = await aiResponse.json();
    const generatedContent = JSON.parse(aiResult.choices?.[0]?.message?.content || '{}');

    console.log('[auto-generate-follow-up] Generated content:', generatedContent);

    // Store the follow-up
    const { data: followUp, error: followUpError } = await supabase
      .from('meeting_follow_ups')
      .insert({
        meeting_id,
        host_id: (meeting.booking_links as any)?.owner_id,
        generated_content: generatedContent,
        email_subject: generatedContent.thank_you_email?.subject,
        email_body: generatedContent.thank_you_email?.body,
        action_items: generatedContent.action_items || [],
        status: 'draft'
      })
      .select()
      .single();

    if (followUpError) {
      console.error('[auto-generate-follow-up] Failed to store follow-up:', followUpError);
      throw followUpError;
    }

    // Create action items
    if (include_action_items && generatedContent.action_items?.length > 0) {
      const actionItems = generatedContent.action_items.map((item: any) => ({
        meeting_id,
        follow_up_id: followUp.id,
        title: item.title,
        description: item.description,
        assignee_id: item.assignee === 'host' ? (meeting.booking_links as any)?.owner_id : null,
        assignee_email: item.assignee === 'guest' ? guestEmail : null,
        priority: item.priority || 'medium',
        due_date: item.due_days 
          ? new Date(Date.now() + item.due_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : null,
        status: 'pending'
      }));

      const { error: actionItemsError } = await supabase
        .from('meeting_action_items')
        .insert(actionItems);

      if (actionItemsError) {
        console.error('[auto-generate-follow-up] Failed to create action items:', actionItemsError);
      }
    }

    // Calculate meeting ROI
    const durationMinutes = meeting.scheduled_end && meeting.scheduled_start
      ? Math.round((new Date(meeting.scheduled_end).getTime() - new Date(meeting.scheduled_start).getTime()) / 60000)
      : null;

    const { error: roiError } = await supabase
      .from('meeting_roi_metrics')
      .upsert({
        meeting_id,
        host_id: (meeting.booking_links as any)?.owner_id,
        participant_count: 2, // Host + Guest minimum
        duration_minutes: durationMinutes,
        decisions_made: generatedContent.summary?.decisions?.length || 0,
        action_items_count: generatedContent.action_items?.length || 0,
        outcomes: generatedContent.summary || {},
        efficiency_score: calculateEfficiencyScore(generatedContent, durationMinutes),
        could_have_been_email: durationMinutes && durationMinutes < 15 && (generatedContent.action_items?.length || 0) <= 1,
        roi_calculated_at: new Date().toISOString()
      }, { onConflict: 'meeting_id' });

    if (roiError) {
      console.error('[auto-generate-follow-up] Failed to store ROI:', roiError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        follow_up_id: followUp.id,
        generated_content: generatedContent,
        action_items_created: generatedContent.action_items?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auto-generate-follow-up] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateEfficiencyScore(content: any, durationMinutes: number | null): number {
  let score = 50; // Base score

  // More decisions = higher efficiency
  const decisions = content.summary?.decisions?.length || 0;
  score += Math.min(decisions * 10, 25);

  // More action items = productive meeting
  const actionItems = content.action_items?.length || 0;
  score += Math.min(actionItems * 5, 15);

  // Shorter meetings with outcomes = efficient
  if (durationMinutes) {
    if (durationMinutes <= 30 && (decisions > 0 || actionItems > 0)) {
      score += 10;
    } else if (durationMinutes > 60 && decisions === 0) {
      score -= 15;
    }
  }

  return Math.max(0, Math.min(100, score));
}
