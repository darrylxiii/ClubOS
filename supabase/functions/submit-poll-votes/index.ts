import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pollId, optionIds, voterName } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update vote counts for each selected option
    for (const optionId of optionIds) {
      const { data: option, error: fetchError } = await supabaseClient
        .from("meeting_poll_options")
        .select("*")
        .eq("id", optionId)
        .single();

      if (fetchError) {
        console.error("Error fetching option:", fetchError);
        continue;
      }

      const voters = option.voters || [];
      
      // Check if voter already voted for this option
      if (!voters.some((v: any) => v.name === voterName)) {
        voters.push({
          name: voterName,
          voted_at: new Date().toISOString(),
        });

        const { error: updateError } = await supabaseClient
          .from("meeting_poll_options")
          .update({
            votes: option.votes + 1,
            voters: voters,
          })
          .eq("id", optionId);

        if (updateError) {
          console.error("Error updating votes:", updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error submitting poll votes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
