import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { CATEGORY_LABELS } from '@/hooks/useInventoryCategories';
import type { InventoryStats } from '@/hooks/useInventoryStats';

interface CategoryPieChartProps {
  stats: InventoryStats;
  onCategoryClick?: (category: string) => void;
}

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(221, 83%, 53%)', // blue
  'hsl(142, 76%, 36%)', // green
  'hsl(45, 93%, 47%)',  // yellow
  'hsl(0, 84%, 60%)',   // red
  'hsl(262, 83%, 58%)', // purple
];

const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

export function CategoryPieChart({ stats, onCategoryClick }: CategoryPieChartProps) {
  const [viewMode, setViewMode] = useState<'count' | 'value'>('count');
  const [activeIndex, setActiveIndex] = useState<number | undefined>();

  const countData = Object.entries(stats.assetsByCategory).map(([key, count]) => ({
    name: CATEGORY_LABELS[key] || key,
    value: count,
    key,
  }));

  const valueData = Object.entries(stats.valueByCategory).map(([key, values]) => ({
    name: CATEGORY_LABELS[key] || key,
    value: values.purchase,
    bookValue: values.book,
    key,
  }));

  const data = viewMode === 'count' ? countData : valueData;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 14}
          outerRadius={outerRadius + 18}
          fill={fill}
        />
        <text x={cx} y={cy - 10} textAnchor="middle" className="fill-foreground text-sm font-medium">
          {payload.name}
        </text>
        <text x={cx} y={cy + 15} textAnchor="middle" className="fill-muted-foreground text-xs">
          {viewMode === 'count' ? `${payload.value} assets` : formatCurrency(payload.value)}
        </text>
        <text x={cx} y={cy + 32} textAnchor="middle" className="fill-muted-foreground text-xs">
          ({(percent * 100).toFixed(1)}%)
        </text>
      </g>
    );
  };

  const handleClick = (data: any) => {
    if (onCategoryClick && data?.key) {
      onCategoryClick(data.key);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Assets by Category</CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'count' | 'value')}>
            <TabsList className="h-8">
              <TabsTrigger value="count" className="text-xs px-3">Count</TabsTrigger>
              <TabsTrigger value="value" className="text-xs px-3">Value</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No assets to display
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                onClick={(_, index) => handleClick(data[index])}
                style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => viewMode === 'count' ? `${value} assets` : formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item, index) => (
            <button
              key={item.key}
              onClick={() => onCategoryClick?.(item.key)}
              className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-2 py-1 transition-colors"
            >
              <div 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate flex-1 text-left">{item.name}</span>
              <span className="text-muted-foreground">
                {viewMode === 'count' ? item.value : formatCurrency(item.value)}
              </span>
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t flex justify-between text-sm">
          <span className="font-medium">Total</span>
          <span className="font-medium">
            {viewMode === 'count' ? `${total} assets` : formatCurrency(total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
