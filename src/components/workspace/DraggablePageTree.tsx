import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspacePage, useWorkspacePages } from '@/hooks/useWorkspacePages';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  ChevronRight, 
  Plus, 
  FileText, 
  Star,
  Copy,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortablePageItemProps {
  page: WorkspacePage;
  level: number;
  onSelect: (pageId: string) => void;
  onCreateSubpage: (parentId: string) => void;
  onDelete: (pageId: string) => void;
  onDuplicate: (page: WorkspacePage) => void;
  onToggleFavorite: (pageId: string, isFavorite: boolean) => void;
  selectedPageId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function SortablePageItem({
  page,
  level,
  onSelect,
  onCreateSubpage,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  selectedPageId,
  isExpanded,
  onToggleExpand,
}: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = page.children && page.children.length > 0;

  return (
    <div ref={setNodeRef} style={style}>
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
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>

            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
              >
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isExpanded && "rotate-90"
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
    </div>
  );
}

// Overlay component for dragging
function DragOverlayItem({ page }: { page: WorkspacePage }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border shadow-lg">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-base">{page.icon_emoji || '📄'}</span>
      <span className="text-sm">{page.title || 'Untitled'}</span>
    </div>
  );
}

interface DraggablePageTreeProps {
  selectedPageId?: string;
}

export function DraggablePageTree({ selectedPageId }: DraggablePageTreeProps) {
  const navigate = useNavigate();
  const { 
    pages,
    pageTree, 
    favorites,
    createPage, 
    deletePage, 
    duplicatePage,
    toggleFavorite,
    updatePage,
    isLoading,
  } = useWorkspacePages();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Flatten tree for sortable context (only expanded items)
  const flattenedPages = useMemo(() => {
    const result: { page: WorkspacePage; level: number }[] = [];
    
    const traverse = (pages: WorkspacePage[], level: number) => {
      pages.forEach(page => {
        result.push({ page, level });
        if (page.children && expandedIds.has(page.id)) {
          traverse(page.children, level + 1);
        }
      });
    };
    
    traverse(pageTree, 0);
    return result;
  }, [pageTree, expandedIds]);

  const activePage = activeId ? pages.find(p => p.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeIndex = flattenedPages.findIndex(f => f.page.id === active.id);
    const overIndex = flattenedPages.findIndex(f => f.page.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    // Calculate new sort order
    const newSortOrder = overIndex;
    
    // Update the page's sort_order
    await updatePage.mutateAsync({
      id: active.id as string,
      updates: { sort_order: newSortOrder },
    });
  };

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

  const toggleExpanded = (pageId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
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

          {/* All Pages with DnD */}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={flattenedPages.map(f => f.page.id)}
                strategy={verticalListSortingStrategy}
              >
                {flattenedPages.map(({ page, level }) => (
                  <SortablePageItem
                    key={page.id}
                    page={page}
                    level={level}
                    onSelect={handleSelect}
                    onCreateSubpage={handleCreatePage}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onToggleFavorite={handleToggleFavorite}
                    selectedPageId={selectedPageId}
                    isExpanded={expandedIds.has(page.id)}
                    onToggleExpand={() => toggleExpanded(page.id)}
                  />
                ))}
              </SortableContext>

              <DragOverlay>
                {activePage && <DragOverlayItem page={activePage} />}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
