import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2';
const MONEYBIRD_AUTH_URL = 'https://moneybird.com/oauth/authorize';
const MONEYBIRD_TOKEN_URL = 'https://moneybird.com/oauth/token';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const clientId = Deno.env.get('MONEYBIRD_CLIENT_ID');
  const clientSecret = Deno.env.get('MONEYBIRD_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('[Moneybird Auth] Missing OAuth credentials');
    return new Response(
      JSON.stringify({ error: 'Moneybird OAuth not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Step 1: Generate OAuth authorization URL
    if (action === 'authorize') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error('[Moneybird Auth] User auth failed:', userError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = `${supabaseUrl}/functions/v1/moneybird-auth`;
      const state = btoa(JSON.stringify({ userId: user.id, timestamp: Date.now() }));
      
      const authUrl = `${MONEYBIRD_AUTH_URL}?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'sales_invoices contacts documents bank',
        state: state,
      }).toString();

      console.log('[Moneybird Auth] Generated auth URL for user:', user.id);

      return new Response(
        JSON.stringify({ authUrl, state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Handle OAuth callback (code exchange)
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('[Moneybird Auth] OAuth error:', error);
      // Redirect to frontend with error
      return new Response(null, {
        status: 302,
        headers: { Location: `/admin/moneybird?error=${encodeURIComponent(error)}` }
      });
    }

    if (code && state) {
      console.log('[Moneybird Auth] Received OAuth callback with code');
      
      let stateData;
      try {
        stateData = JSON.parse(atob(state));
      } catch (e) {
        console.error('[Moneybird Auth] Invalid state:', e);
        return new Response(null, {
          status: 302,
          headers: { Location: '/admin/moneybird?error=invalid_state' }
        });
      }

      const { userId } = stateData;
      const redirectUri = `${supabaseUrl}/functions/v1/moneybird-auth`;

      // Exchange code for tokens
      const tokenResponse = await fetch(MONEYBIRD_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[Moneybird Auth] Token exchange failed:', errorText);
        return new Response(null, {
          status: 302,
          headers: { Location: '/admin/moneybird?error=token_exchange_failed' }
        });
      }

      const tokens = await tokenResponse.json();
      console.log('[Moneybird Auth] Token exchange successful');

      // Fetch administrations
      const adminResponse = await fetch(`${MONEYBIRD_API_BASE}/administrations.json`, {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });

      if (!adminResponse.ok) {
        console.error('[Moneybird Auth] Failed to fetch administrations');
        return new Response(null, {
          status: 302,
          headers: { Location: '/admin/moneybird?error=fetch_administrations_failed' }
        });
      }

      const administrations = await adminResponse.json();
      console.log('[Moneybird Auth] Found administrations:', administrations.length);

      // Store tokens temporarily (user will select administration)
      // We'll use the first administration for now, user can change later
      if (administrations.length > 0) {
        const admin = administrations[0];
        
        const { error: insertError } = await supabase
          .from('moneybird_settings')
          .upsert({
            user_id: userId,
            administration_id: admin.id.toString(),
            administration_name: admin.name,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: tokens.expires_in 
              ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
              : null,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,administration_id',
          });

        if (insertError) {
          console.error('[Moneybird Auth] Failed to store tokens:', insertError);
          return new Response(null, {
            status: 302,
            headers: { Location: '/admin/moneybird?error=storage_failed' }
          });
        }

        // Log the successful connection
        await supabase.from('moneybird_sync_logs').insert({
          user_id: userId,
          operation_type: 'oauth_connect',
          entity_type: 'settings',
          entity_id: admin.id.toString(),
          response_payload: { 
            administration_name: admin.name,
            administrations_count: administrations.length 
          },
          success: true,
        });

        console.log('[Moneybird Auth] Successfully connected for user:', userId);
      }

      // Redirect to success page
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/moneybird?success=connected' }
      });
    }

    // Step 3: Handle refresh token
    if (req.method === 'POST') {
      const body = await req.json();
      
      if (body.action === 'refresh') {
        const { settingsId } = body;
        
        const { data: settings, error: fetchError } = await supabase
          .from('moneybird_settings')
          .select('*')
          .eq('id', settingsId)
          .single();

        if (fetchError || !settings) {
          console.error('[Moneybird Auth] Settings not found:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Settings not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!settings.refresh_token) {
          console.error('[Moneybird Auth] No refresh token available');
          return new Response(
            JSON.stringify({ error: 'No refresh token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const tokenResponse = await fetch(MONEYBIRD_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: settings.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('[Moneybird Auth] Token refresh failed:', errorText);
          
          // Mark settings as inactive
          await supabase
            .from('moneybird_settings')
            .update({ is_active: false })
            .eq('id', settingsId);

          return new Response(
            JSON.stringify({ error: 'Token refresh failed', reconnect_required: true }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const tokens = await tokenResponse.json();

        await supabase
          .from('moneybird_settings')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || settings.refresh_token,
            token_expires_at: tokens.expires_in 
              ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settingsId);

        console.log('[Moneybird Auth] Token refreshed for settings:', settingsId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (body.action === 'disconnect') {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase
          .from('moneybird_settings')
          .update({ is_active: false })
          .eq('user_id', user.id);

        await supabase.from('moneybird_sync_logs').insert({
          user_id: user.id,
          operation_type: 'oauth_disconnect',
          entity_type: 'settings',
          success: true,
        });

        console.log('[Moneybird Auth] Disconnected for user:', user.id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (body.action === 'get_administrations') {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'Authorization required' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get active settings
        const { data: settings } = await supabase
          .from('moneybird_settings')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!settings) {
          return new Response(
            JSON.stringify({ error: 'Not connected' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const adminResponse = await fetch(`${MONEYBIRD_API_BASE}/administrations.json`, {
          headers: { 'Authorization': `Bearer ${settings.access_token}` },
        });

        if (!adminResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch administrations' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const administrations = await adminResponse.json();

        return new Response(
          JSON.stringify({ administrations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Moneybird Auth] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
