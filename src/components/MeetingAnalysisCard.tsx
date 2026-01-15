import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Lightbulb, Mail, ListTodo, TrendingUp, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";

interface AnalysisData {
  whatWentWell: string[];
  redFlags: string[];
  keyInsights: string[];
  followUpEmailDraft: string;
  actionItems: Array<{
    title: string;
    description: string;
    priority: string;
    category: string;
  }>;
  overallSentiment: string;
  improvementAreas: string[];
}

interface MeetingAnalysisCardProps {
  analysis: AnalysisData;
  transcript?: string;
  analyzedAt: string;
  tasksCreated?: number;
}

export const MeetingAnalysisCard = ({ 
  analysis, 
  transcript, 
  analyzedAt,
  tasksCreated 
}: MeetingAnalysisCardProps) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'negative': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      {/* Overall Sentiment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overall Assessment
            </CardTitle>
            <Badge className={getSentimentColor(analysis.overallSentiment)}>
              {analysis.overallSentiment.toUpperCase()}
            </Badge>
          </div>
          <CardDescription>
            Analysis completed on {new Date(analyzedAt).toLocaleString()}
            {tasksCreated && tasksCreated > 0 && (
              <span className="ml-2 text-accent">• {tasksCreated} tasks created</span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* What Went Well */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            What Went Well
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.whatWentWell.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Red Flags */}
      {analysis.redFlags && analysis.redFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Red Flags & Concerns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.redFlags.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">⚠</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.keyInsights.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">💡</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Improvement Areas */}
      {analysis.improvementAreas && analysis.improvementAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-500" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.improvementAreas.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Follow-up Email Draft */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              Follow-up Email Draft
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(analysis.followUpEmailDraft)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {analysis.followUpEmailDraft}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      {analysis.actionItems && analysis.actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-purple-500" />
              Action Items
            </CardTitle>
            <CardDescription>
              These tasks have been automatically added to your task board
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.actionItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{item.title}</h4>
                    <Badge variant={
                      item.priority === 'high' ? 'destructive' :
                      item.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Full Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{transcript}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
