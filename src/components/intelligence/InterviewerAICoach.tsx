import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, BookOpen, MessageSquare, Target, Clock, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface InterviewerAICoachProps {
  candidateId: string;
  jobId: string;
  interviewerId: string;
  interviewType?: string;
}

export function InterviewerAICoach({ candidateId, jobId, interviewerId, interviewType }: InterviewerAICoachProps) {
  const [loading, setLoading] = useState(false);
  const [prep, setPrep] = useState<any>(null);

  const loadPrepMaterial = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-interview-prep-ai', {
        body: { candidateId, jobId, interviewerId, interviewType }
      });

      if (error) throw error;
      setPrep(data.prepMaterial);
      toast.success("AI interview prep ready");
    } catch (error: any) {
      console.error('Error loading prep:', error);
      toast.error("Failed to generate prep material");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrepMaterial();
  }, [candidateId, jobId, interviewerId, interviewType]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Preparing personalized interview coaching...</p>
        </CardContent>
      </Card>
    );
  }

  if (!prep) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <Button onClick={loadPrepMaterial} className="w-full">
            <Brain className="h-4 w-4 mr-2" />
            Generate AI Interview Prep
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Your AI Interview Coach
            </CardTitle>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {prep.estimatedInterviewTime} min
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-background/60 border border-border/40">
            <p className="text-sm leading-relaxed">{prep.candidateSummary}</p>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              What Makes This Candidate Unique
            </h4>
            <p className="text-sm text-muted-foreground">{prep.whatMakesThisCandidateUnique}</p>
          </div>
        </CardContent>
      </Card>

      {/* Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Focus Areas for Your Interview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {prep.focusAreas.map((area: string, idx: number) => (
              <Badge key={idx} variant="secondary">
                {area}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI-Suggested Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {prep.suggestedQuestions.map((q: any, idx: number) => (
              <AccordionItem key={idx} value={`question-${idx}`}>
                <AccordionTrigger className="text-sm hover:no-underline">
                  <div className="flex items-start gap-2 text-left">
                    <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                    <span>{q.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-8 pt-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Why ask this?</p>
                      <p className="text-sm">{q.rationale}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Expected insights</p>
                      <p className="text-sm">{q.expectedInsights}</p>
                    </div>
                    {q.followUps && q.followUps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Follow-ups</p>
                        <ul className="space-y-1">
                          {q.followUps.map((followUp: string, fIdx: number) => (
                            <li key={fIdx} className="text-sm flex items-start gap-2">
                              <span className="text-primary">→</span>
                              <span>{followUp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Conversation Starters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversation Starters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {prep.conversationStarters.map((starter: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <span className="text-primary mt-0.5">💬</span>
                <span>"{starter}"</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Skills to Assess */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Key Skills to Assess
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {prep.keySkillsToAssess.map((skill: string, idx: number) => (
              <Badge key={idx} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Culture Fit & Red Flags */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Culture Fit Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {prep.cultureFitIndicators.map((indicator: string, idx: number) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{indicator}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-500">Red Flags to Watch</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {prep.redFlagsToWatch.map((flag: string, idx: number) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">⚠</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Previous Round Insights */}
      {prep.previousRoundInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Previous Interview Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{prep.previousRoundInsights}</p>
          </CardContent>
        </Card>
      )}

      {/* Potential Concerns */}
      {prep.potentialConcerns && prep.potentialConcerns.length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-sm text-red-500">Potential Concerns to Probe</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {prep.potentialConcerns.map((concern: string, idx: number) => (
                <li key={idx} className="text-xs flex items-start gap-2 text-red-500/80">
                  <span className="mt-0.5">•</span>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button onClick={loadPrepMaterial} variant="outline" className="w-full" size="sm">
        <Sparkles className="h-4 w-4 mr-2" />
        Regenerate Prep Material
      </Button>
    </div>
  );
}
