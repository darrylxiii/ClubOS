import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Gavel, CheckCircle2, XCircle, Clock, AlertTriangle,
  ThumbsUp, Minus, AlertCircle, Loader2, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { CFOSafetyGuard } from './CFOSafetyGuard';
import { RewardProposal, useCreateDecision, useProposalVotes } from '@/hooks/useRewardProposals';

interface RewardDecisionPanelProps {
  proposal: RewardProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const decisionConfig = {
  approved: {
    icon: CheckCircle2,
    label: 'Approve',
    color: 'text-success',
    bg: 'bg-success',
    buttonVariant: 'default' as const,
  },
  rejected: {
    icon: XCircle,
    label: 'Reject',
    color: 'text-destructive',
    bg: 'bg-destructive',
    buttonVariant: 'destructive' as const,
  },
  deferred: {
    icon: Clock,
    label: 'Defer',
    color: 'text-warning',
    bg: 'bg-warning',
    buttonVariant: 'outline' as const,
  },
  modified: {
    icon: AlertTriangle,
    label: 'Modify',
    color: 'text-primary',
    bg: 'bg-primary',
    buttonVariant: 'secondary' as const,
  },
};

export function RewardDecisionPanel({ proposal, open, onOpenChange }: RewardDecisionPanelProps) {
  const [decision, setDecision] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const [modifiedAmount, setModifiedAmount] = useState<number>(proposal.estimated_cost);

  const { data: votes } = useProposalVotes(proposal.id);
  const makeDecision = useCreateDecision();

  const voteCounts = {
    support: votes?.filter(v => v.vote_type === 'support').length || 0,
    neutral: votes?.filter(v => v.vote_type === 'neutral').length || 0,
    concern: votes?.filter(v => v.vote_type === 'concern').length || 0,
  };

  const totalVotes = voteCounts.support + voteCounts.neutral + voteCounts.concern;

  const handleSubmit = async () => {
    if (!decision) return;

    await makeDecision.mutateAsync({
      milestone_id: proposal.milestone_id,
      proposal_id: proposal.id,
      decision,
      rationale,
      modified_amount: decision === 'modified' ? modifiedAmount : undefined,
    });

    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Review & Decide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Proposal Summary */}
          <Card variant="static" className="p-4 space-y-4 bg-muted/30">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="capitalize mb-2">
                  {proposal.category}
                </Badge>
                <h3 className="text-heading-sm font-semibold">{proposal.title}</h3>
                <p className="text-body-sm text-muted-foreground mt-1">
                  {proposal.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-label-sm text-muted-foreground">Requested</p>
                <p className="text-heading-md font-bold">
                  {formatCurrency(proposal.estimated_cost)}
                </p>
              </div>
            </div>

            {/* Vote Summary */}
            <div className="flex items-center gap-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-success" />
                <span className="text-label-sm font-medium">{voteCounts.support}</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-muted-foreground" />
                <span className="text-label-sm font-medium">{voteCounts.neutral}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-label-sm font-medium">{voteCounts.concern}</span>
              </div>
              <span className="text-label-sm text-muted-foreground ml-auto">
                {totalVotes} total votes
              </span>
            </div>
          </Card>

          {/* CFO Safety Check */}
          <CFOSafetyGuard 
            estimatedCost={decision === 'modified' ? modifiedAmount : proposal.estimated_cost} 
          />

          {/* Decision Options */}
          <div className="space-y-3">
            <Label>Decision</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(decisionConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = decision === key;

                return (
                  <Card
                    key={key}
                    variant="interactive"
                    onClick={() => setDecision(key)}
                    className={cn(
                      "p-4 cursor-pointer transition-all",
                      isSelected && `ring-2 ring-offset-2 ring-offset-background`,
                      isSelected && key === 'approved' && 'ring-success',
                      isSelected && key === 'rejected' && 'ring-destructive',
                      isSelected && key === 'deferred' && 'ring-warning',
                      isSelected && key === 'modified' && 'ring-primary',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isSelected ? `${config.bg} text-white` : 'bg-muted'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium">{config.label}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Modified Amount (if modify selected) */}
          {decision === 'modified' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <Label htmlFor="modified-amount">Modified Amount (€)</Label>
              <Input
                id="modified-amount"
                type="number"
                value={modifiedAmount}
                onChange={(e) => setModifiedAmount(Number(e.target.value))}
              />
            </motion.div>
          )}

          {/* Rationale */}
          <div className="space-y-2">
            <Label htmlFor="rationale">Rationale (Required)</Label>
            <Textarea
              id="rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Explain your decision for transparency..."
              rows={4}
            />
            <p className="text-label-sm text-muted-foreground">
              This will be visible to all team members for full transparency.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!decision || !rationale || makeDecision.isPending}
            className={cn(
              decision === 'approved' && 'bg-success hover:bg-success/90',
              decision === 'rejected' && 'bg-destructive hover:bg-destructive/90',
              decision === 'deferred' && 'bg-warning hover:bg-warning/90',
              decision === 'modified' && 'bg-primary hover:bg-primary/90',
            )}
          >
            {makeDecision.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Confirm Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
