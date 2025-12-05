/**
 * AI Fetch Utility with Timeout Support
 * Phase 2: Consistent AI API calls with timeout protection
 */

export interface AIFetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface AIRequestBody {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  tools?: unknown[];
  stream?: boolean;
  [key: string]: unknown;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Fetch from Lovable AI Gateway with timeout protection
 */
export async function fetchAI(
  body: AIRequestBody,
  options: AIFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AITimeoutError(`AI request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Custom error class for AI timeouts
 */
export class AITimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AITimeoutError';
  }
}

/**
 * Handle AI response errors consistently
 */
export function handleAIError(
  response: Response,
  corsHeaders: Record<string, string>
): Response | null {
  if (response.ok) return null;

  if (response.status === 429) {
    return new Response(
      JSON.stringify({ 
        error: 'AI rate limit exceeded. Please try again later.',
        code: 'AI_RATE_LIMITED'
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  if (response.status === 402) {
    return new Response(
      JSON.stringify({ 
        error: 'AI credits exhausted. Please add funds to your workspace.',
        code: 'AI_CREDITS_EXHAUSTED'
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return null; // Let caller handle other errors
}

/**
 * Create timeout error response
 */
export function createTimeoutResponse(
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'AI request timed out. Please try again.',
      code: 'AI_TIMEOUT'
    }),
    { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
