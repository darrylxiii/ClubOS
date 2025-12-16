import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  ChevronRight,
  Minus,
  List,
  Columns2,
  Plus,
  Quote,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  editor: any;
  className?: string;
}

export function EditorToolbar({ editor, className }: EditorToolbarProps) {
  const insertBlock = (type: string, props?: Record<string, any>) => {
    const currentBlock = editor.getTextCursorPosition().block;
    editor.insertBlocks(
      [{ type, props: props || {} }],
      currentBlock,
      'after'
    );
  };

  return (
    <div className={cn('flex items-center gap-1 py-2 border-b border-border mb-4', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-card">
          <DropdownMenuItem onClick={() => insertBlock('callout', { variant: 'info' })}>
            <AlertCircle className="h-4 w-4 mr-2 text-blue-500" />
            Callout
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertBlock('toggle', { isOpen: false })}>
            <ChevronRight className="h-4 w-4 mr-2" />
            Toggle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertBlock('divider', { style: 'solid' })}>
            <Minus className="h-4 w-4 mr-2" />
            Divider
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertBlock('tableOfContents')}>
            <List className="h-4 w-4 mr-2" />
            Table of Contents
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertBlock('columns', { columnCount: 2 })}>
            <Columns2 className="h-4 w-4 mr-2" />
            Columns
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => insertBlock('heading', { level: 1 })}>
            <span className="font-bold mr-2">H1</span>
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertBlock('heading', { level: 2 })}>
            <span className="font-bold mr-2">H2</span>
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertBlock('heading', { level: 3 })}>
            <span className="font-bold mr-2">H3</span>
            Heading 3
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => insertBlock('bulletListItem')}>
            <span className="mr-2">•</span>
            Bullet List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertBlock('numberedListItem')}>
            <span className="mr-2">1.</span>
            Numbered List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertBlock('checkListItem', { checked: false })}>
            <span className="mr-2">☐</span>
            Checklist
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => insertBlock('codeBlock')}>
            <Code className="h-4 w-4 mr-2" />
            Code Block
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.insertBlocks(
            [{ type: 'paragraph', content: [{ type: 'text', text: '', styles: {} }] }],
            editor.getTextCursorPosition().block,
            'after'
          )}>
            <Quote className="h-4 w-4 mr-2" />
            Quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border mx-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertBlock('callout', { variant: 'info' })}
        title="Insert Callout"
      >
        <AlertCircle className="h-4 w-4 text-blue-500" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertBlock('toggle', { isOpen: false })}
        title="Insert Toggle"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertBlock('divider', { style: 'solid' })}
        title="Insert Divider"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => insertBlock('columns', { columnCount: 2 })}
        title="Insert Columns"
      >
        <Columns2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
