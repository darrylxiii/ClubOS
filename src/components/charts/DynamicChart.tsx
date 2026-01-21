/**
 * DynamicChart - A wrapper component that dynamically loads recharts
 * This is the recommended way to use charts to avoid OOM build errors.
 */
import { useState, useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'radar' | 'composed';

interface LineConfig {
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  name?: string;
  type?: 'monotone' | 'linear' | 'step';
  yAxisId?: string;
}

interface BarConfig {
  dataKey: string;
  fill?: string;
  name?: string;
  stackId?: string;
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
}

interface AreaConfig {
  dataKey: string;
  fill?: string;
  stroke?: string;
  name?: string;
  fillOpacity?: number;
}

interface RadarConfig {
  dataKey: string;
  name?: string;
  stroke?: string;
  fill?: string;
  fillOpacity?: number;
}

interface ChartConfig {
  lines?: LineConfig[];
  bars?: BarConfig[];
  pie?: PieConfig;
  pies?: PieConfig[];
  areas?: AreaConfig[];
  radars?: RadarConfig[];
  xAxisKey?: string;
  xAxisDataKey?: string;
  angleAxisKey?: string;
  yAxisFormatter?: (value: number) => string;
  yAxisDomain?: [number, number];
  showGrid?: boolean;
  showTooltip?: boolean;
  legend?: boolean;
  tooltip?: {
    formatter?: (value: any, name?: string) => any;
    labelFormatter?: (label: string) => string;
  };
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
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
    ResponsiveContainer, LineChart, BarChart, PieChart, AreaChart, ComposedChart, RadarChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, Pie, Area, Cell,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  } = recharts;

  const xKey = config.xAxisKey || config.xAxisDataKey;
  const showLegend = config.legend ?? false;
  const showGrid = config.showGrid ?? true;
  const showTooltip = config.showTooltip ?? true;
  const margin = config.margin ?? { top: 5, right: 20, left: 10, bottom: 5 };

  const tooltipProps: any = {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
    },
  };
  if (config.tooltip?.formatter) tooltipProps.formatter = config.tooltip.formatter;
  if (config.tooltip?.labelFormatter) tooltipProps.labelFormatter = config.tooltip.labelFormatter;

  const renderChart = (): ReactNode => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            {xKey && <XAxis dataKey={xKey} className="text-xs" tick={{ fontSize: 11 }} />}
            <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={config.yAxisFormatter} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {(config.lines || []).map((line, i) => (
              <Line key={line.dataKey} type={line.type || 'monotone'} dataKey={line.dataKey}
                stroke={line.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={line.strokeWidth || 2} name={line.name} />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            {xKey && <XAxis dataKey={xKey} className="text-xs" tick={{ fontSize: 11 }} />}
            <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={config.yAxisFormatter} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {(config.bars || []).map((bar, i) => (
              <Bar key={bar.dataKey} dataKey={bar.dataKey}
                fill={bar.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                name={bar.name} stackId={bar.stackId} />
            ))}
          </BarChart>
        );

      case 'pie': {
        const pieConfig = config.pies?.[0] || config.pie || { dataKey: 'value' };
        const colors = pieConfig.colors || DEFAULT_COLORS;
        return (
          <PieChart margin={margin}>
            <Pie data={data} cx={pieConfig.cx || '50%'} cy={pieConfig.cy || '50%'}
              innerRadius={pieConfig.innerRadius} outerRadius={pieConfig.outerRadius || 80}
              paddingAngle={pieConfig.paddingAngle || 0} dataKey={pieConfig.dataKey}
              nameKey={pieConfig.nameKey} onClick={pieConfig.onClick}>
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
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            {xKey && <XAxis dataKey={xKey} className="text-xs" tick={{ fontSize: 11 }} />}
            <YAxis className="text-xs" tick={{ fontSize: 11 }} domain={config.yAxisDomain} tickFormatter={config.yAxisFormatter} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {(config.areas || []).map((area, i) => (
              <Area key={area.dataKey} type="monotone" dataKey={area.dataKey}
                fill={area.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                stroke={area.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fillOpacity={area.fillOpacity ?? 0.3} name={area.name} />
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
              <Radar key={radar.dataKey} name={radar.name} dataKey={radar.dataKey}
                stroke={radar.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fill={radar.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fillOpacity={radar.fillOpacity ?? 0.2} />
            ))}
            {showLegend && <Legend />}
            {showTooltip && <Tooltip {...tooltipProps} />}
          </RadarChart>
        );

      case 'composed':
        return (
          <ComposedChart data={data} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            {xKey && <XAxis dataKey={xKey} className="text-xs" tick={{ fontSize: 11 }} />}
            <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={config.yAxisFormatter} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {(config.bars || []).map((bar, i) => (
              <Bar key={bar.dataKey} dataKey={bar.dataKey}
                fill={bar.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                name={bar.name} stackId={bar.stackId} />
            ))}
            {(config.lines || []).map((line, i) => (
              <Line key={line.dataKey} type={line.type || 'monotone'} dataKey={line.dataKey}
                stroke={line.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={line.strokeWidth || 2} name={line.name} />
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
