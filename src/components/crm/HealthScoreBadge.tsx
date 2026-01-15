import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface HealthScoreBadgeProps {
    score: number;
    trend?: 'improving' | 'declining' | 'stable' | string; // loose string for safety
    className?: string;
}

export function HealthScoreBadge({ score, trend = 'stable', className }: HealthScoreBadgeProps) {
    // Color logic
    let colorClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (score >= 80) colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
    else if (score >= 50) colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
    else if (score < 50) colorClass = "bg-red-100 text-red-700 border-red-200";

    // Trend Icon
    const TrendIcon = () => {
        if (trend === 'improving') return <ArrowUpRight className="ml-1 h-3 w-3" />;
        if (trend === 'declining') return <ArrowDownRight className="ml-1 h-3 w-3" />;
        return <Minus className="ml-1 h-3 w-3" />;
    };

    return (
        <Badge variant="outline" className={cn("flex items-center gap-1", colorClass, className)}>
            <span className="font-bold">{score}</span>
            <span className="text-[10px] uppercase opacity-80 pl-1 border-l border-current ml-1">
                Health
            </span>
            <TrendIcon />
        </Badge>
    );
}
