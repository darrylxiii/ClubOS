import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Users,
  MessageSquare,
  FileText,
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
import { T } from "@/components/T";
import { motion } from "framer-motion";

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
          <Card className="glass-card group hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <T k="common:dashboard.quickActions.title" fallback="Quick Actions" />
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                <T k="common:dashboard.quickActions.description" fallback="Common tasks and shortcuts" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <Button className="w-full justify-start text-sm" variant="glass" asChild>
                <Link to="/company-jobs">
                  <Briefcase className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline"><T k="common:partner.postJob" fallback="Post New Job" /></span>
                  <span className="sm:hidden"><T k="common:navigation.jobs" fallback="New Job" /></span>
                </Link>
              </Button>
              <Button className="w-full justify-start text-sm" variant="glass" asChild>
                <Link to="/company-applications">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline"><T k="common:partner.reviewApplications" fallback="Review Applications" /></span>
                  <span className="sm:hidden"><T k="common:navigation.applications" fallback="Applications" /></span>
                </Link>
              </Button>
              <Button className="w-full justify-start text-sm" variant="glass" asChild>
                <Link to="/company-settings">
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline"><T k="common:partner.updateCompany" fallback="Update Company Profile" /></span>
                  <span className="sm:hidden"><T k="common:navigation.profile" fallback="Company" /></span>
                </Link>
              </Button>
              <Button className="w-full justify-start text-sm" variant="outline" asChild>
                <Link to="/messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline"><T k="common:partner.messageCandidate" fallback="Message Candidates" /></span>
                  <span className="sm:hidden"><T k="common:navigation.messages" fallback="Messages" /></span>
                </Link>
              </Button>
            </CardContent>
          </Card>
          {companyId && <InterviewSuccessWidget companyId={companyId} />}
        </DashboardSection>
      </motion.div>

      {/* Time Tracking & Dossier Activity */}
      {companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay * 9 }}
        >
          <DashboardSection columns={2}>
            <TimeTrackingWidget role="partner" companyId={companyId} />
            <DossierActivityWidget companyId={companyId} />
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
