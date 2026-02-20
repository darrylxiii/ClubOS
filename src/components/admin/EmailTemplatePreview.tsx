import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const EMAIL_HEADER_GIF = "https://os.thequantumclub.com/email-header.gif";
const GOLD = "#C9A24E";

interface EmailTemplatePreviewProps {
  template: any;
  contentOverride?: string;
}

export function EmailTemplatePreview({ template, contentOverride }: EmailTemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Parse content template
  let contentData;
  try {
    contentData = contentOverride ? JSON.parse(contentOverride) : template.content_template;
  } catch (e) {
    contentData = template.content_template;
  }

  // Generate preview HTML matching the real base-template output
  const generatePreviewHTML = () => {
    const steps = contentData.candidateNextSteps || contentData.partnerNextSteps || [];
    const stepsHtml = steps.map((step: string) => `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 8px;">
        <tr><td style="font-size: 14px; color: #555555; line-height: 1.6;">• ${step}</td></tr>
      </table>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #0E0E10;
              background: #f5f5f5;
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 0 0 16px 16px;
              overflow: hidden;
              box-shadow: 0 4px 24px rgba(0,0,0,0.10);
            }
            .header-img {
              display: block;
              width: 100%;
              max-width: 600px;
              border: 0;
              line-height: 0;
              font-size: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .button {
              display: inline-block;
              background: ${GOLD};
              color: #0E0E10;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              margin-top: 20px;
            }
            .card {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
              border: 2px solid ${GOLD};
            }
            .card-default {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
              border: 1px solid #e5e7eb;
            }
            .footer {
              padding: 24px 30px;
              background: #fafafa;
              border-top: 1px solid #f0f0f0;
              text-align: center;
              font-size: 12px;
              color: #aaaaaa;
            }
            a { color: ${GOLD}; }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="padding: 0; margin: 0; line-height: 0; font-size: 0;">
              <img
                src="${EMAIL_HEADER_GIF}"
                alt="The Quantum Club"
                width="600"
                class="header-img"
                onerror="this.style.display='none';"
              />
            </div>
            <div class="content">
              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 600; color: #0E0E10;">
                ${contentData.heading || template.name}
              </h1>
              <p style="color: #555555; margin: 0 0 24px 0;">
                ${contentData.intro || 'Email content goes here'}
              </p>

              ${stepsHtml ? `
                <div class="card">
                  <p style="margin: 0 0 12px 0; font-weight: 600; color: ${GOLD};">✨ What's Next</p>
                  ${stepsHtml}
                </div>
              ` : ''}

              ${contentData.ctaText ? `
                <div style="text-align: center; margin-top: 28px;">
                  <a href="${contentData.ctaUrl || '#'}" class="button">
                    ${contentData.ctaText}
                  </a>
                </div>
              ` : ''}

              ${contentData.showReason ? `
                <div class="card-default" style="margin-top: 24px;">
                  <p style="margin: 0; color: #555555;"><strong>Reason:</strong> Sample feedback would appear here</p>
                </div>
              ` : ''}

              <p style="margin-top: 32px; color: #555555;">
                Best regards,<br><strong>The Quantum Club Team</strong>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0 0 8px 0; font-weight: 500; color: #555555;">The Quantum Club</p>
              <p style="margin: 0 0 8px 0;">
                <a href="#">Email Preferences</a> &nbsp;•&nbsp;
                <a href="#">Support</a> &nbsp;•&nbsp;
                <a href="#">Privacy</a>
              </p>
              <p style="margin: 0; font-size: 11px;">© ${new Date().getFullYear()} The Quantum Club. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === 'desktop' ? 'default' : 'outline'}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">Light theme preview</span>
      </div>

      <div
        className={cn(
          "border rounded-lg overflow-hidden transition-all",
          viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
        )}
      >
        <iframe
          srcDoc={generatePreviewHTML()}
          className="w-full"
          style={{ height: '600px' }}
          title="Email Preview"
        />
      </div>
    </div>
  );
}
