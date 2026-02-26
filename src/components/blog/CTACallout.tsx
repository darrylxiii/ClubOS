import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CTACalloutProps {
  tipText: string;
  className?: string;
}

const CTACallout: React.FC<CTACalloutProps> = ({ tipText, className }) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 md:p-5",
      "bg-card border border-border rounded-2xl my-8",
      className
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{tipText}</p>
        </div>
      </div>
      <Link to="/auth" className="flex-shrink-0 w-full sm:w-auto">
        <Button variant="outline" className="w-full sm:w-auto rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground group">
          Join The Club <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </div>
  );
};

export default CTACallout;
