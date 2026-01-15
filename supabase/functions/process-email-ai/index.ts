import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
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

const SYSTEM_PROMPT = `You are an AI Executive Assistant for The Quantum Club, a luxury executive career platform.

Analyze this email comprehensively and provide:

1. Category: recruiter_outreach | interview_invitation | offer | networking | newsletter | spam | other
2. Priority: 1-5 (5 = urgent interview/offer, 1 = newsletter)
3. Summary: One sentence (max 100 chars)
4. Sentiment: positive | neutral | negative
5. Action items: Array of {type: 'reply'|'schedule'|'review', text: string}
6. Smart Replies: Generate 3 contextual reply options:
   - professional: Formal, executive tone
   - friendly: Warm but professional
   - decline: Polite rejection
   Each reply should be 2-3 sentences, ready to send.
7. Meeting Detection: If email contains meeting request, extract:
   - hasMeeting: boolean
   - meetingTitle: string
   - suggestedDates: array of date strings
   - location: string (if any)
8. Follow-up Needed: Detect if this requires follow-up:
   - needsFollowUp: boolean
   - followUpType: 'no_reply' | 'meeting_request' | 'deadline' | 'important'
   - followUpDays: number (suggested days to wait)
   - followUpReason: string
9. Relationship Intelligence:
   - relationshipStrength: 'cold' | 'warm' | 'hot' | 'vip'
   - keyTopics: array of main discussion points

Respond ONLY with valid JSON.`;

interface ProcessRequest {
  emailId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    console.log('[process-email-ai] Processing request');

    const { emailId }: ProcessRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email details
    const { data: email, error: emailError } = await supabase
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
      return createRateLimitResponse(rateLimit.retryAfter!, publicCorsHeaders);
    }

    // Skip if already processed
    if (email.ai_processed_at) {
      console.log('[process-email-ai] Email already processed:', emailId);
      return new Response(
        JSON.stringify({ message: "Email already processed" }),
        { headers: { ...publicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare email text for AI
    const emailText = `
From: ${email.from_name || email.from_email}
Subject: ${email.subject}
Body: ${email.body_text || email.snippet || ""}
    `.trim();

    console.log('[process-email-ai] Calling Lovable AI');

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: emailText },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorMessage = aiResponse.status === 429 ? 'AI rate limit exceeded' :
        aiResponse.status === 402 ? 'AI credits exhausted' :
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
      priorityReason += " • Contains action items";
    }
    if (analysis.meeting?.hasMeeting) {
      priorityScore = Math.min(100, priorityScore + 15);
      priorityReason += " • Meeting detected";
    }

    const inboxType = analysis.category === "newsletter" || analysis.category === "marketing" ? "newsletters" :
      priorityScore >= 80 ? "important" :
        analysis.action_items?.length > 0 ? "action" :
          priorityScore < 40 ? "low" : "fyi";

    // Update email with AI insights
    const { error: updateError } = await supabase
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
      await supabase
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
      await supabase.from("email_meetings").insert({
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

      await supabase.from("email_follow_ups").insert({
        user_id: email.user_id,
        email_id: emailId,
        follow_up_type: analysis.follow_up.followUpType,
        follow_up_date: followUpDate.toISOString(),
        metadata: { reason: analysis.follow_up.followUpReason },
      });
    }

    // Update relationship intelligence
    await supabase
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

    // --- RAG INTEGRATION: Generate & Store Embedding ---
    try {
      console.log('[process-email-ai] Generating embedding for RAG...');
      const embeddingResp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: emailText,
        })
      });

      if (embeddingResp.ok) {
        const embeddingData = await embeddingResp.json();
        const vector = embeddingData.data[0].embedding;

        // Insert into intelligence_embeddings
        // metadata should match what search_universal_context might expect or just be flexible
        const { error: embedError } = await supabase
          .from('intelligence_embeddings')
          .insert({
            user_id: userId, // Ensure RLS works
            content: emailText,
            role: 'user', // Default to user role ownership? Or checks 'role' column
            embedding: vector,
            metadata: {
              type: 'email',
              email_id: emailId,
              subject: email.subject,
              from: email.from_email,
              date: email.email_date,
              priority: analysis.priority
            }
          });

        if (embedError) {
          console.error('[process-email-ai] Failed to store embedding:', embedError);
        } else {
          console.log('[process-email-ai] Embedding stored successfully');
        }
      } else {
        console.error('[process-email-ai] Failed to generate embedding:', await embeddingResp.text());
      }
    } catch (e) {
      console.error('[process-email-ai] RAG integration error:', e);
      // Don't fail the whole request, just log it
    }
    // ---------------------------------------------------

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
      { headers: { ...publicCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[process-email-ai] Error:", error);
    await logAIUsage({
      userId,
      functionName: 'process-email-ai',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error.message
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...publicCorsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
