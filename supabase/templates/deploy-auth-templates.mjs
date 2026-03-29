#!/usr/bin/env node
/**
 * Deploy Quantum Club branded auth email templates to Supabase
 * 
 * Uses the Management API to update all 6 auth email templates + subjects.
 * Design matches the existing email-templates/base-template.ts design system.
 * 
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=xxx node supabase/templates/deploy-auth-templates.mjs
 *   — OR — 
 *   npx supabase login
 *   node supabase/templates/deploy-auth-templates.mjs  (uses CLI token from keychain)
 */

const PROJECT_REF = 'chgrkvftjfibufoopmav';
const APP_URL = 'https://os.thequantumclub.com';
const SUPPORT_EMAIL = 'support@thequantumclub.nl';
const COMPANY_NAME = 'The Quantum Club';
const COMPANY_ADDRESS = 'Pieter Cornelisz. Hooftstraat 41-2, Amsterdam, The Netherlands';
const HEADER_GIF = 'https://os.thequantumclub.com/email-header.gif';
const LOGO_URL = 'https://os.thequantumclub.com/quantum-clover-icon.png';

// Brand colors (matches email-config.ts)
const GOLD = '#C9A24E';
const ECLIPSE = '#0E0E10';
const BORDER = '#e5e7eb';

// ──────────────────────────────────────────────
// Shared wrapper — matches base-template.ts exactly
// ──────────────────────────────────────────────

