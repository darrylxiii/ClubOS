import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Users,
  MessageSquare,
  FileText,
  PlusCircle
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

export const PartnerHome = () => {
  const { companyId } = useUserRole();
  const { stats, loading } = useRoleStats('partner', undefined, companyId || undefined);

  return (
    <div className="space-y-6">
      {/* Stats at top */}
      <UnifiedStatsBar role="partner" stats={stats} loading={loading} />

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/jobs">
                <Briefcase className="h-4 w-4 mr-2" />
                Post New Job
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="glass" asChild>
              <Link to="/company-applications">
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
        {companyId && <HiringPipelineOverview companyId={companyId} />}
      </DashboardSection>

      {/* Applications & Recommendations */}
      {companyId && (
        <DashboardSection columns={2}>
          <RecentApplicationsList companyId={companyId} />
          <TalentRecommendations companyId={companyId} />
        </DashboardSection>
      )}

      {/* Activity Feed */}
      {companyId && (
        <DashboardSection>
          <PartnerActivityFeed companyId={companyId} />
        </DashboardSection>
      )}
    </div>
  );
};
