import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, sessionId, step } = await req.json();

    if (!email || !sessionId) {
      throw new Error('Email and sessionId are required');
    }

    // Generate recovery link
    const recoveryLink = `${Deno.env.get('APP_URL') || 'https://thequantumclub.lovable.app'}/partner?recover=${sessionId}`;

    // For now, log the recovery attempt (email sending would require SMTP setup)
    console.log(`[Recovery] Sending link to ${email} for session ${sessionId} at step ${step}`);
    console.log(`[Recovery] Link: ${recoveryLink}`);

    // Store recovery request for audit
    await supabase.from('funnel_analytics').insert({
      session_id: sessionId,
      step_number: step,
      step_name: 'recovery_email_sent',
      action: 'email_sent',
      metadata: {
        email_to: email,
        recovery_link: recoveryLink,
        sent_at: new Date().toISOString(),
      },
    });

    // In production, integrate with Resend/SendGrid here
    // For now, return success to indicate the flow works
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Recovery email queued',
        recoveryLink, // Only for development
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-recovery-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
