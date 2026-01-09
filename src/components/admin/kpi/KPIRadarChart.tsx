import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DomainHealth, KPIDomain } from '@/hooks/useUnifiedKPIs';

interface KPIRadarChartProps {
  domainHealth: DomainHealth[];
  size?: number;
  className?: string;
  showLabels?: boolean;
}

const domainColors: Record<KPIDomain, string> = {
  operations: '#10b981', // emerald
  website: '#3b82f6',    // blue
  sales: '#8b5cf6',      // violet
  platform: '#06b6d4',   // cyan
  intelligence: '#f59e0b', // amber
  growth: '#ec4899',     // pink
  costs: '#6366f1',      // indigo
};

export function KPIRadarChart({ 
  domainHealth, 
  size = 280,
  className,
  showLabels = true 
}: KPIRadarChartProps) {
  const center = size / 2;
  const maxRadius = size / 2 - 40;

  // Calculate polygon points for each domain
  const { points, labelPositions, gridLines } = useMemo(() => {
    const n = domainHealth.length;
    if (n === 0) return { points: '', labelPositions: [], gridLines: [] };

    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2; // Start from top

    const pts: string[] = [];
    const labels: { x: number; y: number; label: string; health: number; domain: KPIDomain }[] = [];

    domainHealth.forEach((dh, i) => {
      const angle = startAngle + i * angleStep;
      const normalizedHealth = dh.healthScore / 100;
      const r = normalizedHealth * maxRadius;
      
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      pts.push(`${x},${y}`);

      // Label position (outside the chart)
      const labelR = maxRadius + 25;
      labels.push({
        x: center + labelR * Math.cos(angle),
        y: center + labelR * Math.sin(angle),
        label: dh.label,
        health: dh.healthScore,
        domain: dh.domain,
      });
    });

    // Grid lines at 25%, 50%, 75%, 100%
    const grids = [0.25, 0.5, 0.75, 1].map(pct => {
      const r = pct * maxRadius;
      const gridPts = Array.from({ length: n }, (_, i) => {
        const angle = startAngle + i * angleStep;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      });
      return { pct, points: gridPts.join(' ') };
    });

    return {
      points: pts.join(' '),
      labelPositions: labels,
      gridLines: grids,
    };
  }, [domainHealth, center, maxRadius]);

  // Axis lines
  const axisLines = useMemo(() => {
    const n = domainHealth.length;
    if (n === 0) return [];

    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    return domainHealth.map((_, i) => {
      const angle = startAngle + i * angleStep;
      return {
        x1: center,
        y1: center,
        x2: center + maxRadius * Math.cos(angle),
        y2: center + maxRadius * Math.sin(angle),
      };
    });
  }, [domainHealth, center, maxRadius]);

  if (domainHealth.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Domain Performance Radar</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Domain Performance Radar</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <svg width={size} height={size} className="overflow-visible">
          {/* Grid circles */}
          {gridLines.map((grid, i) => (
            <polygon
              key={i}
              points={grid.points}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          ))}

          {/* Axis lines */}
          {axisLines.map((line, i) => (
            <line
              key={i}
              {...line}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
          ))}

          {/* Data polygon fill */}
          <polygon
            points={points}
            fill="hsl(var(--primary))"
            fillOpacity={0.15}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {domainHealth.map((dh, i) => {
            const n = domainHealth.length;
            const angleStep = (2 * Math.PI) / n;
            const startAngle = -Math.PI / 2;
            const angle = startAngle + i * angleStep;
            const normalizedHealth = dh.healthScore / 100;
            const r = normalizedHealth * maxRadius;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);

            return (
              <circle
                key={dh.domain}
                cx={x}
                cy={y}
                r={5}
                fill={domainColors[dh.domain]}
                stroke="white"
                strokeWidth={2}
                className="drop-shadow-sm"
              />
            );
          })}

          {/* Labels */}
          {showLabels && labelPositions.map((lp, i) => (
            <g key={i}>
              <text
                x={lp.x}
                y={lp.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-[11px] font-medium"
              >
                {lp.label}
              </text>
              <text
                x={lp.x}
                y={lp.y + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {lp.health.toFixed(0)}%
              </text>
            </g>
          ))}

          {/* Center point */}
          <circle
            cx={center}
            cy={center}
            r={3}
            fill="currentColor"
            fillOpacity={0.3}
          />
        </svg>
      </CardContent>
    </Card>
  );
}
