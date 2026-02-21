import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name',
};

// Progressive lockout delays (in seconds)
const LOCKOUT_THRESHOLDS = [
  { attempts: 3, delay: 30 },      // 3 failures: 30 seconds
  { attempts: 5, delay: 300 },     // 5 failures: 5 minutes
  { attempts: 10, delay: 1800 },   // 10 failures: 30 minutes
  { attempts: 20, delay: 3600 },   // 20 failures: 1 hour
];

// IP-based lockout thresholds (stricter)
const IP_LOCKOUT_THRESHOLDS = [
  { attempts: 10, delay: 300 },    // 10 failures from same IP: 5 minutes
  { attempts: 25, delay: 1800 },   // 25 failures: 30 minutes
  { attempts: 50, delay: 3600 },   // 50 failures: 1 hour
];

const LOCKOUT_WINDOW_MINUTES = 60; // Count attempts within last hour

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action, success: loginSuccess } = await req.json();
    
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

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (action === 'check') {
      const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();

      // Check both email-based and IP-based attempts in parallel
      const [emailResult, ipResult] = await Promise.all([
        supabaseAdmin
          .from('login_attempts')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('success', false)
          .gte('created_at', windowStart)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('login_attempts')
          .select('*')
          .eq('ip_address', ipAddress)
          .eq('success', false)
          .gte('created_at', windowStart)
          .order('created_at', { ascending: false }),
      ]);

      if (emailResult.error && ipResult.error) {
        console.error('[check-login-lockout] Error fetching attempts:', emailResult.error);
        return new Response(
          JSON.stringify({ locked: false, attempts: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailAttempts = emailResult.data?.length || 0;
      const ipAttempts = ipResult.data?.length || 0;

      // Check email-based lockout
      const emailLockout = checkLockout(emailAttempts, emailResult.data, LOCKOUT_THRESHOLDS);
      // Check IP-based lockout
      const ipLockout = checkLockout(ipAttempts, ipResult.data, IP_LOCKOUT_THRESHOLDS);

      // Use the stricter lockout
      if (emailLockout.locked || ipLockout.locked) {
        const strictest = (emailLockout.remainingSeconds || 0) > (ipLockout.remainingSeconds || 0) 
          ? emailLockout : ipLockout;
        
        return new Response(
          JSON.stringify({ 
            locked: true, 
            attempts: emailAttempts,
            remaining_seconds: strictest.remainingSeconds,
            unlock_at: strictest.unlockAt,
            message: `Too many failed attempts. Try again in ${formatDuration(strictest.remainingSeconds || 0)}.`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ locked: false, attempts: emailAttempts }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'record') {
      // Record a login attempt (use loginSuccess from the single req.json() call)
      const { error: insertError } = await supabaseAdmin
        .from('login_attempts')
        .insert({
          email: email.toLowerCase(),
          ip_address: ipAddress,
          user_agent: userAgent,
          success: loginSuccess || false
        });

      if (insertError) {
        console.error('[check-login-lockout] Error recording attempt:', insertError);
      }

      // If successful login, clear failed attempts for this email
      if (loginSuccess) {
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
    return new Response(
      JSON.stringify({ locked: false, error: 'Check failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface LockoutResult {
  locked: boolean;
  remainingSeconds?: number;
  unlockAt?: string;
}

function checkLockout(
  failedCount: number,
  attempts: any[] | null,
  thresholds: { attempts: number; delay: number }[]
): LockoutResult {
  let lockoutDelay = 0;
  // Use spread to avoid mutating the original array
  for (const threshold of [...thresholds].reverse()) {
    if (failedCount >= threshold.attempts) {
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
      return {
        locked: true,
        remainingSeconds,
        unlockAt: unlockTime.toISOString(),
      };
    }
  }

  return { locked: false };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  return `${Math.ceil(seconds / 3600)} hour(s)`;
}
