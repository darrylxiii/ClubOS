import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicChart } from '@/components/charts/DynamicChart';
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

  const handleClick = (clickData: any) => {
    if (onCategoryClick && clickData?.key) {
      onCategoryClick(clickData.key);
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
          <DynamicChart
            type="pie"
            data={data}
            height={300}
            config={{
              pies: [{
                dataKey: 'value',
                nameKey: 'name',
                cx: '50%',
                cy: '50%',
                innerRadius: 60,
                outerRadius: 90,
                colors: COLORS,
                onClick: (_, index) => handleClick(data[index]),
              }],
              tooltip: {
                formatter: (value: number) => viewMode === 'count' ? `${value} assets` : formatCurrency(value),
              },
            }}
          />
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
