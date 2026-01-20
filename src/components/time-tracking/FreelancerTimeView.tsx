import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, Clock, Briefcase, TrendingUp } from "lucide-react";
import { formatDuration, secondsToHours } from "@/hooks/useTimeTracking";

export function FreelancerTimeView() {
  const { user } = useAuth();

  // Fetch freelancer's contract-based time data
  const { data: contractStats } = useQuery({
    queryKey: ['freelancer-time-contracts', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get time entries with contract info
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          duration_seconds,
          is_billable,
          hourly_rate,
          contract_id,
          project:tracking_projects(name, color, hourly_rate)
        `)
        .eq('user_id', user.id)
        .not('end_time', 'is', null)
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Calculate stats
      const totalSeconds = entries?.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) || 0;
      const billableSeconds = entries?.filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration_seconds || 0), 0) || 0;
      
      // Calculate earnings (using project rate or entry rate)
      const totalEarnings = entries?.reduce((sum, e) => {
        const rate = e.hourly_rate || (e.project as any)?.hourly_rate || 0;
        const hours = (e.duration_seconds || 0) / 3600;
        return sum + (e.is_billable ? hours * rate : 0);
      }, 0) || 0;

      // Group by project
      const projectBreakdown = entries?.reduce((acc, e) => {
        const projectName = (e.project as any)?.name || 'No Project';
        const projectColor = (e.project as any)?.color || '#6b7280';
        if (!acc[projectName]) {
          acc[projectName] = { seconds: 0, color: projectColor };
        }
        acc[projectName].seconds += e.duration_seconds || 0;
        return acc;
      }, {} as Record<string, { seconds: number; color: string }>);

      return {
        totalHours: secondsToHours(totalSeconds),
        billableHours: secondsToHours(billableSeconds),
        totalEarnings,
        projectBreakdown: Object.entries(projectBreakdown || {}).map(([name, data]) => ({
          name,
          hours: secondsToHours(data.seconds),
          color: data.color,
        })).sort((a, b) => b.hours - a.hours),
      };
    },
    enabled: !!user?.id,
  });

  // Fetch active contracts
  const { data: activeContracts } = useQuery({
    queryKey: ['freelancer-active-contracts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('project_contracts')
        .select('id, project_title, hourly_rate, total_hours_budget, status')
        .eq('freelancer_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hours This Month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(contractStats?.totalHours || 0).toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Billable Hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(contractStats?.billableHours || 0).toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pending Earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              €{(contractStats?.totalEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Active Contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeContracts?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Project Breakdown */}
      {contractStats?.projectBreakdown && contractStats.projectBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time by Project</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contractStats.projectBreakdown.slice(0, 5).map((project) => (
              <div key={project.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-sm font-medium">{project.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{project.hours.toFixed(1)}h</span>
                </div>
                <Progress 
                  value={(project.hours / (contractStats.totalHours || 1)) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Contracts */}
      {activeContracts && activeContracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Contracts</CardTitle>
            <CardDescription>Track time against your contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeContracts.map((contract: any) => (
                <div 
                  key={contract.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{contract.project_title}</p>
                    <p className="text-sm text-muted-foreground">
                      €{contract.hourly_rate}/hr • {contract.total_hours_budget || '∞'}h budget
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}