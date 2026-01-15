import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";

export function RevenueCharts() {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue-trend'],
    queryFn: async () => {
      // Get realized placement revenue
      const { data: placementData } = await supabase
        .from('placement_fees')
        .select('hired_date, fee_amount')
        .eq('status', 'paid')
        .gte('hired_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('hired_date');

      // Get projected revenue
      const { data: projectedData } = await (supabase as any)
        .from('projected_earnings')
        .select('created_at, projected_fee_amount, confidence_score');

      // Aggregate by month
      const monthlyData = new Map();
      
      placementData?.forEach(item => {
        const month = new Date(item.hired_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { month, realized: 0, projected: 0 });
        }
        const current = monthlyData.get(month);
        current.realized += item.fee_amount;
      });

      projectedData?.forEach((item: { created_at: string; projected_fee_amount: number; confidence_score: number | null }) => {
        const month = new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { month, realized: 0, projected: 0 });
        }
        const current = monthlyData.get(month);
        current.projected += item.projected_fee_amount * (item.confidence_score || 0.5);
      });

      return Array.from(monthlyData.values()).slice(-12);
    },
  });

  const { data: pipelineVelocity, isLoading: velocityLoading } = useQuery({
    queryKey: ['pipeline-velocity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('created_at, is_lost')
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      // Aggregate by month
      const monthlyData = new Map();
      
      data?.forEach(job => {
        const month = new Date(job.created_at ?? new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { month, entered: 0, won: 0, lost: 0 });
        }
        const current = monthlyData.get(month);
        current.entered += 1;
        if (job.is_lost) current.lost += 1;
      });

      return Array.from(monthlyData.values()).slice(-6);
    },
  });

  if (isLoading || velocityLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Revenue Trend */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`€${value.toLocaleString()}`, '']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="realized" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Realized Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="projected" 
              stroke="hsl(var(--success))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Projected Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Pipeline Velocity */}
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Pipeline Velocity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pipelineVelocity}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="entered" fill="hsl(var(--primary))" name="Deals Entered" />
            <Bar dataKey="won" fill="hsl(var(--success))" name="Deals Won" />
            <Bar dataKey="lost" fill="hsl(var(--destructive))" name="Deals Lost" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
