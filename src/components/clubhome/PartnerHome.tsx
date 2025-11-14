import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Users, 
  TrendingUp, 
  Calendar,
  MessageSquare,
  FileText,
  PlusCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { RecentApplicationsList } from "./RecentApplicationsList";
import { TalentRecommendations } from "./TalentRecommendations";
import { HiringPipelineOverview } from "./HiringPipelineOverview";
import { PartnerActivityFeed } from "./PartnerActivityFeed";

import { SmartAlertsPanel } from "../partner/SmartAlertsPanel";
import { HealthScoreDashboard } from "../partner/HealthScoreDashboard";
import { DailyBriefing } from "../partner/DailyBriefing";
import { BenchmarkComparison } from "../partner/BenchmarkComparison";

export const PartnerHome = () => {
  const { user } = useAuth();
  const { companyId } = useUserRole();
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    interviews: 0,
    followers: 0
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
      // First get company's job IDs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId);

      const jobIds = jobs?.map(j => j.id) || [];

      const [jobsRes, followersRes, appsRes, meetingsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'published'),
        supabase
          .from('company_followers')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId),
        jobIds.length > 0 ? supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .in('job_id', jobIds)
          : { count: 0 },
        supabase
          .from('meetings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled')
      ]);

      setStats({
        activeJobs: jobsRes.count || 0,
        totalApplications: appsRes.count || 0,
        interviews: meetingsRes.count || 0,
        followers: followersRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching partner stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Intelligence Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Smart Alerts */}
          {companyId && <SmartAlertsPanel companyId={companyId} />}
          
          {/* Daily Briefing */}
          {companyId && <DailyBriefing companyId={companyId} />}
        </div>
        
        <div className="space-y-6">
          {/* Health Score */}
          {companyId && <HealthScoreDashboard companyId={companyId} />}
          
          {/* Benchmarks */}
          {companyId && <BenchmarkComparison companyId={companyId} />}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">Open positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground mt-1">Total received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviews}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Followers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.followers}</div>
            <p className="text-xs text-muted-foreground mt-1">Company followers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/partner-dashboard">
                <Briefcase className="h-4 w-4 mr-2" />
                Post New Job
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/partner-dashboard">
                <Users className="h-4 w-4 mr-2" />
                Review Applications
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/companies">
                <FileText className="h-4 w-4 mr-2" />
                Update Company Profile
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link to="/messages">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Candidates
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Hiring Pipeline Overview */}
        {companyId && <HiringPipelineOverview companyId={companyId} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        {companyId && <RecentApplicationsList companyId={companyId} />}

        {/* Talent Recommendations */}
        {companyId && <TalentRecommendations companyId={companyId} />}
      </div>

      {/* Activity Feed */}
      {companyId && <PartnerActivityFeed companyId={companyId} />}
    </div>
  );
};
