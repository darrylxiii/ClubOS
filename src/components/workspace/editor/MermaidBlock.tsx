import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect, useRef, useId } from 'react';
import { cn } from '@/lib/utils';

export const MermaidBlock = createReactBlockSpec(
  {
    type: 'mermaid',
    propSchema: {
      code: {
        default: '' as const,
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const [isEditing, setIsEditing] = useState(false);
      const [code, setCode] = useState(props.block.props.code as string || '');
      const [svgContent, setSvgContent] = useState<string>('');
      const [error, setError] = useState<string | null>(null);
      const [isLoading, setIsLoading] = useState(false);
      const containerRef = useRef<HTMLDivElement>(null);
      const uniqueId = useId().replace(/:/g, '');

      useEffect(() => {
        const renderDiagram = async () => {
          if (!code) {
            setSvgContent('');
            setError(null);
            return;
          }
          
          setIsLoading(true);
          try {
            // Dynamically import mermaid only when needed
            const mermaid = (await import('mermaid')).default;
            mermaid.initialize({
              startOnLoad: false,
              theme: 'neutral',
              securityLevel: 'loose',
            });
            
            const { svg } = await mermaid.render(`mermaid-${uniqueId}`, code);
            setSvgContent(svg);
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid Mermaid syntax');
            setSvgContent('');
          } finally {
            setIsLoading(false);
          }
        };
        
        // Debounce rendering
        const timer = setTimeout(renderDiagram, 300);
        return () => clearTimeout(timer);
      }, [code, uniqueId]);

      useEffect(() => {
        setCode(props.block.props.code as string || '');
      }, [props.block.props.code]);

      const handleSave = () => {
        props.editor.updateBlock(props.block, {
          props: { code },
        });
        setIsEditing(false);
      };

      const exampleDiagrams = [
        { name: 'Flow', code: 'graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[OK]\n    B -->|No| D[Cancel]' },
        { name: 'Seq', code: 'sequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi!' },
      ];

      if (isEditing) {
        return (
          <div className="my-4 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Mermaid Diagram</span>
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
            
            <div className="flex gap-1 mb-2">
              {exampleDiagrams.map((ex) => (
                <button
                  key={ex.name}
                  onClick={() => setCode(ex.code)}
                  className="text-[10px] px-2 py-0.5 rounded bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  contentEditable={false}
                >
                  {ex.name}
                </button>
              ))}
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Mermaid diagram code..."
              className={cn(
                "w-full min-h-[80px] p-2 rounded font-mono text-sm",
                "bg-background border border-input",
                "focus:outline-none focus:ring-2 focus:ring-accent",
                "resize-y"
              )}
              autoFocus
            />
            
            {isLoading && (
              <div className="mt-2 p-4 text-center text-muted-foreground text-sm">
                Rendering...
              </div>
            )}
            {svgContent && !isLoading && (
              <div className="mt-2 p-4 bg-background rounded border border-input overflow-auto">
                <div 
                  ref={containerRef}
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                  className="flex justify-center"
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
            "my-4 cursor-pointer rounded-lg transition-colors",
            "hover:bg-muted/30",
            !code && "border-2 border-dashed border-muted-foreground/30 p-4"
          )}
          contentEditable={false}
        >
          {svgContent ? (
            <div 
              ref={containerRef}
              dangerouslySetInnerHTML={{ __html: svgContent }}
              className="flex justify-center p-4 overflow-auto"
            />
          ) : isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Loading diagram...
            </p>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              Click to add Mermaid diagram
            </p>
          )}
        </div>
      );
    },
  }
);
