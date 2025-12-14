import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle2, 
  Brain, 
  Users, 
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActionItem {
  owner: string;
  task: string;
  priority: 'low' | 'medium' | 'high';
}

interface MeetingInsight {
  id: string;
  summary: string;
  key_points: string[];
  action_items: ActionItem[];
  decisions: string[];
  topics: string[];
  questions_asked: string[];
  sentiment_analysis: { overall: string };
  participants_summary: Array<{ name: string; message_count: number; percentage: number }>;
  full_transcript: string;
  analysis_status: string;
}

export default function MeetingInsights() {
  const { meetingId } = useParams();
  const [insights, setInsights] = useState<MeetingInsight | null>(null);
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (meetingId) {
      loadMeetingData();
    }
  }, [meetingId]);

  const loadMeetingData = async () => {
    try {
      // Load meeting details
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);

      // Load insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('meeting_insights')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (insightsError) {
        if (insightsError.code === 'PGRST116') {
          toast.info('Meeting analysis is still processing');
        } else {
          throw insightsError;
        }
      } else {
        setInsights(insightsData as unknown as MeetingInsight);
      }
    } catch (error) {
      console.error('Error loading meeting data:', error);
      toast.error('Failed to load meeting insights');
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!insights?.full_transcript) return;

    const blob = new Blob([insights.full_transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-transcript-${meetingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded');
  };

  const copySummary = async () => {
    if (!insights?.summary) return;
    await navigator.clipboard.writeText(insights.summary);
    setCopied(true);
    toast.success('Summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const createTask = async (actionItem: ActionItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to create tasks');
        return;
      }

      const { error } = await supabase.from('pilot_tasks').insert({
        user_id: user.id,
        title: actionItem.task,
        description: `From meeting: ${meeting?.title || meetingId}`,
        priority_score: actionItem.priority === 'high' ? 90 : actionItem.priority === 'medium' ? 60 : 30,
        status: 'pending',
        task_type: 'action_item',
        source: 'meeting_insights',
        metadata: { 
          meeting_id: meetingId, 
          owner: actionItem.owner,
          priority: actionItem.priority
        }
      });

      if (error) throw error;
      toast.success('Task added to Club Pilot');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <Brain className="h-12 w-12 mx-auto animate-pulse text-purple-500" />
            <p className="text-muted-foreground">Loading meeting insights...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!insights) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold">No Insights Available</h2>
                <p className="text-muted-foreground">
                  This meeting hasn't been analyzed yet or the AI Notetaker wasn't enabled.
                </p>
                <Button asChild>
                  <Link to="/meetings">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Meetings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/meetings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Meetings
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">{meeting?.title}</h1>
            <p className="text-muted-foreground">
              {new Date(meeting?.scheduled_start).toLocaleDateString()} at{' '}
              {new Date(meeting?.scheduled_start).toLocaleTimeString()}
            </p>
          </div>
          <Button onClick={downloadTranscript} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Transcript
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Executive Summary
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={copySummary}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{insights.summary}</p>
              </CardContent>
            </Card>

            {/* Key Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Key Discussion Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {insights.key_points?.map((point, index) => (
                    <li key={index} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.action_items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{item.task}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{item.owner}</span>
                          <Badge variant={getPriorityColor(item.priority) as any} className="text-xs">
                            {item.priority}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => createTask(item)}
                      >
                        Create Task
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Decisions */}
            {insights.decisions && insights.decisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Decisions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {insights.decisions.map((decision, index) => (
                      <li key={index} className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                        <span>{decision}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Full Transcript */}
            <Card>
              <CardHeader>
                <CardTitle>Full Transcript</CardTitle>
                <CardDescription>Complete conversation record with timestamps</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {insights.full_transcript}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overall Sentiment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div
                    className={`text-2xl font-bold capitalize ${getSentimentColor(
                      insights.sentiment_analysis?.overall || 'neutral'
                    )}`}
                  >
                    {insights.sentiment_analysis?.overall || 'neutral'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participant Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.participants_summary?.map((participant, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{participant.name}</span>
                        <span className="text-muted-foreground">{participant.percentage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${participant.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {participant.message_count} contributions
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Topics */}
            {insights.topics && insights.topics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Topics Discussed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {insights.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unanswered Questions */}
            {insights.questions_asked && insights.questions_asked.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Follow-up Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {insights.questions_asked.map((question, index) => (
                      <li key={index} className="text-muted-foreground">
                        • {question}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
