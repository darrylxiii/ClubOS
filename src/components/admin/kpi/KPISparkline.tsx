import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { useKPIHistory } from '@/hooks/useKPIHistory';

interface KPISparklineProps {
  kpi: UnifiedKPI;
  height?: number;
  className?: string;
  useHistory?: boolean;
}

export function KPISparkline({ kpi, height = 32, className, useHistory = true }: KPISparklineProps) {
  // Guard against undefined/null kpi
  const safeKpiName = kpi?.name || '';
  const safeKpiDomain = kpi?.domain || 'operations';
  const safeKpiValue = typeof kpi?.value === 'number' && isFinite(kpi.value) ? kpi.value : 0;
  const safeKpiStatus = kpi?.status || 'neutral';
  const safeKpiTrendDirection = kpi?.trendDirection;
  const safeKpiTrendPercentage = kpi?.trendPercentage || 0;
  
  // Fetch real history data if enabled
  const { data: historyData } = useKPIHistory(safeKpiName, safeKpiDomain, 7);

  // Generate data points - use real history if available, otherwise generate based on trend
  const data = useMemo(() => {
    // Use real history if we have enough points
    if (useHistory && historyData && Array.isArray(historyData) && historyData.length >= 3) {
      const values = historyData.map(h => (typeof h?.value === 'number' ? h.value : 0));
      // Ensure we include the current value at the end
      if (values[values.length - 1] !== safeKpiValue) {
        values.push(safeKpiValue);
      }
      return values;
    }

    // Fallback: Generate mock historical data based on current value and trend
    const points = 7;
    const values: number[] = [];
    const currentValue = safeKpiValue;
    const trendPercent = safeKpiTrendPercentage;
    
    // Calculate starting value based on trend
    const startValue = safeKpiTrendDirection === 'up' 
      ? currentValue / (1 + trendPercent / 100)
      : safeKpiTrendDirection === 'down'
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
  }, [safeKpiValue, safeKpiTrendDirection, safeKpiTrendPercentage, historyData, useHistory, safeKpiName]);

  // Determine line color based on status (using safe status)
  const lineColor = useMemo(() => {
    if (safeKpiStatus === 'critical') return 'stroke-rose-500';
    if (safeKpiStatus === 'warning') return 'stroke-amber-500';
    if (safeKpiStatus === 'success') return 'stroke-emerald-500';
    return 'stroke-muted-foreground';
  }, [safeKpiStatus]);

  const fillColor = useMemo(() => {
    if (safeKpiStatus === 'critical') return 'fill-rose-500/10';
    if (safeKpiStatus === 'warning') return 'fill-amber-500/10';
    if (safeKpiStatus === 'success') return 'fill-emerald-500/10';
    return 'fill-muted/30';
  }, [safeKpiStatus]);

  // Calculate SVG path
  const path = useMemo(() => {
    if (data.length < 2) return '';
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
    if (data.length < 2) return '';
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

  // End dot Y position
  const endDotY = useMemo(() => {
    if (data.length < 2) return height / 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return height - 2 - ((data[data.length - 1] - min) / range) * (height - 4);
  }, [data, height]);

  if (data.length < 2) {
    return (
      <svg 
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className={cn("w-full", className)}
        style={{ height }}
      >
        <text x="50" y={height/2} textAnchor="middle" className="fill-muted-foreground text-[8px]">
          No data
        </text>
      </svg>
    );
  }

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
        cy={endDotY}
        r="3"
        className={lineColor.replace('stroke-', 'fill-')}
      />
    </svg>
  );
}
