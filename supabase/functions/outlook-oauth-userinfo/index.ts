/**
 * Outlook OAuth UserInfo Proxy
 *
 * Fetches Microsoft Graph user profile information server-side so that
 * access tokens never leave the backend. The frontend sends
 * only the connectionId; this function looks up the token from
 * the database and calls the Microsoft Graph /me endpoint.
 */

import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { resilientFetch } from '../_shared/resilient-fetch.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const { connectionId } = await req.json();

  if (!connectionId) {
    return new Response(
      JSON.stringify({ error: 'connectionId is required' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Look up the connection, scoped to the authenticated user
  const { data: connection, error: dbError } = await ctx.supabase
    .from('email_connections')
    .select('access_token')
    .eq('id', connectionId)
    .eq('user_id', ctx.user.id)
    .eq('provider', 'outlook')
    .single();

  if (dbError || !connection) {
    console.error('[outlook-oauth-userinfo] Connection lookup failed:', dbError);
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

  // Call Microsoft Graph API server-side
  const { response: graphResponse } = await resilientFetch(
    'https://graph.microsoft.com/v1.0/me',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    {
      timeoutMs: 10_000,
      maxRetries: 1,
      service: 'microsoft',
      operation: 'get-userinfo',
    },
  );

  if (!graphResponse.ok) {
    const errorText = await graphResponse.text();
    console.error('[outlook-oauth-userinfo] Microsoft Graph API error:', graphResponse.status, errorText);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch user info from Microsoft', status: graphResponse.status }),
      { status: graphResponse.status, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const userInfo = await graphResponse.json();

  return new Response(
    JSON.stringify(userInfo),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } },
  );
}));
