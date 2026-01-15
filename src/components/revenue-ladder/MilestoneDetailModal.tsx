import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Trophy, TrendingUp, Plus, Calendar,
  Users, Clock, Gavel, History, Sparkles, ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RevenueMilestone } from '@/hooks/useRevenueLadder';
import { useRewardProposals, useProposalVotes } from '@/hooks/useRewardProposals';
import { ProposalForm } from './ProposalForm';
import { RewardDecisionPanel } from './RewardDecisionPanel';
import { PremiumProgressBar } from './PremiumProgressBar';

interface MilestoneDetailModalProps {
  milestone: RevenueMilestone | null;
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const statusConfig = {
  locked: {
    icon: Lock,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-muted/30',
    label: 'Locked',
    description: 'This milestone has not been unlocked yet.',
    progressVariant: 'default' as const,
  },
  approaching: {
    icon: TrendingUp,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    label: 'Approaching',
    description: "You're getting close! Keep pushing towards this goal.",
    progressVariant: 'warning' as const,
  },
  unlocked: {
    icon: Unlock,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    label: 'Unlocked',
    description: 'Milestone achieved! Create a reward proposal.',
    progressVariant: 'success' as const,
  },
  rewarded: {
    icon: Trophy,
    color: 'text-premium',
    bg: 'bg-premium/10',
    border: 'border-premium/40',
    label: 'Rewarded',
    description: 'This milestone has been celebrated and rewarded.',
    progressVariant: 'premium' as const,
  },
};

export function MilestoneDetailModal({
  milestone,
  open,
  onClose,
  isAdmin = false,
}: MilestoneDetailModalProps) {
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);

  const { data: allProposals } = useRewardProposals();
  const milestoneProposals = allProposals?.filter(
    (p) => p.milestone_id === milestone?.id
  ) || [];

  if (!milestone) return null;

