/**
 * Shared Zod validation schemas for edge function inputs.
 * Centralizes common field validation patterns used across email functions.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ── Primitives ──────────────────────────────────────────────────────────────

export const emailSchema = z.string().email('Invalid email address').trim().toLowerCase();
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const isoDateSchema = z.string().datetime({ message: 'Invalid ISO datetime' });
export const nameSchema = z.string().min(1, 'Name is required').max(200).trim();
export const optionalNameSchema = z.string().max(200).trim().optional();
export const urlSchema = z.string().url('Invalid URL');
export const optionalUrlSchema = z.string().url('Invalid URL').optional();

// ── Common input shapes ─────────────────────────────────────────────────────

/** Standard email recipient with name */
export const recipientSchema = z.object({
  email: emailSchema,
  fullName: nameSchema,
});

/** Email + optional name (for invitations, notifications) */
export const emailRecipientSchema = z.object({
  email: emailSchema,
  name: optionalNameSchema,
});

/** Booking-related IDs */
export const bookingIdSchema = z.object({
  bookingId: uuidSchema,
});

/** Candidate reference */
export const candidateRefSchema = z.object({
  candidateId: uuidSchema,
});

/** User reference */
export const userRefSchema = z.object({
  userId: uuidSchema,
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse and validate request body against a Zod schema.
 * Returns the validated data or a 400 Response with error details.
 */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
  corsHeaders: Record<string, string>,
): Promise<{ data: z.infer<T> } | { error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      error: new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    return {
      error: new Response(
        JSON.stringify({ error: 'Validation failed', issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  return { data: result.data };
}

// Re-export Zod for convenience so functions only need one import
export { z };
