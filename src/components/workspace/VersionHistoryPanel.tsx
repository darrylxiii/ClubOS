import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { usePageVersions, PageVersion } from '@/hooks/usePageVersions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { History, RotateCcw, Eye, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface VersionHistoryPanelProps {
  pageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreviewVersion?: (version: PageVersion) => void;
}

export function VersionHistoryPanel({
  pageId,
  open,
  onOpenChange,
  onPreviewVersion,
}: VersionHistoryPanelProps) {
  const { versions, isLoading, restoreVersion } = usePageVersions(pageId);
  const [selectedVersion, setSelectedVersion] = useState<PageVersion | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleRestore = (version: PageVersion) => {
    setSelectedVersion(version);
    setShowRestoreConfirm(true);
  };

  const confirmRestore = () => {
    if (selectedVersion) {
      restoreVersion.mutate(selectedVersion);
      setShowRestoreConfirm(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
            <SheetDescription>
              View and restore previous versions of this page.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)] mt-6 pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No version history yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  As you edit this page, previous versions will be saved here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    isLatest={index === 0}
                    onPreview={() => onPreviewVersion?.(version)}
                    onRestore={() => handleRestore(version)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current content with the version from{' '}
              {selectedVersion && format(new Date(selectedVersion.created_at), 'PPpp')}.
              A new version will be saved with your current content before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              disabled={restoreVersion.isPending}
            >
              {restoreVersion.isPending ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface VersionItemProps {
  version: PageVersion;
  isLatest: boolean;
  onPreview: () => void;
  onRestore: () => void;
}

function VersionItem({ version, isLatest, onPreview, onRestore }: VersionItemProps) {
  const editorName = version.editor_name || 'Unknown user';
  const editorInitials = editorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        'p-4 border rounded-lg transition-colors hover:bg-accent/50',
        isLatest && 'border-primary/50 bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="text-xs">{editorInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{editorName}</span>
              {isLatest && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Latest
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span title={format(new Date(version.created_at), 'PPpp')}>
                {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
              </span>
            </div>
            {version.title && (
              <p className="text-sm text-muted-foreground mt-2 truncate">
                Title: "{version.title}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreview}
            className="h-8 px-2"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {!isLatest && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestore}
              className="h-8 px-2"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
