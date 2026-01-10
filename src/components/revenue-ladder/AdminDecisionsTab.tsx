import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gavel, Clock, CheckCircle2, XCircle, AlertTriangle,
  Filter, Search, ChevronDown, Users, Calendar, Shield,
  ArrowUpRight, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RewardProposal, useRewardProposals, useProposalVotes } from '@/hooks/useRewardProposals';
import { RewardDecisionPanel } from './RewardDecisionPanel';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'deferred';

export function AdminDecisionsTab() {
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [search, setSearch] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<RewardProposal | null>(null);
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);

  const { data: proposals, isLoading } = useRewardProposals();

  const filteredProposals = proposals?.filter((proposal) => {
    const matchesFilter = filter === 'all' || proposal.status === filter;
    const matchesSearch =
      proposal.title.toLowerCase().includes(search.toLowerCase()) ||
      proposal.description?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  const pendingCount = proposals?.filter((p) => p.status === 'pending').length || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDecide = (proposal: RewardProposal) => {
    setSelectedProposal(proposal);
    setShowDecisionPanel(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-label-sm">Pending</span>
            </div>
            <p className="text-heading-md font-bold text-warning">{pendingCount}</p>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-label-sm">Approved</span>
            </div>
            <p className="text-heading-md font-bold text-success">
              {proposals?.filter((p) => p.status === 'approved').length || 0}
            </p>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" />
              <span className="text-label-sm">Rejected</span>
            </div>
            <p className="text-heading-md font-bold text-destructive">
              {proposals?.filter((p) => p.status === 'rejected').length || 0}
            </p>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="text-label-sm">Total Value</span>
            </div>
            <p className="text-heading-md font-bold">
              {formatCurrency(
                proposals?.filter((p) => p.status === 'approved')
                  .reduce((sum, p) => sum + (p.estimated_cost || 0), 0) || 0
              )}
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals..."
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {filter === 'all' ? 'All Statuses' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilter('all')}>
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('pending')}>
              <Clock className="h-4 w-4 mr-2 text-warning" />
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('approved')}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
              Approved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('rejected')}>
              <XCircle className="h-4 w-4 mr-2 text-destructive" />
              Rejected
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('deferred')}>
              <AlertTriangle className="h-4 w-4 mr-2 text-muted-foreground" />
              Deferred
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProposals.length > 0 ? (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3 pr-4">
            {filteredProposals.map((proposal, index) => (
              <DecisionCard
                key={proposal.id}
                proposal={proposal}
                index={index}
                onDecide={() => handleDecide(proposal)}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Gavel className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-heading-sm font-medium">No proposals found</p>
            <p className="text-body-sm text-muted-foreground">
              {filter === 'pending'
                ? 'All proposals have been reviewed. Great work!'
                : 'Try adjusting your filters or search terms.'}
            </p>
          </div>
        </div>
      )}

      {/* Decision Panel */}
      {selectedProposal && (
        <RewardDecisionPanel
          proposal={selectedProposal}
          open={showDecisionPanel}
          onOpenChange={setShowDecisionPanel}
        />
      )}
    </div>
  );
}

interface DecisionCardProps {
  proposal: RewardProposal;
  index: number;
  onDecide: () => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: 'Pending Review',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    label: 'Rejected',
  },
  deferred: {
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: 'Deferred',
  },
};

function DecisionCard({ proposal, index, onDecide }: DecisionCardProps) {
  const { data: votes } = useProposalVotes(proposal.id);
  const status = proposal.status as keyof typeof statusConfig;
  const config = statusConfig[status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const voteCounts = {
    support: votes?.filter((v) => v.vote_type === 'support').length || 0,
    concern: votes?.filter((v) => v.vote_type === 'concern').length || 0,
  };

  const totalVotes = votes?.length || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const daysRemaining = proposal.voting_deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(proposal.voting_deadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        variant="interactive"
        className="p-4 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="capitalize">
                {proposal.category}
              </Badge>
              <Badge
                variant="outline"
                className={cn('gap-1', config.bg, config.color)}
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              {daysRemaining !== null && status === 'pending' && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {daysRemaining}d left
                </Badge>
              )}
            </div>
            <h4 className="text-heading-sm font-semibold truncate">{proposal.title}</h4>
            <p className="text-body-sm text-muted-foreground line-clamp-2">
              {proposal.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-label-sm text-muted-foreground">Requested</p>
            <p className="text-heading-md font-bold">
              {formatCurrency(proposal.estimated_cost)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-label-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {totalVotes} votes
            </span>
            <span className="text-success">+{voteCounts.support} support</span>
            {voteCounts.concern > 0 && (
              <span className="text-warning">{voteCounts.concern} concerns</span>
            )}
          </div>
          {status === 'pending' && (
            <Button size="sm" onClick={onDecide} className="gap-2">
              <Gavel className="h-4 w-4" />
              Review & Decide
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
