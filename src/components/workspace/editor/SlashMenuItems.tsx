import { 
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react';
import { 
  AlertCircle, 
  ChevronRight, 
  Minus, 
  List, 
  Columns2,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sparkles,
  Quote,
  Calculator,
  GitBranch,
  Table,
} from 'lucide-react';

// Helper to insert or update a block at cursor position
const insertBlock = (editor: any, blockConfig: any) => {
  const currentBlock = editor.getTextCursorPosition().block;
  const isBlockEmpty = 
    currentBlock.content !== undefined &&
    Array.isArray(currentBlock.content) &&
    currentBlock.content.length === 0;

  if (isBlockEmpty) {
    editor.updateBlock(currentBlock, blockConfig);
  } else {
    editor.insertBlocks([blockConfig], currentBlock, 'after');
  }
};

// Custom slash menu item creators
const insertCallout = (editor: any, variant: string = 'info') => ({
  title: variant === 'info' ? 'Callout' : `Callout (${variant})`,
  onItemClick: () => {
    insertBlock(editor, {
      type: 'callout',
      props: { variant },
    });
  },
  aliases: variant === 'info' 
    ? ['callout', 'alert', 'note', 'info'] 
    : [`callout-${variant}`, variant],
  group: 'Advanced',
  icon: variant === 'info' ? <Lightbulb className="h-4 w-4" /> :
        variant === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
        variant === 'success' ? <CheckCircle className="h-4 w-4" /> :
        variant === 'danger' ? <XCircle className="h-4 w-4" /> :
        <AlertCircle className="h-4 w-4" />,
  subtext: `Add a ${variant} callout block`,
});

const insertToggle = (editor: any) => ({
  title: 'Toggle',
  onItemClick: () => {
    insertBlock(editor, {
      type: 'toggle',
      props: { isOpen: false },
    });
  },
  aliases: ['toggle', 'collapse', 'accordion', 'expand', 'dropdown'],
  group: 'Advanced',
  icon: <ChevronRight className="h-4 w-4" />,
  subtext: 'Add a collapsible toggle block',
});

const insertDivider = (editor: any) => ({
  title: 'Divider',
  onItemClick: () => {
    insertBlock(editor, {
      type: 'divider',
      props: { style: 'solid' },
    });
  },
  aliases: ['divider', 'hr', 'line', 'separator', '---'],
  group: 'Advanced',
  icon: <Minus className="h-4 w-4" />,
  subtext: 'Add a horizontal divider',
});

const insertTableOfContents = (editor: any) => ({
  title: 'Table of Contents',
  onItemClick: () => {
    insertBlock(editor, {
      type: 'tableOfContents',
    });
  },
  aliases: ['toc', 'contents', 'table of contents', 'outline', 'index'],
  group: 'Advanced',
  icon: <List className="h-4 w-4" />,
  subtext: 'Auto-generated from headings',
});

const insertColumns = (editor: any, columnCount: number = 2) => ({
  title: columnCount === 2 ? 'Two Columns' : 'Three Columns',
  onItemClick: () => {
    insertBlock(editor, {
      type: 'columns',
      props: { columnCount },
    });
  },
  aliases: columnCount === 2 
    ? ['columns', 'cols', '2col', 'two columns', 'layout'] 
    : ['3col', 'three columns', '3 columns'],
  group: 'Advanced',
  icon: <Columns2 className="h-4 w-4" />,
  subtext: `Add a ${columnCount}-column layout`,
});

// Quote block
const insertQuote = (editor: any) => ({
  title: 'Quote',
  onItemClick: () => {
    insertBlock(editor, {
      type: 'quote',
      props: { author: '' },
    });
  },
  aliases: ['quote', 'blockquote', 'citation', 'testimonial'],
  group: 'Basic',
  icon: <Quote className="h-4 w-4" />,
  subtext: 'Add a styled quote block',
});

// Math/LaTeX block
const insertMath = (editor: any) => ({
  title: 'Math Equation',
  onItemClick: () => {
    insertBlock(editor, {
      type: 'math',
      props: { latex: '', displayMode: true },
    });
  },
  aliases: ['math', 'latex', 'equation', 'formula', 'katex'],
  group: 'Advanced',
  icon: <Calculator className="h-4 w-4" />,
  subtext: 'Add a LaTeX math equation',
});

// Mermaid diagram block
const insertMermaid = (editor: any) => ({
  title: 'Diagram',
  onItemClick: () => {
    insertBlock(editor, {
      type: 'mermaid',
      props: { code: '' },
    });
  },
  aliases: ['diagram', 'mermaid', 'flowchart', 'chart', 'graph', 'sequence'],
  group: 'Advanced',
  icon: <GitBranch className="h-4 w-4" />,
  subtext: 'Add a Mermaid diagram',
});

// Simple table block
const insertSimpleTable = (editor: any) => ({
  title: 'Simple Table',
  onItemClick: () => {
    insertBlock(editor, {
      type: 'simpleTable',
      props: { 
        tableData: JSON.stringify({
          headers: ['Column 1', 'Column 2', 'Column 3'],
          rows: [['', '', ''], ['', '', '']],
        })
      },
    });
  },
  aliases: ['simple table', 'table', 'grid', 'spreadsheet'],
  group: 'Basic',
  icon: <Table className="h-4 w-4" />,
  subtext: 'Add a simple inline table',
});

// AI writing slash command - triggers dialog
const insertAICommand = (editor: any, onAICommand?: () => void) => ({
  title: 'Ask AI to Write',
  onItemClick: () => {
    if (onAICommand) {
      onAICommand();
    }
  },
  aliases: ['ai', 'club ai', 'write', 'generate', 'ask ai'],
  group: 'AI',
  icon: <Sparkles className="h-4 w-4 text-accent" />,
  subtext: 'Let Club AI write content for you',
});

// Get all custom slash menu items for our blocks
export function getCustomSlashMenuItems(
  editor: any,
  onAICommand?: () => void
): DefaultReactSuggestionItem[] {
  // Get default items and filter out Divider to prevent duplicate key warning
  const defaultItems = getDefaultReactSlashMenuItems(editor)
    .filter(item => item.title !== 'Divider');
  
  return [
    // AI command first for prominence
    insertAICommand(editor, onAICommand),
    // Get filtered default BlockNote items
    ...defaultItems,
    // New content blocks
    insertQuote(editor),
    insertMath(editor),
    insertMermaid(editor),
    insertSimpleTable(editor),
    // Add our custom blocks
    insertCallout(editor, 'info'),
    insertCallout(editor, 'warning'),
    insertCallout(editor, 'success'),
    insertCallout(editor, 'danger'),
    insertToggle(editor),
    insertDivider(editor),
    insertTableOfContents(editor),
    insertColumns(editor, 2),
    insertColumns(editor, 3),
  ];
}

// Simple filter function for suggestion items
export function filterSlashMenuItems<T extends { title: string; aliases?: string[] }>(
  items: T[],
  query: string
): T[] {
  if (!query) return items;
  
  const lowerQuery = query.toLowerCase();
  return items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(lowerQuery);
    const aliasMatch = item.aliases?.some((alias) => 
      alias.toLowerCase().includes(lowerQuery)
    );
    return titleMatch || aliasMatch;
  });
}
