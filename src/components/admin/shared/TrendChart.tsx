import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicChart } from "@/components/charts/DynamicChart";

interface ChartLine {
  dataKey: string;
  name: string;
  color: string;
  type?: 'line' | 'area' | 'bar';
}

interface TrendChartProps {
  data: Array<Record<string, any>>;
  lines: ChartLine[];
  xAxisKey: string;
  title: string;
  description?: string;
  height?: number;
  chartType?: 'line' | 'mixed';
}

export const TrendChart = ({ 
  data, 
  lines, 
  xAxisKey, 
  title, 
  description,
  height = 400,
}: TrendChartProps) => {
  const chartLines = lines.map(line => ({
    dataKey: line.dataKey,
    stroke: line.color,
    name: line.name,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <DynamicChart
          type="line"
          data={data}
          height={height}
          config={{
            xAxisKey,
            lines: chartLines,
            legend: true,
          }}
        />
      </CardContent>
    </Card>
  );
};
