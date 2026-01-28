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
import { ActivityTimeline } from "@/components/candidate/ActivityTimeline";
import { QuickTipsCarousel } from "@/components/candidate/QuickTipsCarousel";
import { quickTips } from "@/data/quickTips";
import { Briefcase } from "lucide-react";
import { UnifiedStatsBar } from "./UnifiedStatsBar";
import { DashboardSection } from "./DashboardSection";
import { useRoleStats } from "@/hooks/useRoleStats";
import { UpcomingMeetingsWidget } from "./UpcomingMeetingsWidget";
import { MessagesPreviewWidget } from "./MessagesPreviewWidget";
import { NextBestActionCard } from "./NextBestActionCard";
import { ReferralStatsWidget } from "./ReferralStatsWidget";
import { AchievementsPreviewWidget } from "./AchievementsPreviewWidget";
import { NotificationsPreviewWidget } from "./NotificationsPreviewWidget";
import { InterviewCountdownWidget } from "./InterviewCountdownWidget";
import { StrategistContactCard } from "./StrategistContactCard";
import { T } from "@/components/T";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export const CandidateHome = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
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
    <div className="space-y-4 sm:space-y-6">
      {/* Stats at top */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <UnifiedStatsBar role="user" stats={stats} loading={loading} />
      </motion.div>

      {/* Next Best Action - QUIN Powered */}
      <NextBestActionCard />

      {/* Interview Countdown & Strategist Contact - P0 Widgets */}
      <DashboardSection columns={2}>
        <InterviewCountdownWidget />
        <StrategistContactCard />
      </DashboardSection>

      {/* Profile Completion */}
      <ProfileCompletion />

      {/* Application Tracker & Job Recommendations */}
      {user && (
        <DashboardSection columns={2}>
          <ApplicationStatusTracker userId={user.id} />
          <JobRecommendations userId={user.id} />
        </DashboardSection>
      )}

      {/* Notifications Preview */}
      <NotificationsPreviewWidget />

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

      {/* Quick Tips & Resources */}
      <DashboardSection
        title={t('common:home.quickTips.title', 'Quick Tips & Resources')}
        description={t('common:home.quickTips.subtitle', 'Expert advice to accelerate your career journey')}
      >
        <QuickTipsCarousel tips={quickTips} />
      </DashboardSection>

      {/* Upcoming Meetings & Messages */}
      <DashboardSection columns={2}>
        <UpcomingMeetingsWidget />
        <MessagesPreviewWidget />
      </DashboardSection>

      {/* Referrals & Achievements */}
      <DashboardSection columns={2}>
        <ReferralStatsWidget />
        <AchievementsPreviewWidget />
      </DashboardSection>

      {/* Club Projects Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-strong hover:glass transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="gap-1 bg-premium/20 text-premium-foreground border-premium/30 text-xs">
                    <Briefcase className="h-3 w-3" />
                    <T k="common:badges.newFeature" fallback="New Feature" />
                  </Badge>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">
                  💼 <T k="common:clubProjects.title" fallback="Introducing Club Projects" />
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  <T k="common:clubProjects.description" fallback="Earn while you search. Join our premium freelance marketplace and get matched with high-value projects using Club AI." />
                </p>
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    ✓ <T k="common:clubProjects.features.aiMatching" fallback="AI-powered matching" />
                  </div>
                  <div className="flex items-center gap-1">
                    ✓ <T k="common:clubProjects.features.avgRate" fallback="€100-150/hr avg rate" />
                  </div>
                  <div className="flex items-center gap-1 hidden sm:flex">
                    ✓ <T k="common:clubProjects.features.timeToHire" fallback="<24h time to hire" />
                  </div>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                  <Link to="/projects">
                    <T k="common:clubProjects.cta" fallback="Explore Projects" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      {user && (
        <DashboardSection>
          <ActivityTimeline userId={user.id} />
        </DashboardSection>
      )}
    </div>
  );
};
