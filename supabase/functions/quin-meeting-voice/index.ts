import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { fetchAI, handleAIError, createTimeoutResponse, AITimeoutError } from '../_shared/ai-fetch.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const { command, meetingId, context = {} } = await req.json();

  console.log(`Club AI voice command: ${command} for meeting: ${meetingId}`);

  try {
    // Parse the command type
    const commandLower = command.toLowerCase();
    let responseType = "general";
    let responseText = "";

    // Fetch meeting context if available
    let meetingContext = "";
    if (meetingId) {
      const { data: meeting } = await ctx.supabase
        .from("meetings")
        .select("title, meeting_type, description")
        .eq("id", meetingId)
        .single();

      if (meeting) {
        meetingContext = `Meeting: ${meeting.title}, Type: ${meeting.meeting_type}`;
      }

      // Get recent transcript if available
      if (context.recentTranscript) {
        meetingContext += `\n\nRecent discussion:\n${context.recentTranscript}`;
      }
    }

    // Handle specific commands
    if (commandLower.includes("summarize") || commandLower.includes("summary")) {
      responseType = "summary";

      const response = await fetchAI({
          model: "gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "You are Club AI, The Quantum Club's AI assistant. Provide a concise spoken summary (under 100 words) of the meeting discussion so far. Speak naturally as if talking to the meeting host."
            },
            { role: "user", content: `${meetingContext}\n\nPlease summarize the last 5 minutes of discussion.` }
          ],
          max_tokens: 200
      });

      if (!response.ok) {
        const errorResponse = handleAIError(response, ctx.corsHeaders);
        if (errorResponse) return errorResponse;
        throw new Error(`AI request failed: ${response.status}`);
      }

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content || "I couldn't generate a summary at this time.";

    } else if (commandLower.includes("question") || commandLower.includes("ask")) {
      responseType = "suggestion";

      const response = await fetchAI({
          model: "gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "You are Club AI, an expert interview coach. Based on the conversation, suggest 2-3 follow-up questions the interviewer should ask. Keep suggestions brief and natural for spoken delivery."
            },
            { role: "user", content: `${meetingContext}\n\nWhat questions should I ask next?` }
          ],
          max_tokens: 250
      });

      if (!response.ok) {
        const errorResponse = handleAIError(response, ctx.corsHeaders);
        if (errorResponse) return errorResponse;
        throw new Error(`AI request failed: ${response.status}`);
      }

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content || "Based on the discussion, consider asking about their specific experience with the challenges mentioned.";

    } else if (commandLower.includes("flag") || commandLower.includes("mark") || commandLower.includes("highlight")) {
      responseType = "flag";

      // Create a meeting insight for the flagged moment
      if (meetingId) {
        await ctx.supabase.from("meeting_insights").insert({
          meeting_id: meetingId,
          insight_type: "user_flagged",
          title: "Flagged by host",
          content: context.recentTranscript?.slice(-500) || "Moment flagged during meeting",
          priority: "high",
          is_important: true
        });
      }

      responseText = "Got it! I've flagged this moment. You'll see it highlighted in your meeting notes.";

    } else if (commandLower.includes("concern") || commandLower.includes("red flag")) {
      responseType = "analysis";

      const response = await fetchAI({
          model: "gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "You are Club AI, an expert interview analyst. Identify any potential concerns or red flags from the recent discussion. Be brief and specific."
            },
            { role: "user", content: `${meetingContext}\n\nAre there any concerns I should be aware of?` }
          ],
          max_tokens: 200
      });

      if (!response.ok) {
        const errorResponse = handleAIError(response, ctx.corsHeaders);
        if (errorResponse) return errorResponse;
        throw new Error(`AI request failed: ${response.status}`);
      }

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content || "I haven't detected any significant concerns in the recent discussion.";

    } else if (commandLower.includes("time") || commandLower.includes("schedule")) {
      responseType = "info";
      responseText = context.remainingTime
        ? `You have approximately ${context.remainingTime} minutes remaining in this meeting.`
        : "I don't have the meeting schedule information available right now.";

    } else {
      // General query
      const response = await fetchAI({
          model: "gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "You are Club AI, The Quantum Club's AI meeting assistant. Respond briefly and helpfully to the host's query. Keep responses under 75 words for spoken delivery."
            },
            { role: "user", content: `${meetingContext}\n\nUser said: ${command}` }
          ],
          max_tokens: 150
      });

      if (!response.ok) {
        const errorResponse = handleAIError(response, ctx.corsHeaders);
        if (errorResponse) return errorResponse;
        throw new Error(`AI request failed: ${response.status}`);
      }

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content || "I'm here to help. Could you please rephrase your request?";
    }

    // Log the interaction
    await ctx.supabase.from("ai_action_log").insert({
      user_id: ctx.user.id,
      action_type: "club_ai_voice_command",
      action_data: { command, meetingId, responseType },
      result: { responseText: responseText.slice(0, 500) },
      status: "completed"
    });

    return new Response(
      JSON.stringify({
        success: true,
        responseType,
        responseText,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof AITimeoutError) {
      return createTimeoutResponse(ctx.corsHeaders);
    }
    throw error;
  }
}));
