import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Minus, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveVotingPanelProps {
  applicationId: string;
  meetingId?: string;
}

interface VoteData {
  evaluator_id: string;
  evaluator_name: string;
  evaluator_avatar?: string;
  recommendation: string;
  overall_score: number;
  submitted_at: string;
}

interface VotingSummary {
  total_evaluators: number;
  votes_received: number;
  strong_yes: number;
  yes: number;
  neutral: number;
  no: number;
  strong_no: number;
  average_score: number;
}

const recommendationColors: Record<string, string> = {
  strong_yes: 'bg-green-500',
  yes: 'bg-green-400',
  neutral: 'bg-gray-400',
  no: 'bg-red-400',
  strong_no: 'bg-red-500',
};

const recommendationIcons: Record<string, React.ElementType> = {
  strong_yes: ThumbsUp,
  yes: ThumbsUp,
  neutral: Minus,
  no: ThumbsDown,
  strong_no: ThumbsDown,
};

export function LiveVotingPanel({ applicationId, meetingId }: LiveVotingPanelProps) {
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [summary, setSummary] = useState<VotingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVotes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`scorecards-${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_scorecards',
          filter: `application_id=eq.${applicationId}`,
        },
        () => {
          loadVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationId]);

  async function loadVotes() {
    try {
      // Get scorecards for this application - use correct column name 'overall_rating'
      const { data: scorecards, error } = await supabase
        .from('candidate_scorecards')
        .select('evaluator_id, recommendation, overall_rating, created_at')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get evaluator profiles
      const evaluatorIds = [...new Set(scorecards?.map(s => s.evaluator_id) || [])];
      
      let profiles: Record<string, any> = {};
      if (evaluatorIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', evaluatorIds);
        
        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      // Transform to vote data
      const voteData: VoteData[] = (scorecards || []).map(s => ({
        evaluator_id: s.evaluator_id,
        evaluator_name: profiles[s.evaluator_id]?.full_name || 'Unknown',
        evaluator_avatar: profiles[s.evaluator_id]?.avatar_url,
        recommendation: s.recommendation || 'neutral',
        overall_score: s.overall_rating || 0,
        submitted_at: s.created_at || '',
      }));

      setVotes(voteData);

      // Calculate summary
      const voteSummary: VotingSummary = {
        total_evaluators: evaluatorIds.length,
        votes_received: scorecards?.length || 0,
        strong_yes: scorecards?.filter(s => s.recommendation === 'strong_yes').length || 0,
        yes: scorecards?.filter(s => s.recommendation === 'yes').length || 0,
        neutral: scorecards?.filter(s => s.recommendation === 'neutral').length || 0,
        no: scorecards?.filter(s => s.recommendation === 'no').length || 0,
        strong_no: scorecards?.filter(s => s.recommendation === 'strong_no').length || 0,
        average_score: scorecards?.length 
          ? scorecards.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / scorecards.length 
          : 0,
      };

      setSummary(voteSummary);
    } catch (error) {
      console.error('Failed to load votes:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const positiveVotes = (summary?.strong_yes || 0) + (summary?.yes || 0);
  const negativeVotes = (summary?.no || 0) + (summary?.strong_no || 0);
  const totalVotes = summary?.votes_received || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Panel Voting
          {totalVotes > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vote Distribution Bar */}
        {totalVotes > 0 && (
          <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden">
              {summary?.strong_yes ? (
                <div 
                  className="bg-green-500" 
                  style={{ width: `${(summary.strong_yes / totalVotes) * 100}%` }}
                />
              ) : null}
              {summary?.yes ? (
                <div 
                  className="bg-green-400" 
                  style={{ width: `${(summary.yes / totalVotes) * 100}%` }}
                />
              ) : null}
              {summary?.neutral ? (
                <div 
                  className="bg-gray-400" 
                  style={{ width: `${(summary.neutral / totalVotes) * 100}%` }}
                />
              ) : null}
              {summary?.no ? (
                <div 
                  className="bg-red-400" 
                  style={{ width: `${(summary.no / totalVotes) * 100}%` }}
                />
              ) : null}
              {summary?.strong_no ? (
                <div 
                  className="bg-red-500" 
                  style={{ width: `${(summary.strong_no / totalVotes) * 100}%` }}
                />
              ) : null}
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3 text-green-500" />
                {positiveVotes}
              </span>
              <span className="flex items-center gap-1">
                <Minus className="h-3 w-3" />
                {summary?.neutral || 0}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown className="h-3 w-3 text-red-500" />
                {negativeVotes}
              </span>
            </div>
          </div>
        )}

        {/* Average Score */}
        {summary && summary.average_score > 0 && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
            <span className="text-sm text-muted-foreground">Average Score</span>
            <span className="text-lg font-semibold">
              {summary.average_score.toFixed(1)}/5
            </span>
          </div>
        )}

        {/* Individual Votes */}
        <div className="space-y-2">
          {votes.map((vote) => {
            const Icon = recommendationIcons[vote.recommendation] || Minus;
            return (
              <div
                key={vote.evaluator_id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={vote.evaluator_avatar} />
                  <AvatarFallback className="text-xs">
                    {vote.evaluator_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{vote.evaluator_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {vote.overall_score}/5
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`flex items-center gap-1 ${
                    vote.recommendation.includes('yes') 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : vote.recommendation.includes('no')
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : ''
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {vote.recommendation.replace('_', ' ')}
                </Badge>
              </div>
            );
          })}

          {votes.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No votes submitted yet</p>
            </div>
          )}
        </div>

        {/* Consensus Indicator */}
        {totalVotes >= 2 && (
          <div className="pt-2 border-t">
            {positiveVotes > negativeVotes * 2 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Strong positive consensus</span>
              </div>
            ) : negativeVotes > positiveVotes * 2 ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Strong concerns raised</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Minus className="h-4 w-4" />
                <span className="text-sm">Mixed feedback - further discussion needed</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
