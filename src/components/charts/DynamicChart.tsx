/**
 * DynamicChart - A wrapper component that dynamically loads recharts
 * This is the recommended way to use charts to avoid OOM build errors.
 * 
 * IMPORTANT: All chart usage should go through this component to enable
 * code splitting and reduce initial bundle size (~150MB build memory savings).
 */
import { useState, useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'radar' | 'composed' | 'funnel';

interface LineConfig {
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  name?: string;
  type?: 'monotone' | 'linear' | 'step';
  yAxisId?: string;
  dot?: boolean | object;
}

interface BarConfig {
  dataKey: string;
  fill?: string;
  name?: string;
  stackId?: string;
  radius?: number | [number, number, number, number];
}

interface PieConfig {
  dataKey: string;
  nameKey?: string;
  cx?: string;
  cy?: string;
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  colors?: string[];
  onClick?: (data: any, index: number) => void;
  label?: boolean | ((props: any) => ReactNode);
  labelLine?: boolean;
}

interface AreaConfig {
  dataKey: string;
  fill?: string;
  stroke?: string;
  name?: string;
  fillOpacity?: number;
  type?: 'monotone' | 'linear' | 'step';
  gradientId?: string;
}

interface RadarConfig {
  dataKey: string;
  name?: string;
  stroke?: string;
  fill?: string;
  fillOpacity?: number;
}

interface FunnelConfig {
  dataKey: string;
  nameKey?: string;
  colors?: string[];
  showLabel?: boolean;
  labelPosition?: 'right' | 'left' | 'inside' | 'outside';
}

interface GradientConfig {
  id: string;
  startColor: string;
  endColor: string;
  startOpacity?: number;
  endOpacity?: number;
}

interface ChartConfig {
  lines?: LineConfig[];
  bars?: BarConfig[];
  pie?: PieConfig;
  pies?: PieConfig[];
  areas?: AreaConfig[];
  radars?: RadarConfig[];
  funnel?: FunnelConfig;
  xAxisKey?: string;
  xAxisDataKey?: string;
  xAxisFormatter?: (value: any) => string;
  xAxisTick?: object | boolean;
  angleAxisKey?: string;
  yAxisFormatter?: (value: number) => string;
  yAxisDomain?: [number | 'auto', number | 'auto'];
  yAxisTick?: object | boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  legend?: boolean;
  gradients?: GradientConfig[];
  tooltip?: {
    formatter?: (value: any, name?: string) => any;
    labelFormatter?: (label: string) => string;
    content?: (props: any) => ReactNode;
  };
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  layout?: 'horizontal' | 'vertical';
}

interface DynamicChartProps {
  type: ChartType;
  data: any[];
  height?: number;
  width?: string | number;
  config?: ChartConfig;
  className?: string;
}

const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function DynamicChart({
  type,
  data,
  height = 300,
  width = '100%',
  config = {},
  className,
}: DynamicChartProps) {
  const [recharts, setRecharts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    import('recharts').then((mod) => {
      if (mounted) {
        setRecharts(mod);
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('Failed to load recharts:', err);
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (isLoading || !recharts) {
    return <Skeleton className={className} style={{ height, width }} />;
  }

  const {
    ResponsiveContainer, LineChart, BarChart, PieChart, AreaChart, ComposedChart, RadarChart, FunnelChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, Pie, Area, Cell, Funnel, LabelList,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  } = recharts;

  const xKey = config.xAxisKey || config.xAxisDataKey;
  const showLegend = config.legend ?? false;
  const showGrid = config.showGrid ?? true;
  const showTooltip = config.showTooltip ?? true;
  const margin = config.margin ?? { top: 5, right: 20, left: 10, bottom: 5 };
  const layout = config.layout ?? 'horizontal';

  const tooltipProps: any = {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
    },
  };
  if (config.tooltip?.formatter) tooltipProps.formatter = config.tooltip.formatter;
  if (config.tooltip?.labelFormatter) tooltipProps.labelFormatter = config.tooltip.labelFormatter;
  if (config.tooltip?.content) tooltipProps.content = config.tooltip.content;

  // Render gradients for area charts
  const renderGradients = () => {
    if (!config.gradients) return null;
    return (
      <defs>
        {config.gradients.map((g) => (
          <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={g.startColor} stopOpacity={g.startOpacity ?? 0.3} />
            <stop offset="95%" stopColor={g.endColor} stopOpacity={g.endOpacity ?? 0} />
          </linearGradient>
        ))}
      </defs>
    );
  };

  const xAxisProps: any = {
    dataKey: xKey,
    className: "text-xs",
    tick: config.xAxisTick ?? { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
  };
  if (config.xAxisFormatter) xAxisProps.tickFormatter = config.xAxisFormatter;

  const yAxisProps: any = {
    className: "text-xs",
    tick: config.yAxisTick ?? { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
  };
  if (config.yAxisFormatter) yAxisProps.tickFormatter = config.yAxisFormatter;
  if (config.yAxisDomain) yAxisProps.domain = config.yAxisDomain;

  const renderChart = (): ReactNode => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data} margin={margin}>
            {renderGradients()}
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />}
            {xKey && <XAxis {...xAxisProps} />}
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {(config.lines || []).map((line, i) => (
              <Line 
                key={line.dataKey} 
                type={line.type || 'monotone'} 
                dataKey={line.dataKey}
                stroke={line.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={line.strokeWidth || 2} 
                name={line.name}
                dot={line.dot ?? false}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data} margin={margin} layout={layout}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />}
            {layout === 'vertical' ? (
              <>
                <XAxis type="number" {...yAxisProps} />
                <YAxis dataKey={xKey} type="category" width={100} {...xAxisProps} />
              </>
            ) : (
              <>
                {xKey && <XAxis {...xAxisProps} />}
                <YAxis {...yAxisProps} />
              </>
            )}
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {(config.bars || []).map((bar, i) => (
              <Bar 
                key={bar.dataKey} 
                dataKey={bar.dataKey}
                fill={bar.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                name={bar.name} 
                stackId={bar.stackId}
                radius={bar.radius}
              />
            ))}
          </BarChart>
        );

      case 'pie': {
        const pieConfig = config.pies?.[0] || config.pie || { dataKey: 'value' };
        const colors = pieConfig.colors || DEFAULT_COLORS;
        return (
          <PieChart margin={margin}>
            <Pie 
              data={data} 
              cx={pieConfig.cx || '50%'} 
              cy={pieConfig.cy || '50%'}
              innerRadius={pieConfig.innerRadius} 
              outerRadius={pieConfig.outerRadius || 80}
              paddingAngle={pieConfig.paddingAngle || 0} 
              dataKey={pieConfig.dataKey}
              nameKey={pieConfig.nameKey} 
              onClick={pieConfig.onClick}
              label={pieConfig.label}
              labelLine={pieConfig.labelLine ?? false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
          </PieChart>
        );
      }

      case 'area':
        return (
          <AreaChart data={data} margin={margin}>
            {renderGradients()}
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />}
            {xKey && <XAxis {...xAxisProps} />}
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {(config.areas || []).map((area, i) => (
              <Area 
                key={area.dataKey} 
                type={area.type || 'monotone'} 
                dataKey={area.dataKey}
                fill={area.gradientId ? `url(#${area.gradientId})` : (area.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length])}
                stroke={area.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fillOpacity={area.fillOpacity ?? 0.3} 
                name={area.name} 
              />
            ))}
          </AreaChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey={config.angleAxisKey || 'category'} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            {(config.radars || []).map((radar, i) => (
              <Radar 
                key={radar.dataKey} 
                name={radar.name} 
                dataKey={radar.dataKey}
                stroke={radar.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fill={radar.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fillOpacity={radar.fillOpacity ?? 0.2} 
              />
            ))}
            {showLegend && <Legend />}
            {showTooltip && <Tooltip {...tooltipProps} />}
          </RadarChart>
        );

      case 'funnel': {
        const funnelConfig = config.funnel || { dataKey: 'value' };
        const colors = funnelConfig.colors || DEFAULT_COLORS;
        return (
          <FunnelChart margin={margin}>
            <Tooltip {...tooltipProps} />
            <Funnel
              dataKey={funnelConfig.dataKey}
              data={data}
              isAnimationActive
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || colors[index % colors.length]} />
              ))}
              {funnelConfig.showLabel && (
                <LabelList position={funnelConfig.labelPosition || 'right'} fill="#fff" stroke="none" dataKey={funnelConfig.nameKey || 'name'} />
              )}
            </Funnel>
            {showLegend && <Legend />}
          </FunnelChart>
        );
      }

      case 'composed':
        return (
          <ComposedChart data={data} margin={margin}>
            {renderGradients()}
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />}
            {xKey && <XAxis {...xAxisProps} />}
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {(config.areas || []).map((area, i) => (
              <Area 
                key={area.dataKey} 
                type={area.type || 'monotone'} 
                dataKey={area.dataKey}
                fill={area.gradientId ? `url(#${area.gradientId})` : (area.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length])}
                stroke={area.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fillOpacity={area.fillOpacity ?? 0.3} 
                name={area.name} 
              />
            ))}
            {(config.bars || []).map((bar, i) => (
              <Bar 
                key={bar.dataKey} 
                dataKey={bar.dataKey}
                fill={bar.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                name={bar.name} 
                stackId={bar.stackId} 
              />
            ))}
            {(config.lines || []).map((line, i) => (
              <Line 
                key={line.dataKey} 
                type={line.type || 'monotone'} 
                dataKey={line.dataKey}
                stroke={line.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={line.strokeWidth || 2} 
                name={line.name}
                dot={line.dot ?? false}
              />
            ))}
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

export default DynamicChart;
