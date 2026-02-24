/**
 * Base Email Template - Quantum Club Design System
 * Light theme with Canva GIF header
 */

import { EMAIL_HEADER_GIF, EMAIL_COLORS, COMPANY_NAME, SUPPORT_EMAIL, getEmailAppUrl } from '../email-config.ts';

export interface BaseTemplateProps {
  preheader?: string;
  content: string;
  showHeader?: boolean;
  showFooter?: boolean;
  schemaMarkup?: string;
}

export const baseEmailTemplate = ({
  preheader,
  content,
  showHeader = true,
  showFooter = true,
  schemaMarkup,
}: BaseTemplateProps): string => {
  const appUrl = getEmailAppUrl();
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>${COMPANY_NAME}</title>
  ${schemaMarkup || ''}
  <style>
    /* Email Client Resets */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; display: block; outline: none; text-decoration: none; }

    /* Light Mode (Brand Default — matches Canva GIF that fades to white) */
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #f5f5f5 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }

    .email-wrapper {
      background-color: #f5f5f5;
    }

    .email-container {
      background-color: #ffffff;
    }

    .text-primary {
      color: #0E0E10 !important;
    }

    .text-secondary {
      color: #555555 !important;
    }

    .text-muted {
      color: #888888 !important;
    }

    .bg-card {
      background-color: #f5f5f5 !important;
      border: 1px solid #e5e7eb !important;
    }

    /* Brand Colors (consistent across themes) */
    .accent-gold {
      color: ${EMAIL_COLORS.gold} !important;
    }

    .bg-accent-gold {
      background-color: ${EMAIL_COLORS.gold} !important;
    }

    /* Dark Mode Override — restore ivory/light colors for dark-mode recipients */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0E0E10 !important;
      }

      .email-wrapper {
        background-color: #0E0E10 !important;
      }

      .email-container {
        background-color: #1a1a1c !important;
      }

      .text-primary {
        color: #F5F4EF !important;
      }

      .text-secondary {
        color: #B8B7B3 !important;
      }

      .text-muted {
        color: #8A8985 !important;
      }

      .bg-card {
        background-color: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid #3D3426 !important;
      }
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }

      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      .mobile-stack {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .mobile-hide {
        display: none !important;
      }

      .mobile-center {
        text-align: center !important;
      }

      .mobile-font-size-24 {
        font-size: 24px !important;
        line-height: 32px !important;
      }

      .mobile-font-size-16 {
        font-size: 16px !important;
        line-height: 24px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f5f5f5;">
  ${preheader ? `
  <!-- Preheader Text -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
  </div>
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  ` : ''}

  <!-- Wrapper Table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 16px;">

        <!-- Container Table — no border-radius so GIF fills flush to top edge -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 0 0 16px 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10);">

          ${showHeader ? `
          <!-- GIF Header — edge-to-edge, no gaps -->
          <tr>
            <td style="padding: 0; margin: 0; line-height: 0; font-size: 0;">
              <a href="${appUrl}" style="text-decoration: none; display: block; line-height: 0; font-size: 0;">
                <img
                  src="${EMAIL_HEADER_GIF}"
                  alt="${COMPANY_NAME}"
                  width="600"
                  style="display: block; width: 100%; max-width: 600px; border: 0; outline: none; line-height: 0; font-size: 0;"
                />
                <!-- Fallback for image-blocked clients -->
                <div style="display: none; padding: 40px; text-align: center; background: linear-gradient(180deg, #0E0E10 0%, #1a1a1c 100%);">
                  <div style="font-size: 22px; font-weight: 700; color: ${EMAIL_COLORS.gold}; letter-spacing: 1px;">
                    THE QUANTUM CLUB
                  </div>
                  <div style="font-size: 11px; color: ${EMAIL_COLORS.textMuted}; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px;">
                    Exclusive Talent Network
                  </div>
                </div>
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 24px 32px; color: #0E0E10;">
              ${content}
            </td>
          </tr>

          ${showFooter ? `
          <!-- Footer -->
          <tr>
            <td style="padding: 28px 40px; border-top: 1px solid #f0f0f0; background-color: #fafafa; border-radius: 0 0 16px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="font-size: 13px; line-height: 20px; color: #888888;">
                    <p style="margin: 0 0 12px 0; font-weight: 500; color: #555555;">
                      ${COMPANY_NAME}
                    </p>
                    <p style="margin: 0 0 16px 0;">
                      <a href="${appUrl}/settings/notifications" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Email Preferences</a>
                      <span style="color: #cccccc;">&nbsp;•&nbsp;</span>
                      <a href="mailto:${SUPPORT_EMAIL}" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Support</a>
                      <span style="color: #cccccc;">&nbsp;•&nbsp;</span>
                      <a href="${appUrl}/privacy" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Privacy</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #aaaaaa;">
                      © ${currentYear} ${COMPANY_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

        </table>
        <!-- End Container -->

      </td>
    </tr>
  </table>
  <!-- End Wrapper -->

</body>
</html>
  `.trim();
};
