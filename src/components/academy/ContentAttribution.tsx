import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Shield } from "lucide-react";

interface Attribution {
  original_source?: string;
  original_author?: string;
  original_url?: string;
  license: {
    license_name: string;
    license_url?: string;
    requires_attribution: boolean;
  };
  attribution_text?: string;
}

interface ContentAttributionProps {
  attribution: Attribution;
}

export function ContentAttribution({ attribution }: ContentAttributionProps) {
  if (!attribution.license.requires_attribution && !attribution.original_source) {
    return null;
  }

  return (
    <Card className="squircle p-4 bg-muted/50">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Content Attribution</h4>
            <Badge variant="outline" className="squircle-sm text-xs">
              {attribution.license.license_name}
            </Badge>
          </div>

          {attribution.attribution_text && (
            <p className="text-sm text-muted-foreground">
              {attribution.attribution_text}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            {attribution.original_author && (
              <span className="text-muted-foreground">
                By <span className="font-medium">{attribution.original_author}</span>
              </span>
            )}
            {attribution.original_source && (
              <span className="text-muted-foreground">
                from <span className="font-medium">{attribution.original_source}</span>
              </span>
            )}
          </div>

          {(attribution.original_url || attribution.license.license_url) && (
            <div className="flex flex-wrap gap-3 text-xs">
              {attribution.original_url && (
                <a
                  href={attribution.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Original Source
                </a>
              )}
              {attribution.license.license_url && (
                <a
                  href={attribution.license.license_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  License Details
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
