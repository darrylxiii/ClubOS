import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Target, AlertCircle, MessageCircle, Sparkles, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

interface InterviewPrepBrief {
  id: string;
  candidate_summary: string;
  key_strengths: string[];
  potential_concerns: string[];
  cv_gaps: string[];
  suggested_questions: Array<{ question: string; category: string; priority: string }>;
  conversation_starters: string[];
  technical_topics: string[];
}

interface InterviewPrepPanelProps {
  meetingId: string;
  candidateId?: string;
  roleTitle?: string;
  companyName?: string;
  userRole: string;
}

export function InterviewPrepPanel({
  meetingId,
  candidateId,
  roleTitle,
  companyName,
  userRole
}: InterviewPrepPanelProps) {
  const [brief, setBrief] = useState<InterviewPrepBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Only show to interviewers
  if (!['host', 'interviewer', 'observer'].includes(userRole)) {
    return null;
  }

  useEffect(() => {
    loadBrief();
  }, [meetingId]);

  const loadBrief = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_prep_briefs')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading prep brief:', error);
      } else if (data) {
        setBrief(data as any);
      }
    } catch (error) {
      console.error('Error loading prep brief:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBrief = async () => {
    if (!candidateId || !roleTitle) {
      toast.error("Missing candidate or role information");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-interview-prep', {
        body: { meetingId, candidateId, roleTitle, companyName }
      });

      if (error) throw error;
      
      setBrief(data.brief as any);
      toast.success("Interview prep brief generated!");
    } catch (error) {
      console.error('Error generating prep brief:', error);
      toast.error("Failed to generate prep brief");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading interview prep...</span>
        </div>
      </Card>
    );
  }

  if (!brief) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm text-center">
        <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-semibold mb-2">AI Interview Prep</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a comprehensive interview preparation brief with Club AI
        </p>
        <Button onClick={generateBrief} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Prep Brief
            </>
          )}
        </Button>
      </Card>
    );
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'destructive';
    if (priority === 'medium') return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">Candidate Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {brief.candidate_summary}
            </p>
          </div>
        </div>
      </Card>

      <Accordion type="single" collapsible className="space-y-2">
        <AccordionItem value="strengths">
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                <span className="font-semibold">Key Strengths</span>
                <Badge variant="secondary">{brief.key_strengths.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3">
              <ul className="space-y-1.5 text-sm">
                {brief.key_strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                    <span className="text-muted-foreground">{strength}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {brief.potential_concerns.length > 0 && (
          <AccordionItem value="concerns">
            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">Areas to Probe</span>
                  <Badge variant="secondary">{brief.potential_concerns.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <ul className="space-y-1.5 text-sm">
                  {brief.potential_concerns.map((concern, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                      <span className="text-muted-foreground">{concern}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        <AccordionItem value="questions">
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="font-semibold">Suggested Questions</span>
                <Badge variant="secondary">{brief.suggested_questions.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {brief.suggested_questions.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-background/50 border">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <Badge variant={getPriorityColor(q.priority)} className="shrink-0">
                          {q.priority}
                        </Badge>
                        <Badge variant="outline" className="shrink-0 capitalize">
                          {q.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">{q.question}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {brief.conversation_starters.length > 0 && (
          <AccordionItem value="starters">
            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Conversation Starters</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <ul className="space-y-1.5 text-sm">
                  {brief.conversation_starters.map((starter, idx) => (
                    <li key={idx} className="text-muted-foreground italic">
                      "{starter}"
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}