  const status = milestone.status as keyof typeof statusConfig;
  const config = statusConfig[status] || statusConfig.locked;
  const StatusIcon = config.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const progressPercent = Math.min(100, milestone.progress_percentage || 0);
  const remainingAmount = Math.max(0, milestone.threshold_amount - (milestone.achieved_revenue || 0));

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Header with Status */}
          <div className={cn(
            "relative p-6 pb-4 border-b border-border/30",
            config.bg
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className={cn(
                      "p-2.5 rounded-xl",
                      config.bg,
                      "border",
                      config.border
                    )}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  >
                    <StatusIcon className={cn('h-5 w-5', config.color)} />
                  </motion.div>
                  <Badge variant="outline" className={cn('capitalize', config.color, config.border)}>
                    {config.label}
                  </Badge>
                </div>
                <DialogHeader className="p-0 space-y-1">
                  <DialogTitle className="text-heading-lg font-bold">
                    {milestone.display_name}
                  </DialogTitle>
                  <p className="text-body-sm text-muted-foreground">{config.description}</p>
                </DialogHeader>
              </div>
            </div>

            {/* Amount Display */}
            <motion.div 
              className="mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-display-sm font-bold tracking-tight">
                {formatCurrency(milestone.threshold_amount)}
              </p>
            </motion.div>
          </div>

          <ScrollArea className="max-h-[calc(90vh-280px)]">
            <div className="p-6 space-y-6">
              {/* Progress Card */}
              <Card variant="static" className="p-5 space-y-4 bg-muted/10 border-border/30">
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-medium">Progress</span>
                  <span className={cn("text-heading-sm font-bold", config.color)}>
                    {Math.round(progressPercent)}%
                  </span>
                </div>

                <PremiumProgressBar
                  value={progressPercent}
                  height="lg"
                  variant={config.progressVariant}
                  showShimmer={status === 'approaching'}
                />

                <div className="flex items-center justify-between text-label-sm">
                  <div>
                    <span className="text-muted-foreground">Achieved: </span>
                    <span className="font-medium text-success">
                      {formatCurrency(milestone.achieved_revenue || 0)}
                    </span>
                  </div>
                  {status === 'approaching' && remainingAmount > 0 ? (
                    <span className="text-warning font-medium">
                      {formatCurrency(remainingAmount)} to go
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Target: {formatCurrency(milestone.threshold_amount)}
                    </span>
                  )}
                </div>

                {/* Key Dates */}
                {(milestone.unlocked_at || milestone.rewarded_at) && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                    {milestone.unlocked_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-success" />
                        <div>
                          <p className="text-label-xs text-muted-foreground">Unlocked</p>
                          <p className="text-label-sm font-medium">
                            {formatDate(milestone.unlocked_at)}
                          </p>
                        </div>
                      </div>
                    )}
                    {milestone.rewarded_at && (
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-premium" />
                        <div>
                          <p className="text-label-xs text-muted-foreground">Rewarded</p>
                          <p className="text-label-sm font-medium">
                            {formatDate(milestone.rewarded_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Description */}
              {milestone.description && (
                <div className="space-y-2">
                  <h3 className="text-label-md font-semibold">Description</h3>
                  <p className="text-body-sm text-muted-foreground">
                    {milestone.description}
                  </p>
                </div>
              )}

              <Separator className="bg-border/30" />

              {/* Tabs for Proposals & History */}
              <Tabs defaultValue="proposals" className="space-y-4">
                <TabsList className="w-full bg-muted/30">
                  <TabsTrigger value="proposals" className="flex-1 gap-2">
                    <Plus className="h-4 w-4" />
                    Proposals
                    {milestoneProposals.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{milestoneProposals.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 gap-2">
                    <History className="h-4 w-4" />
                    History
                  </TabsTrigger>
                </TabsList>

                {/* Proposals Tab */}
                <TabsContent value="proposals" className="space-y-4 mt-4">
                  {milestoneProposals.length > 0 ? (
                    milestoneProposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        isAdmin={isAdmin}
                        onDecide={() => {
                          setSelectedProposal(proposal);
                          setShowDecisionPanel(true);
                        }}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-body-sm text-muted-foreground">
                        No proposals yet for this milestone.
                      </p>
                      {status === 'unlocked' && (
                        <Button
                          size="sm"
                          onClick={() => setShowProposalForm(true)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Create Proposal
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-4 mt-4">
                  <div className="text-center py-8 space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                      <History className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-body-sm text-muted-foreground">
                      Milestone history and audit trail will appear here.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          {status === 'unlocked' && (
            <div className="border-t border-border/30 p-5 bg-background/50">
              <Button
                className="w-full gap-2"
                onClick={() => setShowProposalForm(true)}
              >
                <Sparkles className="h-4 w-4" />
                Propose a Reward
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proposal Form Dialog */}
      <ProposalForm
        milestoneId={milestone.id}
        milestoneName={milestone.display_name}
        open={showProposalForm}
        onOpenChange={setShowProposalForm}
      />

      {/* Decision Panel Dialog */}
      {selectedProposal && (
        <RewardDecisionPanel
          proposal={selectedProposal}
          open={showDecisionPanel}
          onOpenChange={setShowDecisionPanel}
        />
      )}
    </>
  );
}

interface ProposalCardProps {
  proposal: any;
  isAdmin?: boolean;
  onDecide: () => void;
}

function ProposalCard({ proposal, isAdmin, onDecide }: ProposalCardProps) {
  const { data: votes } = useProposalVotes(proposal.id);
  const voteCounts = {
    support: votes?.filter((v) => v.vote_type === 'support').length || 0,
    concern: votes?.filter((v) => v.vote_type === 'concern').length || 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card variant="interactive" className="p-4 space-y-3 bg-muted/10">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <Badge variant="outline" className="capitalize text-label-xs">
            {proposal.category}
          </Badge>
          <h4 className="text-label-md font-semibold">{proposal.title}</h4>
          <p className="text-body-sm text-muted-foreground line-clamp-2">
            {proposal.description}
          </p>
        </div>
        <p className="text-heading-sm font-bold shrink-0">
          {formatCurrency(proposal.estimated_cost)}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-label-sm">
          <span className="flex items-center gap-1 text-success">
            <TrendingUp className="h-3 w-3" />
            {voteCounts.support}
          </span>
          <span className="flex items-center gap-1 text-warning">
            <Clock className="h-3 w-3" />
            {voteCounts.concern}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            {(votes?.length || 0)} votes
          </span>
        </div>

        {isAdmin && proposal.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={onDecide} className="gap-1">
            <Gavel className="h-3 w-3" />
            Decide
          </Button>
        )}
      </div>
    </Card>
  );
}
