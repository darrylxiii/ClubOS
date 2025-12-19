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
import { useUserRole } from "@/hooks/useUserRole";
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
import { T } from "@/components/T";
import { motion } from "framer-motion";

export const PartnerHome = () => {
  const { companyId } = useUserRole();
  const { stats, loading } = useRoleStats('partner', undefined, companyId || undefined);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats at top */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <UnifiedStatsBar role="partner" stats={stats} loading={loading} />
      </motion.div>

      {/* Concierge Card - Premium white-glove service */}
      {companyId && (
        <DashboardSection>
          <PartnerConciergeCard companyId={companyId} />
        </DashboardSection>
      )}

      {/* Dashboard Intelligence */}
      {companyId && (
        <DashboardSection>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SmartAlertsPanel companyId={companyId} />
              <DailyBriefing companyId={companyId} />
            </div>
            <div className="space-y-6">
              <HealthScoreDashboard companyId={companyId} />
              <BenchmarkComparison companyId={companyId} />
              <SLATracker companyId={companyId} />
            </div>
          </div>
        </DashboardSection>
      )}

      {/* Quick Actions & Pipeline */}
      <DashboardSection columns={2}>
        <Card className="glass-card">
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
        {companyId && <HiringPipelineOverview companyId={companyId} />}
      </DashboardSection>

      {/* Today's Interviews & Upcoming Meetings */}
      <DashboardSection columns={2}>
        <InterviewTodayWidget />
        <UpcomingMeetingsWidget />
      </DashboardSection>

      {/* Time Tracking */}
      <DashboardSection>
        {companyId && <TimeTrackingWidget role="partner" companyId={companyId} />}
      </DashboardSection>


      {/* Applications & Recommendations */}
      <DashboardSection columns={2}>
        {companyId && <RecentApplicationsList companyId={companyId} />}
        {companyId && <TalentRecommendations companyId={companyId} />}
      </DashboardSection>

      {/* Activity Feed */}
      {companyId && (
        <DashboardSection>
          <PartnerActivityFeed companyId={companyId} />
        </DashboardSection>
      )}
    </div>
  );
};
