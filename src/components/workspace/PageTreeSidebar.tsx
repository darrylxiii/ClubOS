import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkspacePage, useWorkspacePages } from '@/hooks/useWorkspacePages';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ChevronRight, 
  Plus, 
  FileText, 
  Star,
  Copy,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageTreeItemProps {
  page: WorkspacePage;
  level: number;
  onSelect: (pageId: string) => void;
  onCreateSubpage: (parentId: string) => void;
  onDelete: (pageId: string) => void;
  onDuplicate: (page: WorkspacePage) => void;
  onToggleFavorite: (pageId: string, isFavorite: boolean) => void;
  selectedPageId?: string;
}

function PageTreeItem({ 
  page, 
  level, 
  onSelect, 
  onCreateSubpage,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  selectedPageId,
}: PageTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = page.children && page.children.length > 0;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
              selectedPageId === page.id && "bg-accent",
            )}
            style={{ paddingLeft: `${8 + level * 16}px` }}
            onClick={() => onSelect(page.id)}
          >
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
              >
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isOpen && "rotate-90"
                )} />
              </Button>
            ) : (
              <div className="w-5" />
            )}

            <span className="text-base shrink-0">
              {page.icon_emoji || '📄'}
            </span>

            <span className="text-sm truncate flex-1">
              {page.title || 'Untitled'}
            </span>

            {page.is_favorite && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubpage(page.id);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => onSelect(page.id)}>
            <FileText className="h-4 w-4 mr-2" />
            Open
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCreateSubpage(page.id)}>
            <Plus className="h-4 w-4 mr-2" />
            Add subpage
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onToggleFavorite(page.id, !page.is_favorite)}>
            <Star className={cn("h-4 w-4 mr-2", page.is_favorite && "fill-yellow-500 text-yellow-500")} />
            {page.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDuplicate(page)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => onDelete(page.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Move to trash
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {hasChildren && isOpen && (
        <div>
          {page.children!.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              level={level + 1}
              onSelect={onSelect}
              onCreateSubpage={onCreateSubpage}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onToggleFavorite={onToggleFavorite}
              selectedPageId={selectedPageId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PageTreeSidebarProps {
  selectedPageId?: string;
}

export function PageTreeSidebar({ selectedPageId }: PageTreeSidebarProps) {
  const navigate = useNavigate();
  const { 
    pageTree, 
    favorites,
    createPage, 
    deletePage, 
    duplicatePage,
    toggleFavorite,
    isLoading,
  } = useWorkspacePages();

  const handleSelect = (pageId: string) => {
    navigate(`/pages/${pageId}`);
  };

  const handleCreatePage = async (parentId?: string) => {
    const newPage = await createPage.mutateAsync({ 
      parent_page_id: parentId || null 
    });
    navigate(`/pages/${newPage.id}`);
  };

  const handleDelete = (pageId: string) => {
    deletePage.mutate(pageId);
    if (selectedPageId === pageId) {
      navigate('/pages');
    }
  };

  const handleDuplicate = (page: WorkspacePage) => {
    duplicatePage.mutate(page);
  };

  const handleToggleFavorite = (pageId: string, isFavorite: boolean) => {
    toggleFavorite.mutate({ id: pageId, is_favorite: isFavorite });
  };

  return (
    <div className="w-64 border-r bg-card/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <span className="font-semibold text-sm">Pages</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleCreatePage()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Favorites Section */}
          {favorites.length > 0 && (
            <div className="mb-4">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Favorites
              </div>
              {favorites.map((page) => (
                <div
                  key={page.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
                    selectedPageId === page.id && "bg-accent",
                  )}
                  onClick={() => handleSelect(page.id)}
                >
                  <span className="text-base">{page.icon_emoji || '📄'}</span>
                  <span className="text-sm truncate">{page.title || 'Untitled'}</span>
                </div>
              ))}
            </div>
          )}

          {/* All Pages */}
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Private
          </div>

          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : pageTree.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">No pages yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreatePage()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create a page
              </Button>
            </div>
          ) : (
            pageTree.map((page) => (
              <PageTreeItem
                key={page.id}
                page={page}
                level={0}
                onSelect={handleSelect}
                onCreateSubpage={handleCreatePage}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onToggleFavorite={handleToggleFavorite}
                selectedPageId={selectedPageId}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
