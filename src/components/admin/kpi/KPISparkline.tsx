import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

interface KPISparklineProps {
  kpi: UnifiedKPI;
  height?: number;
  className?: string;
}

export function KPISparkline({ kpi, height = 32, className }: KPISparklineProps) {
  // Generate mock historical data based on current value and trend
  const data = useMemo(() => {
    const points = 7;
    const values: number[] = [];
    const currentValue = kpi.value;
    const trendPercent = kpi.trendPercentage || 0;
    
    // Calculate starting value based on trend
    const startValue = kpi.trendDirection === 'up' 
      ? currentValue / (1 + trendPercent / 100)
      : kpi.trendDirection === 'down'
      ? currentValue / (1 - trendPercent / 100)
      : currentValue;
    
    // Generate intermediate points with some variance
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const baseValue = startValue + (currentValue - startValue) * progress;
      const variance = (Math.random() - 0.5) * (currentValue * 0.1);
      values.push(Math.max(0, baseValue + variance));
    }
    
    // Ensure last value matches current
    values[points - 1] = currentValue;
    
    return values;
  }, [kpi.value, kpi.trendDirection, kpi.trendPercentage]);

  // Determine line color based on trend and lowerIsBetter
  const lineColor = useMemo(() => {
    if (kpi.status === 'critical') return 'stroke-rose-500';
    if (kpi.status === 'warning') return 'stroke-amber-500';
    if (kpi.status === 'success') return 'stroke-emerald-500';
    return 'stroke-muted-foreground';
  }, [kpi.status]);

  const fillColor = useMemo(() => {
    if (kpi.status === 'critical') return 'fill-rose-500/10';
    if (kpi.status === 'warning') return 'fill-amber-500/10';
    if (kpi.status === 'success') return 'fill-emerald-500/10';
    return 'fill-muted/30';
  }, [kpi.status]);

  // Calculate SVG path
  const path = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 100;
    const padding = 2;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [data, height]);

  // Area path (for fill)
  const areaPath = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 100;
    const padding = 2;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });
    
    return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  }, [data, height]);

  return (
    <svg 
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      {/* Area fill */}
      <path 
        d={areaPath} 
        className={fillColor}
      />
      {/* Line */}
      <path 
        d={path} 
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={lineColor}
      />
      {/* End dot */}
      <circle
        cx={100}
        cy={(() => {
          const min = Math.min(...data);
          const max = Math.max(...data);
          const range = max - min || 1;
          return height - 2 - ((data[data.length - 1] - min) / range) * (height - 4);
        })()}
        r="3"
        className={lineColor.replace('stroke-', 'fill-')}
      />
    </svg>
  );
}
