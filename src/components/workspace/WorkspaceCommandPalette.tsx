import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  FileText,
  Plus,
  Copy,
  Trash2,
  Star,
  Download,
  Type,
  ListTodo,
  Quote,
  Code,
  Table,
  ImageIcon,
  LayoutGrid,
  Minus,
} from 'lucide-react';
import { useWorkspacePages } from '@/hooks/useWorkspacePages';
import { useRegisterCommands, CommandItem } from '@/contexts/CommandContext';

interface WorkspaceCommandPaletteProps {
  pageId?: string;
  onInsertBlock?: (blockType: string) => void;
}

export function WorkspaceCommandRegistry({
  pageId,
  onInsertBlock,
}: WorkspaceCommandPaletteProps) {
  const navigate = useNavigate();
  const { pages, createPage, duplicatePage, deletePage, toggleFavorite } = useWorkspacePages();

  const currentPage = useMemo(() =>
    pages.find(p => p.id === pageId),
    [pages, pageId]
  );

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // 1. Page Actions (Context) - High Priority
    if (pageId && currentPage) {
      items.push(
        {
          id: 'ws-duplicate-page',
          label: 'Duplicate current page',
          icon: Copy,
          shortcut: '⌘⇧D',
          action: () => duplicatePage.mutate(currentPage),
          category: 'Context',
          priority: 100,
        },
        {
          id: 'ws-toggle-favorite',
          label: currentPage.is_favorite ? 'Remove from favorites' : 'Add to favorites',
          icon: Star,
          action: () => toggleFavorite.mutate({ id: pageId, is_favorite: !currentPage.is_favorite }),
          category: 'Context',
          priority: 99,
        },
        {
          id: 'ws-export-page',
          label: 'Export as Markdown/JSON',
          icon: Download,
          action: () => {
            const content = JSON.stringify(currentPage.content, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentPage.title || 'untitled'}.json`;
            a.click();
          },
          category: 'Context',
          priority: 95,
        },
        {
          id: 'ws-delete-page',
          label: 'Delete current page',
          icon: Trash2,
          action: () => {
            deletePage.mutate(pageId);
            navigate('/pages');
          },
          category: 'Context',
          priority: 90, // Dangerous actions lower
        }
      );
    }

    // 2. Block Insertions (only if handler provided)
    if (pageId && onInsertBlock) {
      const blockCmds: CommandItem[] = [
        { id: 'blk-h1', label: 'Insert Heading 1', icon: Type, action: () => onInsertBlock('heading'), category: 'Insert', keywords: ['h1', 'title'] },
        { id: 'blk-h2', label: 'Insert Heading 2', icon: Type, action: () => onInsertBlock('heading2'), category: 'Insert', keywords: ['h2', 'subtitle'] },
        { id: 'blk-todo', label: 'Insert To-do list', icon: ListTodo, action: () => onInsertBlock('checkListItem'), category: 'Insert', keywords: ['checkbox'] },
        { id: 'blk-bullet', label: 'Insert Bullet list', icon: ListTodo, action: () => onInsertBlock('bulletListItem'), category: 'Insert' },
        { id: 'blk-num', label: 'Insert Numbered list', icon: ListTodo, action: () => onInsertBlock('numberedListItem'), category: 'Insert' },
        { id: 'blk-quote', label: 'Insert Quote', icon: Quote, action: () => onInsertBlock('quote'), category: 'Insert' },
        { id: 'blk-code', label: 'Insert Code block', icon: Code, action: () => onInsertBlock('codeBlock'), category: 'Insert' },
        { id: 'blk-divider', label: 'Insert Divider', icon: Minus, action: () => onInsertBlock('divider'), category: 'Insert' },
        { id: 'blk-img', label: 'Insert Image', icon: ImageIcon, action: () => onInsertBlock('image'), category: 'Insert' },
        { id: 'blk-table', label: 'Insert Table', icon: Table, action: () => onInsertBlock('table'), category: 'Insert' },
        { id: 'blk-cols', label: 'Insert Columns', icon: LayoutGrid, action: () => onInsertBlock('columns'), category: 'Insert' },
      ];
      items.push(...blockCmds);
    }

    // 3. Global Workspace Actions
    items.push(
      {
        id: 'ws-new-page',
        label: 'Create new page',
        icon: Plus,
        shortcut: '⌘N',
        action: async () => {
          const newPage = await createPage.mutateAsync({});
          navigate(`/pages/${newPage.id}`);
        },
        category: 'Actions',
        priority: 80,
      }
    );

    // 4. Register Pages as Searchable Items
    pages.forEach(p => {
      items.push({
        id: `page-${p.id}`,
        label: p.title || 'Untitled Page',
        icon: FileText,
        path: `/pages/${p.id}`,
        category: 'Pages',
        keywords: ['doc', 'workspace'],
        priority: 10
      });
    });

    return items;
  }, [pageId, currentPage, createPage, duplicatePage, deletePage, toggleFavorite, navigate, onInsertBlock, pages]);

  useRegisterCommands(commands, [commands]); // Re-register when dependencies change

  return null;
}
