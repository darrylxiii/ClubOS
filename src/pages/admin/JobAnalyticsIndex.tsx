import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Briefcase, 
  BarChart3, 
  TrendingUp, 
  Users,
  Clock,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';

export default function JobAnalyticsIndex({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs-for-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          created_at,
          companies (name)
        `)
        .in('status', ['published', 'open', 'active'])
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch application counts for each job
  const { data: applicationCounts } = useQuery({
    queryKey: ['job-application-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('job_id');
      
      if (error) return {};
      
      const counts: Record<string, number> = {};
      (data || []).forEach((app: any) => {
        counts[app.job_id] = (counts[app.job_id] || 0) + 1;
      });
      return counts;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'open':
      case 'active':
        return 'default';
      case 'closed':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const Wrapper = embedded ? ({ children }: { children: React.ReactNode }) => <>{children}</> : AppLayout;

  return (
    <Wrapper>
      <RoleGate allowedRoles={["admin", "strategist"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Per-Job Analytics</h1>
                <p className="text-muted-foreground">
                  View detailed analytics for each job posting
                </p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                </div>
                <p className="text-2xl font-bold">{jobs?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                </div>
                <p className="text-2xl font-bold">
                  {Object.values(applicationCounts || {}).reduce((a, b) => a + b, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Avg. Applications</p>
                </div>
                <p className="text-2xl font-bold">
                  {jobs?.length ? Math.round(
                    Object.values(applicationCounts || {}).reduce((a, b) => a + b, 0) / jobs.length
                  ) : 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">New This Month</p>
                </div>
                <p className="text-2xl font-bold">
                  {jobs?.filter(j => {
                    const created = new Date(j.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && 
                           created.getFullYear() === now.getFullYear();
                  }).length || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Jobs List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Jobs</CardTitle>
              <CardDescription>
                Click on a job to view its detailed analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
              ) : jobs && jobs.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {jobs.map((job: any) => (
                      <div 
                        key={job.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/admin/jobs/${job.id}/analytics`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{job.title}</p>
                            <Badge variant={getStatusColor(job.status)}>
                              {job.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {job.companies?.name || 'No company'}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              {applicationCounts?.[job.id] || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">applications</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <EmptyState
                  icon={Briefcase}
                  title="No Active Jobs"
                  description="Create a job posting to start tracking analytics."
                  action={{
                    label: "Create Job",
                    onClick: () => navigate('/jobs/new')
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </Wrapper>
  );
}
