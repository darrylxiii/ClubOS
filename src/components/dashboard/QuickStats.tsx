import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, TrendingUp, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const QuickStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['quick-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [applications, jobs] = await Promise.all([
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      return {
        applications: applications.count || 0,
        openJobs: jobs.count || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.applications || 0}</div>
          <p className="text-xs text-muted-foreground">In progress</p>
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.openJobs || 0}</div>
          <p className="text-xs text-muted-foreground">Available now</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profile Strength</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">85%</div>
          <p className="text-xs text-muted-foreground">Complete</p>
        </CardContent>
      </Card>
    </div>
  );
};
