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

    console.log('reCAPTCHA verification result:', {
      success: verifyData.success,
      score: verifyData.score,
      action: verifyData.action,
      expectedAction,
      hostname: verifyData.hostname,
      errorCodes: verifyData['error-codes'],
    });

    // Check for Google API errors first
    if (!verifyData.success && verifyData['error-codes']?.length > 0) {
      const errorCodes = verifyData['error-codes'].join(', ');
      console.error(`reCAPTCHA API error: ${errorCodes}`);
      return {
        success: false,
        score: verifyData.score,
        error: `API error: ${errorCodes}`
      };
    }

    // Verify action matches if specified
    if (expectedAction && verifyData.action !== expectedAction) {
      console.error(`reCAPTCHA action mismatch: expected '${expectedAction}', got '${verifyData.action}'`);
      return {
        success: false,
        score: verifyData.score,
        action: verifyData.action,
        error: `Action mismatch: expected '${expectedAction}', got '${verifyData.action}'`
      };
    }

    // Check score threshold
    if (verifyData.success && verifyData.score < minScore) {
      console.warn(`reCAPTCHA score below threshold: ${verifyData.score} < ${minScore} (hostname: ${verifyData.hostname})`);
      return {
        success: false,
        score: verifyData.score,
        error: `Score ${verifyData.score} below threshold ${minScore}`
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
