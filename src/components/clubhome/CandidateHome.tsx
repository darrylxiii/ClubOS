import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
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
import { Briefcase } from "lucide-react";
import { UnifiedStatsBar } from "./UnifiedStatsBar";
import { DashboardSection } from "./DashboardSection";
import { useRoleStats } from "@/hooks/useRoleStats";
import { UpcomingMeetingsWidget } from "./UpcomingMeetingsWidget";
import { ClubPilotTasksWidget } from "./ClubPilotTasksWidget";
import { MessagesPreviewWidget } from "./MessagesPreviewWidget";
import { TimeTrackingWidget } from "./TimeTrackingWidget";
import { T } from "@/components/T";

export const CandidateHome = () => {
  const { user } = useAuth();
  const { stats: roleStats, loading } = useRoleStats('user', user?.id);
  const [profileCompletion, setProfileCompletion] = useState(0);

  const stats = roleStats as { applications: number; matches: number; interviews: number; messages: number };

  useEffect(() => {
    if (user) {
      fetchProfileCompletion();
    }
  }, [user]);

  const fetchProfileCompletion = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, current_title, bio, avatar_url')
        .eq('id', user.id)
        .single();
      
      const completion = profileData ? 
        (Object.values(profileData).filter(v => v).length / 4) * 100 : 0;
      setProfileCompletion(Math.round(completion));
    } catch (error) {
      console.error('Error fetching profile completion:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats at top */}
      <UnifiedStatsBar role="user" stats={stats} loading={loading} />

      {/* Profile Completion */}
      <ProfileCompletion />

      {/* Quick Tips & Resources */}
      <DashboardSection
        title="Quick Tips & Resources"
        description="Expert advice to accelerate your career journey"
      >
        <QuickTipsCarousel tips={quickTips} />
      </DashboardSection>

      {/* Club Projects Banner */}
      <Card className="glass-strong hover:glass transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1 bg-premium/20 text-premium-foreground border-premium/30">
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
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/projects">
                  Explore Projects
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {user && (
        <DashboardSection>
          <CandidateQuickActions
            profileCompletion={profileCompletion}
            newMatches={stats.matches}
            pendingApplications={stats.applications}
            upcomingInterviews={stats.interviews}
          />
        </DashboardSection>
      )}

      {/* Application Tracker & Job Recommendations */}
      {user && (
        <DashboardSection columns={2}>
          <ApplicationStatusTracker userId={user.id} />
          <JobRecommendations userId={user.id} />
        </DashboardSection>
      )}

      {/* Upcoming Meetings & Tasks */}
      <DashboardSection columns={2}>
        <UpcomingMeetingsWidget />
        <ClubPilotTasksWidget />
      </DashboardSection>

      {/* Messages & Time Tracking */}
      <DashboardSection columns={2}>
        <MessagesPreviewWidget />
        <TimeTrackingWidget role="candidate" />
      </DashboardSection>

      {/* Live Pulse & Profile Views */}
      <DashboardSection columns={2}>
        <LivePulse />
        <ProfileViewers />
      </DashboardSection>

      {/* Recent Activity */}
      {user && (
        <DashboardSection>
          <ActivityTimeline userId={user.id} />
        </DashboardSection>
      )}
    </div>
  );
};
