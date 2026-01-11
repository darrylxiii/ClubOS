import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CRMDeal } from '@/types/crm';
import { CRMProspect } from '@/types/crm-enterprise';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface DealProbabilityCardProps {
    deal: CRMDeal | CRMProspect;
    className?: string; // Allow custom styling
}

interface AIAnalysis {
    score: number;
    risk_level: 'low' | 'medium' | 'high';
    factors: { name: string; type: 'positive' | 'negative' }[];
    recommendation?: string;
}

export function DealProbabilityCard({ deal, className }: DealProbabilityCardProps) {
    // Determine ID and basic fallback score
    const id = deal.id;
    const initialScore = (deal as any).lead_score || 50;

    const { data: analysis, isLoading, isError, refetch } = useQuery({
        queryKey: ['deal-probability', id],
        queryFn: async () => {
            console.log('Fetching AI analysis for deal:', id);
            const { data, error } = await supabase.functions.invoke('analyze-deal-health', {
                body: { deal }
            });

            if (error) {
                console.error('Edge function error:', error);
                throw error;
            }
            return data as AIAnalysis;
        },
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
        retry: false,
    });

    const score = analysis?.score ?? initialScore;
    const factors = analysis?.factors || [];
    const isLoadingAI = isLoading;

    // Fallback UI for loading
    if (isLoadingAI) {
        return (
            <Card className={cn("overflow-hidden border-none shadow-none bg-transparent", className)}>
                <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between text-muted-foreground">
                        <span>Win Probability</span>
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                    <Progress value={20} className="h-2 opacity-50" />
                    <div className="text-xs text-muted-foreground">Analyzing deal signals...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("overflow-hidden border-none shadow-none bg-transparent", className)}>
            <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>Win Probability</span>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-lg font-bold",
                            score > 70 ? "text-green-500" : score > 40 ? "text-yellow-500" : "text-red-500"
                        )}>
                            {score}%
                        </span>
                        {/* Refetch button (hidden by default unless error or stale needs)
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => refetch()}>
                            <RefreshCw className="h-3 w-3" />
                        </Button>
                        */}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
                <Progress value={score} className={cn("h-2",
                    score > 70 ? "bg-green-100 dark:bg-green-900" : score > 40 ? "bg-yellow-100 dark:bg-yellow-900" : "bg-red-100 dark:bg-red-900"
                )} />

                <div className="space-y-1">
                    {factors.map((factor, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            {factor.type === 'positive' ? (
                                <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                                <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                            )}
                            <span className="text-muted-foreground truncate">{factor.name}</span>
                        </div>
                    ))}
                    {factors.length === 0 && !isError && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Standard pipeline progression</span>
                        </div>
                    )}
                    {isError && (
                        <div className="flex items-center gap-2 text-xs text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            <span>Analysis unavailable</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
