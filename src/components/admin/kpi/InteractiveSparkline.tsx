import React, { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { useKPIHistory } from '@/hooks/useKPIHistory';
import { format } from 'date-fns';

interface InteractiveSparklineProps {
  kpi: UnifiedKPI;
  height?: number;
  width?: number;
  className?: string;
  showTooltip?: boolean;
  days?: number;
}

interface DataPoint {
  x: number;
  y: number;
  value: number;
  date: Date;
  index: number;
}

export function InteractiveSparkline({ 
  kpi, 
  height = 40, 
  width = 120,
  className, 
  showTooltip = true,
  days = 7
}: InteractiveSparklineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const safeKpiName = kpi?.name || '';
  const safeKpiDomain = kpi?.domain || 'operations';
  const safeKpiValue = typeof kpi?.value === 'number' && isFinite(kpi.value) ? kpi.value : 0;
  const safeKpiStatus = kpi?.status || 'neutral';
  
  const { data: historyData } = useKPIHistory(safeKpiName, safeKpiDomain, days);

  // Generate data points with real history
  const dataPoints = useMemo(() => {
    const points: DataPoint[] = [];
    const padding = 4;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    let values: { value: number; date: Date }[] = [];

    if (historyData && Array.isArray(historyData) && historyData.length >= 2) {
      values = historyData.map(h => ({
        value: typeof h?.value === 'number' ? h.value : 0,
        date: new Date(h?.recorded_at || Date.now()),
      }));
      // Ensure current value is included
      if (values.length > 0 && values[values.length - 1].value !== safeKpiValue) {
        values.push({ value: safeKpiValue, date: new Date() });
      }
    } else {
      // Generate mock data
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const variance = (Math.random() - 0.5) * (safeKpiValue * 0.2);
        values.push({ value: Math.max(0, safeKpiValue + variance), date });
      }
      values[values.length - 1].value = safeKpiValue;
    }

    if (values.length < 2) return [];

    const min = Math.min(...values.map(v => v.value));
    const max = Math.max(...values.map(v => v.value));
    const range = max - min || 1;

    values.forEach((v, i) => {
      const x = padding + (i / (values.length - 1)) * effectiveWidth;
      const y = height - padding - ((v.value - min) / range) * effectiveHeight;
      points.push({ x, y, value: v.value, date: v.date, index: i });
    });

    return points;
  }, [historyData, safeKpiValue, safeKpiName, days, width, height]);

  // Line path
  const linePath = useMemo(() => {
    if (dataPoints.length < 2) return '';
    return dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  }, [dataPoints]);

  // Area path
  const areaPath = useMemo(() => {
    if (dataPoints.length < 2) return '';
    const first = dataPoints[0];
    const last = dataPoints[dataPoints.length - 1];
    return `${linePath} L ${last.x},${height} L ${first.x},${height} Z`;
  }, [linePath, dataPoints, height]);

  // Status colors
  const statusColors = useMemo(() => {
    const colors = {
      success: { stroke: 'stroke-emerald-500', fill: 'fill-emerald-500/15', dot: 'fill-emerald-500' },
      warning: { stroke: 'stroke-amber-500', fill: 'fill-amber-500/15', dot: 'fill-amber-500' },
      critical: { stroke: 'stroke-rose-500', fill: 'fill-rose-500/15', dot: 'fill-rose-500' },
      neutral: { stroke: 'stroke-muted-foreground', fill: 'fill-muted/20', dot: 'fill-muted-foreground' },
    };
    return colors[safeKpiStatus] || colors.neutral;
  }, [safeKpiStatus]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setMousePos({ x, y: e.clientY - rect.top });

    // Find closest point
    let closest: DataPoint | null = null;
    let minDist = Infinity;
    dataPoints.forEach(p => {
      const dist = Math.abs(p.x - x);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    });
    if (minDist < 20) {
      setHoveredPoint(closest);
    } else {
      setHoveredPoint(null);
    }
  }, [dataPoints]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setMousePos(null);
  }, []);

  // Format value based on KPI format
  const formatValue = useCallback((value: number) => {
    switch (kpi.format) {
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `€${value.toLocaleString()}`;
      case 'hours':
        return `${value.toFixed(1)}h`;
      case 'days':
        return `${value.toFixed(1)}d`;
      case 'ms':
        return `${value.toFixed(0)}ms`;
      default:
        return value.toLocaleString();
    }
  }, [kpi.format]);

  if (dataPoints.length < 2) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-xs", className)} style={{ height, width }}>
        No data
      </div>
    );
  }

  const lastPoint = dataPoints[dataPoints.length - 1];

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("relative", className)} style={{ height, width }}>
        <svg 
          width={width} 
          height={height}
          className="overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Area fill */}
          <path d={areaPath} className={statusColors.fill} />
          
          {/* Line */}
          <path 
            d={linePath} 
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={statusColors.stroke}
          />

          {/* Hover line */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={4}
              x2={hoveredPoint.x}
              y2={height - 4}
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="2,2"
            />
          )}

          {/* Data points on hover */}
          {hoveredPoint && (
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={4}
              className={cn(statusColors.dot, "stroke-background stroke-2")}
            />
          )}

          {/* End point */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={3}
            className={cn(statusColors.dot)}
          />
        </svg>

        {/* Tooltip */}
        {showTooltip && hoveredPoint && (
          <div 
            className="absolute z-50 pointer-events-none bg-popover border rounded-md shadow-md px-2 py-1.5 text-xs"
            style={{
              left: hoveredPoint.x + 10,
              top: hoveredPoint.y - 30,
              transform: hoveredPoint.x > width / 2 ? 'translateX(-100%)' : undefined,
            }}
          >
            <div className="font-medium">{formatValue(hoveredPoint.value)}</div>
            <div className="text-muted-foreground text-[10px]">
              {format(hoveredPoint.date, 'MMM d, HH:mm')}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
