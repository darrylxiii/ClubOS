import { createAuthenticatedHandler } from '../_shared/handler.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  action: "set_password" | "regenerate_magic_link" | "resend_welcome";
  target_user_id: string;
  password?: string;
}

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const corsHeaders = ctx.corsHeaders;
    const supabase = ctx.supabase;
    const caller = ctx.user;

    // Check caller has admin or strategist role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const callerRoles = (roles || []).map((r: { role: string }) => r.role);
    if (!callerRoles.includes("admin") && !callerRoles.includes("strategist")) {
      return new Response(JSON.stringify({ error: "Forbidden: requires admin or strategist role" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { action, target_user_id, password } = body;

    if (!action || !target_user_id) {
      return new Response(JSON.stringify({ error: "Missing action or target_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify target user was provisioned (exists in partner_provisioning_logs)
    const { data: provLog } = await supabase
      .from("partner_provisioning_logs")
      .select("id, provisioned_by, provision_method")
      .eq("provisioned_user_id", target_user_id)
      .maybeSingle();

    if (!provLog) {
      return new Response(JSON.stringify({ error: "User was not provisioned through partner provisioning" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: set_password ──
    if (action === "set_password") {
      if (!password || password.length < 12) {
        return new Response(JSON.stringify({ error: "Password must be at least 12 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(target_user_id, {
        password,
        user_metadata: { force_password_change: true },
      });

      if (updateError) {
        console.error("Failed to set password:", updateError);
        return new Response(JSON.stringify({ error: `Failed to set password: ${updateError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update provision method in log
      await supabase
        .from("partner_provisioning_logs")
        .update({ provision_method: "password" })
        .eq("provisioned_user_id", target_user_id);

      return new Response(JSON.stringify({
        success: true,
        message: "Temporary password set. User will be prompted to change it on first login.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: regenerate_magic_link ──
    if (action === "regenerate_magic_link") {
      // Get user email
      const { data: { user: targetUser }, error: getUserError } = await supabase.auth.admin.getUserById(target_user_id);
      if (getUserError || !targetUser?.email) {
        return new Response(JSON.stringify({ error: "Could not retrieve user email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: targetUser.email,
      });

      if (linkError || !linkData) {
        console.error("Failed to generate magic link:", linkError);
        return new Response(JSON.stringify({ error: `Failed to generate magic link: ${linkError?.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update provision method in log
      await supabase
        .from("partner_provisioning_logs")
        .update({ provision_method: "magic_link" })
        .eq("provisioned_user_id", target_user_id);

      return new Response(JSON.stringify({
        success: true,
        magic_link: linkData.properties?.action_link || null,
        message: "Magic link generated successfully.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: resend_welcome ──
    if (action === "resend_welcome") {
      // Get target user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", target_user_id)
        .single();

      if (!profile?.email) {
        return new Response(JSON.stringify({ error: "Could not find user profile" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get company name if linked
      const { data: companyMember } = await supabase
        .from("company_members")
        .select("company:companies(name)")
        .eq("user_id", target_user_id)
        .maybeSingle();

      const companyName = (companyMember?.company as { name: string } | null)?.name;

      // Generate a fresh magic link for the email
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: profile.email,
      });

      const magicLink = linkData?.properties?.action_link || undefined;

      // Call the welcome email function
      const welcomeResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-partner-welcome-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile.email,
          fullName: profile.full_name,
          companyName,
          magicLink,
          provisionMethod: provLog.provision_method,
        }),
      });

      const welcomeResult = await welcomeResponse.json();

      if (welcomeResult.success) {
        await supabase
          .from("partner_provisioning_logs")
          .update({ welcome_email_sent: true, welcome_email_sent_at: new Date().toISOString() })
          .eq("provisioned_user_id", target_user_id);
      }

      return new Response(JSON.stringify({
        success: welcomeResult.success === true,
        message: welcomeResult.success ? "Welcome email resent." : "Failed to send welcome email.",
      }), {
        status: welcomeResult.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}));
