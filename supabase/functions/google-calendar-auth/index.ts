import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const requestSchema = z.object({
      action: z.enum(['getAuthUrl', 'exchangeCode']),
      code: z.string().optional(),
      redirectUri: z.string().url('Invalid redirect URI')
    });

    const { action, code, redirectUri } = requestSchema.parse(await req.json());
    
    console.log('Google Calendar auth request:', { action, redirectUri: redirectUri.substring(0, 50) + '...' });
    
    // Only verify authentication for exchangeCode action (not for getAuthUrl)
    if (action === 'exchangeCode') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.error('Missing authorization header');
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User authentication failed:', userError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Authenticated user:', user.id);
    }
    
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth credentials');
      return new Response(
        JSON.stringify({ error: 'Google Calendar integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getAuthUrl') {
      // Generate OAuth URL
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent`;

      console.log('Generated Google OAuth URL with redirect:', redirectUri);

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchangeCode') {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { error: errorText };
        }
        
        console.error('Token exchange failed:', {
          status: tokenResponse.status,
          error: errorDetails,
          redirectUri
        });
        
        let userMessage = 'Failed to authenticate with Google Calendar';
        if (errorDetails.error === 'redirect_uri_mismatch') {
          userMessage = `Redirect URI mismatch. Please add "${redirectUri}" to your Google Cloud Console OAuth 2.0 Client authorized redirect URIs.`;
        } else if (errorDetails.error === 'invalid_grant') {
          userMessage = 'Authorization code expired or invalid. Please try connecting again.';
        } else if (errorDetails.error_description) {
          userMessage = errorDetails.error_description;
        }
        
        return new Response(
          JSON.stringify({ 
            error: userMessage,
            details: errorDetails,
            redirectUri 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      
      return new Response(
        JSON.stringify({ tokens }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google Calendar auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});