function wrap(preheader, content) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <title>${COMPANY_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; display: block; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; background-color: #f5f5f5 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; }
    .email-wrapper { background-color: #f5f5f5; }
    .email-container { background-color: #ffffff; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0E0E10 !important; }
      .email-wrapper { background-color: #0E0E10 !important; }
      .email-container { background-color: #1a1a1c !important; }
      .text-primary { color: #F5F4EF !important; }
      .text-secondary { color: #B8B7B3 !important; }
      .text-muted { color: #8A8985 !important; }
      .footer-bg { background-color: #141416 !important; }
      .footer-border { border-top-color: #2a2a2c !important; }
    }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f5f5f5;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}</div>
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 0 0 16px 16px; overflow: hidden;">

          <!-- GIF Header -->
          <tr>
            <td style="padding: 0; margin: 0; line-height: 0; font-size: 0;">
              <a href="${APP_URL}" style="text-decoration: none; display: block; line-height: 0; font-size: 0;">
                <img src="${HEADER_GIF}" alt="${COMPANY_NAME}" width="600" style="display: block; width: 100%; max-width: 600px; border: 0; outline: none; line-height: 0; font-size: 0;" />
              </a>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 32px 40px; color: #0E0E10;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-bg footer-border" style="padding: 28px 40px; border-top: 1px solid #f0f0f0; background-color: #fafafa; border-radius: 0 0 16px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="font-size: 13px; line-height: 20px; color: #888888;">
                    <p style="margin: 0 0 12px 0; font-weight: 500; color: #555555;">${COMPANY_NAME}</p>
                    <p style="margin: 0 0 16px 0;">
                      <a href="${APP_URL}/settings/notifications" style="color: ${GOLD}; text-decoration: none;">Email Preferences</a>
                      <span style="color: #cccccc;">&nbsp;&bull;&nbsp;</span>
                      <a href="mailto:${SUPPORT_EMAIL}" style="color: ${GOLD}; text-decoration: none;">Support</a>
                      <span style="color: #cccccc;">&nbsp;&bull;&nbsp;</span>
                      <a href="${APP_URL}/privacy" style="color: ${GOLD}; text-decoration: none;">Privacy</a>
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #aaaaaa;">${COMPANY_ADDRESS}</p>
                    <p style="margin: 0; font-size: 11px; color: #aaaaaa;">&copy; ${year} ${COMPANY_NAME}. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ──────────────────────────────────────────────
// CTA Button (matches components.ts Button)
// ──────────────────────────────────────────────

function ctaButton(url, text) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 28px 0 8px 0;">
  <tr><td align="center">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="15%" fillcolor="${GOLD}">
      <w:anchorlock/><center style="color:${ECLIPSE};font-family:sans-serif;font-size:16px;font-weight:600;">${text}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${url}" style="display: inline-block; padding: 16px 48px; background-color: ${GOLD}; color: ${ECLIPSE}; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px; mso-hide: all;">${text}</a>
    <!--<![endif]-->
  </td></tr>
</table>`;
}

// ──────────────────────────────────────────────
// Security Footer (shared by all templates)
// ──────────────────────────────────────────────

function securityNote(extra = '') {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 28px; border-top: 1px solid ${BORDER}; padding-top: 20px;">
  <tr><td>
    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #aaaaaa;">
      ${extra ? extra + ' ' : ''}If you did not request this email, you can safely ignore it. This link will expire shortly for your security.
    </p>
  </td></tr>
</table>`;
}


// ══════════════════════════════════════════════
// TEMPLATE 1: Magic Link
// ══════════════════════════════════════════════

const magicLinkTemplate = wrap(
  'Your secure login link for The Quantum Club',
  `
  <h1 class="text-primary" style="margin: 0 0 8px 0; font-size: 28px; line-height: 36px; font-weight: 600; color: ${ECLIPSE};">
    Your Secure Login Link
  </h1>
  <p class="text-secondary" style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #555555;">
    Click the button below to sign in to your Quantum Club account. This link is valid for a limited time and can only be used once.
  </p>

  ${ctaButton('{{ .ConfirmationURL }}', 'Sign In to The Quantum Club')}

  <p class="text-muted" style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #888888; text-align: center;">
    Or copy and paste this URL into your browser:
  </p>
  <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: ${GOLD}; word-break: break-all; text-align: center;">
    {{ .ConfirmationURL }}
  </p>

  ${securityNote()}
  `
);


// ══════════════════════════════════════════════
// TEMPLATE 2: Confirm Signup
// ══════════════════════════════════════════════

const confirmSignupTemplate = wrap(
  'Confirm your Quantum Club account',
  `
  <h1 class="text-primary" style="margin: 0 0 8px 0; font-size: 28px; line-height: 36px; font-weight: 600; color: ${ECLIPSE};">
    Welcome to The Quantum Club
  </h1>
  <p class="text-secondary" style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #555555;">
    We're excited to have you. Please confirm your email address to activate your account and begin your journey with our exclusive talent network.
  </p>

  ${ctaButton('{{ .ConfirmationURL }}', 'Confirm Your Email')}

  <p class="text-muted" style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #888888; text-align: center;">
    Or copy and paste this URL into your browser:
  </p>
  <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: ${GOLD}; word-break: break-all; text-align: center;">
    {{ .ConfirmationURL }}
  </p>

  ${securityNote()}
  `
);


// ══════════════════════════════════════════════
// TEMPLATE 3: Invite User
// ══════════════════════════════════════════════

const inviteTemplate = wrap(
  'You\'ve been invited to The Quantum Club',
  `
  <h1 class="text-primary" style="margin: 0 0 8px 0; font-size: 28px; line-height: 36px; font-weight: 600; color: ${ECLIPSE};">
    You've Been Invited
  </h1>
  <p class="text-secondary" style="margin: 0 0 8px 0; font-size: 15px; line-height: 24px; color: #555555;">
    You've been personally invited to join <strong style="color: ${GOLD};">The Quantum Club</strong> — an exclusive talent network connecting elite professionals with world-class opportunities.
  </p>
  <p class="text-secondary" style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #555555;">
    Click below to accept the invitation and set up your account.
  </p>

  ${ctaButton('{{ .ConfirmationURL }}', 'Accept Invitation')}

  <p class="text-muted" style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #888888; text-align: center;">
    Or copy and paste this URL into your browser:
  </p>
  <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: ${GOLD}; word-break: break-all; text-align: center;">
    {{ .ConfirmationURL }}
  </p>

  ${securityNote()}
  `
);


// ══════════════════════════════════════════════
// TEMPLATE 4: Password Recovery
// ══════════════════════════════════════════════

const recoveryTemplate = wrap(
  'Reset your Quantum Club password',
  `
  <h1 class="text-primary" style="margin: 0 0 8px 0; font-size: 28px; line-height: 36px; font-weight: 600; color: ${ECLIPSE};">
    Reset Your Password
  </h1>
  <p class="text-secondary" style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #555555;">
    We received a request to reset the password for your account. Click the button below to choose a new password. If you didn't make this request, you can safely ignore this email.
  </p>

  ${ctaButton('{{ .ConfirmationURL }}', 'Reset Password')}

  <p class="text-muted" style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #888888; text-align: center;">
    Or copy and paste this URL into your browser:
  </p>
  <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: ${GOLD}; word-break: break-all; text-align: center;">
    {{ .ConfirmationURL }}
  </p>

  ${securityNote('For your security, this password reset link expires in 1 hour.')}
  `
);


// ══════════════════════════════════════════════
// TEMPLATE 5: Email Change
// ══════════════════════════════════════════════

const emailChangeTemplate = wrap(
  'Confirm your email change on The Quantum Club',
  `
  <h1 class="text-primary" style="margin: 0 0 8px 0; font-size: 28px; line-height: 36px; font-weight: 600; color: ${ECLIPSE};">
    Confirm Email Change
  </h1>
  <p class="text-secondary" style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #555555;">
    You've requested to update your email address to <strong>{{ .NewEmail }}</strong>. Please click the button below to confirm this change.
  </p>

  ${ctaButton('{{ .ConfirmationURL }}', 'Confirm New Email')}

  <p class="text-muted" style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #888888; text-align: center;">
    Or copy and paste this URL into your browser:
  </p>
  <p style="margin: 8px 0 0 0; font-size: 12px; line-height: 18px; color: ${GOLD}; word-break: break-all; text-align: center;">
    {{ .ConfirmationURL }}
  </p>

  ${securityNote('If you did not request this change, please contact support immediately.')}
  `
);


// ══════════════════════════════════════════════
// TEMPLATE 6: Reauthentication (OTP)
// ══════════════════════════════════════════════

const reauthTemplate = wrap(
  'Your verification code for The Quantum Club',
  `
  <h1 class="text-primary" style="margin: 0 0 8px 0; font-size: 28px; line-height: 36px; font-weight: 600; color: ${ECLIPSE};">
    Verification Code
  </h1>
  <p class="text-secondary" style="margin: 0 0 28px 0; font-size: 15px; line-height: 24px; color: #555555;">
    To complete your action, please enter the following verification code. This code will expire shortly.
  </p>

  <!-- OTP Code Box (matches components.ts CodeBox) -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9f4e9; border: 2px dashed ${GOLD}; border-radius: 16px; overflow: hidden;">
    <tr>
      <td style="padding: 32px; text-align: center;">
        <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 20px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">Your Code</p>
        <div style="font-size: 40px; font-weight: 700; color: ${GOLD}; letter-spacing: 10px; font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;">
          {{ .Token }}
        </div>
      </td>
    </tr>
  </table>

  ${securityNote('Do not share this code with anyone. The Quantum Club will never ask you for this code.')}
  `
);


// ══════════════════════════════════════════════
// DEPLOY — Management API
// ══════════════════════════════════════════════

// Minify: collapse multi‑line HTML to one line, escape inner quotes
function minify(html) {
  return html
    .replace(/\n\s*/g, '')        // collapse whitespace
    .replace(/\s{2,}/g, ' ')     // multi-space → single
    .trim();
}

const payload = {
  // Subjects
  mailer_subjects_magic_link: 'Your Secure Login — The Quantum Club',
  mailer_subjects_confirmation: 'Welcome to The Quantum Club — Confirm Your Email',
  mailer_subjects_invite: 'You\'ve Been Invited to The Quantum Club',
  mailer_subjects_recovery: 'Reset Your Password — The Quantum Club',
  mailer_subjects_email_change: 'Confirm Your Email Change — The Quantum Club',
  mailer_subjects_reauthentication: 'Your Verification Code — The Quantum Club',

  // Templates
  mailer_templates_magic_link_content: minify(magicLinkTemplate),
  mailer_templates_confirmation_content: minify(confirmSignupTemplate),
  mailer_templates_invite_content: minify(inviteTemplate),
  mailer_templates_recovery_content: minify(recoveryTemplate),
  mailer_templates_email_change_content: minify(emailChangeTemplate),
  mailer_templates_reauthentication_content: minify(reauthTemplate),
};


async function deploy() {
  // Try getting token from env, then from Supabase CLI
  let token = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!token) {
    // Try getting from keychain via CLI
    try {
      const { execSync } = await import('child_process');
      // Supabase CLI stores token in system keychain, use CLI command to verify auth
      console.log('No SUPABASE_ACCESS_TOKEN in env. Checking CLI auth...');
      execSync('npx supabase projects list', { stdio: 'pipe' });
    } catch {
      console.error('\n❌ No access token found.');
      console.error('Get one from: https://supabase.com/dashboard/account/tokens');
      console.error('Then run: SUPABASE_ACCESS_TOKEN=xxx node supabase/templates/deploy-auth-templates.mjs\n');
      process.exit(1);
    }
  }
  
  if (!token) {
    // Fallback: output the payload for manual deployment
    console.log('\n📋 Auth templates generated. To deploy, get an access token from:');
    console.log('   https://supabase.com/dashboard/account/tokens\n');
    console.log('Then run:\n');
    
    // Write payload to a temp file for curl
    const { writeFileSync } = await import('fs');
    const payloadPath = '/tmp/quantum-email-templates.json';
    writeFileSync(payloadPath, JSON.stringify(payload, null, 2));
    
    console.log(`SUPABASE_ACCESS_TOKEN=your_token_here \\`);
    console.log(`  curl -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \\`);
    console.log(`  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d @${payloadPath}\n`);
    
    console.log(`✅ Payload saved to ${payloadPath}`);
    console.log(`   Contains ${Object.keys(payload).length} template+subject updates.\n`);
    return;
  }

  // Deploy via Management API
  console.log(`\n🚀 Deploying ${Object.keys(payload).length / 2} email templates to project ${PROJECT_REF}...\n`);
  
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ Failed (${response.status}): ${errText}`);
    process.exit(1);
  }

  console.log('✅ All 6 email templates deployed successfully!\n');
  console.log('Templates updated:');
  console.log('  1. Magic Link      — "Your Secure Login"');
  console.log('  2. Confirm Signup  — "Welcome to The Quantum Club"');
  console.log('  3. Invite User     — "You\'ve Been Invited"');
  console.log('  4. Password Reset  — "Reset Your Password"');
  console.log('  5. Email Change    — "Confirm Your Email Change"');
  console.log('  6. Reauthentication — "Your Verification Code"\n');
  console.log(`🎨 All templates use the Quantum Club branded design with GIF header + gold CTA buttons.\n`);
}

deploy().catch(console.error);
