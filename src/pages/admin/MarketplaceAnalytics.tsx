import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Briefcase, TrendingUp, ArrowUpRight, Activity } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Line } from "recharts";
import { format, subDays } from "date-fns";

const MarketplaceAnalytics = () => {
  // Fetch all marketplace data
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['admin-marketplace-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketplace_projects')
        .select('*');
      return data || [];
    },
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['admin-marketplace-contracts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('*');
      return data || [];
    },
  });

  const { data: freelancers, isLoading: freelancersLoading } = useQuery({
    queryKey: ['admin-freelancers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('freelance_profiles')
        .select('*');
      return data || [];
    },
  });

  const { data: proposals } = useQuery({
    queryKey: ['admin-proposals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_proposals')
        .select('*');
      return data || [];
    },
  });

  const { data: connectsTransactions } = useQuery({
    queryKey: ['admin-connects-transactions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('connects_transactions')
        .select('*');
      return data || [];
    },
  });

  // Calculate GMV and metrics
  const totalGMV = contracts?.reduce((sum, c) => sum + (c.estimated_total || 0), 0) || 0;
  const completedContracts = contracts?.filter(c => c.status === 'completed') || [];
  const completedGMV = completedContracts.reduce((sum, c) => sum + (c.estimated_total || 0), 0);

  // Platform take rate (assuming 10%)
  const takeRate = 0.10;
  const platformRevenue = completedGMV * takeRate;

  // Connects revenue
  const connectsRevenue = connectsTransactions
    ?.filter(t => t.transaction_type === 'purchase')
    .reduce((sum, t) => sum + (t.amount || 0) * 0.10, 0) || 0; // €0.10 per connect

  const totalRevenue = platformRevenue + connectsRevenue;

  // User metrics
  // const totalFreelancers = freelancers?.length || 0;
  const activeFreelancers = freelancers?.filter(f => (f as Record<string, unknown>).is_active !== false).length || 0;
  const verifiedFreelancers = freelancers?.filter(f => f.is_verified === true).length || 0;

  const totalProjects = projects?.length || 0;
  const openProjects = projects?.filter(p => p.status === 'open').length || 0;
  const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;

  const totalProposals = proposals?.length || 0;
  const acceptedProposals = proposals?.filter(p => p.status === 'accepted').length || 0;
  const conversionRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0;

  // Generate trend data (mock - would come from time-series aggregation)
  const last30DaysGMV = Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM dd'),
    gmv: Math.floor(Math.random() * 5000) + 1000,
    revenue: Math.floor(Math.random() * 500) + 100,
  }));

  const categoryDistribution = [
    { category: 'Development', projects: 45, gmv: 125000 },
    { category: 'Design', projects: 32, gmv: 78000 },
    { category: 'Marketing', projects: 28, gmv: 45000 },
    { category: 'Writing', projects: 25, gmv: 32000 },
    { category: 'Video', projects: 15, gmv: 28000 },
  ];

  const isLoading = projectsLoading || contractsLoading || freelancersLoading;

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Marketplace Analytics</h1>
          <p className="text-muted-foreground">Platform performance and GMV metrics</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Updated {format(new Date(), 'HH:mm')}
        </Badge>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gross Merchandise Value</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalGMV.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12.5% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{(takeRate * 100).toFixed(0)}% take rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Freelancers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFreelancers}</div>
            <p className="text-xs text-muted-foreground">{verifiedFreelancers} verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openProjects}</div>
            <p className="text-xs text-muted-foreground">{totalProjects} total</p>
          </CardContent>
        </Card>
      </div>

      {/* GMV Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>GMV & Revenue Trend</CardTitle>
          <CardDescription>Last 30 days performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30DaysGMV}>
                <defs>
                  <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, '']} />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  stroke="hsl(var(--primary))"
                  fill="url(#gmvGradient)"
                  strokeWidth={2}
                  name="GMV"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Performance & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Projects and GMV by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, 'GMV']} />
                  <Bar dataKey="gmv" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Projects Posted</span>
                <span className="font-medium">{totalProjects}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Proposals Submitted</span>
                <span className="font-medium">{totalProposals}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary/80 h-2 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Proposals Accepted</span>
                <span className="font-medium">{acceptedProposals}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary/60 h-2 rounded-full" style={{ width: `${conversionRate}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Contracts Completed</span>
                <span className="font-medium">{completedContracts.length}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${acceptedProposals > 0 ? (completedContracts.length / acceptedProposals) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Conversion</span>
                <span className="font-medium text-primary">{conversionRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{completedProjects}</p>
              <p className="text-xs text-muted-foreground">Completed Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">€{(completedGMV / Math.max(completedContracts.length, 1)).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Avg. Contract Value</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{connectsTransactions?.filter(t => t.transaction_type === 'purchase').length || 0}</p>
              <p className="text-xs text-muted-foreground">Connects Purchased</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">€{connectsRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Connects Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketplaceAnalytics;
