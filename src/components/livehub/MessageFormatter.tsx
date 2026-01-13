import { LazyMarkdown } from '@/components/ui/LazyMarkdown';
import { Link } from 'react-router-dom';

interface MessageFormatterProps {
  content: string;
  mentions?: string[];
}

export function MessageFormatter({ content, mentions = [] }: MessageFormatterProps) {
  // Parse mentions
  const parseMention = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = text.split(mentionRegex);
    
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <span key={i} className="text-primary bg-primary/10 px-1 rounded">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <LazyMarkdown
        components={{
          p: ({ children }) => <p className="mb-1 last:mb-0">{parseMention(String(children))}</p>,
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-muted p-2 rounded overflow-x-auto">
                <code className="text-xs font-mono" {...props}>
                  {children}
                </code>
              </pre>
            ),
          a: ({ href, children }) => (
            <Link to={href || '#'} className="text-primary hover:underline">
              {children}
            </Link>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground pl-3 italic">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </LazyMarkdown>
    </div>
  );
}
