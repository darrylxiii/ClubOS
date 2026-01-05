import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Clock, Target, MessageSquare, CheckCircle2 } from "lucide-react";
import { MeetingTemplate } from "./MeetingTemplateSelector";

interface InterviewPlaybookProps {
  template: MeetingTemplate;
  onQuestionComplete?: (questionIndex: number, completed: boolean) => void;
}

export function InterviewPlaybook({ template, onQuestionComplete }: InterviewPlaybookProps) {
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [isRubricOpen, setIsRubricOpen] = useState(false);

  const toggleQuestion = (index: number) => {
    setCompletedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      onQuestionComplete?.(index, next.has(index));
      return next;
    });
  };

  const progress = (completedQuestions.size / template.questions.length) * 100;
  const timePerQuestion = Math.floor(template.duration / Math.max(template.questions.length, 1));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Interview Playbook
          </CardTitle>
          <Badge variant="outline">
            {completedQuestions.size}/{template.questions.length} completed
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            ~{timePerQuestion} min per question
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {template.duration} min total
          </span>
        </div>

        <div className="space-y-2">
          {template.questions.map((question, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                completedQuestions.has(idx) 
                  ? "bg-primary/5 border-primary/20" 
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={completedQuestions.has(idx)}
                onCheckedChange={() => toggleQuestion(idx)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <p className={`text-sm ${completedQuestions.has(idx) ? "line-through text-muted-foreground" : ""}`}>
                  {question}
                </p>
              </div>
              {completedQuestions.has(idx) && (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
          ))}
        </div>

        {template.scoringRubric && template.scoringRubric.length > 0 && (
          <Collapsible open={isRubricOpen} onOpenChange={setIsRubricOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Scoring Rubric
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isRubricOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                {template.scoringRubric.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{item.criterion}</span>
                    <Badge variant="secondary">{item.weight}%</Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
