import { createHandler } from '../_shared/handler.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

// Helper function to strip markdown code blocks from JSON responses
function stripMarkdownCodeBlocks(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
}

const SYSTEM_PROMPT = `You are an AI assistant for The Quantum Club, a luxury executive career platform.

Analyze this email and return ONLY valid JSON with these fields:
1. category: recruiter_outreach | interview_invitation | offer | networking | newsletter | spam | other
2. priority: 1-5 (5=urgent, 1=newsletter)
3. summary: one sentence max 100 chars
4. sentiment: positive | neutral | negative
5. action_items: array of {type: 'reply'|'schedule'|'review', text: string}
6. smart_replies: ONLY for categories recruiter_outreach, interview_invitation, offer — generate {professional, friendly, decline} replies of 2-3 sentences each. For ALL other categories set smart_replies to null.
7. meeting: {hasMeeting: boolean, meetingTitle?: string, suggestedDates?: string[], location?: string}
8. follow_up: {needsFollowUp: boolean, followUpType?: 'no_reply'|'meeting_request'|'deadline'|'important', followUpDays?: number, followUpReason?: string}
9. relationship: {relationshipStrength: 'cold'|'warm'|'hot'|'vip', keyTopics: string[]}

Respond ONLY with valid JSON.`;

interface ProcessRequest {
  emailId: string;
}

Deno.serve(createHandler(async (req, ctx) => {
  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  console.log('[process-email-ai] Processing request');

  const { emailId }: ProcessRequest = await req.json();

  const googleApiKey = Deno.env.get("GOOGLE_API_KEY")!;

  // Get email details
  const { data: email, error: emailError } = await ctx.supabase
    .from("emails")
    .select("*")
    .eq("id", emailId)
    .single();

  if (emailError || !email) {
    console.log('[process-email-ai] Email not found:', emailId);
    throw new Error("Email not found");
  }

  userId = email.user_id;

  // Rate limiting: 100 emails per hour per user
  const rateLimit = await checkUserRateLimit(userId || 'anonymous', 'process-email-ai', 100);
  if (!rateLimit.allowed) {
    console.log('[process-email-ai] Rate limit exceeded for user:', userId);
    await logAIUsage({
      userId,
      functionName: 'process-email-ai',
      ...clientInfo,
      rateLimitHit: true,
      success: false,
      errorMessage: 'Rate limit exceeded'
    });
    return createRateLimitResponse(rateLimit.retryAfter!, ctx.corsHeaders);
  }

  // Skip if already processed
  if (email.ai_processed_at) {
    console.log('[process-email-ai] Email already processed:', emailId);
    return new Response(
      JSON.stringify({ message: "Email already processed" }),
      { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Prepare email text for AI
  const emailText = `
From: ${email.from_name || email.from_email}
Subject: ${email.subject}
Body: ${email.body_text || email.snippet || ""}
  `.trim();

  console.log('[process-email-ai] Calling Google Gemini');

  // Call Google Gemini
  const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${googleApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: emailText },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    const errorMessage = aiResponse.status === 429 ? 'AI rate limit exceeded' :
                        aiResponse.status === 402 ? 'AI quota exceeded' :
                        'AI service error';

    await logAIUsage({
      userId,
      functionName: 'process-email-ai',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage
    });

    throw new Error(`AI API error: ${aiResponse.statusText}`);
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices[0].message.content;
  const cleanedContent = stripMarkdownCodeBlocks(rawContent);
  const analysis = JSON.parse(cleanedContent);

  // Calculate priority score
  let priorityScore = 50;
  let priorityReason = "Standard email";
  if (analysis.priority === "urgent") {
    priorityScore = 90;
    priorityReason = "Urgent priority detected";
  } else if (analysis.priority === "high") {
    priorityScore = 75;
    priorityReason = "High priority indicators";
  }
  if (analysis.action_items?.length > 0) {
    priorityScore = Math.min(100, priorityScore + 10);
    priorityReason += " \u2022 Contains action items";
  }
  if (analysis.meeting?.hasMeeting) {
    priorityScore = Math.min(100, priorityScore + 15);
    priorityReason += " \u2022 Meeting detected";
  }

  const inboxType = analysis.category === "newsletter" || analysis.category === "marketing" ? "newsletters" :
                   priorityScore >= 80 ? "important" :
                   analysis.action_items?.length > 0 ? "action" :
                   priorityScore < 40 ? "low" : "fyi";

  // Update email with AI insights
  const { error: updateError } = await ctx.supabase
    .from("emails")
    .update({
      ai_category: analysis.category,
      ai_priority: analysis.priority,
      ai_summary: analysis.summary,
      ai_sentiment: analysis.sentiment,
      ai_action_items: analysis.action_items || [],
      ai_priority_score: priorityScore,
      ai_priority_reason: priorityReason,
      inbox_type: inboxType,
      ai_processed_at: new Date().toISOString(),
    })
    .eq("id", emailId);

  if (updateError) {
    throw updateError;
  }

  // Store smart replies in metadata
  if (analysis.smart_replies) {
    await ctx.supabase
      .from("emails")
      .update({
        metadata: {
          smart_replies: analysis.smart_replies,
          relationship: analysis.relationship,
        }
      })
      .eq("id", emailId);
  }

  // Create meeting record if detected
  if (analysis.meeting?.hasMeeting) {
    await ctx.supabase.from("email_meetings").insert({
      user_id: email.user_id,
      email_id: emailId,
      meeting_title: analysis.meeting.meetingTitle,
      meeting_date: analysis.meeting.suggestedDates?.[0] || null,
      meeting_location: analysis.meeting.location,
      participants: [],
      metadata: { suggestedDates: analysis.meeting.suggestedDates },
    });
  }

  // Create follow-up reminder if needed
  if (analysis.follow_up?.needsFollowUp) {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + (analysis.follow_up.followUpDays || 3));

    await ctx.supabase.from("email_follow_ups").insert({
      user_id: email.user_id,
      email_id: emailId,
      follow_up_type: analysis.follow_up.followUpType,
      follow_up_date: followUpDate.toISOString(),
      metadata: { reason: analysis.follow_up.followUpReason },
    });
  }

  // Update relationship intelligence
  await ctx.supabase
    .from("email_relationships")
    .upsert({
      user_id: email.user_id,
      contact_email: email.from_email,
      contact_name: email.from_name,
      last_email_at: email.email_date,
      relationship_strength: analysis.relationship?.relationshipStrength || 'cold',
      avg_sentiment: analysis.sentiment,
      metadata: { keyTopics: analysis.relationship?.keyTopics || [] },
    }, {
      onConflict: 'user_id,contact_email',
    });

  await logAIUsage({
    userId,
    functionName: 'process-email-ai',
    ...clientInfo,
    responseTimeMs: Date.now() - startTime,
    success: true
  });

  console.log('[process-email-ai] Email processed successfully:', emailId);

  return new Response(
    JSON.stringify({
      success: true,
      analysis,
    }),
    { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
  );
}));
