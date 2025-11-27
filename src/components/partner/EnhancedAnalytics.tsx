import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Calendar, Download, TrendingUp, Users, Briefcase, CheckCircle } from "lucide-react";
import { format, subDays } from "date-fns";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const EnhancedAnalytics = () => {
  const { companyId } = useRole();
  const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 30), end: new Date() });

  const { data: snapshots } = useQuery({
    queryKey: ['analytics-snapshots', companyId, dateRange],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('partner_analytics_snapshots')
        .select('*')
        .eq('company_id', companyId)
        .gte('snapshot_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('snapshot_date', format(dateRange.end, 'yyyy-MM-dd'))
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const latestSnapshot = snapshots?.[snapshots.length - 1];

  const chartData = snapshots?.map(s => ({
    date: format(new Date(s.snapshot_date), 'MMM d'),
    applications: s.total_applications,
    hires: s.hires_made
  })) || [];

  const handleExport = () => {
    const csv = [
      ['Date', 'Applications', 'Active Candidates', 'Interviews', 'Offers', 'Hires', 'Avg Time to Hire', 'Offer Acceptance Rate'],
      ...(snapshots || []).map(s => [
        s.snapshot_date,
        s.total_applications,
        s.active_candidates,
        s.interviews_scheduled,
        s.offers_sent,
        s.hires_made,
        s.avg_time_to_hire_days || '',
        s.offer_acceptance_rate || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Enhanced Analytics</h2>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSnapshot?.total_applications || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSnapshot?.interviews_scheduled || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offers Sent</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSnapshot?.offers_sent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hires Made</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSnapshot?.hires_made || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications & Hires Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="hires" stroke="hsl(var(--secondary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
