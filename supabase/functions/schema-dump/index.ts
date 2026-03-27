import { authenticateUser, requireRole } from '../_shared/auth-helpers.ts';
import { createErrorResponse } from '../_shared/error-responses.ts';
import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const auth = await authenticateUser(req.headers.get('authorization'));
  requireRole(auth, ['admin']);

  const { data, error } = await ctx.supabase.rpc('tqc_generate_schema_dump');
  if (error) {
    throw new Error(error.message);
  }

  const sql = typeof data === 'string' ? data : String(data ?? '');

  return new Response(sql, {
    status: 200,
    headers: {
      ...ctx.corsHeaders,
      'Content-Type': 'application/sql; charset=utf-8',
      'Content-Disposition': 'attachment; filename="schema.sql"',
      'Cache-Control': 'no-store',
    },
  });
}));
