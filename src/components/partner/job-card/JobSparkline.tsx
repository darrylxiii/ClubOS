import { memo, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobSparklineProps {
  jobId: string;
  candidateCount: number;
  daysOpen: number;
}

/**
 * Generates mock 7-day application trend data based on job metrics.
 * In production, this would be replaced with actual daily application counts.
 */
const generateTrendData = (candidateCount: number, daysOpen: number): number[] => {
  // Simulate a reasonable 7-day trend based on job metrics
  const avgPerDay = candidateCount / Math.max(daysOpen, 1);
  const baseValue = Math.max(1, Math.floor(avgPerDay));
  
  // Generate 7 days of data with some variation
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variance = Math.random() * 2 - 1; // -1 to 1
    const value = Math.max(0, Math.round(baseValue + variance * baseValue * 0.5));
    data.push(value);
  }
  
  return data;
};

const calculateTrend = (data: number[]): 'up' | 'down' | 'flat' => {
  if (data.length < 2) return 'flat';
  
  const firstHalf = data.slice(0, 3).reduce((a, b) => a + b, 0);
  const secondHalf = data.slice(4).reduce((a, b) => a + b, 0);
  
  const diff = secondHalf - firstHalf;
  if (diff > 1) return 'up';
  if (diff < -1) return 'down';
  return 'flat';
};

const MiniSparkline = memo(({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'flat' }) => {
  const maxValue = Math.max(...data, 1);
  const height = 16;
  const width = 56;
  const stepX = width / (data.length - 1);

  const points = data.map((value, index) => {
    const x = index * stepX;
    const y = height - (value / maxValue) * height;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = trend === 'up' 
    ? 'hsl(var(--primary))' 
    : trend === 'down' 
      ? 'hsl(var(--destructive))' 
      : 'hsl(var(--muted-foreground))';

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

MiniSparkline.displayName = 'MiniSparkline';

export const JobSparkline = memo(({ jobId, candidateCount, daysOpen }: JobSparklineProps) => {
  const data = useMemo(
    () => generateTrendData(candidateCount, daysOpen),
    [candidateCount, daysOpen]
  );
  
  const trend = useMemo(() => calculateTrend(data), [data]);
  
  const total = data.reduce((a, b) => a + b, 0);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <MiniSparkline data={data} trend={trend} />
            <TrendIcon 
              className={cn(
                'h-3 w-3',
                trend === 'up' && 'text-primary',
                trend === 'down' && 'text-destructive',
                trend === 'flat' && 'text-muted-foreground'
              )} 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">7-day trend</div>
          <div className="text-muted-foreground">{total} applications this week</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

JobSparkline.displayName = 'JobSparkline';
