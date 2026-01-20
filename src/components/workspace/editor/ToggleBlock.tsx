import { createReactBlockSpec } from '@blocknote/react';
import { ChevronRight } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export const ToggleBlock = createReactBlockSpec(
  {
    type: 'toggle',
    propSchema: {
      isOpen: {
        default: false,
      },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const [isOpen, setIsOpen] = useState(props.block.props.isOpen);

      const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isOpen;
        setIsOpen(newState);
        props.editor.updateBlock(props.block, {
          props: { isOpen: newState },
        });
      }, [isOpen, props.editor, props.block]);

      return (
        <div className="my-2 group">
          <div className="flex items-start gap-1">
            <button
              type="button"
              onClick={handleToggle}
              className={cn(
                'p-0.5 rounded hover:bg-accent transition-transform duration-200 mt-0.5 flex-shrink-0',
                isOpen && 'rotate-90'
              )}
              contentEditable={false}
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div
              ref={props.contentRef}
              className="flex-1 font-medium min-h-[1.5em]"
            />
          </div>
          {isOpen && (
            <div className="ml-6 mt-2 pl-4 border-l-2 border-border">
              <div 
                className="text-sm text-muted-foreground min-h-[2em] p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors cursor-text"
                contentEditable={false}
              >
                <span className="opacity-60 italic">
                  Click to add nested content (use blocks below)
                </span>
              </div>
            </div>
          )}
        </div>
      );
    },
  }
);
