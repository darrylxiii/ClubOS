import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      const [appsRes, matchesRes, interviewsRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('candidate_id', user.id),
        supabase
          .from('match_scores')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('overall_score', 70),
        supabase
          .from('meeting_participants')
          .select('meeting_id, meetings!inner(scheduled_start)', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('meetings.scheduled_start', new Date().toISOString())
      ]);

      setStats({
        applications: appsRes.count || 0,
        interviews: interviewsRes.count || 0,
        messages: 0, // Messages simplified - will be fixed with proper schema later
        matches: matchesRes.count || 0
      });
      
      // Profile completion - calculate client-side based on profile fields
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, current_title, bio, avatar_url')
        .eq('id', user.id)
        .single();
      
      const completion = profileData ? 
        (Object.values(profileData).filter(v => v).length / 4) * 100 : 0;
      setProfileCompletion(Math.round(completion));
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

      {/* Club Projects Banner */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50 shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  New Feature
                </Badge>
              </div>
              <h3 className="text-xl font-bold mb-2">💼 Introducing Club Projects</h3>
              <p className="text-muted-foreground mb-4">
                Earn while you search. Join our premium freelance marketplace and get matched 
                with high-value projects using Club AI.
              </p>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  ✓ AI-powered matching
                </div>
                <div className="flex items-center gap-1">
                  ✓ €100-150/hr avg rate
                </div>
                <div className="flex items-center gap-1">
                  ✓ &lt;24h time to hire
                </div>
              </div>
              <Button asChild>
                <Link to="/projects">
                  Explore Projects
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
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

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
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

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
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

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
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
