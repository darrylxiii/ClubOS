import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Vote {
  id: string;
  voter_id: string;
  vote_type: string;
  voter?: {
    full_name: string;
  };
}

interface InterviewerVotingPanelProps {
  meetingId: string;
  currentUserId: string;
  candidateId?: string;
}

const VOTE_TYPES = [
  { type: 'strong_hire', label: 'Strong Hire', icon: TrendingUp, color: 'text-green-600' },
  { type: 'hire', label: 'Hire', icon: ThumbsUp, color: 'text-green-500' },
  { type: 'neutral', label: 'Neutral', icon: Minus, color: 'text-yellow-500' },
  { type: 'no_hire', label: 'No Hire', icon: ThumbsDown, color: 'text-red-500' },
  { type: 'strong_no_hire', label: 'Strong No', icon: TrendingDown, color: 'text-red-600' },
];

export function InterviewerVotingPanel({
  meetingId,
  currentUserId,
  candidateId,
}: InterviewerVotingPanelProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVotes();

    const channel = supabase
      .channel(`votes:${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviewer_votes',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          loadVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const loadVotes = async () => {
    const { data, error } = await supabase
      .from('interviewer_votes' as any)
      .select(`
        *,
        voter:profiles!interviewer_votes_voter_id_fkey(full_name)
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading votes:', error);
      return;
    }

    setVotes(data as any || []);
    const userVote = (data as any)?.find((v: any) => v.voter_id === currentUserId);
    setMyVote((userVote as any)?.vote_type || null);
  };

  const castVote = async (voteType: string) => {
    if (voting) return;

    setVoting(true);
    const { error } = await supabase.from('interviewer_votes' as any).upsert({
      meeting_id: meetingId,
      voter_id: currentUserId,
      candidate_id: candidateId || null,
      vote_type: voteType,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to cast vote',
        variant: 'destructive',
      });
    } else {
      setMyVote(voteType);
      toast({
        title: 'Vote Recorded',
        description: 'Your vote has been saved',
      });
    }
    setVoting(false);
  };

  const getVoteCount = (voteType: string) => {
    return votes.filter((v) => v.vote_type === voteType).length;
  };

  const totalVotes = votes.length;

  return (
    <div className="space-y-4">
      {/* Voting Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {VOTE_TYPES.map(({ type, label, icon: Icon, color }) => {
          const count = getVoteCount(type);
          const isMyVote = myVote === type;

          return (
            <Button
              key={type}
              variant={isMyVote ? 'default' : 'outline'}
              onClick={() => castVote(type)}
              disabled={voting}
              className={cn(
                'flex flex-col items-center gap-1 h-auto py-3',
                isMyVote && 'bg-primary border-2 border-primary'
              )}
            >
              <Icon className={cn('w-5 h-5', isMyVote ? 'text-primary-foreground' : color)} />
              <span className="text-xs font-medium">{label}</span>
              {count > 0 && (
                <span className="text-xs opacity-70">
                  {count} {count === 1 ? 'vote' : 'votes'}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Vote Summary */}
      {totalVotes > 0 && (
        <div className="p-3 bg-card/50 rounded-lg border border-border/50">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Team Assessment</h4>
          <div className="space-y-1">
            {VOTE_TYPES.map(({ type, label }) => {
              const count = getVoteCount(type);
              if (count === 0) return null;

              const percentage = ((count / totalVotes) * 100).toFixed(0);
              const voters = votes
                .filter((v) => v.vote_type === type)
                .map((v) => v.voter?.full_name || 'Unknown')
                .join(', ');

              return (
                <div key={type} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-foreground">{label}</span>
                    <span className="text-muted-foreground">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">{voters}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        🔒 Votes are hidden from candidates
      </p>
    </div>
  );
}
