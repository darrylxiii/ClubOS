import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email: rawEmail, sessionId } = await req.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail;

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic format check
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ quality: 'invalid', reason: 'invalid_format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const millionVerifierKey = Deno.env.get('MILLIONVERIFIER_API_KEY');
    const findymailKey = Deno.env.get('FINDYMAIL_API_KEY');

    let quality = 'unknown';
    let reason: string | null = null;

    // Step 1: MillionVerifier check
    if (millionVerifierKey) {
      try {
        const mvUrl = `https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(millionVerifierKey)}&email=${encodeURIComponent(email)}`;
        const mvRes = await fetch(mvUrl);

        if (mvRes.ok) {
          const mvData = await mvRes.json();
          const result = mvData.result?.toLowerCase() || mvData.resultcode?.toString();

          console.log(`MillionVerifier result for ${email}:`, mvData);

          if (result === 'ok' || result === 'valid' || mvData.resultcode === 1) {
            quality = 'verified';
          } else if (result === 'catch_all' || mvData.resultcode === 4) {
            quality = 'catch_all';
          } else if (result === 'disposable' || mvData.resultcode === 3) {
            quality = 'disposable';
            reason = 'disposable';
          } else if (result === 'invalid' || result === 'error' || mvData.resultcode === 2) {
            quality = 'invalid';
            reason = 'invalid';
          } else {
            quality = 'unknown';
          }
        }
      } catch (err) {
        console.error('MillionVerifier API error (fail-open):', err);
        // Fail open
      }
    }

    // Step 2: Findymail double-check for catch_all or unknown
    if ((quality === 'catch_all' || quality === 'unknown') && findymailKey) {
      try {
        const fmRes = await fetch('https://app.findymail.com/api/verify/single', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${findymailKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (fmRes.ok) {
          const fmData = await fmRes.json();
          console.log(`Findymail result for ${email}:`, fmData);

          if (fmData.status === 'valid' || fmData.deliverable === true) {
            quality = 'verified';
            reason = null;
          } else if (fmData.status === 'invalid' || fmData.deliverable === false) {
            quality = 'invalid';
            reason = 'unverifiable';
          }
          // If Findymail also returns unknown/catch_all, keep the original quality
        }
      } catch (err) {
        console.error('Findymail API error (fail-open):', err);
        // Fail open — keep previous quality
      }
    }

    // Step 3: Update funnel_partial_submissions if sessionId provided
    if (sessionId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase
          .from('funnel_partial_submissions')
          .update({
            email_quality: quality,
            email_verified_at: quality === 'verified' ? new Date().toISOString() : null,
          })
          .eq('session_id', sessionId);
      } catch (err) {
        console.error('Failed to update email_quality:', err);
      }
    }

    return new Response(JSON.stringify({ quality, reason }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error verifying funnel email:', error);
    // Fail open
    return new Response(JSON.stringify({ quality: 'unknown', reason: 'error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
