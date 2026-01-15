import { createReactBlockSpec } from '@blocknote/react';
import { List } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface BlockContent {
  text?: string;
}

interface Block {
  id: string;
  type: string;
  content?: BlockContent[];
  props?: { level?: number };
  children?: Block[];
}

interface TableOfContentsBlockRenderProps {
  editor: {
    document: Block[];
  };
}

function TableOfContentsBlockRender(props: TableOfContentsBlockRenderProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

  useEffect(() => {
    const extractHeadings = () => {
      const blocks = props.editor.document;
      const extracted: HeadingItem[] = [];

      const processBlocks = (blockList: Block[]) => {
        for (const block of blockList) {
          if (block.type === 'heading' && block.content) {
            const text = block.content
              .map((c: BlockContent) => c.text || '')
              .join('');
            if (text.trim()) {
              extracted.push({
                id: block.id,
                text: text,
                level: block.props?.level || 1,
              });
            }
          }
          if (block.children) {
            processBlocks(block.children);
          }
        }
      };

      processBlocks(blocks);
      setHeadings(extracted);
    };

    extractHeadings();

    // Re-extract when document changes
    const interval = setInterval(extractHeadings, 2000);
    return () => clearInterval(interval);
  }, [props.editor]);

  const scrollToHeading = (id: string) => {
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="my-4 p-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
        <List className="h-4 w-4" />
        <span>Table of Contents</span>
      </div>
      {headings.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No headings found. Add headings to generate table of contents.
        </p>
      ) : (
        <nav className="space-y-1">
          {headings.map((heading, index) => (
            <button
              key={`${heading.id}-${index}`}
              onClick={() => scrollToHeading(heading.id)}
              className="block w-full text-left text-sm hover:text-primary transition-colors"
              style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
              contentEditable={false}
            >
              <span className="hover:underline">{heading.text}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export const TableOfContentsBlock = createReactBlockSpec(
  {
    type: 'tableOfContents',
    propSchema: {},
    content: 'none',
  },
  {
    render: (props) => <TableOfContentsBlockRender {...props as unknown as TableOfContentsBlockRenderProps} />,
  }
);
