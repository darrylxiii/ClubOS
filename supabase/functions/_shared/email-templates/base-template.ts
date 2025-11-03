/**
 * Base Email Template - Quantum Club Design System
 * Supports dark/light mode, responsive, and all major email clients
 */

export interface BaseTemplateProps {
  preheader?: string;
  content: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

export const baseEmailTemplate = ({
  preheader,
  content,
  showHeader = true,
  showFooter = true,
}: BaseTemplateProps): string => {
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
  <title>The Quantum Club</title>
  <style>
    /* Email Client Resets */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; display: block; outline: none; text-decoration: none; }
    
    /* Design Tokens - Light Mode (Default) */
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #f5f5f5 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    /* Light Mode Styles */
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
      background: linear-gradient(135deg, #0E0E10 0%, #1a1a1c 100%) !important;
    }
    
    /* Dark Mode Styles */
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
        color: rgba(245, 244, 239, 0.7) !important;
      }
      
      .text-muted {
        color: rgba(245, 244, 239, 0.5) !important;
      }
      
      .bg-card {
        background-color: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(201, 162, 78, 0.2) !important;
      }
      
      .gradient-header {
        background: linear-gradient(135deg, #0E0E10 0%, #2a2a2c 100%) !important;
      }
    }
    
    /* Brand Colors (same in both modes) */
    .accent-gold {
      color: #C9A24E !important;
    }
    
    .bg-accent-gold {
      background-color: #C9A24E !important;
    }
    
    /* Responsive Styles */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
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
      
      .mobile-font-size-24 {
        font-size: 24px !important;
        line-height: 32px !important;
      }
      
      .mobile-font-size-16 {
        font-size: 16px !important;
        line-height: 24px !important;
      }
    }
    
    /* Utility Classes */
    .spacer-20 { height: 20px; line-height: 20px; font-size: 20px; }
    .spacer-32 { height: 32px; line-height: 32px; font-size: 32px; }
    .spacer-48 { height: 48px; line-height: 48px; font-size: 48px; }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f5f5f5;">
  ${preheader ? `
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
  </div>
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  ` : ''}
  
  <!-- Wrapper Table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Container Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);">
          
          ${showHeader ? `
          <!-- Header -->
          <tr>
            <td class="gradient-header" style="padding: 48px 40px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 16px;">
                          <div style="width: 80px; height: 80px; margin: 0 auto; border-radius: 16px; background: linear-gradient(135deg, #C9A24E 0%, #F5F4EF 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(201, 162, 78, 0.3);">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M24 4L28 20L24 28L20 20L24 4Z" fill="#0E0E10" opacity="0.9"/>
                              <path d="M24 20L40 24L32 28L24 32L24 20Z" fill="#0E0E10" opacity="0.7"/>
                              <path d="M24 20L8 24L16 28L24 32L24 20Z" fill="#0E0E10" opacity="0.5"/>
                              <circle cx="24" cy="24" r="3" fill="#0E0E10"/>
                            </svg>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <div style="font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #C9A24E 0%, #F5F4EF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; margin-top: 8px;">
                            THE QUANTUM CLUB
                          </div>
                          <div style="font-size: 14px; color: rgba(245, 244, 239, 0.6); margin-top: 8px; letter-spacing: 2px; text-transform: uppercase;">
                            Exclusive Talent Network
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 48px 40px;">
              ${content}
            </td>
          </tr>
          
          ${showFooter ? `
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid rgba(201, 162, 78, 0.2);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" class="text-muted" style="font-size: 14px; line-height: 20px;">
                    <p style="margin: 0 0 8px 0;">The Quantum Club - Exclusive Talent Network</p>
                    <p style="margin: 0 0 16px 0;">
                      <a href="https://app.thequantumclub.com/settings" style="color: #C9A24E; text-decoration: none;">Manage Preferences</a>
                      &nbsp;•&nbsp;
                      <a href="mailto:support@thequantumclub.nl" style="color: #C9A24E; text-decoration: none;">Support</a>
                    </p>
                    <p style="margin: 0; font-size: 12px;">
                      © ${new Date().getFullYear()} The Quantum Club. All rights reserved.
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
