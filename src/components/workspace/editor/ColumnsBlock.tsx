import { createReactBlockSpec } from '@blocknote/react';
import { Columns2, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ColumnsBlock = createReactBlockSpec(
  {
    type: 'columns',
    propSchema: {
      columnCount: {
        default: 2,
      },
      column1: {
        default: '',
      },
      column2: {
        default: '',
      },
      column3: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const columnCount = props.block.props.columnCount as number;

      const updateColumn = (colNum: number, value: string) => {
        props.editor.updateBlock(props.block, {
          props: { [`column${colNum}`]: value },
        });
      };

      return (
        <div className="my-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() =>
                props.editor.updateBlock(props.block, {
                  props: { columnCount: 2 },
                })
              }
              className={cn(
                'p-1 rounded hover:bg-accent',
                columnCount === 2 && 'bg-accent'
              )}
              contentEditable={false}
            >
              <Columns2 className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                props.editor.updateBlock(props.block, {
                  props: { columnCount: 3 },
                })
              }
              className={cn(
                'p-1 rounded hover:bg-accent',
                columnCount === 3 && 'bg-accent'
              )}
              contentEditable={false}
            >
              <Columns3 className="h-4 w-4" />
            </button>
          </div>
          <div
            className={cn(
              'grid gap-4',
              columnCount === 2 ? 'grid-cols-2' : 'grid-cols-3'
            )}
          >
            {Array.from({ length: columnCount }).map((_, index) => (
              <div
                key={index}
                className="min-h-[100px] p-3 rounded-lg border border-dashed border-border bg-muted/30 hover:border-primary/50 transition-colors"
              >
                <textarea
                  value={(props.block.props as any)[`column${index + 1}`] || ''}
                  onChange={(e) => updateColumn(index + 1, e.target.value)}
                  placeholder={`Column ${index + 1} content...`}
                  className="w-full h-full min-h-[80px] bg-transparent resize-none focus:outline-none text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      );
    },
  }
);
