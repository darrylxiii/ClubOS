import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input - now includes refreshToken action
    const requestSchema = z.object({
      action: z.enum(['getAuthUrl', 'exchangeCode', 'refreshToken']),
      code: z.string().optional(),
      refreshToken: z.string().optional(),
      redirectUri: z.string().url('Invalid redirect URI').optional()
    }).refine(
      (data) => {
        // redirectUri required for getAuthUrl and exchangeCode
        if (data.action === 'getAuthUrl' || data.action === 'exchangeCode') {
          return !!data.redirectUri;
        }
        // refreshToken required for refreshToken action
        if (data.action === 'refreshToken') {
          return !!data.refreshToken;
        }
        return true;
      },
      {
        message: "redirectUri required for getAuthUrl/exchangeCode, refreshToken required for refreshToken action"
      }
    );

    const body = await req.json();
    const { action, code, refreshToken, redirectUri } = requestSchema.parse(body);
    
    console.log('🔵 Google Calendar auth request:', { action, redirectUri: redirectUri?.substring(0, 50) + '...' });
    
    // Authentication is handled by Supabase platform (verify_jwt = true in config.toml)
    // No need to manually check auth here
    
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
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
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
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Authorization code is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Exchange authorization code for tokens
      console.log('🔄 Exchanging code with Google...');
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri!,
          grant_type: 'authorization_code',
        }),
      });
      console.log('📥 Google response status:', tokenResponse.status);

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
      console.log('✅ Token exchange successful');
      
      // Calculate token expiration (Google tokens typically expire in 1 hour)
      const expiresIn = tokens.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      return new Response(
        JSON.stringify({ 
          tokens: {
            ...tokens,
            expires_at: expiresAt.toISOString()
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refreshToken') {
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: 'Refresh token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('🔄 Refreshing Google access token...');
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });
      console.log('📥 Google refresh response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { error: errorText };
        }
        
        console.error('Token refresh failed:', {
          status: tokenResponse.status,
          error: errorDetails,
        });
        
        let userMessage = 'Failed to refresh Google Calendar token';
        if (errorDetails.error === 'invalid_grant') {
          userMessage = 'Refresh token expired or revoked. Please reconnect your Google Calendar.';
        } else if (errorDetails.error_description) {
          userMessage = errorDetails.error_description;
        }
        
        return new Response(
          JSON.stringify({ 
            error: userMessage,
            details: errorDetails,
            requiresReauth: errorDetails.error === 'invalid_grant'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      console.log('✅ Token refresh successful');
      
      // Calculate token expiration
      const expiresIn = tokens.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      return new Response(
        JSON.stringify({ 
          tokens: {
            access_token: tokens.access_token,
            expires_in: tokens.expires_in,
            expires_at: expiresAt.toISOString(),
            token_type: tokens.token_type,
            scope: tokens.scope,
            // Preserve original refresh_token if not returned
            refresh_token: tokens.refresh_token || refreshToken
          }
        }),
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
