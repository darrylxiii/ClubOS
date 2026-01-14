import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }
    if (!ELEVENLABS_AGENT_ID) {
      throw new Error('ELEVENLABS_AGENT_ID is not set');
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

    // Request a signed URL from ElevenLabs using the configured Agent ID
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`Failed to create voice session: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
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
