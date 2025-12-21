import { createReactBlockSpec } from '@blocknote/react';
import { cn } from '@/lib/utils';

export const QuoteBlock = createReactBlockSpec(
  {
    type: 'quote',
    propSchema: {
      author: {
        default: '' as const,
      },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const author = props.block.props.author as string;

      return (
        <figure className="my-4 border-l-4 border-accent pl-4 py-2">
          <blockquote className="italic text-lg text-foreground/90">
            <div ref={props.contentRef} className="quote-content" />
          </blockquote>
          <figcaption className="mt-2 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">—</span>
            <input
              type="text"
              value={author}
              onChange={(e) =>
                props.editor.updateBlock(props.block, {
                  props: { author: e.target.value },
                })
              }
              placeholder="Author name"
              className={cn(
                "text-sm text-muted-foreground bg-transparent border-none",
                "focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50",
                "w-full max-w-[200px]"
              )}
              contentEditable={false}
            />
          </figcaption>
        </figure>
      );
    },
  }
);
