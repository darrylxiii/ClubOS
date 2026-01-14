import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

const requestSchema = z.object({
  action: z.enum(['getAuthUrl', 'exchangeCode']),
  code: z.string().max(500).optional(),
  redirectUri: z.string().url().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, code, redirectUri } = requestSchema.parse(body);
    
    console.log('📧 Gmail OAuth request:', { action, redirectUri: redirectUri?.substring(0, 50) + '...' });
    
    const clientId = Deno.env.get('GMAIL_CLIENT_ID');
    const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    if (action === 'getAuthUrl') {
      if (!redirectUri) throw new Error('redirectUri is required for getAuthUrl');
      
      // Request comprehensive Gmail scopes
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/gmail.settings.basic',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent`;

      console.log('✅ Generated Gmail OAuth URL');

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchangeCode') {
      if (!code) throw new Error('code is required for exchangeCode');
      if (!redirectUri) throw new Error('redirectUri is required for exchangeCode');
      
      console.log('🔄 Exchanging code with Google...');
      
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      console.log('📥 Google response status:', response.status);

      const tokens = await response.json();

      if (!response.ok) {
        console.error('❌ Google token exchange error:', tokens);
        
        if (tokens.error === 'redirect_uri_mismatch') {
          throw new Error('Redirect URI mismatch. Please ensure the redirect URI is registered in Google Cloud Console.');
        }
        if (tokens.error === 'invalid_grant') {
          throw new Error('Authorization code expired or invalid. Please try connecting again.');
        }
        
        throw new Error(tokens.error_description || 'Failed to exchange code for tokens');
      }

      console.log('✅ Token exchange successful');

      return new Response(
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          scope: tokens.scope,
          token_type: tokens.token_type
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('❌ Error in gmail-oauth:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
