import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, RefreshCw, Plus, LayoutGrid, List, 
  Sparkles, Gavel, Trophy, History, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  useRevenueLadders, 
  useCalculateRevenueMilestones,
  useMilestoneStats,
  RevenueMilestone
} from '@/hooks/useRevenueLadder';
import { useRewardProposals } from '@/hooks/useRewardProposals';
import { DualTrackVisualizer } from './DualTrackVisualizer';
import { MilestoneCard } from './MilestoneCard';
import { ProposalForm } from './ProposalForm';
import { ProposalVoting } from './ProposalVoting';
import { MilestoneUnlockCelebration } from './MilestoneUnlockCelebration';
import { RevenueLadderSkeleton } from './RevenueLadderSkeleton';
import { EmptyState } from './EmptyState';
import { MilestoneDetailDrawer } from './MilestoneDetailDrawer';
import { AdminDecisionsTab } from './AdminDecisionsTab';
import { TeamLeaderboard } from './TeamLeaderboard';
import { HistoricalTimeline } from './HistoricalTimeline';

type ViewMode = 'grid' | 'list';

export function RevenueLadderDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedMilestone, setSelectedMilestone] = useState<RevenueMilestone | null>(null);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState<RevenueMilestone | null>(null);

  const { data: ladders, isLoading } = useRevenueLadders();
  const { data: proposals } = useRewardProposals();
  const calculateMilestones = useCalculateRevenueMilestones();
  const stats = useMilestoneStats();

  const annualLadder = ladders?.find(l => l.track_type === 'annual');
  const cumulativeLadder = ladders?.find(l => l.track_type === 'cumulative');
  const pendingProposals = proposals?.filter(p => p.status === 'pending') || [];

  const handleMilestoneClick = (milestone: RevenueMilestone) => {
    setSelectedMilestone(milestone);
    setShowDrawer(true);
  };

  // Show skeleton during loading
  if (isLoading) {
    return <RevenueLadderSkeleton />;
  }

  // Show empty state if no data
  if (!ladders || ladders.length === 0 || stats.totalMilestones === 0) {
    return (
      <EmptyState 
        onSyncRevenue={() => calculateMilestones.mutate()} 
        isSyncing={calculateMilestones.isPending}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-heading-xl font-bold">Revenue Ladder</h1>
          </div>
          <p className="text-body-md text-muted-foreground">
            Track milestones, propose rewards, and celebrate wins together.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => calculateMilestones.mutate()}
          disabled={calculateMilestones.isPending}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", calculateMilestones.isPending && "animate-spin")} />
          Sync Revenue
        </Button>
      </div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 space-y-1">
          <p className="text-label-sm text-muted-foreground">Total Milestones</p>
          <p className="text-heading-md font-bold">{stats.totalMilestones}</p>
        </div>
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 space-y-1">
          <p className="text-label-sm text-success">Unlocked</p>
          <p className="text-heading-md font-bold text-success">{stats.unlockedMilestones}</p>
        </div>
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 space-y-1">
          <p className="text-label-sm text-warning">Approaching</p>
          <p className="text-heading-md font-bold text-warning">{stats.approachingMilestones}</p>
        </div>
        <div className="p-4 rounded-xl bg-premium/10 border border-premium/30 space-y-1">
          <p className="text-label-sm text-premium">Rewarded</p>
          <p className="text-heading-md font-bold text-premium">{stats.rewardedMilestones}</p>
        </div>
      </motion.div>

      {/* Dual Track Visualizer */}
      <DualTrackVisualizer annualLadder={annualLadder} cumulativeLadder={cumulativeLadder} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="milestones" className="space-y-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          <TabsList>
            <TabsTrigger value="milestones" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="proposals" className="gap-2">
              <Plus className="h-4 w-4" />
              Proposals
              {proposals && proposals.length > 0 && (
                <Badge variant="secondary" className="ml-1">{proposals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-2">
              <Gavel className="h-4 w-4" />
              Decisions
              {pendingProposals.length > 0 && (
                <Badge className="ml-1 bg-warning text-warning-foreground">{pendingProposals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setViewMode('grid')} className={cn(viewMode === 'grid' && "bg-muted")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} className={cn(viewMode === 'list' && "bg-muted")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-6">
          {annualLadder && (
            <div className="space-y-4">
              <h2 className="text-heading-sm font-semibold flex items-center gap-2">
                Annual Track
                <Badge variant="outline" className="font-normal">Execution Focus</Badge>
              </h2>
              <div className={cn(viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4")}>
                {annualLadder.revenue_milestones?.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    onClick={() => handleMilestoneClick(milestone)}
                    isNext={stats.nextMilestone?.id === milestone.id}
                  />
                ))}
              </div>
            </div>
          )}
          {cumulativeLadder && (
            <div className="space-y-4">
              <h2 className="text-heading-sm font-semibold flex items-center gap-2">
                Lifetime Track
                <Badge variant="outline" className="font-normal">Vision Focus</Badge>
              </h2>
              <div className={cn(viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4")}>
                {cumulativeLadder.revenue_milestones?.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    onClick={() => handleMilestoneClick(milestone)}
                    isNext={stats.nextMilestone?.id === milestone.id}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
          {proposals && proposals.length > 0 ? (
            proposals.map((proposal) => <ProposalVoting key={proposal.id} proposal={proposal} />)
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-heading-sm font-medium">No proposals yet</p>
              <p className="text-body-sm text-muted-foreground">Unlock a milestone to start proposing rewards</p>
            </div>
          )}
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions">
          <AdminDecisionsTab />
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <TeamLeaderboard members={[]} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <HistoricalTimeline />
        </TabsContent>
      </Tabs>

      {/* Milestone Detail Drawer */}
      <MilestoneDetailDrawer
        milestone={selectedMilestone}
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        isAdmin={true}
      />

      {/* Proposal Form Modal */}
      {selectedMilestone && (
        <ProposalForm
          milestoneId={selectedMilestone.id}
          milestoneName={selectedMilestone.display_name}
          open={showProposalForm}
          onOpenChange={setShowProposalForm}
        />
      )}

      {/* Celebration Modal */}
      <MilestoneUnlockCelebration milestone={celebratingMilestone} onClose={() => setCelebratingMilestone(null)} />
    </div>
  );
}
