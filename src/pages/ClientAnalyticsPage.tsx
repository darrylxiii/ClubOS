import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Clock, DollarSign, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const ClientAnalyticsPage = () => {
  const { user } = useAuth();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['client-projects-analytics', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('marketplace_projects')
        .select('id, status, budget_min, budget_max')
        .eq('client_id', user?.id);
      return (data || []) as Array<{ id: string; status: string; budget_min: number; budget_max: number }>;
    },
    enabled: !!user?.id,
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['client-contracts-analytics', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('*')
        .eq('client_id', user?.id ?? '');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: proposals } = useQuery({
    queryKey: ['client-proposals-analytics', user?.id],
    queryFn: async () => {
      const projectIds = projects?.map(p => p.id) || [];
      if (projectIds.length === 0) return [];
      
      const { data } = await supabase
        .from('project_proposals')
        .select('*')
        .in('project_id', projectIds);
      return data || [];
    },
    enabled: !!projects && projects.length > 0,
  });

  // Calculate metrics
  const totalProjects = projects?.length || 0;
  const openProjects = projects?.filter(p => p.status === 'open').length || 0;
  const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;
  const inProgressProjects = projects?.filter(p => p.status === 'active').length || 0;

  const totalSpent = contracts?.reduce((sum, c) => sum + (c.estimated_total || 0), 0) || 0;
  const avgProjectCost = completedProjects > 0 ? totalSpent / completedProjects : 0;

  const totalProposalsReceived = proposals?.length || 0;
  const avgProposalsPerProject = totalProjects > 0 ? Math.round(totalProposalsReceived / totalProjects) : 0;

  // Project status distribution
  const statusData = [
    { name: 'Open', value: openProjects, color: 'hsl(var(--primary))' },
    { name: 'In Progress', value: inProgressProjects, color: 'hsl(var(--accent))' },
    { name: 'Completed', value: completedProjects, color: 'hsl(142, 76%, 36%)' },
  ].filter(d => d.value > 0);

  // Monthly spending (mock data - would come from real aggregation)
  const monthlySpending = [
    { month: 'Jan', amount: 2500 },
    { month: 'Feb', amount: 4200 },
    { month: 'Mar', amount: 3100 },
    { month: 'Apr', amount: 5800 },
    { month: 'May', amount: 4500 },
    { month: 'Jun', amount: 6200 },
  ];

  const isLoading = projectsLoading || contractsLoading;

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
        <h1 className="text-2xl font-bold">Client Analytics</h1>
        <p className="text-muted-foreground">Monitor your hiring and project metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">{openProjects} currently open</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{completedProjects} projects completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">€{avgProjectCost.toLocaleString()} avg per project</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Proposals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProposalsPerProject}</div>
            <p className="text-xs text-muted-foreground">per project posted</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
            <CardDescription>Current project breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No projects yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip formatter={(value) => [`€${value}`, 'Spent']} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg. time to first proposal</span>
              <span className="font-medium">2.5 hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg. time to hire</span>
              <span className="font-medium">4.2 days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg. project duration</span>
              <span className="font-medium">12.5 days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Optimization Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {avgProposalsPerProject < 5 && (
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Add more project details to attract more proposals</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Respond to proposals within 24h for best talent retention</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use milestone payments to reduce project risk</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Leave reviews to build your client reputation</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientAnalyticsPage;
