import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing reCAPTCHA token' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY');
    
    if (!recaptchaSecret) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify with Google reCAPTCHA API
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
      hostname: verifyData.hostname,
    });

    return new Response(
      JSON.stringify({
        success: verifyData.success,
        score: verifyData.score,
        action: verifyData.action,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    const errorMessage = error instanceof Error ? error.message : 'Verification failed';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
