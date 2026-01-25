/**
 * Base Email Template - Quantum Club Design System
 * Professional, client-compatible, with proper branding
 */

import { EMAIL_LOGOS, EMAIL_LOGO_SIZES, EMAIL_COLORS, COMPANY_NAME, TAGLINE, SUPPORT_EMAIL, getEmailAppUrl } from '../email-config.ts';

export interface BaseTemplateProps {
  preheader?: string;
  content: string;
  showHeader?: boolean;
  showFooter?: boolean;
  schemaMarkup?: string; // For Schema.org JSON-LD
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
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
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
    
    /* Dark Mode First (Brand Default) */
    :root {
      color-scheme: dark light;
      supported-color-schemes: dark light;
    }
    
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: ${EMAIL_COLORS.eclipse} !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    /* Dark Mode Styles (Default) */
    .email-wrapper {
      background-color: ${EMAIL_COLORS.eclipse};
    }
    
    .email-container {
      background-color: ${EMAIL_COLORS.cardBg};
    }
    
    .text-primary {
      color: ${EMAIL_COLORS.textPrimary} !important;
    }
    
    .text-secondary {
      color: ${EMAIL_COLORS.textSecondary} !important;
    }
    
    .text-muted {
      color: ${EMAIL_COLORS.textMuted} !important;
    }
    
    .bg-card {
      background-color: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid ${EMAIL_COLORS.border} !important;
    }
    
    .gradient-header {
      background: linear-gradient(180deg, ${EMAIL_COLORS.eclipse} 0%, ${EMAIL_COLORS.cardBg} 100%) !important;
    }
    
    /* Light Mode Override */
    @media (prefers-color-scheme: light) {
      body {
        background-color: #f5f5f5 !important;
      }
      
      .email-wrapper {
        background-color: #f5f5f5 !important;
      }
      
      .email-container {
        background-color: #ffffff !important;
      }
      
      .text-primary {
        color: #0E0E10 !important;
      }
      
      .text-secondary {
        color: #666666 !important;
      }
      
      .text-muted {
        color: #999999 !important;
      }
      
      .bg-card {
        background-color: #fafafa !important;
        border: 1px solid #e5e5e5 !important;
      }
      
      .gradient-header {
        background: linear-gradient(180deg, #0E0E10 0%, #1a1a1c 100%) !important;
      }
    }
    
    /* Brand Colors (same in both modes) */
    .accent-gold {
      color: ${EMAIL_COLORS.gold} !important;
    }
    
    .bg-accent-gold {
      background-color: ${EMAIL_COLORS.gold} !important;
    }
    
    /* Responsive Styles */
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
<body style="margin: 0; padding: 0; width: 100%; background-color: ${EMAIL_COLORS.eclipse};">
  ${preheader ? `
  <!-- Preheader Text -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
  </div>
  <!-- Preheader Padding (prevents body text from appearing in preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  ` : ''}
  
  <!-- Wrapper Table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper" style="background-color: ${EMAIL_COLORS.eclipse};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Container Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: ${EMAIL_COLORS.cardBg}; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);">
          
          ${showHeader ? `
          <!-- Header -->
          <tr>
            <td class="gradient-header" style="padding: 48px 40px 40px 40px; text-align: center; background: linear-gradient(180deg, ${EMAIL_COLORS.eclipse} 0%, ${EMAIL_COLORS.cardBg} 100%);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Logo Image - OVERSIZED for clear branding -->
                    <a href="${appUrl}" style="text-decoration: none;">
                      <img 
                        src="${EMAIL_LOGOS.fullBrand}" 
                        alt="${COMPANY_NAME}" 
                        title="${COMPANY_NAME}"
                        width="${EMAIL_LOGO_SIZES.headerBrand}" 
                        height="${EMAIL_LOGO_SIZES.headerBrand}" 
                        style="display: block; margin: 0 auto 24px auto; border: 0; outline: none; max-width: ${EMAIL_LOGO_SIZES.headerBrand}px;"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                      />
                      <div style="display: none; width: ${EMAIL_LOGO_SIZES.headerBrand}px; height: ${EMAIL_LOGO_SIZES.headerBrand}px; margin: 0 auto 24px auto; background-color: ${EMAIL_COLORS.gold}; border-radius: 50%; line-height: ${EMAIL_LOGO_SIZES.headerBrand}px; text-align: center; font-size: 56px; font-weight: bold; color: #0E0E10;">Q</div>
                    </a>
                    <!-- Brand Name (Solid Gold - Compatible with all clients) -->
                    <div style="font-size: 24px; font-weight: 700; color: ${EMAIL_COLORS.gold}; letter-spacing: 1px; margin-bottom: 8px;">
                      THE QUANTUM CLUB
                    </div>
                    <div style="font-size: 12px; color: ${EMAIL_COLORS.textMuted}; letter-spacing: 2px; text-transform: uppercase;">
                      ${TAGLINE}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          ${showFooter ? `
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid ${EMAIL_COLORS.border}; background-color: rgba(0,0,0,0.2);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" class="text-muted" style="font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.textMuted};">
                    <p style="margin: 0 0 12px 0; font-weight: 500; color: ${EMAIL_COLORS.textSecondary};">
                      ${COMPANY_NAME}
                    </p>
                    <p style="margin: 0 0 16px 0;">
                      <a href="${appUrl}/settings/notifications" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Email Preferences</a>
                      <span style="color: ${EMAIL_COLORS.textMuted};">&nbsp;•&nbsp;</span>
                      <a href="mailto:${SUPPORT_EMAIL}" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Support</a>
                      <span style="color: ${EMAIL_COLORS.textMuted};">&nbsp;•&nbsp;</span>
                      <a href="${appUrl}/privacy" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Privacy</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: ${EMAIL_COLORS.textMuted};">
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
