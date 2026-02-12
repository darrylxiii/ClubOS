import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, FileText, Mic, Newspaper, ExternalLink } from "lucide-react";

interface Props {
  publicMentions: any;
}

export const PublicPresenceCard = ({ publicMentions }: Props) => {
  if (!publicMentions) {
    return (
      <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" />
            Public Presence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Public presence not yet scanned.</p>
        </CardContent>
      </Card>
    );
  }

  const { articles, talks, mentions } = publicMentions;
  const hasContent = (articles?.length || 0) + (talks?.length || 0) + (mentions?.length || 0) > 0;

  if (!hasContent) {
    return (
      <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" />
            Public Presence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No significant public mentions found.</p>
        </CardContent>
      </Card>
    );
  }

  const Section = ({ icon: Icon, title, items }: { icon: any; title: string; items: any[] }) => {
    if (!items?.length) return null;
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{items.length}</Badge>
        </div>
        <div className="space-y-1.5">
          {items.slice(0, 5).map((item: any, i: number) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{item.source}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="w-4 h-4" />
          Public Presence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Section icon={FileText} title="Articles" items={articles} />
        <Section icon={Mic} title="Talks & Appearances" items={talks} />
        <Section icon={Newspaper} title="Other Mentions" items={mentions} />
      </CardContent>
    </Card>
  );
};
