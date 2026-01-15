import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Plus, BarChart3, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Poll {
  id: string;
  question: string;
  options: Array<{ text: string; votes: number }>;
  allow_multiple: boolean;
  is_active: boolean;
  total_votes: number;
  user_voted: boolean;
}

interface MeetingPollPanelProps {
  meetingId: string;
  isHost: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeetingPollPanel({ meetingId, isHost, open, onOpenChange }: MeetingPollPanelProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (open) {
      loadPolls();
      
      const channel = supabase
        .channel(`polls-${meetingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meeting_polls',
            filter: `meeting_id=eq.${meetingId}`
          },
          () => loadPolls()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meeting_poll_responses',
          },
          () => loadPolls()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, meetingId]);

  const loadPolls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: pollsData, error } = await supabase
        .from('meeting_polls' as any)
        .select(`
          *,
          meeting_poll_responses(count)
        `)
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = await Promise.all(pollsData?.map(async (poll: any) => {
        const { data: userVote } = await supabase
          .from('meeting_poll_responses' as any)
          .select('id')
          .eq('poll_id', poll.id)
          .eq('participant_id', user?.id || '')
          .single();

        return {
          id: poll.id,
          question: poll.question,
          options: poll.options as any || [],
          allow_multiple: poll.allow_multiple,
          is_active: poll.is_active,
          total_votes: (poll.meeting_poll_responses as any)[0]?.count || 0,
          user_voted: !!userVote
        };
      }) || []);

      setPolls(formatted);
    } catch (error) {
      console.error('Error loading polls:', error);
    }
  };

  const createPoll = async () => {
    if (!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2) {
      toast.error("Question and at least 2 options are required");
      return;
    }

    try {
      const options = newOptions
        .filter(o => o.trim())
        .map(text => ({ text, votes: 0 }));

      const { error } = await supabase
        .from('meeting_polls' as any)
        .insert({
          meeting_id: meetingId,
          question: newQuestion,
          options,
          poll_type: 'multiple_choice'
        });

      if (error) throw error;

      setNewQuestion("");
      setNewOptions(["", ""]);
      setShowCreateForm(false);
      toast.success("Poll created");
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error("Failed to create poll");
    }
  };

  const votePoll = async (pollId: string, optionIndex: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('meeting_poll_responses' as any)
        .insert({
          poll_id: pollId,
          participant_id: user.id,
          participant_name: user.user_metadata.full_name || user.email,
          selected_options: [optionIndex]
        });

      if (error) throw error;

      // Update vote count
      const poll = polls.find(p => p.id === pollId);
      if (poll) {
        const updatedOptions = [...poll.options];
        updatedOptions[optionIndex].votes += 1;
        
        await supabase
          .from('meeting_polls' as any)
          .update({ options: updatedOptions })
          .eq('id', pollId);
      }

      toast.success("Vote recorded");
    } catch (error: any) {
      if (error.code === '23505') {
        toast.info("You've already voted on this poll");
      } else {
        toast.error("Failed to vote");
      }
    }
  };

  const closePoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_polls' as any)
        .update({ is_active: false })
        .eq('id', pollId);

      if (error) throw error;
      toast.success("Poll closed");
    } catch (error) {
      toast.error("Failed to close poll");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] p-0 z-[10200]">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Live Polls
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {isHost && (
            <>
              {!showCreateForm ? (
                <Button onClick={() => setShowCreateForm(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Poll
                </Button>
              ) : (
                <Card className="p-4 bg-card/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">New Poll</h3>
                    <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Input
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Enter your question"
                  />
                  
                  <div className="space-y-2">
                    {newOptions.map((option, idx) => (
                      <Input
                        key={idx}
                        value={option}
                        onChange={(e) => {
                          const updated = [...newOptions];
                          updated[idx] = e.target.value;
                          setNewOptions(updated);
                        }}
                        placeholder={`Option ${idx + 1}`}
                      />
                    ))}
                    {newOptions.length < 6 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNewOptions([...newOptions, ""])}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>

                  <Button onClick={createPoll} className="w-full">
                    Create Poll
                  </Button>
                </Card>
              )}
            </>
          )}

          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {polls.length === 0 ? (
                <Card className="p-8 text-center bg-card/50">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No polls yet</p>
                </Card>
              ) : (
                polls.map((poll) => (
                  <Card key={poll.id} className="p-4 bg-card/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{poll.question}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={poll.is_active ? "default" : "secondary"}>
                            {poll.is_active ? 'Active' : 'Closed'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      {isHost && poll.is_active && (
                        <Button size="sm" variant="ghost" onClick={() => closePoll(poll.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {poll.options.map((option, idx) => {
                        const percentage = poll.total_votes > 0
                          ? Math.round((option.votes / poll.total_votes) * 100)
                          : 0;

                        return (
                          <div key={idx}>
                            <Button
                              variant="outline"
                              className="w-full justify-start mb-1"
                              onClick={() => votePoll(poll.id, idx)}
                              disabled={!poll.is_active || poll.user_voted}
                            >
                              {poll.user_voted && <Check className="w-4 h-4 mr-2 text-primary" />}
                              {option.text}
                            </Button>
                            <div className="flex items-center gap-2">
                              <Progress value={percentage} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground w-12 text-right">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}