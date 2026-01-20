import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ThumbsUp, Minus, AlertCircle, MessageSquare, 
  Clock, Users, Send, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  RewardProposal, 
  useCastVote, 
  useProposalVotes 
} from '@/hooks/useRewardProposals';

interface ProposalVotingProps {
  proposal: RewardProposal;
}

const voteConfig = {
  support: {
    icon: ThumbsUp,
    label: 'Support',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
  },
  neutral: {
    icon: Minus,
    label: 'Neutral',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
  },
  concern: {
    icon: AlertCircle,
    label: 'Concern',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
  },
};

const categoryColors = {
  enablement: 'bg-success/20 text-success',
  experience: 'bg-warning/20 text-warning',
  assets: 'bg-primary/20 text-primary',
  cash: 'bg-destructive/20 text-destructive',
};

export function ProposalVoting({ proposal }: ProposalVotingProps) {
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  const { data: votes } = useProposalVotes(proposal.id);
  const castVote = useCastVote();

  const handleVote = async (voteType: string) => {
    setSelectedVote(voteType);
    await castVote.mutateAsync({
      proposalId: proposal.id,
      voteType: voteType,
      comment: comment || undefined,
    });
    setComment('');
  };

  const voteCounts = {
    support: votes?.filter(v => v.vote_type === 'support').length || 0,
    neutral: votes?.filter(v => v.vote_type === 'neutral').length || 0,
    concern: votes?.filter(v => v.vote_type === 'concern').length || 0,
  };

  const totalVotes = voteCounts.support + voteCounts.neutral + voteCounts.concern;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const daysRemaining = proposal.voting_deadline 
    ? Math.max(0, Math.ceil((new Date(proposal.voting_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card variant="default" className="overflow-hidden">
        {/* Header */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "capitalize",
                    categoryColors[proposal.category as keyof typeof categoryColors]
                  )}
                >
                  {proposal.category}
                </Badge>
                {daysRemaining !== null && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {daysRemaining}d left
                  </Badge>
                )}
              </div>
              <h3 className="text-heading-sm font-semibold">{proposal.title}</h3>
              <p className="text-body-sm text-muted-foreground line-clamp-2">
                {proposal.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-label-sm text-muted-foreground">Estimated Cost</p>
              <p className="text-heading-md font-bold">
                {formatCurrency(proposal.estimated_cost)}
              </p>
            </div>
          </div>

          {/* Vote Summary Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-label-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{totalVotes} votes</span>
              </div>
              <span className="text-muted-foreground">Advisory only</span>
            </div>
            
            {totalVotes > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                {voteCounts.support > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(voteCounts.support / totalVotes) * 100}%` }}
                    className="bg-success"
                  />
                )}
                {voteCounts.neutral > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(voteCounts.neutral / totalVotes) * 100}%` }}
                    className="bg-muted-foreground/30"
                  />
                )}
                {voteCounts.concern > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(voteCounts.concern / totalVotes) * 100}%` }}
                    className="bg-warning"
                  />
                )}
              </div>
            )}
          </div>

          {/* Voting Buttons */}
          <div className="flex items-center gap-3">
            {Object.entries(voteConfig).map(([type, config]) => {
              const Icon = config.icon;
              const count = voteCounts[type as keyof typeof voteCounts];
              const isSelected = selectedVote === type;

              return (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(type)}
                  disabled={castVote.isPending}
                  className={cn(
                    "flex-1 gap-2 transition-all",
                    isSelected && `${config.bg} ${config.border}`
                  )}
                >
                  {castVote.isPending && selectedVote === type ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className={cn("h-4 w-4", isSelected && config.color)} />
                  )}
                  <span>{config.label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Comment Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment with your vote (optional)..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Comments Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="w-full gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {showComments ? 'Hide Comments' : 'Show Comments'}
            <Badge variant="secondary">{votes?.filter(v => v.comment).length || 0}</Badge>
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && votes && votes.length > 0 && (
          <div className="border-t border-border p-6 space-y-4 bg-muted/20">
            {votes.filter(v => v.comment).map((vote) => {
              const config = voteConfig[vote.vote_type as keyof typeof voteConfig];
              const Icon = config?.icon || Minus;

              return (
                <motion.div
                  key={vote.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-label-sm font-medium">Team Member</span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-label-xs", config?.border, config?.color)}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {vote.vote_type}
                      </Badge>
                      <span className="text-label-xs text-muted-foreground">
                        {new Date(vote.created_at).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                    <p className="text-body-sm text-muted-foreground">{vote.comment}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
