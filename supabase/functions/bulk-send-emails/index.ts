import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkEmailRequest {
  candidateIds: string[];
  template: string;
  subject: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { candidateIds, template, subject }: BulkEmailRequest = await req.json();

    if (!candidateIds?.length) {
      return new Response(
        JSON.stringify({ error: "No candidates specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing bulk email for ${candidateIds.length} candidates`);

    // Fetch candidate emails
    const { data: candidates, error: fetchError } = await supabase
      .from("candidate_profiles")
      .select("id, email, full_name")
      .in("id", candidateIds);

    if (fetchError) {
      console.error("Error fetching candidates:", fetchError);
      throw fetchError;
    }

    const validCandidates = candidates?.filter(c => c.email) || [];
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 50 to avoid rate limiting
    const batchSize = 50;
    for (let i = 0; i < validCandidates.length; i += batchSize) {
      const batch = validCandidates.slice(i, i + batchSize);
      
      for (const candidate of batch) {
        try {
          // Use the send-email function
          const { error: sendError } = await supabase.functions.invoke("send-email", {
            body: {
              to: candidate.email,
              subject: subject,
              html: template.replace(/\{\{name\}\}/g, candidate.full_name || ""),
              type: "bulk_campaign"
            }
          });

          if (sendError) {
            failed++;
            errors.push(`${candidate.email}: ${sendError.message}`);
          } else {
            processed++;
          }
        } catch (err) {
          failed++;
          errors.push(`${candidate.email}: ${(err as Error).message}`);
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < validCandidates.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Log the bulk action
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("email_logs").insert({
      user_id: user?.id,
      email_type: "bulk_campaign",
      subject: subject,
      status: failed === 0 ? "sent" : "partial",
      metadata: {
        total_recipients: candidateIds.length,
        processed,
        failed,
        template
      }
    });

    console.log(`Bulk email complete: ${processed} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: failed === 0, 
        processed, 
        failed, 
        errors: errors.slice(0, 10) // Return first 10 errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Bulk email error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
