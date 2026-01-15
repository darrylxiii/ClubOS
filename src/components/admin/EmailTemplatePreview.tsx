import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailTemplatePreviewProps {
  template: any;
  contentOverride?: string;
}

export function EmailTemplatePreview({ template, contentOverride }: EmailTemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  // Parse content template
  let contentData;
  try {
    contentData = contentOverride ? JSON.parse(contentOverride) : template.content_template;
  } catch (_e) {
    contentData = template.content_template;
  }

  // Generate sample HTML preview
  const generatePreviewHTML = () => {
    const steps = contentData.candidateNextSteps || contentData.partnerNextSteps || [];
    const stepsHtml = steps.map((step: string) => `<li>${step}</li>`).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: ${colorScheme === 'dark' ? '#F5F4EF' : '#333'};
              background: ${colorScheme === 'dark' ? '#0E0E10' : '#f5f5f5'};
              padding: 20px;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: ${colorScheme === 'dark' ? '#1a1a1c' : '#fff'};
              border-radius: 8px;
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #0E0E10 0%, #1a1a1d 100%); 
              color: #F5F4EF; 
              padding: 40px 20px; 
              text-align: center; 
            }
            .content { 
              padding: 40px 30px; 
            }
            .button { 
              display: inline-block; 
              background: #C9A24E; 
              color: #fff; 
              padding: 14px 32px; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: 600; 
              margin-top: 20px; 
            }
            .highlight { 
              background: ${colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6'}; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 20px 0; 
              border: 1px solid ${colorScheme === 'dark' ? 'rgba(201,162,78,0.2)' : '#e5e7eb'};
            }
            ul { margin: 10px 0 0 0; padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">${contentData.heading || template.name}</h1>
            </div>
            <div class="content">
              <p>${contentData.intro || 'Email content goes here'}</p>
              
              ${stepsHtml ? `
                <div class="highlight">
                  <p style="margin: 0;"><strong>What's Next:</strong></p>
                  <ul>${stepsHtml}</ul>
                </div>
              ` : ''}
              
              ${contentData.ctaText ? `
                <div style="text-align: center;">
                  <a href="${contentData.ctaUrl || '#'}" class="button">
                    ${contentData.ctaText}
                  </a>
                </div>
              ` : ''}
              
              ${contentData.showReason ? `
                <p style="color: #999; margin-top: 20px;">
                  <strong>Reason:</strong> Sample decline reason would appear here
                </p>
              ` : ''}
              
              <p style="margin-top: 30px;">Best regards,<br>The Quantum Club Team</p>
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={colorScheme === 'light' ? 'default' : 'outline'}
            onClick={() => setColorScheme('light')}
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={colorScheme === 'dark' ? 'default' : 'outline'}
            onClick={() => setColorScheme('dark')}
          >
            <Moon className="h-4 w-4" />
          </Button>
        </div>
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
