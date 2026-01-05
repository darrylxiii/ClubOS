import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, meetingId, context = {} } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`QUIN voice command: ${command} for meeting: ${meetingId}`);

    // Parse the command type
    const commandLower = command.toLowerCase();
    let responseType = "general";
    let responseText = "";

    // Fetch meeting context if available
    let meetingContext = "";
    if (meetingId) {
      const { data: meeting } = await supabase
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
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: "You are QUIN, The Quantum Club's AI assistant. Provide a concise spoken summary (under 100 words) of the meeting discussion so far. Speak naturally as if talking to the meeting host." 
            },
            { role: "user", content: `${meetingContext}\n\nPlease summarize the last 5 minutes of discussion.` }
          ],
          max_tokens: 200
        })
      });

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content || "I couldn't generate a summary at this time.";
      
    } else if (commandLower.includes("question") || commandLower.includes("ask")) {
      responseType = "suggestion";
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: "You are QUIN, an expert interview coach. Based on the conversation, suggest 2-3 follow-up questions the interviewer should ask. Keep suggestions brief and natural for spoken delivery." 
            },
            { role: "user", content: `${meetingContext}\n\nWhat questions should I ask next?` }
          ],
          max_tokens: 250
        })
      });

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content || "Based on the discussion, consider asking about their specific experience with the challenges mentioned.";
      
    } else if (commandLower.includes("flag") || commandLower.includes("mark") || commandLower.includes("highlight")) {
      responseType = "flag";
      
      // Create a meeting insight for the flagged moment
      if (meetingId) {
        await supabase.from("meeting_insights").insert({
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
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: "You are QUIN, an expert interview analyst. Identify any potential concerns or red flags from the recent discussion. Be brief and specific." 
            },
            { role: "user", content: `${meetingContext}\n\nAre there any concerns I should be aware of?` }
          ],
          max_tokens: 200
        })
      });

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content || "I haven't detected any significant concerns in the recent discussion.";
      
    } else if (commandLower.includes("time") || commandLower.includes("schedule")) {
      responseType = "info";
      responseText = context.remainingTime 
        ? `You have approximately ${context.remainingTime} minutes remaining in this meeting.`
        : "I don't have the meeting schedule information available right now.";
        
    } else {
      // General query
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { 
              role: "system", 
              content: "You are QUIN, The Quantum Club's AI meeting assistant. Respond briefly and helpfully to the host's query. Keep responses under 75 words for spoken delivery." 
            },
            { role: "user", content: `${meetingContext}\n\nUser said: ${command}` }
          ],
          max_tokens: 150
        })
      });

      const result = await response.json();
      responseText = result.choices?.[0]?.message?.content || "I'm here to help. Could you please rephrase your request?";
    }

    // Log the interaction
    await supabase.from("ai_action_log").insert({
      user_id: user.id,
      action_type: "quin_voice_command",
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("QUIN voice error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        responseText: "I'm sorry, I encountered an issue processing your request."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
