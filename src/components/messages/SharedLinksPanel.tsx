import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { LinkItem } from '@/hooks/useConversationMedia';

interface SharedLinksPanelProps {
  links: LinkItem[];
  loading?: boolean;
}

export const SharedLinksPanel = ({ links, loading }: SharedLinksPanelProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Loading links...</p>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No links shared yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ExternalLink className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {link.title || link.url}
            </p>
            <p className="text-xs text-muted-foreground truncate">{link.url}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(link.created_at), 'MMM d, yyyy')} • {link.sender_name}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
};
