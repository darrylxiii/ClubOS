import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase, 
  Users, 
  TrendingUp, 
  Calendar,
  MessageSquare,
  FileText,
  PlusCircle,
  Eye,
  BarChart3,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

export const PartnerHome = () => {
  const { user } = useAuth();
  const { companyId } = useUserRole();
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    totalCandidates: 0,
    interviews: 0,
    followers: 0,
    profileViews: 0,
    jobViews: 0,
    postViews: 0,
    postEngagements: 0,
    offerAcceptance: 85,
    avgTimeToHire: 28
  });
  const [pipelineData, setPipelineData] = useState({
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchPartnerStats();
    }
  }, [companyId]);

  const fetchPartnerStats = async () => {
    if (!companyId) return;

    try {
      const [jobsRes, followersRes, analyticsRes, applicationsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'published'),
        supabase
          .from('company_followers')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('company_analytics')
          .select('*')
          .eq('company_id', companyId)
          .order('date', { ascending: false })
          .limit(30),
        supabase
          .from('applications')
          .select('*, jobs!inner(company_id)')
          .eq('jobs.company_id', companyId)
      ]);

      // Aggregate analytics
      let totalProfileViews = 0;
      let totalJobViews = 0;
      let totalPostViews = 0;
      let totalPostEngagements = 0;

      if (analyticsRes.data) {
        analyticsRes.data.forEach(day => {
          totalProfileViews += day.profile_views || 0;
          totalJobViews += day.job_views || 0;
          totalPostViews += day.post_views || 0;
          totalPostEngagements += day.post_engagements || 0;
        });
      }

      // Calculate pipeline distribution
      const pipeline = {
        applied: 0,
        screening: 0,
        interview: 0,
        offer: 0,
        hired: 0
      };

      if (applicationsRes.data) {
        applicationsRes.data.forEach(app => {
          const stage = app.stages?.[app.current_stage_index]?.name?.toLowerCase() || '';
          if (stage.includes('applied')) pipeline.applied++;
          else if (stage.includes('screen')) pipeline.screening++;
          else if (stage.includes('interview')) pipeline.interview++;
          else if (stage.includes('offer')) pipeline.offer++;
          else if (stage.includes('hired')) pipeline.hired++;
        });
      }

      setStats({
        activeJobs: jobsRes.count || 0,
        totalApplications: applicationsRes.count || 0,
        totalCandidates: applicationsRes.count || 0,
        interviews: pipeline.interview,
        followers: followersRes.count || 0,
        profileViews: totalProfileViews,
        jobViews: totalJobViews,
        postViews: totalPostViews,
        postEngagements: totalPostEngagements,
        offerAcceptance: 85,
        avgTimeToHire: 28
      });

      setPipelineData(pipeline);
    } catch (error) {
      console.error('Error fetching partner stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 glass-strong shadow-glass-xl">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
        <div className="relative z-10 space-y-4">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            Partner Dashboard
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-accent bg-clip-text text-transparent">
            Hiring Excellence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Your complete recruiting analytics and pipeline overview
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/partner-dashboard">
          <Card className="glass hover-lift cursor-pointer group border-0 shadow-glass-md hover:shadow-glass-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Post New Job</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/partner-dashboard">
          <Card className="glass hover-lift cursor-pointer group border-0 shadow-glass-md hover:shadow-glass-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-glow">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Review Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/companies">
          <Card className="glass hover-lift cursor-pointer group border-0 shadow-glass-md hover:shadow-glass-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center shadow-glow">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Update Profile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/messages">
          <Card className="glass hover-lift cursor-pointer group border-0 shadow-glass-md hover:shadow-glass-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/80 to-primary/80 flex items-center justify-center shadow-glow">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Message Candidates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-strong border-0 shadow-glass-lg hover-lift">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Profile Views
              </p>
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-black text-foreground">{stats.profileViews}</div>
              <p className="text-sm font-medium text-success">Last 30 days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-0 shadow-glass-lg hover-lift">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Job Views
              </p>
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-black text-foreground">{stats.jobViews}</div>
              <p className="text-sm font-medium text-success">Total views</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-0 shadow-glass-lg hover-lift">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Applications
              </p>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-black text-foreground">{stats.totalApplications}</div>
              <p className="text-sm font-medium text-success">Total received</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-0 shadow-glass-lg hover-lift">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Engagement
              </p>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-black text-foreground">{stats.postEngagements}</div>
              <p className="text-sm font-medium text-success">Reactions & comments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Health */}
        <Card className="glass-strong border-0 shadow-glass-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pipeline Distribution
            </CardTitle>
            <CardDescription>Candidates by stage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Applied</span>
                  <span className="font-semibold">{pipelineData.applied}</span>
                </div>
                <Progress value={(pipelineData.applied / Math.max(stats.totalApplications, 1)) * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Screening</span>
                  <span className="font-semibold">{pipelineData.screening}</span>
                </div>
                <Progress value={(pipelineData.screening / Math.max(stats.totalApplications, 1)) * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Interview</span>
                  <span className="font-semibold">{pipelineData.interview}</span>
                </div>
                <Progress value={(pipelineData.interview / Math.max(stats.totalApplications, 1)) * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Offer</span>
                  <span className="font-semibold">{pipelineData.offer}</span>
                </div>
                <Progress value={(pipelineData.offer / Math.max(stats.totalApplications, 1)) * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hired</span>
                  <span className="font-semibold">{pipelineData.hired}</span>
                </div>
                <Progress value={(pipelineData.hired / Math.max(stats.totalApplications, 1)) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className="glass-strong border-0 shadow-glass-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Hiring Metrics
            </CardTitle>
            <CardDescription>Performance overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Candidates</span>
                <span className="text-2xl font-bold">{stats.totalCandidates}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Jobs</span>
                <span className="text-2xl font-bold">{stats.activeJobs}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Time to Hire</span>
                <span className="text-2xl font-bold">{stats.avgTimeToHire} days</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Offer Acceptance</span>
                <span className="text-2xl font-bold">{stats.offerAcceptance}%</span>
              </div>
              <Progress value={stats.offerAcceptance} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications */}
      <Card className="glass-strong border-0 shadow-glass-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Applications
          </CardTitle>
          <CardDescription>Latest candidate applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center py-8">
              Recent applications will appear here
            </p>
            <Button className="w-full" variant="outline" asChild>
              <Link to="/partner-dashboard">View All Applications</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
