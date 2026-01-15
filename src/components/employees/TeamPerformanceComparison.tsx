import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Trophy, TrendingUp, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { EmployeeProfile } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";

interface TeamPerformanceComparisonProps {
  directReports: EmployeeProfile[];
  performanceData: {
    employeeId: string;
    name: string;
    avatar?: string;
    revenue: number;
    placements: number;
    trend: number[];
  }[];
  isLoading?: boolean;
}

export function TeamPerformanceComparison({ 
  directReports, 
  performanceData,
  isLoading 
}: TeamPerformanceComparisonProps) {
  const sortedByRevenue = [...performanceData].sort((a, b) => b.revenue - a.revenue);
  const topPerformers = sortedByRevenue.slice(0, 3);

  const chartData = performanceData.map(p => ({
    name: p.name.split(' ')[0], // First name only
    revenue: p.revenue,
    placements: p.placements,
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Team Performance Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Performers Podium */}
        <div className="flex items-end justify-center gap-4 py-4">
          {topPerformers.length >= 2 && (
            <PerformerPodium performer={topPerformers[1]} position={2} />
          )}
          {topPerformers.length >= 1 && (
            <PerformerPodium performer={topPerformers[0]} position={1} />
          )}
          {topPerformers.length >= 3 && (
            <PerformerPodium performer={topPerformers[2]} position={3} />
          )}
        </div>

        {/* Revenue Bar Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Revenue"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Lines */}
        {performanceData.some(p => p.trend.length > 0) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Trends
            </h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  {performanceData.map((performer, index) => (
                    <Line
                      key={performer.employeeId}
                      type="monotone"
                      data={performer.trend.map((value, i) => ({
                        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
                        value,
                      }))}
                      dataKey="value"
                      stroke={`hsl(${(index * 60) % 360}, 70%, 50%)`}
                      strokeWidth={2}
                      dot={false}
                      name={performer.name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Full Leaderboard</h4>
          <div className="space-y-2">
            {sortedByRevenue.map((performer, index) => (
              <motion.div
                key={performer.employeeId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={performer.avatar} />
                    <AvatarFallback>{performer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{performer.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {performer.placements} placements
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(performer.revenue)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformerPodium({ 
  performer, 
  position 
}: { 
  performer: {
    name: string;
    avatar?: string;
    revenue: number;
    placements: number;
  };
  position: 1 | 2 | 3;
}) {
  const heights = { 1: 'h-24', 2: 'h-20', 3: 'h-16' };
  const colors = { 
    1: 'bg-amber-500/20 border-amber-500/50', 
    2: 'bg-gray-400/20 border-gray-400/50', 
    3: 'bg-amber-700/20 border-amber-700/50' 
  };
  const medalColors = {
    1: 'text-amber-500',
    2: 'text-gray-400',
    3: 'text-amber-700'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className="flex flex-col items-center"
    >
      <Avatar className="h-12 w-12 mb-2 ring-2 ring-primary/50">
        <AvatarImage src={performer.avatar} />
        <AvatarFallback>{performer.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <p className="text-sm font-medium text-center mb-1">{performer.name.split(' ')[0]}</p>
      <p className="text-xs text-muted-foreground mb-2">{formatCurrency(performer.revenue)}</p>
      <div className={`${heights[position]} w-20 ${colors[position]} border rounded-t-lg flex items-center justify-center`}>
        <Medal className={`h-6 w-6 ${medalColors[position]}`} />
      </div>
    </motion.div>
  );
}
