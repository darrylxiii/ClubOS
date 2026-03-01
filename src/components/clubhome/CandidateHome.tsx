import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { CandidateQuickActions } from "@/components/candidate/CandidateQuickActions";
import { ApplicationStatusTracker } from "@/components/candidate/ApplicationStatusTracker";
import { JobRecommendations } from "@/components/candidate/JobRecommendations";
import { ActivityTimeline } from "@/components/candidate/ActivityTimeline";
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
import { SavedJobsWidget } from "./SavedJobsWidget";
import { DocumentStatusWidget } from "./DocumentStatusWidget";
import { SalaryInsightsWidget } from "./SalaryInsightsWidget";
import { SkillDemandWidget } from "./SkillDemandWidget";
import { CareerProgressWidget } from "./CareerProgressWidget";
import { PushNotificationOptIn } from "@/components/notifications/PushNotificationOptIn";
import { motion, AnimatePresence } from "framer-motion";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";

const BANNER_DISMISS_KEY = 'tqc_club_projects_banner_dismissed';

export const CandidateHome = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { stats: roleStats, loading } = useRoleStats('user', user?.id);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem(BANNER_DISMISS_KEY) === 'true';
  });

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    localStorage.setItem(BANNER_DISMISS_KEY, 'true');
  }, []);

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
      // Profile completion fetch failed silently
    }
  };

  const [showCareer, setShowCareer] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showTools, setShowTools] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Above the fold: Stats + Next Action (max 3 items) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <UnifiedStatsBar role="user" stats={stats} loading={loading} />
      </motion.div>

      <NextBestActionCard />

      <ClubAIHomeChatWidget />

      {/* ── Career Activity (collapsible) ── */}
      <div className="space-y-3">
        <button
          onClick={() => setShowCareer(v => !v)}
          className="flex items-center justify-between w-full text-left group"
        >
          <h2 className="text-lg font-semibold tracking-tight">Career Activity</h2>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            {showCareer ? 'Collapse' : 'Expand'}
          </span>
        </button>
        
        <DashboardSection columns={2}>
          <InterviewCountdownWidget />
          <StrategistContactCard />
        </DashboardSection>

        <AnimatePresence>
          {showCareer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 overflow-hidden"
            >
              <ProfileCompletion />
              {user && (
                <DashboardSection columns={2}>
                  <ApplicationStatusTracker userId={user.id} />
                  <JobRecommendations userId={user.id} />
                </DashboardSection>
              )}
              <NotificationsPreviewWidget />
              <PushNotificationOptIn />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Market Intelligence (collapsible) ── */}
      <div className="space-y-3">
        <button
          onClick={() => setShowMarket(v => !v)}
          className="flex items-center justify-between w-full text-left group"
        >
          <h2 className="text-lg font-semibold tracking-tight">Market Intelligence</h2>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            {showMarket ? 'Collapse' : 'Expand'}
          </span>
        </button>
        
        <AnimatePresence>
          {showMarket && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 overflow-hidden"
            >
              <DashboardSection columns={3}>
                <SalaryInsightsWidget />
                <SkillDemandWidget />
                <CareerProgressWidget />
              </DashboardSection>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Tools & Resources (collapsible) ── */}
      <div className="space-y-3">
        <button
          onClick={() => setShowTools(v => !v)}
          className="flex items-center justify-between w-full text-left group"
        >
          <h2 className="text-lg font-semibold tracking-tight">Tools & Resources</h2>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            {showTools ? 'Collapse' : 'Expand'}
          </span>
        </button>
        
        <AnimatePresence>
          {showTools && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 overflow-hidden"
            >
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
              <DashboardSection columns={2}>
                <UpcomingMeetingsWidget />
                <MessagesPreviewWidget />
              </DashboardSection>
              <DashboardSection columns={2}>
                <SavedJobsWidget />
                <DocumentStatusWidget />
              </DashboardSection>
              <DashboardSection columns={2}>
                <ReferralStatsWidget />
                <AchievementsPreviewWidget />
              </DashboardSection>
              {user && (
                <DashboardSection>
                  <ActivityTimeline userId={user.id} />
                </DashboardSection>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
