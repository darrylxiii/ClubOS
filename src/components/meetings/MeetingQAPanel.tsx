import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircleQuestion, ThumbsUp, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  asker_name: string;
  is_anonymous: boolean;
  upvotes: number;
  is_answered: boolean;
  answer_text: string | null;
  created_at: string;
  user_upvoted: boolean;
}

interface MeetingQAPanelProps {
  meetingId: string;
  isHost: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeetingQAPanel({ meetingId, isHost, open, onOpenChange }: MeetingQAPanelProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");

  useEffect(() => {
    if (open) {
      loadQuestions();
      
      const channel = supabase
        .channel(`qa-${meetingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'meeting_questions',
            filter: `meeting_id=eq.${meetingId}`
          },
          () => loadQuestions()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, meetingId]);

  const loadQuestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: questionsData, error } = await supabase
        .from('meeting_questions' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = await Promise.all(questionsData?.map(async (q: any) => {
        const { data: upvote } = await supabase
          .from('meeting_question_upvotes' as any)
          .select('id')
          .eq('question_id', q.id)
          .eq('participant_id', user?.id || '')
          .single();

        return {
          ...q,
          user_upvoted: !!upvote
        };
      }) || []);

      setQuestions(formatted as any);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const askQuestion = async () => {
    if (!newQuestion.trim()) {
      toast.error("Question cannot be empty");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('meeting_questions' as any)
        .insert({
          meeting_id: meetingId,
          asked_by: isAnonymous ? null : user?.id,
          asker_name: isAnonymous ? 'Anonymous' : (user?.user_metadata.full_name || user?.email || 'Guest'),
          question_text: newQuestion,
          is_anonymous: isAnonymous
        });

      if (error) throw error;

      setNewQuestion("");
      setIsAnonymous(false);
      toast.success("Question submitted");
    } catch (error) {
      console.error('Error asking question:', error);
      toast.error("Failed to submit question");
    }
  };

  const upvoteQuestion = async (questionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const question = questions.find(q => q.id === questionId);
      if (question?.user_upvoted) {
        // Remove upvote
        await supabase
          .from('meeting_question_upvotes' as any)
          .delete()
          .eq('question_id', questionId)
          .eq('participant_id', user.id);

        await supabase
          .from('meeting_questions' as any)
          .update({ upvotes: Math.max(0, question.upvotes - 1) })
          .eq('id', questionId);
      } else {
        // Add upvote
        await supabase
          .from('meeting_question_upvotes' as any)
          .insert({
            question_id: questionId,
            participant_id: user.id
          });

        await supabase
          .from('meeting_questions' as any)
          .update({ upvotes: (question?.upvotes || 0) + 1 })
          .eq('id', questionId);
      }

      loadQuestions();
    } catch (error: any) {
      if (error.code !== '23505') {
        toast.error("Failed to upvote");
      }
    }
  };

  const answerQuestion = async (questionId: string) => {
    if (!answerText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('meeting_questions' as any)
        .update({
          is_answered: true,
          answer_text: answerText,
          answered_by: user?.id,
          answered_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (error) throw error;

      setAnsweringId(null);
      setAnswerText("");
      toast.success("Answer posted");
    } catch (error) {
      toast.error("Failed to post answer");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] p-0 z-[10200]">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5" />
            Q&A
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <Card className="p-4 bg-card/50">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a question..."
              rows={3}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                />
                <label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
                  Ask anonymously
                </label>
              </div>
              <Button onClick={askQuestion} size="sm">
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </div>
          </Card>

          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {questions.length === 0 ? (
                <Card className="p-8 text-center bg-card/50">
                  <MessageCircleQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No questions yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Be the first to ask a question
                  </p>
                </Card>
              ) : (
                questions.map((q) => (
                  <Card key={q.id} className="p-4 bg-card/50">
                    <div className="flex items-start gap-3">
                      <Button
                        size="sm"
                        variant={q.user_upvoted ? "default" : "outline"}
                        className="shrink-0"
                        onClick={() => upvoteQuestion(q.id)}
                      >
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        {q.upvotes}
                      </Button>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium">{q.question_text}</p>
                          {q.is_answered && (
                            <Badge variant="default" className="shrink-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Answered
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          Asked by {q.asker_name}
                        </p>

                        {q.is_answered && q.answer_text && (
                          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-sm">{q.answer_text}</p>
                          </div>
                        )}

                        {isHost && !q.is_answered && answeringId === q.id && (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="Type your answer..."
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => answerQuestion(q.id)}>
                                Post Answer
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setAnsweringId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {isHost && !q.is_answered && answeringId !== q.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => setAnsweringId(q.id)}
                          >
                            Answer
                          </Button>
                        )}
                      </div>
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