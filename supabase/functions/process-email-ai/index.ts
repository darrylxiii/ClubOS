import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Consider:
- Recruiter emails with "interview" or "opportunity" → HIGH priority
- Offer letters → HIGHEST priority
- Networking intros → MEDIUM priority
- Newsletters/marketing → LOW priority

Respond ONLY with valid JSON in this format:
{
  "category": "string",
  "priority": number,
  "summary": "string",
  "sentiment": "string",
  "action_items": [],
  "smart_replies": {
    "professional": "string",
    "friendly": "string",
    "decline": "string"
  },
  "meeting": {
    "hasMeeting": boolean,
    "meetingTitle": "string",
    "suggestedDates": [],
    "location": "string"
  },
  "follow_up": {
    "needsFollowUp": boolean,
    "followUpType": "string",
    "followUpDays": number,
    "followUpReason": "string"
  },
  "relationship": {
    "relationshipStrength": "string",
    "keyTopics": []
  }
}`;

interface ProcessRequest {
  emailId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      throw new Error("Email not found");
    }

    // Skip if already processed
    if (email.ai_processed_at) {
      return new Response(
        JSON.stringify({ message: "Email already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare email text for AI
    const emailText = `
From: ${email.from_name || email.from_email}
Subject: ${email.subject}
Body: ${email.body_text || email.snippet || ""}
    `.trim();

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
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

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

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing email with AI:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
