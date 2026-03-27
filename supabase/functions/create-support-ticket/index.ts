/**
 * Create Support Ticket Edge Function
 * Phase 3: Enhanced with validation, logging, and standardized CORS
 */
import { createHandler } from '../_shared/handler.ts';
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { createFunctionLogger, getClientInfo } from "../_shared/function-logger.ts";
import { supportTicketSchema, validateInputSafe } from "../_shared/validation-schemas.ts";

Deno.serve(createHandler(async (req, ctx) => {
  const logger = createFunctionLogger('create-support-ticket');
  const clientInfo = getClientInfo(req);
  logger.logRequest(req.method, undefined, { ip: clientInfo.ip });

  // Rate limiting: 5 tickets per hour per IP
  const rateLimitResult = await checkUserRateLimit(clientInfo.ip, "create-support-ticket", 5, 3600000);
  if (!rateLimitResult.allowed) {
    logger.logRateLimit(clientInfo.ip);
    return createRateLimitResponse(rateLimitResult.retryAfter || 3600, ctx.corsHeaders);
  }

  const rawInput = await req.json();
  const validation = validateInputSafe(supportTicketSchema, rawInput, ctx.corsHeaders);
  if (!validation.success) {
    logger.logError(400, 'Validation failed');
    return validation.response;
  }

  const { user_id, email, category, priority, subject, description, metadata, company_id } = validation.data;
  logger.info('Creating support ticket', { category, priority, hasUserId: !!user_id });

  // Create support ticket
  const { data: ticket, error: ticketError } = await ctx.supabase
    .from('support_tickets')
    .insert({
      user_id: user_id || null,
      created_by_email: email,
      company_id: company_id || null,
      category,
      priority: priority || 'medium',
      subject,
      description,
      metadata: metadata || {},
      channel: 'in_app',
      status: 'open',
    })
    .select()
    .single();

  if (ticketError) throw ticketError;

  // Auto-assign based on category (simple round-robin for now)
  // In production, use workload balancing
  const { data: agents } = await ctx.supabase
    .from('user_roles')
    .select('user_id, profiles!inner(full_name, email)')
    .eq('role', 'strategist')
    .limit(1);

  if (agents && agents.length > 0) {
    await ctx.supabase
      .from('support_tickets')
      .update({
        assigned_to: agents[0].user_id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);
  }

  // Send notification to user
  if (user_id) {
    await ctx.supabase
      .from('notifications')
      .insert({
        user_id,
        title: 'Support Ticket Created',
        message: `Your ticket ${ticket.ticket_number} has been received. We'll respond within ${ticket.sla_target_response_minutes || 120} minutes.`,
        type: 'support',
        action_url: `/support/tickets/${ticket.id}`,
        metadata: { ticket_id: ticket.id },
      });
  }

  logger.logSuccess(200, { ticketId: ticket.id, ticketNumber: ticket.ticket_number });

  return new Response(
    JSON.stringify({
      success: true,
      ticket,
      message: 'Support ticket created successfully'
    }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
