import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Lock, Users, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PollMessageProps {
  pollId: string;
  pollData: {
    question: string;
    options: string[];
    pollType: 'single' | 'multiple' | 'ranking';
    showResultsBeforeVote?: boolean;
    isClosed?: boolean;
    closeAt?: string;
  };
}

interface SortableRankItemProps {
  id: number;
  index: number;
  option: string;
  disabled: boolean;
}

function SortableRankItem({ id, index, option, disabled }: SortableRankItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: String(id), disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 bg-muted p-2 rounded cursor-grab"
    >
      <GripVertical className="w-4 h-4 text-muted-foreground" />
      <Badge variant="outline" className="w-8 text-center">#{index + 1}</Badge>
      <span className="flex-1">{option}</span>
    </div>
  );
}

export const PollMessage = ({ pollId, pollData }: PollMessageProps) => {
  const { user } = useAuth();
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVote, setUserVote] = useState<number[] | null>(null);
  const [rankedOptions, setRankedOptions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(pollData.isClosed || false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadVotes();
    checkPollClosure();
    const subscription = subscribeToVotes();
    return () => {
      subscription.unsubscribe();
    };
  }, [pollId]);

  const checkPollClosure = () => {
    if (pollData.closeAt) {
      const closeTime = new Date(pollData.closeAt);
      const now = new Date();
      if (now >= closeTime) {
        setIsClosed(true);
      } else {
        const timeout = closeTime.getTime() - now.getTime();
        setTimeout(() => {
          setIsClosed(true);
          toast.info('Poll has closed');
        }, timeout);
      }
    }
  };

  const loadVotes = async () => {
    const { data: pollVotes, error } = await (supabase
      .from('poll_votes' as any)
      .select('selected_options, ranking, user_id')
      .eq('poll_id', pollId) as any);

    if (error) {
      console.error('Error loading votes:', error);
      setLoading(false);
      return;
    }

    processVotes(pollVotes || []);
    setLoading(false);
  };

  const processVotes = (pollVotes: any[]) => {
    const voteCounts: Record<number, number> = {};
    pollData.options.forEach((_, i) => {
      voteCounts[i] = 0;
    });

    let total = 0;
    let myVote: number[] | null = null;

    pollVotes.forEach(vote => {
      if (pollData.pollType === 'ranking' && vote.ranking) {
        const ranking = vote.ranking as number[];
        ranking.forEach((optionIndex, rank) => {
          const points = pollData.options.length - rank;
          voteCounts[optionIndex] = (voteCounts[optionIndex] || 0) + points;
        });
        total++;

        if (user && vote.user_id === user.id) {
          myVote = ranking;
        }
      } else if (vote.selected_options) {
        const selections = vote.selected_options as number[];
        selections.forEach(index => {
          voteCounts[index] = (voteCounts[index] || 0) + 1;
        });
        total++;

        if (user && vote.user_id === user.id) {
          myVote = selections;
        }
      }
    });

    setVotes(voteCounts);
    setTotalVotes(total);
    setUserVote(myVote);

    if (myVote && pollData.pollType === 'ranking') {
      setRankedOptions(myVote);
    }
  };

  const subscribeToVotes = () => {
    return supabase
      .channel(`poll:${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `poll_id=eq.${pollId}`
        },
        () => loadVotes()
      )
      .subscribe();
  };

  const handleSingleVote = async (index: number) => {
    if (!user || isClosed) return;

    setUserVote([index]);

    const { error } = await (supabase
      .from('poll_votes' as any)
      .upsert({
        poll_id: pollId,
        user_id: user.id,
        selected_options: [index]
      } as any, {
        onConflict: 'poll_id,user_id'
      }) as any);

    if (error) {
      console.error('Error voting:', error);
      toast.error('Failed to submit vote');
      loadVotes();
    } else {
      toast.success('Vote submitted');
    }
  };

  const handleMultipleVote = async (index: number, checked: boolean) => {
    if (!user || isClosed) return;

    let newVote = userVote ? [...userVote] : [];
    if (checked) {
      if (!newVote.includes(index)) {
        newVote.push(index);
      }
    } else {
      newVote = newVote.filter(i => i !== index);
    }

    setUserVote(newVote);

    const { error } = await (supabase
      .from('poll_votes' as any)
      .upsert({
        poll_id: pollId,
        user_id: user.id,
        selected_options: newVote
      } as any, {
        onConflict: 'poll_id,user_id'
      }) as any);

    if (error) {
      console.error('Error voting:', error);
      toast.error('Failed to submit vote');
      loadVotes();
    }
  };

  const handleRankingDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = rankedOptions.length > 0 ? rankedOptions : pollData.options.map((_, i) => i);
    const oldIndex = items.indexOf(Number(active.id));
    const newIndex = items.indexOf(Number(over.id));

    const newOrder = arrayMove(items, oldIndex, newIndex);
    setRankedOptions(newOrder);
  };

  const submitRanking = async () => {
    if (!user || isClosed || rankedOptions.length === 0) return;

    const { error } = await (supabase
      .from('poll_votes' as any)
      .upsert({
        poll_id: pollId,
        user_id: user.id,
        selected_options: [],
        ranking: rankedOptions
      } as any, {
        onConflict: 'poll_id,user_id'
      }) as any);

    if (error) {
      console.error('Error voting:', error);
      toast.error('Failed to submit vote');
    } else {
      setUserVote(rankedOptions);
      toast.success('Ranking submitted');
    }
  };

  if (loading) return <div className="animate-pulse h-20 bg-muted rounded" />;

  const hasVoted = userVote !== null && userVote.length > 0;
  const showResults = hasVoted || pollData.showResultsBeforeVote || isClosed;

  const currentRankItems = rankedOptions.length > 0 ? rankedOptions : pollData.options.map((_, i) => i);

  return (
    <div className="bg-card border border-border rounded-lg p-4 max-w-md w-full space-y-4 my-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-lg flex-1">{pollData.question}</h3>
        {isClosed && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Closed
          </Badge>
        )}
      </div>

      {pollData.closeAt && !isClosed && (
        <p className="text-xs text-muted-foreground">
          Closes {new Date(pollData.closeAt).toLocaleString()}
        </p>
      )}

      {/* Single Choice Poll */}
      {pollData.pollType === 'single' && (
        <div className="space-y-3">
          {pollData.options.map((option, index) => {
            const voteCount = votes[index] || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = userVote?.includes(index);

            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={isSelected ? 'font-medium text-primary' : ''}>{option}</span>
                  {showResults && (
                    <span className="text-muted-foreground">{percentage}% ({voteCount})</span>
                  )}
                </div>
                {showResults && <Progress value={percentage} className="h-2" />}
                {!hasVoted && !isClosed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1"
                    onClick={() => handleSingleVote(index)}
                  >
                    Vote
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Multiple Choice Poll */}
      {pollData.pollType === 'multiple' && (
        <div className="space-y-3">
          {pollData.options.map((option, index) => {
            const voteCount = votes[index] || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = userVote?.includes(index);

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  {!isClosed && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleMultipleVote(index, checked as boolean)}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className={isSelected ? 'font-medium text-primary' : ''}>{option}</span>
                      {showResults && (
                        <span className="text-muted-foreground">{percentage}% ({voteCount})</span>
                      )}
                    </div>
                    {showResults && <Progress value={percentage} className="h-2" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranking Poll */}
      {pollData.pollType === 'ranking' && (
        <div className="space-y-3">
          {hasVoted ? (
            <div className="space-y-2">
              {pollData.options
                .map((option, index) => ({ option, index, points: votes[index] || 0 }))
                .sort((a, b) => b.points - a.points)
                .map(({ option, index, points }, rank) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="outline" className="w-8 text-center">#{rank + 1}</Badge>
                    <span className="flex-1">{option}</span>
                    <span className="text-sm text-muted-foreground">{points} pts</span>
                  </div>
                ))}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Drag to rank your preferences</p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleRankingDragEnd}
              >
                <SortableContext
                  items={currentRankItems.map(String)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {currentRankItems.map((optionIndex, rank) => (
                      <SortableRankItem
                        key={optionIndex}
                        id={optionIndex}
                        index={rank}
                        option={pollData.options[optionIndex]}
                        disabled={isClosed}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {!isClosed && rankedOptions.length > 0 && (
                <Button onClick={submitRanking} className="w-full">
                  Submit Ranking
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
        <Badge variant="outline" className="text-xs">
          {pollData.pollType === 'single' ? 'Single Choice' :
            pollData.pollType === 'multiple' ? 'Multiple Choice' : 'Ranking'}
        </Badge>
      </div>
    </div>
  );
};
