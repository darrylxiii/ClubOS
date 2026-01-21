/**
 * DynamicChart - A wrapper component that dynamically loads recharts
 * This is the recommended way to use charts to avoid OOM build errors.
 * 
 * Usage:
 * <DynamicChart
 *   type="line"
 *   data={data}
 *   height={300}
 *   config={{
 *     lines: [{ dataKey: 'value', stroke: 'hsl(var(--primary))' }],
 *     xAxisDataKey: 'date',
 *   }}
 * />
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
}

interface AreaConfig {
  dataKey: string;
  fill?: string;
  stroke?: string;
  name?: string;
}

interface ChartConfig {
  lines?: LineConfig[];
  bars?: BarConfig[];
  pie?: PieConfig;
  areas?: AreaConfig[];
  xAxisDataKey?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
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

// Default colors for pie charts
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
    ResponsiveContainer,
    LineChart,
    BarChart,
    PieChart,
    AreaChart,
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Line,
    Bar,
    Pie,
    Area,
    Cell,
  } = recharts;

  const {
    lines = [],
    bars = [],
    pie,
    areas = [],
    xAxisDataKey,
    showGrid = true,
    showTooltip = true,
    showLegend = false,
    margin = { top: 5, right: 20, left: 10, bottom: 5 },
  } = config;

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
    },
  };

  const renderChart = (): ReactNode => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            {xAxisDataKey && <XAxis dataKey={xAxisDataKey} className="text-xs" tick={{ fontSize: 11 }} />}
            <YAxis className="text-xs" tick={{ fontSize: 11 }} />
            {showTooltip && <Tooltip {...tooltipStyle} />}
            {showLegend && <Legend />}
            {lines.map((line, i) => (
              <Line
                key={line.dataKey}
                type={line.type || 'monotone'}
                dataKey={line.dataKey}
                stroke={line.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={line.strokeWidth || 2}
                name={line.name}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            {xAxisDataKey && <XAxis dataKey={xAxisDataKey} className="text-xs" tick={{ fontSize: 11 }} />}
            <YAxis className="text-xs" tick={{ fontSize: 11 }} />
            {showTooltip && <Tooltip {...tooltipStyle} />}
            {showLegend && <Legend />}
            {bars.map((bar, i) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                fill={bar.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                name={bar.name}
                stackId={bar.stackId}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        const pieConfig = pie || { dataKey: 'value' };
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
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {showTooltip && <Tooltip {...tooltipStyle} />}
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            {xAxisDataKey && <XAxis dataKey={xAxisDataKey} className="text-xs" tick={{ fontSize: 11 }} />}
            <YAxis className="text-xs" tick={{ fontSize: 11 }} />
            {showTooltip && <Tooltip {...tooltipStyle} />}
            {showLegend && <Legend />}
            {areas.map((area, i) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                fill={area.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                stroke={area.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                name={area.name}
              />
            ))}
          </AreaChart>
        );

      case 'composed':
        return (
          <ComposedChart data={data} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            {xAxisDataKey && <XAxis dataKey={xAxisDataKey} className="text-xs" tick={{ fontSize: 11 }} />}
            <YAxis className="text-xs" tick={{ fontSize: 11 }} />
            {showTooltip && <Tooltip {...tooltipStyle} />}
            {showLegend && <Legend />}
            {bars.map((bar, i) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                fill={bar.fill || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                name={bar.name}
              />
            ))}
            {lines.map((line, i) => (
              <Line
                key={line.dataKey}
                type={line.type || 'monotone'}
                dataKey={line.dataKey}
                stroke={line.stroke || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={line.strokeWidth || 2}
                name={line.name}
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
