/**
 * Standardized Error Response Helper
 * Phase 2: Consistent error formatting across all edge functions
 */

export interface ErrorResponseOptions {
  message: string;
  status: number;
  corsHeaders: Record<string, string>;
  code?: string;
  details?: unknown;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse({
  message,
  status,
  corsHeaders,
  code,
  details,
}: ErrorResponseOptions): Response {
  const errorBody: Record<string, unknown> = {
    error: message,
    code: code || getErrorCode(status),
    timestamp: new Date().toISOString(),
  };

  if (details) {
    errorBody.details = details;
  }

  return new Response(JSON.stringify(errorBody), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create a success response with consistent formatting
 */
export function createSuccessResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Get a standard error code based on HTTP status
 */
function getErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    case 500:
      return 'INTERNAL_ERROR';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'ERROR';
  }
}

/**
 * Common error responses
 */
export const CommonErrors = {
  unauthorized: (corsHeaders: Record<string, string>) =>
    createErrorResponse({
      message: 'Authentication required',
      status: 401,
      corsHeaders,
      code: 'UNAUTHORIZED',
    }),

  forbidden: (corsHeaders: Record<string, string>) =>
    createErrorResponse({
      message: 'Access denied',
      status: 403,
      corsHeaders,
      code: 'FORBIDDEN',
    }),

  rateLimited: (corsHeaders: Record<string, string>, retryAfter?: number) => {
    const response = createErrorResponse({
      message: 'Too many requests. Please try again later.',
      status: 429,
      corsHeaders,
      code: 'RATE_LIMITED',
    });
    if (retryAfter) {
      response.headers.set('Retry-After', String(retryAfter));
    }
    return response;
  },

  badRequest: (corsHeaders: Record<string, string>, message?: string) =>
    createErrorResponse({
      message: message || 'Invalid request',
      status: 400,
      corsHeaders,
      code: 'BAD_REQUEST',
    }),

  internalError: (corsHeaders: Record<string, string>, message?: string) =>
    createErrorResponse({
      message: message || 'An unexpected error occurred',
      status: 500,
      corsHeaders,
      code: 'INTERNAL_ERROR',
    }),

  notFound: (corsHeaders: Record<string, string>, resource?: string) =>
    createErrorResponse({
      message: resource ? `${resource} not found` : 'Resource not found',
      status: 404,
      corsHeaders,
      code: 'NOT_FOUND',
    }),

  validationError: (
    corsHeaders: Record<string, string>,
    details: unknown
  ) =>
    createErrorResponse({
      message: 'Validation failed',
      status: 422,
      corsHeaders,
      code: 'VALIDATION_ERROR',
      details,
    }),

  missingConfig: (corsHeaders: Record<string, string>, configName: string) =>
    createErrorResponse({
      message: `${configName} is not configured. Please add it in backend settings.`,
      status: 500,
      corsHeaders,
      code: 'CONFIG_MISSING',
    }),
};
