import { memo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSmartScheduling } from '@/hooks/useSmartScheduling';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  TrendingUp,
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SmartSchedulingSuggestionsProps {
  candidateId: string;
  interviewerIds?: string[];
  onSelectSlot?: (date: string, time: string) => void;
  className?: string;
}

export const SmartSchedulingSuggestions = memo(({
  candidateId,
  interviewerIds = [],
  onSelectSlot,
  className,
}: SmartSchedulingSuggestionsProps) => {
  const { analyzeOptimalSlots, loading } = useSmartScheduling();
  const [suggestion, setSuggestion] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const result = await analyzeOptimalSlots(candidateId, interviewerIds);
      setSuggestion(result);
    };
    
    fetchSuggestions();
  }, [candidateId, interviewerIds.join(',')]);

  if (loading) {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!suggestion || suggestion.recommendedSlots.length === 0) {
    return null;
  }

  const handleSelectSlot = (slot: any) => {
    const slotKey = `${slot.date}-${slot.slot}`;
    setSelectedSlot(slotKey);
    onSelectSlot?.(slot.date, slot.slot);
  };

  return (
    <Card className={cn('border-primary/20 bg-gradient-to-br from-primary/5 to-transparent', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Optimized Time Slots
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {Math.round(suggestion.confidence * 100)}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reasoning */}
        {suggestion.reasoning.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestion.reasoning.map((reason: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs font-normal">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                {reason}
              </Badge>
            ))}
          </div>
        )}

        {/* Top Slots */}
        <div className="space-y-2">
          {suggestion.recommendedSlots.slice(0, 3).map((slot: any, index: number) => {
            const slotKey = `${slot.date}-${slot.slot}`;
            const isSelected = selectedSlot === slotKey;
            const isOptimal = index === 0;

            return (
              <TooltipProvider key={slotKey}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'w-full justify-between h-auto py-3',
                        isOptimal && !isSelected && 'border-primary/50 bg-primary/5'
                      )}
                      onClick={() => handleSelectSlot(slot)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(slot.date), 'EEE, MMM d')}
                        </span>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{slot.slot}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOptimal && (
                          <Badge variant="default" className="text-xs">
                            Best Match
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          {Math.round(slot.score * 100)}%
                        </div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-2 text-xs">
                      <div className="font-medium">Scoring Factors</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Historical Show Rate:</span>
                          <span>{Math.round(slot.factors.historicalShowRate * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Timezone Match:</span>
                          <span>{Math.round(slot.factors.timezoneCompatibility * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time Preference:</span>
                          <span>{Math.round(slot.factors.candidatePreference * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Availability:</span>
                          <span>{Math.round(slot.factors.interviewerAvailability * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            These suggestions are based on historical show rates, timezone analysis, 
            and optimal meeting times. Click to select a slot.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

SmartSchedulingSuggestions.displayName = 'SmartSchedulingSuggestions';
