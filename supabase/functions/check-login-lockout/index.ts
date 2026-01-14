import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

// Progressive lockout delays (in seconds)
const LOCKOUT_THRESHOLDS = [
  { attempts: 3, delay: 30 },      // 3 failures: 30 seconds
  { attempts: 5, delay: 300 },     // 5 failures: 5 minutes
  { attempts: 10, delay: 1800 },   // 10 failures: 30 minutes
  { attempts: 20, delay: 3600 },   // 20 failures: 1 hour
];

const LOCKOUT_WINDOW_MINUTES = 60; // Count attempts within last hour

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (action === 'check') {
      // Check if user is locked out
      const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();

      const { data: attempts, error } = await supabaseAdmin
        .from('login_attempts')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('success', false)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[check-login-lockout] Error fetching attempts:', error);
        // Fail open - allow login attempt
        return new Response(
          JSON.stringify({ locked: false, attempts: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const failedAttempts = attempts?.length || 0;

      // Find applicable lockout threshold
      let lockoutDelay = 0;
      for (const threshold of LOCKOUT_THRESHOLDS.reverse()) {
        if (failedAttempts >= threshold.attempts) {
          lockoutDelay = threshold.delay;
          break;
        }
      }

      if (lockoutDelay > 0 && attempts && attempts.length > 0) {
        const lastAttempt = new Date(attempts[0].created_at);
        const unlockTime = new Date(lastAttempt.getTime() + lockoutDelay * 1000);
        const now = new Date();

        if (now < unlockTime) {
          const remainingSeconds = Math.ceil((unlockTime.getTime() - now.getTime()) / 1000);
          
          return new Response(
            JSON.stringify({ 
              locked: true, 
              attempts: failedAttempts,
              remaining_seconds: remainingSeconds,
              unlock_at: unlockTime.toISOString(),
              message: `Too many failed attempts. Try again in ${formatDuration(remainingSeconds)}.`
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ locked: false, attempts: failedAttempts }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'record') {
      // Record a login attempt
      const { success } = await req.json();

      const { error: insertError } = await supabaseAdmin
        .from('login_attempts')
        .insert({
          email: email.toLowerCase(),
          ip_address: ipAddress,
          user_agent: userAgent,
          success: success || false
        });

      if (insertError) {
        console.error('[check-login-lockout] Error recording attempt:', insertError);
      }

      // If successful login, optionally clear failed attempts
      if (success) {
        await supabaseAdmin
          .from('login_attempts')
          .delete()
          .eq('email', email.toLowerCase())
          .eq('success', false);
      }

      return new Response(
        JSON.stringify({ recorded: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[check-login-lockout] Error:', error);
    // Fail open on errors
    return new Response(
      JSON.stringify({ locked: false, error: 'Check failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  return `${Math.ceil(seconds / 3600)} hour(s)`;
}
