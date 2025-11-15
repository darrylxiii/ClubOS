import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email_ids, since_date } = await req.json();

    console.log("Syncing email interactions:", { email_ids, since_date });

    // Get all active tracked domains
    const { data: trackedDomains, error: domainError } = await supabase
      .from("company_email_domains")
      .select("domain, company_id, companies(*)")
      .eq("is_active", true);

    if (domainError) {
      console.error("Error fetching tracked domains:", domainError);
      throw domainError;
    }

    const domainMap = new Map(
      trackedDomains?.map((d) => [d.domain, d]) || []
    );

    console.log(`Tracking ${domainMap.size} company domains`);

    // Fetch emails from the emails table (from gmail/outlook syncs)
    let emailQuery = supabase
      .from("emails")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(1000);

    if (email_ids && email_ids.length > 0) {
      emailQuery = emailQuery.in("id", email_ids);
    } else if (since_date) {
      emailQuery = emailQuery.gte("received_at", since_date);
    }

    const { data: emails, error: emailError } = await emailQuery;

    if (emailError) {
      console.error("Error fetching emails:", emailError);
      throw emailError;
    }

    console.log(`Processing ${emails?.length || 0} emails`);

    let interactionsCreated = 0;
    let interactionsSkipped = 0;

    for (const email of emails || []) {
      try {
        // Extract domain from sender
        const senderDomain = email.from_email?.split("@")[1]?.toLowerCase();
        
        if (!senderDomain || !domainMap.has(senderDomain)) {
          interactionsSkipped++;
          continue;
        }

        const companyInfo = domainMap.get(senderDomain);
        
        if (!companyInfo) {
          interactionsSkipped++;
          continue;
        }

        // Check if interaction already exists for this email
        const { data: existingInteraction } = await supabase
          .from("company_interactions")
          .select("id")
          .eq("external_id", `email-${email.id}`)
          .single();

        if (existingInteraction) {
          interactionsSkipped++;
          continue;
        }

        // Find or create stakeholder
        const { data: existingStakeholder } = await supabase
          .from("company_stakeholders")
          .select("*")
          .eq("company_id", companyInfo.company_id)
          .eq("email", email.from_email)
          .single();

        let stakeholderId = existingStakeholder?.id;

        if (!existingStakeholder) {
          const { data: newStakeholder } = await supabase
            .from("company_stakeholders")
            .insert({
              company_id: companyInfo.company_id,
              email: email.from_email,
              full_name: email.from_name || email.from_email.split("@")[0],
              role_type: "unknown",
              first_contacted_at: email.received_at,
              last_contacted_at: email.received_at,
            })
            .select()
            .single();

          stakeholderId = newStakeholder?.id;
        }

        // Determine direction
        const direction = email.folder === "SENT" ? "outbound" : "inbound";

        // Create interaction
        const { data: interaction, error: interactionError } = await supabase
          .from("company_interactions")
          .insert({
            company_id: companyInfo.company_id,
            interaction_type: "email",
            interaction_subtype: "synced",
            interaction_date: email.received_at,
            direction,
            initiated_by_stakeholder_id:
              direction === "inbound" ? stakeholderId : null,
            subject: email.subject,
            raw_content: email.body_text || email.body_html,
            status: "active",
            is_manually_entered: false,
            external_id: `email-${email.id}`,
            source_metadata: {
              email_id: email.id,
              provider: email.provider || "unknown",
              message_id: email.message_id,
            },
          })
          .select()
          .single();

        if (interactionError) {
          console.error(
            `Error creating interaction for email ${email.id}:`,
            interactionError
          );
          continue;
        }

        // Create participant record
        if (stakeholderId) {
          await supabase.from("interaction_participants").insert({
            interaction_id: interaction.id,
            stakeholder_id: stakeholderId,
            participation_type: direction === "inbound" ? "sender" : "recipient",
          });
        }

        // Update stakeholder last_contacted_at
        if (stakeholderId) {
          await supabase
            .from("company_stakeholders")
            .update({
              last_contacted_at: email.received_at,
              total_interactions: existingStakeholder
                ? (existingStakeholder.total_interactions || 0) + 1
                : 1,
            })
            .eq("id", stakeholderId);
        }

        interactionsCreated++;
      } catch (emailError) {
        console.error(`Error processing email ${email.id}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emails_processed: emails?.length || 0,
        interactions_created: interactionsCreated,
        interactions_skipped: interactionsSkipped,
        tracked_domains: domainMap.size,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing email interactions:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
