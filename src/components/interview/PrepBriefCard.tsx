import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  AlertTriangle, 
  MessageCircle, 
  Code,
  Star,
  User
} from "lucide-react";

interface PrepBriefCardProps {
  brief: {
    id: string;
    role_title: string | null;
    company_name: string | null;
    candidate_summary: string | null;
    key_strengths: string[] | null;
    potential_concerns: string[] | null;
    cv_gaps: string[] | null;
    suggested_questions: any;
    conversation_starters: string[] | null;
    technical_topics: string[] | null;
    generated_at: string | null;
  };
}

export function PrepBriefCard({ brief }: PrepBriefCardProps) {
  const questions = brief.suggested_questions as { question: string; why: string }[] | null;

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <div className="w-1 h-6 bg-foreground" />
              Interview Brief
            </CardTitle>
            <CardDescription className="mt-1">
              {brief.role_title} at {brief.company_name}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            <Lightbulb className="h-3 w-3 mr-1" />
            AI Generated
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        {brief.candidate_summary && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Your Summary
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              {brief.candidate_summary}
            </p>
          </div>
        )}

        {/* Key Strengths */}
        {brief.key_strengths && brief.key_strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              Key Strengths to Highlight
            </h4>
            <div className="flex flex-wrap gap-2">
              {brief.key_strengths.map((strength, idx) => (
                <Badge key={idx} variant="secondary" className="bg-success/10 text-success">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Areas to Prepare */}
        {brief.potential_concerns && brief.potential_concerns.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Areas to Prepare
            </h4>
            <ul className="space-y-1">
              {brief.potential_concerns.map((concern, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conversation Starters */}
        {brief.conversation_starters && brief.conversation_starters.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Questions to Ask Them
            </h4>
            <div className="space-y-2">
              {brief.conversation_starters.slice(0, 5).map((starter, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm"
                >
                  "{starter}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Topics */}
        {brief.technical_topics && brief.technical_topics.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Code className="h-4 w-4" />
              Technical Topics to Review
            </h4>
            <div className="flex flex-wrap gap-2">
              {brief.technical_topics.map((topic, idx) => (
                <Badge key={idx} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Questions with Context */}
        {questions && questions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Expected Questions</h4>
            <div className="space-y-3">
              {questions.slice(0, 5).map((q, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-muted/20">
                  <p className="font-medium text-sm">{q.question}</p>
                  {q.why && (
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 {q.why}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
