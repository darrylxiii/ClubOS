import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, MessageSquare, Target, AlertTriangle, Lightbulb } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InterviewIntelligence {
  id: string;
  communication_clarity_score: number;
  technical_depth_score: number;
  culture_fit_score: number;
  confidence_score: number;
  overall_score: number;
  red_flags: Array<{ flag: string; severity: string; timestamp: string }>;
  positive_signals: Array<{ signal: string; timestamp: string }>;
  follow_up_suggestions: string[];
  topic_coverage: { technical: number; behavioral: number; culture: number };
  last_updated_at: string;
}

interface InterviewScoringDashboardProps {
  meetingId: string;
  userRole: string; // Only show to 'host', 'interviewer', 'observer'
}

export function InterviewScoringDashboard({ meetingId, userRole }: InterviewScoringDashboardProps) {
  const [intelligence, setIntelligence] = useState<InterviewIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthorizedRole = ['host', 'interviewer', 'observer'].includes(userRole);

  useEffect(() => {
    if (!isAuthorizedRole) return;

    loadIntelligence();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`interview-intelligence-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_intelligence',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          if (payload.new) {
            setIntelligence(payload.new as unknown as InterviewIntelligence);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, isAuthorizedRole]);

  // Only show to interviewers, not candidates - moved after hooks
  if (!isAuthorizedRole) {
    return null;
  }

  const loadIntelligence = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_intelligence')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading intelligence:', error);
      } else if (data) {
        setIntelligence(data as any);
      }
    } catch (error) {
      console.error('Error loading intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="w-4 h-4 animate-pulse" />
          <span>Loading Club AI Interview Intelligence...</span>
        </div>
      </Card>
    );
  }

  if (!intelligence) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="w-4 h-4" />
          <span>AI scoring will appear once the interview begins</span>
        </div>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return "destructive";
    if (severity === 'medium') return "default";
    return "secondary";
  };

  return (
    <div className="space-y-3">
      {/* Overall Score */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-semibold">Overall Interview Score</span>
          </div>
          <span className={`text-2xl font-bold ${getScoreColor(intelligence.overall_score)}`}>
            {intelligence.overall_score}/100
          </span>
        </div>
        <Progress value={intelligence.overall_score} className="h-2" />
      </Card>

      {/* Detailed Scores */}
      <Card className="p-4 bg-card/50 backdrop-blur-sm space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Detailed Scoring
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Communication Clarity
            </span>
            <div className="flex items-center gap-2">
              <Progress value={intelligence.communication_clarity_score} className="h-1.5 w-24" />
              <span className={`font-medium ${getScoreColor(intelligence.communication_clarity_score)}`}>
                {intelligence.communication_clarity_score}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Target className="w-3 h-3" />
              Technical Depth
            </span>
            <div className="flex items-center gap-2">
              <Progress value={intelligence.technical_depth_score} className="h-1.5 w-24" />
              <span className={`font-medium ${getScoreColor(intelligence.technical_depth_score)}`}>
                {intelligence.technical_depth_score}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Culture Fit</span>
            <div className="flex items-center gap-2">
              <Progress value={intelligence.culture_fit_score} className="h-1.5 w-24" />
              <span className={`font-medium ${getScoreColor(intelligence.culture_fit_score)}`}>
                {intelligence.culture_fit_score}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Confidence Level</span>
            <div className="flex items-center gap-2">
              <Progress value={intelligence.confidence_score} className="h-1.5 w-24" />
              <span className={`font-medium ${getScoreColor(intelligence.confidence_score)}`}>
                {intelligence.confidence_score}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Red Flags */}
      {intelligence.red_flags && intelligence.red_flags.length > 0 && (
        <Card className="p-4 bg-card/50 backdrop-blur-sm">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Red Flags
          </h3>
          <ScrollArea className="h-24">
            <div className="space-y-2">
              {intelligence.red_flags.map((flag, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <Badge variant={getSeverityColor(flag.severity)} className="shrink-0 mt-0.5">
                    {flag.severity}
                  </Badge>
                  <span className="text-muted-foreground">{flag.flag}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Positive Signals */}
      {intelligence.positive_signals && intelligence.positive_signals.length > 0 && (
        <Card className="p-4 bg-card/50 backdrop-blur-sm">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Positive Signals
          </h3>
          <ScrollArea className="h-20">
            <div className="space-y-1.5">
              {intelligence.positive_signals.map((signal, idx) => (
                <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  {signal.signal}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Follow-up Suggestions */}
      {intelligence.follow_up_suggestions && intelligence.follow_up_suggestions.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary" />
            Suggested Follow-ups
          </h3>
          <ScrollArea className="h-24">
            <ul className="space-y-1.5 text-sm">
              {intelligence.follow_up_suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-muted-foreground">• {suggestion}</li>
              ))}
            </ul>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}