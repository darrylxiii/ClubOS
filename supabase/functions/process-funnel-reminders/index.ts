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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const appUrl = Deno.env.get('APP_URL') || 'https://os.thequantumclub.com';
    const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;

    const now = Date.now();
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();

    // --- Touch 1: First reminder (2–48h, reminder_count = 0) ---
    const { data: firstTouch, error: firstError } = await supabase
      .from('funnel_partial_submissions')
      .select('*')
      .eq('completed', false)
      .eq('reminder_count', 0)
      .lt('created_at', twoHoursAgo)
      .gt('created_at', fortyEightHoursAgo)
      .not('contact_email', 'is', null)
      .not('email_quality', 'in', '("invalid","disposable")')
      .limit(50);

    if (firstError) throw firstError;

    // --- Touch 2: Second reminder (24h+ after first reminder, reminder_count = 1) ---
    const { data: secondTouch, error: secondError } = await supabase
      .from('funnel_partial_submissions')
      .select('*')
      .eq('completed', false)
      .eq('reminder_count', 1)
      .lt('reminder_sent_at', twentyFourHoursAgo)
      .not('contact_email', 'is', null)
      .limit(50);

    if (secondError) throw secondError;

    const allPartials = [
      ...(firstTouch || []).map(p => ({ ...p, _touch: 1 })),
      ...(secondTouch || []).map(p => ({ ...p, _touch: 2 })),
    ];

    if (allPartials.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'No reminders to send' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const partial of allPartials) {
      try {
        const resumeUrl = `${baseUrl}/partner?resume=${partial.session_id}`;
        const isSecondTouch = partial._touch === 2;

        const { error: invokeError } = await supabase.functions.invoke('send-funnel-reminder', {
          body: {
            email: partial.contact_email,
            contactName: partial.contact_name,
            companyName: partial.company_name,
            resumeUrl,
            isSecondReminder: isSecondTouch,
          },
        });

        if (invokeError) throw invokeError;

        // Update reminder tracking
        await supabase
          .from('funnel_partial_submissions')
          .update({
            reminder_sent_at: new Date().toISOString(),
            reminder_count: (partial.reminder_count || 0) + 1,
          })
          .eq('id', partial.id);

        sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${partial.contact_email}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({
      processed: allPartials.length,
      sent,
      failed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing funnel reminders:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
