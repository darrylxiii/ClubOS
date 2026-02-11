import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  MessageSquare,
  Calendar,
  PlusCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { RecentApplicationsList } from "./RecentApplicationsList";
import { TalentRecommendations } from "../partner/TalentRecommendations";
import { HiringPipelineOverview } from "./HiringPipelineOverview";
import { PartnerActivityFeed } from "./PartnerActivityFeed";
import { SmartAlertsPanel } from "../partner/SmartAlertsPanel";
import { HealthScoreDashboard } from "../partner/HealthScoreDashboard";
import { DailyBriefing } from "../partner/DailyBriefing";
import { BenchmarkComparison } from "../partner/BenchmarkComparison";
import { PartnerConciergeCard } from "../partner/PartnerConciergeCard";
import { SLATracker } from "../partner/SLATracker";
import { UnifiedStatsBar } from "./UnifiedStatsBar";
import { DashboardSection } from "./DashboardSection";
import { useRoleStats } from "@/hooks/useRoleStats";
import { UpcomingMeetingsWidget } from "./UpcomingMeetingsWidget";
import { TimeTrackingWidget } from "./TimeTrackingWidget";
import { InterviewTodayWidget } from "./InterviewTodayWidget";

import { OfferPipelineWidget } from "../partner/OfferPipelineWidget";
import { CandidateShortlistWidget } from "../partner/CandidateShortlistWidget";
import { PositionFillCountdown } from "../partner/PositionFillCountdown";
import { InterviewSuccessWidget } from "../partner/InterviewSuccessWidget";
import { UnreadMessagesWidget } from "../partner/UnreadMessagesWidget";
import { UpcomingDeadlinesWidget } from "../partner/UpcomingDeadlinesWidget";
import { DossierActivityWidget } from "../partner/DossierActivityWidget";
import { usePartnerDataPopulation } from "@/hooks/usePartnerDataPopulation";
import { usePartnerRealtime } from "@/hooks/usePartnerRealtime";
import { TeamOverviewWidget } from "../partner/TeamOverviewWidget";
import { T } from "@/components/T";
import { motion } from "framer-motion";
import { ClubAIHomeChatWidget } from "./ClubAIHomeChatWidget";

export const PartnerHome = () => {
  const { companyId } = useRole();
  const { user } = useAuth();
  const { stats, loading } = useRoleStats('partner', undefined, companyId || undefined);
  
  // Auto-populate dashboard data on mount
  usePartnerDataPopulation(companyId || undefined);
  
  // Enable real-time updates for dashboard
  usePartnerRealtime(companyId || undefined);

  const staggerDelay = 0.1;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats at top with animated entrance */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <UnifiedStatsBar role="partner" stats={stats} loading={loading} />
      </motion.div>

      {/* Club AI Intelligence Hub */}
      <ClubAIHomeChatWidget />

      {/* Hero Concierge Card - Premium white-glove service */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay }}
        >
          <DashboardSection>
            <PartnerConciergeCard companyId={companyId} />
          </DashboardSection>
        </motion.div>
      )}

      {/* Offers & Messages - High Priority Business Metrics */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 2 }}
        >
          <DashboardSection columns={2}>
            <OfferPipelineWidget companyId={companyId} />
            <UnreadMessagesWidget companyId={companyId} userId={user?.id} />
          </DashboardSection>
        </motion.div>
      )}

      {/* AI Daily Briefing - Full Width */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 3 }}
        >
          <DashboardSection>
            <DailyBriefing companyId={companyId} />
          </DashboardSection>
        </motion.div>
      )}

      {/* Smart Alerts, Health Score & SLA - 3-column grid */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 4 }}
        >
          <DashboardSection columns={3}>
            <SmartAlertsPanel companyId={companyId} />
            <HealthScoreDashboard companyId={companyId} />
            <SLATracker companyId={companyId} />
          </DashboardSection>
        </motion.div>
      )}

      {/* Today's Interviews & Upcoming Deadlines */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 5 }}
        >
          <DashboardSection columns={2}>
            <InterviewTodayWidget />
            <UpcomingDeadlinesWidget companyId={companyId} />
          </DashboardSection>
        </motion.div>
      )}

      {/* Pipeline Overview & Talent Matches */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 6 }}
        >
          <DashboardSection columns={2}>
            <HiringPipelineOverview companyId={companyId} />
            <TalentRecommendations companyId={companyId} />
          </DashboardSection>
        </motion.div>
      )}

      {/* Position Tracking, Shortlists & Benchmarks */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 7 }}
        >
          <DashboardSection columns={3}>
            <PositionFillCountdown companyId={companyId} />
            <CandidateShortlistWidget companyId={companyId} />
            <BenchmarkComparison companyId={companyId} />
          </DashboardSection>
        </motion.div>
      )}

      {/* Quick Actions & Interview Success */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: staggerDelay * 8 }}
      >
        <DashboardSection columns={2}>
          <div className="glass-subtle rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div>
              <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <T k="common:dashboard.quickActions.title" fallback="Quick Actions" />
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                <T k="common:dashboard.quickActions.description" fallback="Common tasks and shortcuts" />
              </p>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <Button className="w-full justify-start text-sm" variant="ghost" asChild>
                <Link to="/company-jobs/new">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Create New Role</span>
                  <span className="sm:hidden">New Role</span>
                </Link>
              </Button>
              <Button className="w-full justify-start text-sm" variant="ghost" asChild>
                <Link to="/company-applications">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Review Shortlist</span>
                  <span className="sm:hidden">Shortlist</span>
                </Link>
              </Button>
              <Button className="w-full justify-start text-sm" variant="ghost" asChild>
                <Link to="/meetings">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Schedule Interview</span>
                  <span className="sm:hidden">Interview</span>
                </Link>
              </Button>
              <Button className="w-full justify-start text-sm" variant="ghost" asChild>
                <Link to="/messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Message Candidates</span>
                  <span className="sm:hidden">Messages</span>
                </Link>
              </Button>
            </div>
          </div>
          {companyId && <TeamOverviewWidget companyId={companyId} />}
        </DashboardSection>
      </motion.div>

      {/* Time Tracking & Dossier Activity */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 9 }}
        >
          <DashboardSection columns={3}>
            <TimeTrackingWidget role="partner" companyId={companyId} />
            <DossierActivityWidget companyId={companyId} />
            <InterviewSuccessWidget companyId={companyId} />
          </DashboardSection>
        </motion.div>
      )}

      {/* Recent Applications & Activity Feed */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 10 }}
        >
          <DashboardSection columns={2}>
            <RecentApplicationsList companyId={companyId} />
            <PartnerActivityFeed companyId={companyId} />
          </DashboardSection>
        </motion.div>
      )}
    </div>
  );
};
