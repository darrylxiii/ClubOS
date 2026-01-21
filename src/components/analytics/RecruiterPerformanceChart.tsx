import { DynamicChart } from '@/components/charts/DynamicChart';
import { RecruiterPerformance } from "@/hooks/useAnalytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RecruiterPerformanceChartProps {
  data: RecruiterPerformance[];
  isLoading: boolean;
}

export function RecruiterPerformanceChart({ data, isLoading }: RecruiterPerformanceChartProps) {
  if (isLoading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">No recruiter performance data available</div>
      </div>
    );
  }

  // Get latest month data for each recruiter
  const latestMonth = data[0]?.month;
  const recruiterData = data
    .filter(d => d.month === latestMonth)
    .map(r => ({
      name: r.recruiter_name || 'Unknown',
      initials: (r.recruiter_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase(),
      reviews: r.total_reviews || 0,
      interviews: r.interviews_scheduled || 0,
      hires: r.hires_made || 0,
      jobs: r.jobs_managed || 0,
      avgResponseDays: Math.round(r.avg_response_time_days || 0),
      conversionRate: r.total_reviews > 0 ? Math.round((r.hires_made / r.total_reviews) * 100) : 0,
    }))
    .sort((a, b) => b.hires - a.hires);

  return (
    <div className="space-y-8">
      {/* Performance Chart */}
      <div>
        <h4 className="text-sm font-medium mb-4">Recruiter Activity Overview</h4>
        <DynamicChart
          type="bar"
          data={recruiterData}
          height={300}
          config={{
            bars: [
              { dataKey: 'reviews', fill: 'hsl(var(--chart-1))', name: 'Reviews' },
              { dataKey: 'interviews', fill: 'hsl(var(--chart-2))', name: 'Interviews' },
              { dataKey: 'hires', fill: 'hsl(var(--chart-3))', name: 'Hires' },
            ],
            xAxisDataKey: 'name',
            showGrid: true,
            showTooltip: true,
            showLegend: true,
          }}
        />
      </div>

      {/* Detailed Table */}
      <div>
        <h4 className="text-sm font-medium mb-4">Detailed Performance Metrics</h4>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recruiter</TableHead>
                <TableHead className="text-right">Total Reviews</TableHead>
                <TableHead className="text-right">Interviews</TableHead>
                <TableHead className="text-right">Hires</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
                <TableHead className="text-right">Avg Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recruiterData.map((recruiter) => (
                <TableRow key={recruiter.name}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {recruiter.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{recruiter.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{recruiter.reviews}</TableCell>
                  <TableCell className="text-right">{recruiter.interviews}</TableCell>
                  <TableCell className="text-right font-medium">{recruiter.hires}</TableCell>
                  <TableCell className="text-right">{recruiter.jobs}</TableCell>
                  <TableCell className="text-right">
                    <span className={recruiter.conversionRate >= 50 ? 'text-green-600' : ''}>
                      {recruiter.conversionRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {recruiter.avgResponseDays}d
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}