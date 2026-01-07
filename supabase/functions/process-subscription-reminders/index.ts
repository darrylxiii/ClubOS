import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Processing subscription renewal reminders...');

    // Get active subscriptions with upcoming renewals
    const { data: subscriptions, error: fetchError } = await supabase
      .from('vendor_subscriptions')
      .select('*')
      .eq('status', 'active')
      .not('next_renewal_date', 'is', null);

    if (fetchError) throw fetchError;

    const now = new Date();
    const remindersCreated: string[] = [];

    for (const sub of subscriptions || []) {
      const renewalDate = new Date(sub.next_renewal_date);
      const noticeDays = sub.cancellation_notice_days || 30;
      const reminderDate = new Date(renewalDate);
      reminderDate.setDate(reminderDate.getDate() - noticeDays);

      // Check if we should create a reminder (within notice period)
      if (now >= reminderDate && now <= renewalDate) {
        // Check if reminder already exists
        const { data: existing } = await supabase
          .from('vendor_renewal_reminders')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('reminder_type', 'renewal_notice')
          .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());

        if (!existing || existing.length === 0) {
          // Create reminder
          const { error: insertError } = await supabase
            .from('vendor_renewal_reminders')
            .insert({
              subscription_id: sub.id,
              reminder_type: 'renewal_notice',
              scheduled_date: now.toISOString(),
              message: `${sub.vendor_name} subscription renews on ${renewalDate.toLocaleDateString()}. Cancellation notice required by ${reminderDate.toLocaleDateString()}.`,
            });

          if (!insertError) {
            remindersCreated.push(sub.vendor_name);
            console.log(`Created renewal reminder for ${sub.vendor_name}`);
          }
        }
      }
    }

    console.log(`Processed ${subscriptions?.length || 0} subscriptions, created ${remindersCreated.length} reminders`);

    return new Response(JSON.stringify({
      success: true,
      processed: subscriptions?.length || 0,
      remindersCreated: remindersCreated.length,
      vendors: remindersCreated,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing subscription reminders:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
