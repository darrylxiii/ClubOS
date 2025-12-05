/**
 * Shared Validation Schemas
 * Phase 4: Input Validation Standardization
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Common reusable schemas for consistent validation
 */
export const commonSchemas = {
  // Identity
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  
  // Text fields
  shortText: z.string().trim().min(1, 'Cannot be empty').max(100, 'Too long (max 100 chars)'),
  mediumText: z.string().trim().min(1, 'Cannot be empty').max(500, 'Too long (max 500 chars)'),
  longText: z.string().trim().min(1, 'Cannot be empty').max(5000, 'Too long (max 5000 chars)'),
  
  // URLs
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),
  
  // Dates
  isoDate: z.string().datetime('Invalid ISO date format'),
  
  // Numbers
  positiveInt: z.number().int().positive('Must be positive'),
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),
  
  // Arrays
  stringArray: z.array(z.string()).max(100, 'Too many items'),
  uuidArray: z.array(z.string().uuid()).max(100, 'Too many items'),
};

/**
 * KB Search schema
 */
export const kbSearchSchema = z.object({
  query: z.string().min(2, 'Query too short').max(500, 'Query too long'),
  category: z.string().max(100).optional(),
  user_role: z.enum(['admin', 'strategist', 'partner', 'candidate']).optional(),
});

/**
 * Support ticket schema
 */
export const supportTicketSchema = z.object({
  user_id: commonSchemas.uuid.optional(),
  email: commonSchemas.email,
  category: z.string().max(100),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  metadata: z.record(z.any()).optional(),
  company_id: commonSchemas.uuid.optional(),
});

/**
 * Embeddings generation schema
 */
export const embeddingsSchema = z.object({
  text: z.string().min(1).max(10000),
  entity_type: z.enum(['candidate', 'job', 'knowledge', 'interaction']).optional(),
  entity_id: commonSchemas.uuid.optional(),
});

/**
 * Message schema for chat endpoints
 */
export const chatMessageSchema = z.object({
  message: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long (max 5000 characters)'),
  conversationId: commonSchemas.uuid.optional(),
  context: z.record(z.any()).optional()
});

/**
 * User identification schema
 */
export const userIdSchema = z.object({
  userId: commonSchemas.uuid
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  startDate: commonSchemas.isoDate,
  endDate: commonSchemas.isoDate
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before end date' }
);

/**
 * API key schema
 */
export const apiKeySchema = z.object({
  apiKey: z.string()
    .min(32, 'Invalid API key format')
    .max(64, 'Invalid API key format')
});

/**
 * Contact form schema with comprehensive validation
 */
export const contactFormSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  email: commonSchemas.email,
  subject: z.string()
    .trim()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters'),
  message: z.string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be less than 2000 characters')
});

/**
 * Helper function to validate input with safe result type
 */
export function validateInputSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  corsHeaders: Record<string, string>
): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.flatten();
    console.error('[Validation] Input validation failed:', errors);
    
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }
  
  return { success: true, data: result.data };
}

/**
 * Helper to create validation error response
 */
export function createValidationErrorResponse(
  error: Error,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      message: error.message,
      code: 'VALIDATION_ERROR'
    }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}
