/**
 * Google OAuth UserInfo Proxy
 *
 * Fetches Google user profile information server-side so that
 * access tokens never leave the backend. The frontend sends
 * only the connectionId; this function looks up the token from
 * the database and calls the Google userinfo endpoint.
 */

import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { resilientFetch } from '../_shared/resilient-fetch.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const { connectionId, source } = await req.json();

  if (!connectionId) {
    return new Response(
      JSON.stringify({ error: 'connectionId is required' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Determine which table to look up based on source (calendar or email)
  const table = source === 'email' ? 'email_connections' : 'calendar_connections';

  // Look up the connection, scoped to the authenticated user
  const { data: connection, error: dbError } = await ctx.supabase
    .from(table)
    .select('access_token')
    .eq('id', connectionId)
    .eq('user_id', ctx.user.id)
    .single();

  if (dbError || !connection) {
    console.error(`[google-oauth-userinfo] Connection lookup failed (table=${table}):`, dbError);
    return new Response(
      JSON.stringify({ error: 'Connection not found or access denied' }),
      { status: 404, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const accessToken = connection.access_token;
  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: 'No access token found for this connection' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Call Google userinfo API server-side
  const { response: googleResponse } = await resilientFetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    {
      timeoutMs: 10_000,
      maxRetries: 1,
      service: 'google',
      operation: 'get-userinfo',
    },
  );

  if (!googleResponse.ok) {
    const errorText = await googleResponse.text();
    console.error('[google-oauth-userinfo] Google API error:', googleResponse.status, errorText);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch user info from Google', status: googleResponse.status }),
      { status: googleResponse.status, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const userInfo = await googleResponse.json();

  return new Response(
    JSON.stringify(userInfo),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
  );
}));
