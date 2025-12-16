import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePageBacklinks } from '@/hooks/usePageBacklinks';
import { Link2, FileText, Loader2 } from 'lucide-react';

interface BacklinksPanelProps {
  pageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BacklinksPanel({ pageId, open, onOpenChange }: BacklinksPanelProps) {
  const navigate = useNavigate();
  const { backlinks, isLoading } = usePageBacklinks(pageId);

  const handleNavigate = (sourcePageId: string) => {
    navigate(`/pages/${sourcePageId}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Backlinks
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backlinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Link2 className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No pages link to this page yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When other pages link here, they'll appear in this list
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-150px)]">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-3">
                  {backlinks.length} page{backlinks.length !== 1 ? 's' : ''} link to this page
                </p>
                
                {backlinks.map((backlink) => (
                  <button
                    key={backlink.id}
                    onClick={() => handleNavigate(backlink.source_page_id)}
                    className="w-full p-3 text-left rounded-lg hover:bg-accent transition-colors flex items-start gap-3"
                  >
                    <span className="text-lg flex-shrink-0">
                      {backlink.source_page?.icon_emoji || '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">
                        {backlink.source_page?.title || 'Untitled'}
                      </span>
                      {backlink.link_text && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          "{backlink.link_text}"
                        </p>
                      )}
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
