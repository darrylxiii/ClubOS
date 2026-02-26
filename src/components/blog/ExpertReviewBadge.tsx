import React from 'react';
import { ShieldCheck, Award, Building } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Author } from '@/data/blog';

interface ExpertReviewBadgeProps { reviewer: Author; }

const ExpertReviewBadge: React.FC<ExpertReviewBadgeProps> = ({ reviewer }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-help">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="underline decoration-dotted underline-offset-2">Expert Reviewed</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-72 p-4 bg-card border border-border shadow-lg rounded-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{reviewer.name}</p>
                <p className="text-xs text-muted-foreground">{reviewer.credentials}</p>
              </div>
            </div>
            {reviewer.institution && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" /><span>{reviewer.institution}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">✓ Reviewed for accuracy and relevance</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ExpertReviewBadge;
