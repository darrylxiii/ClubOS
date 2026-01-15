import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MathBlockRenderProps {
  block: {
    props: {
      latex: string;
      displayMode: boolean;
    };
  };
  editor: {
    updateBlock: (block: unknown, update: { props: { latex: string } }) => void;
  };
}

function MathBlockRender(props: MathBlockRenderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(props.block.props.latex as string || '');
  const [rendered, setRendered] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const renderMath = async () => {
      if (!latex) {
        setRendered('');
        setError(null);
        return;
      }

      setIsLoading(true);
      try {
        // Dynamically import katex only when needed
        const katex = (await import('katex')).default;
        // Import CSS dynamically
        await import('katex/dist/katex.min.css');

        const html = katex.renderToString(latex, {
          displayMode: props.block.props.displayMode as boolean,
          throwOnError: false,
          errorColor: '#ef4444',
        });
        setRendered(html);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid LaTeX');
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce rendering
    const timer = setTimeout(renderMath, 200);
    return () => clearTimeout(timer);
  }, [latex, props.block.props.displayMode]);

  useEffect(() => {
    setLatex(props.block.props.latex as string || '');
  }, [props.block.props.latex]);

  const handleSave = () => {
    props.editor.updateBlock(props.block, {
      props: { latex },
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="my-4 p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">LaTeX Formula</span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
              contentEditable={false}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-2 py-1 rounded bg-accent text-accent-foreground hover:bg-accent/80"
              contentEditable={false}
            >
              Save
            </button>
          </div>
        </div>
        <textarea
          ref={inputRef}
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          placeholder="Enter LaTeX, e.g., E = mc^2"
          className={cn(
            "w-full min-h-[60px] p-2 rounded font-mono text-sm",
            "bg-background border border-input",
            "focus:outline-none focus:ring-2 focus:ring-accent",
            "resize-y"
          )}
          autoFocus
        />
        {isLoading && (
          <div className="mt-2 p-2 text-center text-muted-foreground text-sm">
            Rendering...
          </div>
        )}
        {rendered && !isLoading && (
          <div className="mt-2 p-2 bg-background rounded border border-input">
            <span className="text-xs text-muted-foreground mb-1 block">Preview:</span>
            <div
              dangerouslySetInnerHTML={{ __html: rendered }}
              className="text-center py-2"
            />
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "my-4 py-4 cursor-pointer rounded-lg transition-colors",
        "hover:bg-muted/30",
        !latex && "border-2 border-dashed border-muted-foreground/30 p-4"
      )}
      contentEditable={false}
    >
      {rendered ? (
        <div
          dangerouslySetInnerHTML={{ __html: rendered }}
          className="text-center"
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Rendering formula...</span>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center">
          Click to add LaTeX formula
        </p>
      )}
    </div>
  );
}

export const MathBlock = createReactBlockSpec(
  {
    type: 'math',
    propSchema: {
      latex: {
        default: '' as const,
      },
      displayMode: {
        default: true,
      },
    },
    content: 'none',
  },
  {
    render: (props) => <MathBlockRender {...props as unknown as MathBlockRenderProps} />,
  }
);
