import { useState, useRef, useEffect } from 'react';
import { WorkspacePage } from '@/hooks/useWorkspacePages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Star, 
  StarOff, 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Share2,
  ImageIcon,
  Link,
  History,
} from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { CoverPicker } from './CoverPicker';
import { EnhancedShareDialog } from './EnhancedShareDialog';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PageHeaderProps {
  page: WorkspacePage;
  onUpdate: (updates: Partial<WorkspacePage>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleFavorite: () => void;
}

export function PageHeader({ 
  page, 
  onUpdate, 
  onDelete, 
  onDuplicate,
  onToggleFavorite,
}: PageHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(page.title);
  }, [page.title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title !== page.title) {
      onUpdate({ title: title || 'Untitled' });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
    if (e.key === 'Escape') {
      setTitle(page.title);
      setIsEditingTitle(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onUpdate({ icon_emoji: emoji });
    setShowEmojiPicker(false);
  };

  const handleCoverSelect = (coverUrl: string | null) => {
    onUpdate({ cover_url: coverUrl });
    setShowCoverPicker(false);
  };

  const handleCopyLink = async () => {
    const pageUrl = `${window.location.origin}/pages/${page.id}`;
    await navigator.clipboard.writeText(pageUrl);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="relative">
      {/* Cover Image */}
      {page.cover_url && (
        <div 
          className="h-[200px] w-full bg-cover bg-center relative group"
          style={{ backgroundImage: `url(${page.cover_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowCoverPicker(true)}
          >
            Change cover
          </Button>
        </div>
      )}

      {/* Header Content */}
      <div className={cn(
        "px-12 py-8",
        page.cover_url ? "-mt-12 relative z-10" : "pt-16"
      )}>
        {/* Icon & Quick Actions */}
        <div className="flex items-center gap-2 mb-4">
          {/* Icon */}
          <button
            onClick={() => setShowEmojiPicker(true)}
            className="text-6xl hover:bg-accent rounded-lg p-2 transition-colors"
          >
            {page.icon_emoji || '📄'}
          </button>

          {/* Quick Actions - Show on hover */}
          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
            {!page.cover_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCoverPicker(true)}
                className="text-muted-foreground"
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                Add cover
              </Button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="text-4xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
                placeholder="Untitled"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-4xl font-bold cursor-text hover:bg-accent/50 rounded px-1 -mx-1 transition-colors"
              >
                {page.title || 'Untitled'}
              </h1>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFavorite}
              className={cn(
                page.is_favorite && "text-yellow-500"
              )}
            >
              {page.is_favorite ? (
                <Star className="h-5 w-5 fill-current" />
              ) : (
                <StarOff className="h-5 w-5" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link className="h-4 w-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
                  <History className="h-4 w-4 mr-2" />
                  Version history
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Move to trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Last edited info */}
        <p className="text-sm text-muted-foreground mt-4">
          Last edited {new Date(page.updated_at).toLocaleDateString()}
        </p>
      </div>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
          currentEmoji={page.icon_emoji}
        />
      )}

      {/* Cover Picker Modal */}
      {showCoverPicker && (
        <CoverPicker
          onSelect={handleCoverSelect}
          onClose={() => setShowCoverPicker(false)}
          currentCover={page.cover_url}
        />
      )}

      {/* Enhanced Share Dialog */}
      <EnhancedShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        page={page}
        onUpdate={onUpdate}
      />

      {/* Version History Panel */}
      <VersionHistoryPanel
        pageId={page.id}
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
      />
    </div>
  );
}
