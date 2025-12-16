import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  FileText,
  Plus,
  Search,
  Copy,
  Trash2,
  Star,
  Share2,
  Download,
  History,
  Type,
  ListTodo,
  Quote,
  Code,
  Link,
  Table,
  ImageIcon,
  LayoutGrid,
  MessageSquare,
  ToggleLeft,
  Minus,
  Clock,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';
import { useWorkspacePages } from '@/hooks/useWorkspacePages';
import { cn } from '@/lib/utils';

interface WorkspaceCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId?: string;
  onInsertBlock?: (blockType: string) => void;
}

interface CommandAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
  category: 'pages' | 'blocks' | 'actions' | 'recent';
}

export function WorkspaceCommandPalette({
  open,
  onOpenChange,
  pageId,
  onInsertBlock,
}: WorkspaceCommandPaletteProps) {
  const navigate = useNavigate();
  const { pages, createPage, duplicatePage, deletePage, toggleFavorite, recent: recentPages } = useWorkspacePages();
  const [search, setSearch] = useState('');

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setSearch('');
  }, [onOpenChange]);

  const handleAction = useCallback((action: () => void) => {
    action();
    handleClose();
  }, [handleClose]);

  const currentPage = useMemo(() => 
    pages.find(p => p.id === pageId),
    [pages, pageId]
  );

  // Build command actions
  const actions = useMemo<CommandAction[]>(() => {
    const items: CommandAction[] = [];

    // Page actions (when on a page)
    if (pageId && currentPage) {
      items.push(
        {
          id: 'duplicate-page',
          label: 'Duplicate page',
          icon: Copy,
          shortcut: '⌘⇧D',
          action: () => duplicatePage.mutate(currentPage),
          category: 'actions',
        },
        {
          id: 'toggle-favorite',
          label: currentPage.is_favorite ? 'Remove from favorites' : 'Add to favorites',
          icon: Star,
          action: () => toggleFavorite.mutate({ id: pageId, is_favorite: !currentPage.is_favorite }),
          category: 'actions',
        },
        {
          id: 'delete-page',
          label: 'Delete page',
          icon: Trash2,
          action: () => {
            deletePage.mutate(pageId);
            navigate('/pages');
          },
          category: 'actions',
        },
        {
          id: 'export-page',
          label: 'Export as Markdown',
          icon: Download,
          action: () => {
            // Export functionality
            const content = JSON.stringify(currentPage.content, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentPage.title || 'untitled'}.json`;
            a.click();
          },
          category: 'actions',
        }
      );
    }

    // Global actions
    items.push(
      {
        id: 'new-page',
        label: 'Create new page',
        icon: Plus,
        shortcut: '⌘N',
        action: async () => {
          const newPage = await createPage.mutateAsync({});
          navigate(`/pages/${newPage.id}`);
        },
        category: 'actions',
      },
      {
        id: 'search-pages',
        label: 'Search all pages',
        icon: Search,
        shortcut: '⌘P',
        action: () => {
          // Already in search
        },
        category: 'actions',
      }
    );

    // Block insertion commands (only when on a page)
    if (pageId && onInsertBlock) {
      const blockCommands: CommandAction[] = [
        { id: 'block-heading', label: 'Heading 1', icon: Type, action: () => onInsertBlock('heading'), category: 'blocks' },
        { id: 'block-heading2', label: 'Heading 2', icon: Type, action: () => onInsertBlock('heading2'), category: 'blocks' },
        { id: 'block-heading3', label: 'Heading 3', icon: Type, action: () => onInsertBlock('heading3'), category: 'blocks' },
        { id: 'block-todo', label: 'To-do list', icon: ListTodo, action: () => onInsertBlock('checkListItem'), category: 'blocks' },
        { id: 'block-bullet', label: 'Bullet list', icon: ListTodo, action: () => onInsertBlock('bulletListItem'), category: 'blocks' },
        { id: 'block-numbered', label: 'Numbered list', icon: ListTodo, action: () => onInsertBlock('numberedListItem'), category: 'blocks' },
        { id: 'block-quote', label: 'Quote', icon: Quote, action: () => onInsertBlock('quote'), category: 'blocks' },
        { id: 'block-callout', label: 'Callout', icon: MessageSquare, action: () => onInsertBlock('callout'), category: 'blocks' },
        { id: 'block-code', label: 'Code block', icon: Code, action: () => onInsertBlock('codeBlock'), category: 'blocks' },
        { id: 'block-divider', label: 'Divider', icon: Minus, action: () => onInsertBlock('divider'), category: 'blocks' },
        { id: 'block-toggle', label: 'Toggle', icon: ToggleLeft, action: () => onInsertBlock('toggle'), category: 'blocks' },
        { id: 'block-table', label: 'Table', icon: Table, action: () => onInsertBlock('table'), category: 'blocks' },
        { id: 'block-image', label: 'Image', icon: ImageIcon, action: () => onInsertBlock('image'), category: 'blocks' },
        { id: 'block-embed', label: 'Embed', icon: Link, action: () => onInsertBlock('embed'), category: 'blocks' },
        { id: 'block-columns', label: 'Columns', icon: LayoutGrid, action: () => onInsertBlock('columns'), category: 'blocks' },
      ];
      items.push(...blockCommands);
    }

    return items;
  }, [pageId, currentPage, createPage, duplicatePage, deletePage, toggleFavorite, navigate, onInsertBlock]);

  // Filter actions by search
  const filteredActions = useMemo(() => {
    if (!search) return actions;
    const lower = search.toLowerCase();
    return actions.filter(a => 
      a.label.toLowerCase().includes(lower) ||
      a.category.toLowerCase().includes(lower)
    );
  }, [actions, search]);

  // Filter pages by search
  const filteredPages = useMemo(() => {
    if (!search) return recentPages.slice(0, 5);
    const lower = search.toLowerCase();
    return pages.filter(p => 
      p.title?.toLowerCase().includes(lower)
    ).slice(0, 10);
  }, [pages, recentPages, search]);

  const actionsByCategory = useMemo(() => {
    return {
      actions: filteredActions.filter(a => a.category === 'actions'),
      blocks: filteredActions.filter(a => a.category === 'blocks'),
    };
  }, [filteredActions]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Recent/Search Pages */}
        {filteredPages.length > 0 && (
          <CommandGroup heading={search ? "Pages" : "Recent pages"}>
            {filteredPages.map(page => (
              <CommandItem
                key={page.id}
                value={`page-${page.id}`}
                onSelect={() => {
                  navigate(`/pages/${page.id}`);
                  handleClose();
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span className="flex-1 truncate">
                  {page.title || 'Untitled'}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredPages.length > 0 && (actionsByCategory.actions.length > 0 || actionsByCategory.blocks.length > 0) && (
          <CommandSeparator />
        )}

        {/* Actions */}
        {actionsByCategory.actions.length > 0 && (
          <CommandGroup heading="Actions">
            {actionsByCategory.actions.map(action => (
              <CommandItem
                key={action.id}
                value={action.id}
                onSelect={() => handleAction(action.action)}
              >
                <action.icon className="mr-2 h-4 w-4" />
                <span className="flex-1">{action.label}</span>
                {action.shortcut && (
                  <kbd className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {action.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Block Commands */}
        {actionsByCategory.blocks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Insert block">
              {actionsByCategory.blocks.map(action => (
                <CommandItem
                  key={action.id}
                  value={action.id}
                  onSelect={() => handleAction(action.action)}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  <span>{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
