import { createReactBlockSpec } from '@blocknote/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
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

      const handleToggle = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        props.editor.updateBlock(props.block, {
          props: { isOpen: newState },
        });
      };

      return (
        <div className="my-2">
          <div
            className="flex items-start gap-1 cursor-pointer group"
            onClick={handleToggle}
          >
            <button
              type="button"
              className={cn(
                'p-0.5 rounded hover:bg-accent transition-transform duration-200 mt-0.5',
                isOpen && 'rotate-90'
              )}
              contentEditable={false}
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div
              ref={props.contentRef}
              className="flex-1 font-medium"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {isOpen && (
            <div className="ml-6 mt-2 pl-4 border-l-2 border-border text-muted-foreground">
              <p className="text-sm">Toggle content goes here (nested blocks coming soon)</p>
            </div>
          )}
        </div>
      );
    },
  }
);
