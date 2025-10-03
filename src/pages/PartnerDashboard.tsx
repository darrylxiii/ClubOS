import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Users, TrendingUp, Building2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PartnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    activeConversations: 0,
    teamMembers: 0
  });

  useEffect(() => {
    fetchCompanyData();
    fetchStats();
  }, [user]);

  const fetchCompanyData = async () => {
    if (!user) return;

    try {
      // Get user's company membership
      const { data: membership, error: memberError } = await supabase
        .from('company_members')
        .select('company_id, role, companies(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (memberError) throw memberError;

      if (membership) {
        setCompanyData(membership);
      }
    } catch (error: any) {
      console.error('Error fetching company:', error);
      toast.error("Failed to load company data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get company from membership
      const { data: membership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!membership) return;

      // Get jobs count
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', membership.company_id)
        .eq('status', 'published');

      // Get applications count
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', membership.company_id);

      const jobIds = jobs?.map(j => j.id) || [];
      
      const { count: appsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobIds);

      // Get conversations count
      const { data: applications } = await supabase
        .from('applications')
        .select('id')
        .in('job_id', jobIds);

      const appIds = applications?.map(a => a.id) || [];

      const { count: convsCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .in('application_id', appIds);

      // Get team members count
      const { count: membersCount } = await supabase
        .from('company_members')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', membership.company_id)
        .eq('is_active', true);

      setStats({
        activeJobs: jobsCount || 0,
        totalApplications: appsCount || 0,
        activeConversations: convsCount || 0,
        teamMembers: membersCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    {
      title: "Active Jobs",
      value: stats.activeJobs,
      icon: Briefcase,
      trend: "Published positions"
    },
    {
      title: "Total Applications",
      value: stats.totalApplications,
      icon: TrendingUp,
      trend: "Candidates applied"
    },
    {
      title: "Active Conversations",
      value: stats.activeConversations,
      icon: Users,
      trend: "Ongoing dialogues"
    },
    {
      title: "Team Members",
      value: stats.teamMembers,
      icon: Building2,
      trend: "Company access"
    }
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!companyData) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12">
          <Card className="border-2 border-foreground">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-black uppercase mb-2">No Company Access</h2>
              <p className="text-muted-foreground mb-6">
                You need to be added to a company to access the partner dashboard.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Candidate Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <div className="space-y-4 mb-12">
          <p className="text-caps text-muted-foreground">Partner Dashboard</p>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
            {companyData.companies.name}
          </h1>
          <p className="text-lg text-muted-foreground">
            {companyData.role.toUpperCase()} · Manage jobs, candidates, and team
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="border-2 border-foreground p-8 hover:bg-foreground hover:text-background transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-caps">{stat.title}</p>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-5xl font-black mb-2">{stat.value}</div>
                <p className="text-sm font-bold">{stat.trend}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="border-2 border-foreground">
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="company">Company Profile</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <Card className="border-2 border-foreground">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-black uppercase">
                    Job Postings
                  </CardTitle>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Job
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Job management interface coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="text-2xl font-black uppercase">
                  Candidate Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Applicant pipeline interface coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="text-2xl font-black uppercase">
                  Company Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-bold uppercase text-muted-foreground">
                    Company Name
                  </label>
                  <p className="text-lg">{companyData.companies.name}</p>
                </div>
                {companyData.companies.tagline && (
                  <div>
                    <label className="text-sm font-bold uppercase text-muted-foreground">
                      Tagline
                    </label>
                    <p className="text-lg">{companyData.companies.tagline}</p>
                  </div>
                )}
                <p className="text-muted-foreground text-sm">
                  Full company management interface coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card className="border-2 border-foreground">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-black uppercase">
                    Team Management
                  </CardTitle>
                  {(companyData.role === 'owner' || companyData.role === 'admin') && (
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Invite Member
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Team management interface coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PartnerDashboard;
