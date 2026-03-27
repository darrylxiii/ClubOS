import { z } from 'npm:zod@3';
import { createAuthenticatedHandler } from '../_shared/handler.ts';

const gdprDeleteSchema = z.object({
  action: z.enum(['request', 'cancel']),
  reason: z.string().trim().max(1000, 'Reason must be under 1000 characters').optional(),
});

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const body = await req.json();
    const parseResult = gdprDeleteSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.flatten().fieldErrors }),
        { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, reason } = parseResult.data;

    if (action === 'request') {
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 30);

      const { data: deletionRequest, error: requestError } = await ctx.supabase
        .from('deletion_requests')
        .insert({
          user_id: ctx.user.id,
          scheduled_for: scheduledFor.toISOString(),
          reason: reason ?? null,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      await ctx.supabase.from('audit_events').insert({
        event_type: 'gdpr_deletion_requested',
        actor_id: ctx.user.id,
        actor_email: ctx.user.email,
        action: 'deletion_requested',
        metadata: {
          deletion_request_id: deletionRequest.id,
          scheduled_for: scheduledFor.toISOString(),
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          scheduled_for: scheduledFor.toISOString(),
          deletion_request_id: deletionRequest.id,
        }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'cancel') {
      const { error: cancelError } = await ctx.supabase
        .from('deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', ctx.user.id)
        .eq('status', 'pending');

      if (cancelError) throw cancelError;

      await ctx.supabase.from('audit_events').insert({
        event_type: 'gdpr_deletion_cancelled',
        actor_id: ctx.user.id,
        actor_email: ctx.user.email,
        action: 'deletion_cancelled',
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
