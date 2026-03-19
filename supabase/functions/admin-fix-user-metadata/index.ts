import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * admin-fix-user-metadata
 * 
 * Admin-only recovery tool to clear stuck metadata flags (e.g. force_password_change).
 * Requires the caller to be an admin (verified via user_roles table).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept auth from Authorization header OR apikey header (for service-role calls via curl tool)
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // If apikey matches service role key, allow directly
    const isServiceRoleViaApikey = apikeyHeader === serviceRoleKey;
    
    if (!isServiceRoleViaApikey && !authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    let callerId = "service-role";

    // If the token is the service role key, allow (for CLI/internal calls)
    if (token !== serviceRoleKey) {
      // Verify as user JWT and check admin role
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      callerId = claimsData.claims.sub as string;

      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse request
    const { target_user_id, metadata_updates } = await req.json();
    if (!target_user_id || !metadata_updates || typeof metadata_updates !== "object") {
      return new Response(
        JSON.stringify({ error: "target_user_id and metadata_updates required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current metadata to merge
    const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(target_user_id);
    if (getUserError || !userData?.user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentMeta = userData.user.user_metadata || {};
    const newMeta = { ...currentMeta, ...metadata_updates };

    // Update metadata
    const { error: updateError } = await adminClient.auth.admin.updateUserById(target_user_id, {
      user_metadata: newMeta,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit log
    await adminClient.from("comprehensive_audit_logs").insert({
      event_type: "admin_metadata_fix",
      action: "update_user_metadata",
      event_category: "admin",
      actor_id: callerId,
      actor_role: "admin",
      resource_type: "user",
      resource_id: target_user_id,
      description: `Admin cleared metadata flags for user ${target_user_id}`,
      after_value: metadata_updates,
    });

    return new Response(
      JSON.stringify({ success: true, updated_fields: Object.keys(metadata_updates) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
