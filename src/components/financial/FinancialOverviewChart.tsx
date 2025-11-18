import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data - replace with actual data from database
const data = [
  { month: 'Jan', revenue: 45000, fees: 15000 },
  { month: 'Feb', revenue: 52000, fees: 18000 },
  { month: 'Mar', revenue: 48000, fees: 16500 },
  { month: 'Apr', revenue: 61000, fees: 21000 },
  { month: 'May', revenue: 55000, fees: 19000 },
  { month: 'Jun', revenue: 67000, fees: 23500 },
];

export function FinancialOverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis 
          dataKey="month" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(value) => `€${value / 1000}k`}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => `€${value.toLocaleString()}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          name="Total Revenue"
        />
        <Line 
          type="monotone" 
          dataKey="fees" 
          stroke="hsl(var(--chart-2))" 
          strokeWidth={2}
          name="Placement Fees"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
