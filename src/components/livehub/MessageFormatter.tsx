import { Link } from 'react-router-dom';
import { LazyMarkdown } from '@/components/ui/LazyMarkdown';

interface MessageFormatterProps {
  content: string;
  mentions?: string[];
}

export function MessageFormatter({ content, mentions = [] }: MessageFormatterProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <LazyMarkdown>{content}</LazyMarkdown>
    </div>
  );
}
