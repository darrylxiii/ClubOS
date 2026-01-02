import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Briefcase, Users, History, Plus, TrendingUp, Trophy, Zap, Activity, Share2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { ReferralEarningsOverview } from "@/components/referrals/ReferralEarningsOverview";
import { CompanyReferralCard } from "@/components/referrals/CompanyReferralCard";
import { MemberReferralCard } from "@/components/referrals/MemberReferralCard";
import { ClaimReferralDialog } from "@/components/referrals/ClaimReferralDialog";
import { EarningsHistoryTable } from "@/components/referrals/EarningsHistoryTable";
import { RevenueShareInfo } from "@/components/referrals/RevenueShareInfo";
import { ReferralJobTracker } from "@/components/referrals/ReferralJobTracker";
import { ReferralLeaderboard } from "@/components/referrals/ReferralLeaderboard";
import { ReferralTierProgress } from "@/components/referrals/ReferralTierProgress";
import { ReferralChallenges } from "@/components/referrals/ReferralChallenges";
import { ReferralActivityFeed } from "@/components/referrals/ReferralActivityFeed";
import { ReferralShareSheet } from "@/components/referrals/ReferralShareSheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  useReferralPolicies, 
  useReferralEarnings, 
  useRevenueShares,
  useReferralStats 
} from "@/hooks/useReferralSystem";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";

export default function Referrals() {
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  
  const { user } = useAuth();
  const { role } = useUserRole();
  const { data: policies, isLoading: policiesLoading } = useReferralPolicies();
  const { data: earnings, isLoading: earningsLoading } = useReferralEarnings();
  const { data: revenueShares } = useRevenueShares();
  const { data: stats, isLoading: statsLoading } = useReferralStats();

  const isAdmin = role === 'admin' || role === 'strategist';
  const isPartner = role === 'partner';

  const companyPolicies = policies?.filter(p => p.policy_type === 'company') || [];
  const memberPolicies = policies?.filter(p => p.source_type === 'member_referral') || [];

  const handleClaimClick = () => {
    setClaimDialogOpen(true);
  };

  const defaultStats = { 
    totalRevenueGenerated: 0, 
    yourEarnings: 0, 
    projectedEarnings: 0, 
    activePipelines: 0, 
    companiesCount: 0, 
    jobsCount: 0,
    memberReferralsCount: 0,
    successRate: 0
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              Your Earnings & Referrals
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your referrals, monitor pipelines, and view your earnings
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShareSheetOpen(true)} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share Link
            </Button>
            {(isAdmin || isPartner) && (
              <Button variant="outline" size="sm" onClick={handleClaimClick} className="gap-2">
                <Building2 className="h-4 w-4" />
                Claim Company
              </Button>
            )}
            <Button size="sm" onClick={handleClaimClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Refer a Member
            </Button>
          </div>
        </motion.div>

        {/* Tier Progress & Active Challenges Banner */}
        <div className="grid gap-4 md:grid-cols-2">
          <ReferralTierProgress />
          <ReferralChallenges />
        </div>

        <ReferralEarningsOverview stats={stats || defaultStats} loading={statsLoading} />

        <RevenueShareInfo shares={revenueShares || []} userRole={role || undefined} />

        <Tabs defaultValue="pipeline" className="space-y-6">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="pipeline" className="gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Pipeline</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Leaderboard</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="companies" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Companies</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Members</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="pipeline" className="space-y-4">
            <ReferralJobTracker />
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <ReferralLeaderboard />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ReferralActivityFeed />
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            {policiesLoading ? (
              <div className="h-48 bg-muted/50 rounded-xl animate-pulse" />
            ) : companyPolicies.length === 0 ? (
              <EmptyState icon={Building2} title="No company referrals" description="Claim a company to track all its jobs." onAction={handleClaimClick} showAction={isAdmin || isPartner} />
            ) : (
              companyPolicies.map(policy => <CompanyReferralCard key={policy.id} policy={policy} earnings={earnings?.filter(e => e.company_id === policy.company_id) || []} />)
            )}
          </TabsContent>

          <TabsContent value="members" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policiesLoading ? <div className="h-32 bg-muted/50 rounded-xl animate-pulse" /> : memberPolicies.length === 0 ? (
              <EmptyState icon={Users} title="No member referrals" description="Refer professionals to earn rewards." onAction={handleClaimClick} showAction={true} />
            ) : memberPolicies.map(policy => <MemberReferralCard key={policy.id} policy={policy} earnings={earnings?.filter(e => e.policy_id === policy.id) || []} />)}
          </TabsContent>

          <TabsContent value="history">
            <EarningsHistoryTable earnings={earnings || []} loading={earningsLoading} />
          </TabsContent>
        </Tabs>

        <ClaimReferralDialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen} />
        <ReferralShareSheet open={shareSheetOpen} onOpenChange={setShareSheetOpen} />
      </div>
    </AppLayout>
  );
}

function EmptyState({ icon: Icon, title, description, onAction, showAction }: { icon: React.ElementType; title: string; description: string; onAction: () => void; showAction?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center glass-card rounded-xl col-span-full">
      <div className="p-4 rounded-full bg-muted/50 mb-4"><Icon className="h-8 w-8 text-muted-foreground" /></div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{description}</p>
      {showAction && <Button onClick={onAction} className="gap-2"><Plus className="h-4 w-4" />Add</Button>}
    </div>
  );
}
