import { CalloutBlock } from './CalloutBlock';
import { ToggleBlock } from './ToggleBlock';
import { DividerBlock } from './DividerBlock';
import { TableOfContentsBlock } from './TableOfContentsBlock';
import { ColumnsBlock } from './ColumnsBlock';

// Export block specs - call the factory functions to get the actual specs
export const customBlockSpecs = {
  callout: CalloutBlock,
  toggle: ToggleBlock,
  divider: DividerBlock,
  tableOfContents: TableOfContentsBlock,
  columns: ColumnsBlock,
} as const;

export const customSlashMenuItems = [
  {
    title: 'Callout',
    subtext: 'Add a callout block with an icon',
    group: 'Advanced',
    onItemClick: (editor: any) => {
      editor.insertBlocks(
        [{ type: 'callout', props: { variant: 'info' } }],
        editor.getTextCursorPosition().block,
        'after'
      );
    },
    aliases: ['callout', 'alert', 'note', 'info'],
    icon: '💡',
  },
  {
    title: 'Toggle',
    subtext: 'Add a collapsible toggle block',
    group: 'Advanced',
    onItemClick: (editor: any) => {
      editor.insertBlocks(
        [{ type: 'toggle', props: { isOpen: false } }],
        editor.getTextCursorPosition().block,
        'after'
      );
    },
    aliases: ['toggle', 'collapse', 'accordion', 'expand'],
    icon: '▶️',
  },
  {
    title: 'Divider',
    subtext: 'Add a horizontal divider',
    group: 'Advanced',
    onItemClick: (editor: any) => {
      editor.insertBlocks(
        [{ type: 'divider', props: { style: 'solid' } }],
        editor.getTextCursorPosition().block,
        'after'
      );
    },
    aliases: ['divider', 'hr', 'line', 'separator'],
    icon: '➖',
  },
  {
    title: 'Table of Contents',
    subtext: 'Auto-generated from headings',
    group: 'Advanced',
    onItemClick: (editor: any) => {
      editor.insertBlocks(
        [{ type: 'tableOfContents' }],
        editor.getTextCursorPosition().block,
        'after'
      );
    },
    aliases: ['toc', 'contents', 'table of contents', 'outline'],
    icon: '📑',
  },
  {
    title: 'Columns',
    subtext: 'Add a multi-column layout',
    group: 'Advanced',
    onItemClick: (editor: any) => {
      editor.insertBlocks(
        [{ type: 'columns', props: { columnCount: 2 } }],
        editor.getTextCursorPosition().block,
        'after'
      );
    },
    aliases: ['columns', 'cols', 'layout', 'grid'],
    icon: '⬜',
  },
];
