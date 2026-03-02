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

    // Find incomplete submissions from 2-48 hours ago that haven't been reminded
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: partials, error: fetchError } = await supabase
      .from('funnel_partial_submissions')
      .select('*')
      .eq('completed', false)
      .is('reminder_sent_at', null)
      .lt('created_at', twoHoursAgo)
      .gt('created_at', fortyEightHoursAgo)
      .not('contact_email', 'is', null)
      .limit(50);

    if (fetchError) throw fetchError;

    if (!partials || partials.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'No reminders to send' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const partial of partials) {
      try {
        const resumeUrl = `${baseUrl}/partner?resume=${partial.session_id}`;

        // Call the send-funnel-reminder function
        const { error: invokeError } = await supabase.functions.invoke('send-funnel-reminder', {
          body: {
            email: partial.contact_email,
            contactName: partial.contact_name,
            companyName: partial.company_name,
            resumeUrl,
          },
        });

        if (invokeError) throw invokeError;

        // Mark as reminded
        await supabase
          .from('funnel_partial_submissions')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', partial.id);

        sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${partial.contact_email}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({
      processed: partials.length,
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
