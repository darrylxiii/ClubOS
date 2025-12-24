import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    let userName = 'there';
    let userRole = 'member';

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        userId = user.id;
        
        // Fetch user profile for personalization
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          userName = profile.full_name?.split(' ')[0] || 'there';
          userRole = profile.role || 'member';
        }
      }
    }

    // Parse request body for context
    const { context = {} } = await req.json().catch(() => ({}));
    const currentPage = context.page || 'dashboard';

    console.log("Creating ClubAI voice session for user:", userId, "on page:", currentPage);

    // Build the system prompt for ClubAI
    const systemPrompt = `You are ClubAI, the premium voice assistant for The Quantum Club - an exclusive, invite-only talent platform. You help members navigate the platform, manage their careers, and access opportunities.

Your personality:
- Professional yet warm and approachable
- Concise and efficient - respect the user's time
- Knowledgeable about the platform's features
- Proactive in suggesting helpful actions

The user's name is ${userName} and their role is ${userRole}. They are currently on the ${currentPage} page.

You have access to these tools to help users:
- navigate_to: Navigate to different pages (dashboard, jobs, messages, profile, calendar, tasks, academy, etc.)
- create_task: Create a new task with title and optional priority
- search_platform: Search across the platform for jobs, companies, or content
- show_notification: Display a notification message to the user
- open_command_palette: Open the command palette for quick actions

When users ask to go somewhere or do something, use the appropriate tool. Always confirm what you're doing.

Keep responses brief and natural for voice - typically 1-2 sentences unless more detail is requested.`;

    // Request a WebRTC token from ElevenLabs
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=placeholder",
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    // For now, we'll use the session endpoint which supports custom prompts
    const sessionResponse = await fetch(
      "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url",
      {
        method: "POST", 
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_config: {
            prompt: {
              prompt: systemPrompt,
            },
            first_message: `Hi ${userName}! I'm ClubAI, your voice assistant. How can I help you today?`,
            language: "en",
          },
        }),
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("ElevenLabs API error:", errorText);
      
      // Fallback to signed URL approach without custom config
      const fallbackResponse = await fetch(
        "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url",
        {
          method: "GET",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        }
      );

      if (!fallbackResponse.ok) {
        throw new Error(`Failed to create voice session: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      
      // Log session creation
      if (userId) {
        await supabase.from('clubai_voice_sessions').insert({
          user_id: userId,
          context: { page: currentPage, userName, userRole },
        });
      }

      return new Response(JSON.stringify({
        signedUrl: fallbackData.signed_url,
        userName,
        userRole,
        currentPage,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await sessionResponse.json();
    console.log("ClubAI session created successfully");

    // Log session creation
    if (userId) {
      await supabase.from('clubai_voice_sessions').insert({
        user_id: userId,
        context: { page: currentPage, userName, userRole },
      });
    }

    return new Response(JSON.stringify({
      signedUrl: data.signed_url,
      userName,
      userRole,
      currentPage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error creating ClubAI session:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
