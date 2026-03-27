import { createHandler } from '../_shared/handler.ts';

// Progressive lockout delays (in seconds)
const LOCKOUT_THRESHOLDS = [
  { attempts: 3, delay: 30 },
  { attempts: 5, delay: 300 },
  { attempts: 10, delay: 1800 },
  { attempts: 20, delay: 3600 },
];

// IP-based lockout thresholds (stricter)
const IP_LOCKOUT_THRESHOLDS = [
  { attempts: 10, delay: 300 },
  { attempts: 25, delay: 1800 },
  { attempts: 50, delay: 3600 },
];

const LOCKOUT_WINDOW_MINUTES = 60;

Deno.serve(createHandler(async (req, ctx) => {
    const { email, action, success: loginSuccess } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (action === 'check') {
      const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();

      const [emailResult, ipResult] = await Promise.all([
        ctx.supabase
          .from('login_attempts')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('success', false)
          .gte('created_at', windowStart)
          .order('created_at', { ascending: false }),
        ctx.supabase
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
          { status: 200, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailAttempts = emailResult.data?.length || 0;
      const ipAttempts = ipResult.data?.length || 0;

      const emailLockout = checkLockout(emailAttempts, emailResult.data, LOCKOUT_THRESHOLDS);
      const ipLockout = checkLockout(ipAttempts, ipResult.data, IP_LOCKOUT_THRESHOLDS);

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
          { status: 200, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ locked: false, attempts: emailAttempts }),
        { status: 200, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'record') {
      const { error: insertError } = await ctx.supabase
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

      if (loginSuccess) {
        await ctx.supabase
          .from('login_attempts')
          .delete()
          .eq('email', email.toLowerCase())
          .eq('success', false);
      }

      return new Response(
        JSON.stringify({ recorded: true }),
        { status: 200, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
}));

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
