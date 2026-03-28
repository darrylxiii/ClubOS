import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TrendSparklineProps {
  /** Array of numeric values to plot */
  data: number[];
  /** Line/fill color class (Tailwind) */
  color?: 'primary' | 'emerald' | 'amber' | 'rose' | 'muted';
  /** SVG height in pixels */
  height?: number;
  /** SVG width in pixels */
  width?: number;
  /** Show area fill under the line */
  showArea?: boolean;
  /** Show end dot */
  showEndDot?: boolean;
  className?: string;
}

const COLOR_MAP = {
  primary: { stroke: 'stroke-primary', fill: 'fill-primary/10', dot: 'fill-primary' },
  emerald: { stroke: 'stroke-emerald-500', fill: 'fill-emerald-500/10', dot: 'fill-emerald-500' },
  amber: { stroke: 'stroke-amber-500', fill: 'fill-amber-500/10', dot: 'fill-amber-500' },
  rose: { stroke: 'stroke-rose-500', fill: 'fill-rose-500/10', dot: 'fill-rose-500' },
  muted: { stroke: 'stroke-muted-foreground', fill: 'fill-muted/30', dot: 'fill-muted-foreground' },
};

export function TrendSparkline({
  data,
  color = 'primary',
  height = 32,
  width = 100,
  showArea = true,
  showEndDot = true,
  className,
}: TrendSparklineProps) {
  const colors = COLOR_MAP[color];
  const padding = 2;

  const { linePath, areaPath, endDotY } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '', endDotY: height / 2 };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y };
    });

    const line = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const area = `M 0,${height} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${width},${height} Z`;
    const dotY = points[points.length - 1].y;

    return { linePath: line, areaPath: area, endDotY: dotY };
  }, [data, height, width]);

  if (data.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={cn('w-full', className)}
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height }}
      aria-hidden="true"
    >
      {showArea && <path d={areaPath} className={colors.fill} />}
      <path
        d={linePath}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={colors.stroke}
      />
      {showEndDot && (
        <circle cx={width} cy={endDotY} r="2.5" className={colors.dot} />
      )}
    </svg>
  );
}
