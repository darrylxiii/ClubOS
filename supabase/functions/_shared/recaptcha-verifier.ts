/**
 * reCAPTCHA v3 Verification Utility
 * Verifies reCAPTCHA tokens with Google's API
 */

export interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  error?: string;
}

/**
 * Verify a reCAPTCHA v3 token
 * 
 * @param token - The reCAPTCHA token from the client
 * @param expectedAction - Optional action name to verify against
 * @param minScore - Minimum score to consider valid (default: 0.5)
 * @returns Verification result with success status and score
 */
export async function verifyRecaptcha(
  token: string,
  expectedAction?: string,
  minScore: number = 0.5
): Promise<RecaptchaVerificationResult> {
  const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY');
  
  if (!recaptchaSecret) {
    console.error('RECAPTCHA_SECRET_KEY not configured');
    return {
      success: false,
      error: 'Server configuration error'
    };
  }

  try {
    const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${recaptchaSecret}&response=${token}`,
    });

    const verifyData = await verifyResponse.json();

    console.log('reCAPTCHA verification:', {
      success: verifyData.success,
      score: verifyData.score,
      action: verifyData.action,
      expectedAction
    });

    // Verify action matches if specified
    if (expectedAction && verifyData.action !== expectedAction) {
      return {
        success: false,
        score: verifyData.score,
        error: 'Action mismatch'
      };
    }

    // Check score threshold
    if (verifyData.success && verifyData.score < minScore) {
      return {
        success: false,
        score: verifyData.score,
        error: `Score too low: ${verifyData.score} < ${minScore}`
      };
    }

    return {
      success: verifyData.success,
      score: verifyData.score,
      action: verifyData.action
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    };
  }
}

/**
 * Create a reCAPTCHA verification error response
 */
export function createRecaptchaErrorResponse(
  result: RecaptchaVerificationResult,
  corsHeaders: Record<string, string>
) {
  return new Response(
    JSON.stringify({
      error: 'reCAPTCHA verification failed',
      details: result.error,
      score: result.score
    }),
    {
      status: 403,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}
