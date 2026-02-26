import React from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AEOSummaryBoxProps { takeaways: string[]; className?: string; }

const AEOSummaryBox: React.FC<AEOSummaryBoxProps> = ({ takeaways, className }) => {
  return (
    <div id="key-takeaways" role="region" aria-label="Key takeaways summary" data-speakable="true"
      className={cn("bg-muted/50 border-l-4 border-accent rounded-r-2xl p-6 md:p-8 my-8", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-accent" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Key Takeaways</h2>
      </div>
      <ul className="space-y-3" role="list">
        {takeaways.map((t, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-1" aria-hidden="true"><Check className="h-5 w-5 text-accent" /></span>
            <span className="text-foreground/80 leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AEOSummaryBox;
