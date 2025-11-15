import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailWebhook {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const emailData: EmailWebhook = await req.json();

    console.log("Received forwarded email:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // Extract domain from sender email
    const senderDomain = emailData.from.split("@")[1]?.toLowerCase();

    if (!senderDomain) {
      return new Response(
        JSON.stringify({ error: "Invalid sender email" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if this domain matches any tracked company domains
    const { data: matchedDomains, error: domainError } = await supabase
      .from("company_email_domains")
      .select("*, companies(*)")
      .eq("domain", senderDomain)
      .eq("is_active", true);

    if (domainError) {
      console.error("Error checking domains:", domainError);
      throw domainError;
    }

    // Store in learning queue
    const { data: queueEntry, error: queueError } = await supabase
      .from("email_learning_queue")
      .insert({
        from_email: emailData.from,
        to_email: emailData.to,
        subject: emailData.subject,
        body_text: emailData.text,
        body_html: emailData.html,
        company_id: matchedDomains?.[0]?.company_id || null,
        metadata: {
          headers: emailData.headers,
          matched_domains: matchedDomains?.length || 0,
        },
      })
      .select()
      .single();

    if (queueError) {
      console.error("Error storing in queue:", queueError);
      throw queueError;
    }

    // If we matched a company, create interaction immediately
    if (matchedDomains && matchedDomains.length > 0) {
      const company = matchedDomains[0].companies;

      // Find or create stakeholder
      const { data: existingStakeholder } = await supabase
        .from("company_stakeholders")
        .select("*")
        .eq("company_id", company.id)
        .eq("email", emailData.from)
        .single();

      let stakeholderId = existingStakeholder?.id;

      if (!existingStakeholder) {
        const senderName = emailData.from.split("@")[0];
        const { data: newStakeholder } = await supabase
          .from("company_stakeholders")
          .insert({
            company_id: company.id,
            email: emailData.from,
            full_name: senderName,
            role_type: "unknown",
            first_contacted_at: new Date().toISOString(),
            last_contacted_at: new Date().toISOString(),
          })
          .select()
          .single();

        stakeholderId = newStakeholder?.id;
      }

      // Create interaction
      const { data: interaction, error: interactionError } = await supabase
        .from("company_interactions")
        .insert({
          company_id: company.id,
          interaction_type: "email",
          interaction_subtype: "forwarded",
          interaction_date: new Date().toISOString(),
          direction: "inbound",
          initiated_by_stakeholder_id: stakeholderId,
          subject: emailData.subject,
          raw_content: emailData.text || emailData.html,
          status: "active",
          is_manually_entered: false,
          external_id: `forwarded-${queueEntry.id}`,
        })
        .select()
        .single();

      if (interactionError) {
        console.error("Error creating interaction:", interactionError);
      } else {
        // Update queue entry with interaction_id
        await supabase
          .from("email_learning_queue")
          .update({
            interaction_id: interaction.id,
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq("id", queueEntry.id);

        // Create participant record
        if (stakeholderId) {
          await supabase.from("interaction_participants").insert({
            interaction_id: interaction.id,
            stakeholder_id: stakeholderId,
            participation_type: "sender",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        queue_id: queueEntry.id,
        company_matched: matchedDomains && matchedDomains.length > 0,
        company_name: matchedDomains?.[0]?.companies?.name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing forwarded email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
