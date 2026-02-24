/**
 * One-Click Admin Provisioning for Partner Requests
 * Enterprise-grade: JWT auth, rollback, welcome email, invite code, audit log.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading,
  Paragraph,
  Spacer,
  Button,
  StatusBadge,
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── AUTH: Verify JWT and admin role ──────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: adminUser },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !adminUser) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    // ── Parse body (ignore client-supplied approvedBy) ──────
    const { requestId } = (await req.json()) as { requestId: string };

    if (!requestId) {
      return jsonResponse({ error: "requestId is required" }, 400);
    }

    // ── Fetch partner request ───────────────────────────────
    const { data: request, error: fetchError } = await supabase
      .from("partner_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      return jsonResponse({ error: "Partner request not found" }, 404);
    }

    // Idempotency guard
    if (request.status !== "pending") {
      return jsonResponse(
        { error: `Request is already ${request.status}`, idempotent: true },
        409
      );
    }

    // ── Step 1: Create auth user ────────────────────────────
    const {
      data: { user },
      error: createUserError,
    } = await supabase.auth.admin.createUser({
      email: request.contact_email,
      email_confirm: true,
      user_metadata: {
        full_name: request.contact_name,
        phone: request.contact_phone,
        provisioned_by_admin: true,
        provisioned_at: new Date().toISOString(),
      },
    });

    if (createUserError || !user) {
      return jsonResponse(
        { error: `Auth creation failed: ${createUserError?.message}` },
        400
      );
    }

    // Rollback helpers
    let newCompanyId: string | null = null;
    async function rollbackUser(reason: string) {
      console.error(`Rolling back user ${user!.id}: ${reason}`);
      try {
        await supabase.auth.admin.deleteUser(user!.id);
      } catch (e) {
        console.error(`CRITICAL: rollback failed for user ${user!.id}:`, e);
      }
      // Also rollback company if we created one
      if (newCompanyId) {
        try {
          await supabase.from("companies").delete().eq("id", newCompanyId);
          console.log(`Rolled back company ${newCompanyId}`);
        } catch (e) {
          console.error(`CRITICAL: rollback failed for company ${newCompanyId}:`, e);
        }
      }
    }

    // ── Step 2: Create company if needed ─────────────────────
    let companyId: string | null = null;
    if (!companyId && request.company_name) {
      const domain =
        request.contact_email.split("@")[1]?.toLowerCase() || "";
      const slug = request.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: request.company_name,
          slug: `${slug}-${Date.now().toString(36)}`,
          domain,
          status: "active",
        })
        .select()
        .single();

      if (companyError) {
        console.error("Company creation error:", companyError);
        await rollbackUser("Company creation failed");
        return jsonResponse(
          { error: `Company creation failed: ${companyError.message}` },
          500
        );
      }

      companyId = company?.id;
      newCompanyId = companyId;

      // Explicitly create task board (trigger skips when auth.uid() IS NULL)
      if (companyId) {
        const { error: boardError } = await supabase
          .from("task_boards")
          .insert({
            name: `${request.company_name} Team Board`,
            description: `Shared board for all ${request.company_name} team members`,
            visibility: "company",
            owner_id: user.id,
            company_id: companyId,
            icon: "🏢",
          });
        if (boardError) {
          console.error("Task board creation error (non-fatal):", boardError);
        }
      }
    }

    // ── Step 3: Assign partner role ─────────────────────────
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "partner",
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      await rollbackUser("Role assignment failed");
      return jsonResponse(
        { error: `Role assignment failed: ${roleError.message}` },
        500
      );
    }

    // ── Step 4: Update profile ──────────────────────────────
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: request.contact_name,
        phone: request.contact_phone,
        provisioned_by: adminUser.id,
        provisioned_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error (non-fatal):", profileError);
    }

    // ── Step 5: Add to company_members ──────────────────────
    if (companyId) {
      const { error: memberError } = await supabase
        .from("company_members")
        .insert({
          user_id: user.id,
          company_id: companyId,
          role: "owner",
          is_active: true,
        });
      if (memberError) {
        console.error("Company member insert error (non-fatal):", memberError);
      }
    }

    // ── Step 6: Update partner request with audit trail ─────
    const { error: updateError } = await supabase
      .from("partner_requests")
      .update({
        status: "approved",
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Request update error:", updateError);
    }

    // ── Step 7: Generate magic link ─────────────────────────
    const siteUrl =
      Deno.env.get("SITE_URL") ||
      Deno.env.get("APP_URL") ||
      "https://os.thequantumclub.com";
    let magicLink: string | null = null;

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: request.contact_email,
        options: { redirectTo: `${siteUrl}/partner-welcome` },
      });

    if (!linkError && linkData?.properties?.action_link) {
      magicLink = linkData.properties.action_link;
    } else {
      console.error("Magic link generation error:", linkError);
    }

    // ── Step 8: Create invite code ──────────────────────────
    const inviteCode = `PARTNER-${Date.now().toString(36).toUpperCase()}`;
    const { error: inviteError } = await supabase.from("invite_codes").insert({
      code: inviteCode,
      created_by: adminUser.id,
      created_by_type: "admin",
      max_uses: 1,
      uses_count: 0,
      expires_at: new Date(
        Date.now() + 72 * 60 * 60 * 1000
      ).toISOString(),
      invite_type: "partner",
      company_id: companyId,
      target_role: "partner",
      provisioned_by: adminUser.id,
    });
    if (inviteError) {
      console.error("Invite code insert error (non-fatal):", inviteError);
    }

    // ── Step 9: Provisioning log ────────────────────────────
    const { error: provLogError } = await supabase
      .from("partner_provisioning_logs")
      .insert({
        provisioned_user_id: user.id,
        provisioned_by: adminUser.id,
        company_id: companyId,
        provision_method: "magic_link",
        invite_code_generated: inviteCode,
        metadata: {
          source: "approve-partner-request",
          request_id: requestId,
        },
      });
    if (provLogError) {
      console.error("Provisioning log insert error (non-fatal):", provLogError);
    }

    // ── Step 10: Send welcome email ─────────────────────────
    let welcomeEmailSent = false;
    if (resendApiKey && magicLink) {
      try {
        const emailContent = `
          ${StatusBadge({ status: "confirmed", text: "PARTNER ACCESS GRANTED" })}
          ${Heading({ text: "Welcome to The Quantum Club", level: 1 })}
          ${Spacer(24)}
          ${Paragraph(`Dear ${request.contact_name},`, "primary")}
          ${Spacer(8)}
          ${Paragraph(
            `You've been personally invited to join The Quantum Club as a valued partner.`,
            "secondary"
          )}
          ${Spacer(32)}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr><td align="center">${Button({
              url: magicLink,
              text: "Access Your Account",
              variant: "primary",
            })}</td></tr>
          </table>
          ${Spacer(16)}
          ${Paragraph(
            "This link expires in 72 hours. If you have any questions, your dedicated strategist is ready to assist.",
            "muted"
          )}
        `;

        const emailBody = baseEmailTemplate({
          preheader:
            "Welcome to The Quantum Club — your partner access is ready.",
          content: emailContent,
          showHeader: true,
          showFooter: true,
        });

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: EMAIL_SENDERS.notifications,
            to: request.contact_email,
            subject: `Welcome to The Quantum Club, ${request.contact_name}`,
            html: emailBody,
          }),
        });

        if (!emailResponse.ok) {
          const errorBody = await emailResponse.text();
          console.error("Resend email error:", emailResponse.status, errorBody);
        }
        welcomeEmailSent = emailResponse.ok;

        if (welcomeEmailSent) {
          await supabase
            .from("partner_provisioning_logs")
            .update({
              welcome_email_sent: true,
              welcome_email_sent_at: new Date().toISOString(),
            })
            .eq("provisioned_user_id", user.id);
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
      }
    }

    // ── Step 11: Audit log ──────────────────────────────────
    const { error: auditError } = await supabase
      .from("comprehensive_audit_logs")
      .insert({
        actor_id: adminUser.id,
        actor_role: "admin",
        event_type: "partner_request_approved",
        action: "partner_request_approved",
        event_category: "user_management",
        resource_type: "partner_request",
        resource_id: requestId,
        description: `Approved partner request and provisioned ${request.contact_email}`,
        after_value: {
          user_id: user.id,
          company_id: companyId,
          email: request.contact_email,
          invite_code: inviteCode,
          welcome_email_sent: welcomeEmailSent,
        },
        actor_ip_address: (() => { const raw = req.headers.get("x-forwarded-for"); return raw ? raw.split(",")[0].trim() : null; })(),
        actor_user_agent: req.headers.get("user-agent") || "unknown",
      });
    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return jsonResponse(
      {
        success: true,
        userId: user.id,
        companyId,
        inviteCode,
        welcomeEmailSent,
        message: "Partner provisioned successfully",
      },
      200
    );
  } catch (error) {
    console.error("Provisioning error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});
