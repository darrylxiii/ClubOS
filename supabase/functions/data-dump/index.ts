import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import { authenticateUser, requireRole } from '../_shared/auth-helpers.ts';
import { createErrorResponse } from '../_shared/error-responses.ts';
import { getCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true);

  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(req);
  }

  try {
    const auth = await authenticateUser(req.headers.get('authorization'));
    requireRole(auth, ['admin']);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabaseAdmin.rpc('tqc_generate_data_dump');
    if (error) {
      throw new Error(error.message);
    }

    const sql = typeof data === 'string' ? data : String(data ?? '');

    return new Response(sql, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': 'attachment; filename="data.sql"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const m = message.toLowerCase();
    const status =
      m.includes('missing authorization') ||
      m.includes('invalid or expired token') ||
      m.includes('unauthorized')
        ? 401
        : m.includes('required roles') || m.includes('forbidden')
          ? 403
          : 500;

    return createErrorResponse({
      message,
      status,
      corsHeaders,
    });
  }
});
