import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Briefcase, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { CompanyProfile } from "@/components/partner/CompanyProfile";
import { JobManagement } from "@/components/partner/JobManagement";
import { TeamManagement } from "@/components/partner/TeamManagement";
import { ApplicantPipeline } from "@/components/partner/ApplicantPipeline";
import { PartnerAnalytics } from "@/components/partner/PartnerAnalytics";
import { TargetCompanies } from "@/components/partner/TargetCompanies";
import { CompanyPosts } from "@/components/partner/CompanyPosts";
import { CompanyBranding } from "@/components/partner/CompanyBranding";
import { CompanyAnalyticsChart } from "@/components/partner/CompanyAnalyticsChart";
import { CompanyWall } from "@/components/partner/CompanyWall";
import { CompanyFollowers } from "@/components/partner/CompanyFollowers";
import { CompanyBrandingEditor } from "@/components/partner/CompanyBrandingEditor";
import { useNavigate } from "react-router-dom";

const PartnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role, companyId, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    activeApplications: 0,
  });
  const [company, setCompany] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect to partner onboarding if no company is set
  useEffect(() => {
    if (!roleLoading && !companyId) {
      navigate('/partner-onboarding');
    }
  }, [roleLoading, companyId, navigate]);

  // Set loadingStats to false immediately if no companyId and roleLoading is complete
  useEffect(() => {
    if (!roleLoading && !companyId) {
      setLoadingStats(false);
    }
  }, [roleLoading, companyId]);

  useEffect(() => {
    if (!companyId || roleLoading) return;

    const fetchCompanyAndStats = async () => {
      try {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        setCompany(companyData);

        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, status')
          .eq('company_id', companyId);

        const activeJobs = jobsData?.filter(j => j.status === 'published').length || 0;

        const { data: applicationsData } = await supabase
          .from('applications')
          .select('id, status, job_id')
          .in('job_id', jobsData?.map(j => j.id) || []);

        const activeApplications = applicationsData?.filter(a => a.status === 'active').length || 0;

        setStats({
          totalJobs: jobsData?.length || 0,
          activeJobs,
          totalApplications: applicationsData?.length || 0,
          activeApplications,
        });
      } catch (error) {
        console.error('[PartnerDashboard] Error:', error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoadingStats(false);
      }
    };

    fetchCompanyAndStats();
  }, [companyId]);

  if (roleLoading || loadingStats) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!companyId) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Company Setup Required</CardTitle>
              <CardDescription>
                You need to be associated with a company to access the partner dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Please contact an administrator to set up your company profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const statsCards = [
    {
      title: "Total Jobs",
      value: stats.totalJobs,
      icon: Briefcase,
      description: `${stats.activeJobs} active`,
    },
    {
      title: "Applications",
      value: stats.totalApplications,
      icon: Users,
      description: `${stats.activeApplications} active`,
    },
    {
      title: "Engagement Rate",
      value: stats.totalJobs > 0 
        ? `${Math.round((stats.totalApplications / stats.totalJobs) * 10) / 10}`
        : "0",
      icon: TrendingUp,
      description: "avg per job",
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            <h1 className="text-4xl font-black uppercase tracking-tight">
              {company?.name || "Partner Dashboard"}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Manage your company profile, job postings, and candidate pipeline
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-2 border-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold uppercase">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 lg:grid-cols-9">
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="applicants">Applicants</TabsTrigger>
            <TabsTrigger value="wall">Wall</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="company">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <JobManagement companyId={companyId} />
          </TabsContent>

          <TabsContent value="applicants" className="space-y-4">
            <ApplicantPipeline companyId={companyId} />
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            <CompanyPosts companyId={companyId} />
          </TabsContent>

          <TabsContent value="targets" className="space-y-4">
            <TargetCompanies companyId={companyId} />
          </TabsContent>

          <TabsContent value="wall" className="space-y-4">
            <CompanyWall companyId={companyId} canCreate={true} />
          </TabsContent>

          <TabsContent value="followers" className="space-y-4">
            <CompanyFollowers companyId={companyId} />
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <TeamManagement companyId={companyId} canManage={role === 'company_admin'} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <CompanyAnalyticsChart companyId={companyId} />
            <PartnerAnalytics companyId={companyId} />
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <CompanyBrandingEditor companyId={companyId} canEdit={role === 'company_admin'} />
          </TabsContent>

          <TabsContent value="company" className="space-y-4">
            <CompanyProfile companyId={companyId} canEdit={role === 'company_admin'} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PartnerDashboard;
