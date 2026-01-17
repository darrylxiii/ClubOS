import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Eye, FileText, DollarSign, Clock, Star } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";

const FreelancerAnalyticsPage = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['freelance-profile-analytics', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('freelance_profiles')
        .select('id, connects_balance, avg_response_time_hours, job_success_score, video_intro_url, is_verified')
        .eq('user_id', user?.id)
        .maybeSingle();
      return data as { 
        id: string; 
        connects_balance: number; 
        avg_response_time_hours: number; 
        job_success_score: number; 
        video_intro_url: string | null; 
        is_verified: boolean;
      } | null;
    },
    enabled: !!user?.id,
  });

  const { data: proposals } = useQuery({
    queryKey: ['freelancer-proposals', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_proposals')
        .select('*, marketplace_projects(title, budget_max)')
        .eq('freelancer_id', user?.id ?? '');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: contracts } = useQuery({
    queryKey: ['freelancer-contracts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('*')
        .eq('freelancer_id', user?.id ?? '');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['freelancer-reviews', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_reviews')
        .select('*')
        .eq('reviewee_id', user?.id ?? '');
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate metrics
  const totalProposals = proposals?.length || 0;
  const acceptedProposals = proposals?.filter(p => p.status === 'accepted').length || 0;
  const proposalSuccessRate = totalProposals > 0 ? Math.round((acceptedProposals / totalProposals) * 100) : 0;

  const completedContracts = contracts?.filter(c => c.status === 'completed').length || 0;
  const totalEarnings = contracts?.reduce((sum, c) => sum + (c.estimated_total || 0), 0) || 0;

  const avgRating = reviews?.length 
    ? (reviews.reduce((sum, r) => sum + (r.expertise_rating || 0), 0) / reviews.length).toFixed(1)
    : 'N/A';

  // Generate mock trend data (would come from analytics table in production)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    return {
      date: format(date, 'MMM dd'),
      views: Math.floor(Math.random() * 50) + 10,
      proposals: Math.floor(Math.random() * 3),
    };
  });

  const categoryPerformance = [
    { category: 'Web Dev', success: 75 },
    { category: 'Mobile', success: 60 },
    { category: 'Design', success: 45 },
    { category: 'Writing', success: 80 },
  ];

  const isLoading = !profile && !proposals && !contracts;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Freelancer Analytics</h1>
        <p className="text-muted-foreground">Track your performance and growth</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Projects worked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Proposal Success</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposalSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">{acceptedProposals} of {totalProposals} accepted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{completedContracts} projects completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating}</div>
            <p className="text-xs text-muted-foreground">{reviews?.length || 0} reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Views & Proposals</CardTitle>
            <CardDescription>Last 30 days activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30Days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="proposals" stroke="hsl(var(--accent))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate by Category</CardTitle>
            <CardDescription>Proposal acceptance rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="success" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Time & Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Response Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg. response time</span>
              <span className="font-medium">{profile?.avg_response_time_hours ? `${profile.avg_response_time_hours}h` : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Connects remaining</span>
              <span className="font-medium">{profile?.connects_balance || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completion rate</span>
              <span className="font-medium">{profile?.job_success_score || 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Growth Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {proposalSuccessRate < 30 && (
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Personalize proposals more — mention specific project details</span>
                </li>
              )}
              {!profile?.video_intro_url && (
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Add a video introduction to increase profile views by 40%</span>
                </li>
              )}
              {(contracts?.length || 0) < 5 && (
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Complete your portfolio to improve search visibility</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Respond within 1 hour to increase win rate by 25%</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FreelancerAnalyticsPage;
