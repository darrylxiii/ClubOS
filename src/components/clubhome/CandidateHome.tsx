import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { CandidateQuickActions } from "@/components/candidate/CandidateQuickActions";
import { ApplicationStatusTracker } from "@/components/candidate/ApplicationStatusTracker";
import { JobRecommendations } from "@/components/candidate/JobRecommendations";
import { LivePulse } from "@/components/LivePulse";
import { ProfileViewers } from "@/components/ProfileViewers";
import { ActivityTimeline } from "@/components/candidate/ActivityTimeline";
import { QuickTipsCarousel } from "@/components/candidate/QuickTipsCarousel";
import { quickTips } from "@/data/quickTips";
import { Briefcase, Calendar, MessageSquare, Target } from "lucide-react";

export const CandidateHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    messages: 0,
    matches: 0
  });
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    if (user) {
      fetchCandidateStats();
    }
  }, [user]);

  const fetchCandidateStats = async () => {
    if (!user) return;

    try {
      const [appsRes, matchesRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('candidate_id', user.id),
        supabase
          .from('match_scores')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('overall_score', 70)
      ]);

      setStats({
        applications: appsRes.count || 0,
        interviews: 0,
        messages: 0,
        matches: matchesRes.count || 0
      });
      
      setProfileCompletion(75);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Completion */}
      <ProfileCompletion />

      {/* NEW: Quick Tips & Resources Carousel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Quick Tips & Resources</h2>
            <p className="text-sm text-muted-foreground">
              Expert advice to accelerate your career journey
            </p>
          </div>
        </div>
        <QuickTipsCarousel tips={quickTips} />
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.applications}</div>
            <p className="text-xs text-muted-foreground mt-1">Active applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matches}</div>
            <p className="text-xs text-muted-foreground mt-1">High-fit roles</p>
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
              <MessageSquare className="h-4 w-4 text-primary" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messages}</div>
            <p className="text-xs text-muted-foreground mt-1">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {user && (
        <CandidateQuickActions
          profileCompletion={profileCompletion}
          newMatches={stats.matches}
          pendingApplications={stats.applications}
          upcomingInterviews={stats.interviews}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Tracker */}
        {user && <ApplicationStatusTracker userId={user.id} />}

        {/* Top Matches */}
        {user && <JobRecommendations userId={user.id} />}
      </div>

      {/* Live Pulse & Profile Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LivePulse />
        <ProfileViewers />
      </div>

      {/* Recent Activity */}
      {user && <ActivityTimeline userId={user.id} />}
    </div>
  );
};
