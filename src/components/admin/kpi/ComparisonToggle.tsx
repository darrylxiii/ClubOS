import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonToggleProps {
  isComparing: boolean;
  onToggle: () => void;
  period: 'weekly' | 'monthly';
}

export function ComparisonToggle({ isComparing, onToggle, period }: ComparisonToggleProps) {
  const comparisonLabel = period === 'weekly' ? 'vs Last Week' : 'vs Last Month';
  
  return (
    <Button
      variant={isComparing ? "secondary" : "outline"}
      size="sm"
      onClick={onToggle}
      className={cn(
        "gap-2 transition-all",
        isComparing && "bg-primary/10 border-primary/30 text-primary"
      )}
    >
      <ArrowLeftRight className={cn(
        "h-4 w-4 transition-transform",
        isComparing && "text-primary"
      )} />
      <span className="hidden sm:inline">Compare</span>
      {isComparing && (
        <Badge variant="outline" className="ml-1 text-[10px] px-1.5 bg-primary/10 border-primary/30">
          {comparisonLabel}
        </Badge>
      )}
    </Button>
  );
}
