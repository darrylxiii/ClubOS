import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Code, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface EmbedCodeGeneratorProps {
  bookingLinks: { id: string; slug: string; title: string }[];
}

export function EmbedCodeGenerator({ bookingLinks }: EmbedCodeGeneratorProps) {
  const [selectedSlug, setSelectedSlug] = useState(bookingLinks[0]?.slug || "");
  const [buttonText, setButtonText] = useState("Book a Meeting");
  const [buttonColor, setButtonColor] = useState("#6366f1");

  const baseUrl = window.location.origin;
  const bookingUrl = `${baseUrl}/book/${selectedSlug}`;

  const inlineCode = `<!-- The Quantum Club Booking Widget (Inline) -->
<iframe
  src="${bookingUrl}?embed=true"
  style="width:100%;min-height:700px;border:none;border-radius:12px;"
  title="Book a meeting"
  loading="lazy"
></iframe>`;

  const popupCode = `<!-- The Quantum Club Booking Widget (Popup) -->
<script>
(function() {
  var btn = document.createElement('a');
  btn.href = '${bookingUrl}';
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.textContent = '${buttonText}';
  btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:12px 24px;background:${buttonColor};color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;cursor:pointer;transition:opacity 0.2s;';
  btn.onmouseover = function() { this.style.opacity = '0.9'; };
  btn.onmouseout = function() { this.style.opacity = '1'; };
  document.currentScript.parentNode.insertBefore(btn, document.currentScript);
})();
</script>`;

  const floatingCode = `<!-- The Quantum Club Booking Widget (Floating) -->
<script>
(function() {
  var btn = document.createElement('button');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> ${buttonText}';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;align-items:center;gap:8px;padding:14px 24px;background:${buttonColor};color:#fff;border:none;border-radius:50px;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:transform 0.2s,box-shadow 0.2s;';
  btn.onmouseover = function() { this.style.transform = 'scale(1.05)'; this.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)'; };
  btn.onmouseout = function() { this.style.transform = 'scale(1)'; this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; };
  btn.onclick = function() { window.open('${bookingUrl}', '_blank'); };
  document.body.appendChild(btn);
})();
</script>`;

  const copyToClipboard = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${label} embed code copied`);
  };

  if (bookingLinks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Create a booking link first to generate embed codes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Embed Configuration
          </CardTitle>
          <CardDescription>
            Add your booking page to any website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Booking Link</Label>
            <Select value={selectedSlug} onValueChange={setSelectedSlug}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bookingLinks.map((link) => (
                  <SelectItem key={link.slug} value={link.slug}>
                    {link.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Button Text</Label>
              <Input
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Book a Meeting"
              />
            </div>
            <div>
              <Label>Button Color</Label>
              <Input
                type="color"
                value={buttonColor}
                onChange={(e) => setButtonColor(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="inline">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inline" className="gap-1.5">
            <Code className="h-3.5 w-3.5" />
            Inline
          </TabsTrigger>
          <TabsTrigger value="popup" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Popup Button
          </TabsTrigger>
          <TabsTrigger value="floating" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Floating
          </TabsTrigger>
        </TabsList>

        {[
          { key: "inline", code: inlineCode, desc: "Embeds the full calendar directly into your page." },
          { key: "popup", code: popupCode, desc: "Adds a styled button that opens booking in a new tab." },
          { key: "floating", code: floatingCode, desc: "A fixed floating button in the bottom-right corner." },
        ].map(({ key, code, desc }) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">{desc}</p>
                <div className="relative">
                  <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto border max-h-48">
                    <code>{code}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(code, key)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
