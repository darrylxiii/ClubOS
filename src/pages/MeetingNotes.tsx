import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Play, Download, Share2, AlertTriangle, Star, 
  CheckCircle2, Clock, User, Briefcase, ChevronDown, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';
import { SendToPilotButton } from '@/components/meetings/SendToPilotButton';

export default function MeetingNotes() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState<any>(null);
  const [meeting, setMeeting] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (meetingId) {
      loadRecording();
    }
  }, [meetingId]);

  const loadRecording = async () => {
    try {
      const { data: recordingData, error } = await supabase
        .from('meeting_recordings_extended' as any)
        .select(`
          *,
          meetings!inner(
            title,
            meeting_type,
            scheduled_start,
            host_id
          )
        `)
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (recordingData) {
        setRecording(recordingData);
        setMeeting((recordingData as any).meetings);
      }
    } catch (error) {
      console.error('Error loading recording:', error);
      toast.error('Failed to load meeting notes');
    } finally {
      setLoading(false);
    }
  };

  const getFitColor = (fit: string) => {
    switch (fit) {
      case 'excellent': return 'text-green-500 bg-green-500/10';
      case 'good': return 'text-blue-500 bg-blue-500/10';
      case 'fair': return 'text-yellow-500 bg-yellow-500/10';
      case 'poor': return 'text-rose-500 bg-rose-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const exportPDF = () => {
    if (!recording) return;
    
    // Create a printable version of the meeting notes
    const printContent = `
      Meeting Notes: ${meeting?.title || 'Untitled'}
      Date: ${meeting?.scheduled_start ? format(new Date(meeting.scheduled_start), 'MMM d, yyyy') : 'Unknown'}
      Duration: ${Math.round((recording.duration_seconds || 0) / 60)} minutes
      
      Executive Summary:
      ${analysis.executiveSummary || 'No summary available'}
      
      Action Items:
      ${(analysis.actionItems || []).map((item: any) => `- ${item.task} (${item.owner}, Due: ${item.deadline})`).join('\n')}
      
      Key Moments:
      ${(analysis.keyMoments || []).map((m: any) => `[${m.timestamp}] ${m.type}: ${m.description}`).join('\n')}
    `;
    
    // Create blob and download
    const blob = new Blob([printContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-notes-${meetingId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Meeting notes exported');
  };

  const shareWithTeam = async () => {
    if (!recording) return;
    
    const shareUrl = `${window.location.origin}/meetings/notes/${meetingId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/meetings')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!recording) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/meetings')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recording Not Found</AlertTitle>
            <AlertDescription>
              This meeting recording could not be found or you don't have access to it.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const analysis = recording.ai_summary || {};
  const candidateEval = analysis.candidateEvaluation || {};
  const decisionGuidance = analysis.decisionGuidance || {};

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/meetings')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meetings
        </Button>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">{meeting.title}</h1>
            <div className="flex items-center gap-2">
              <SendToPilotButton
                meetingId={meetingId!}
                recordingId={recording?.id}
                actionItems={analysis.actionItems || []}
                meetingTitle={meeting.title}
              />
              <Button onClick={exportPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={shareWithTeam} variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(meeting.scheduled_start), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {Math.round(recording.duration_seconds / 60)} minutes
            </span>
            <Badge variant="secondary">{meeting.meeting_type}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <video 
                  src={recording.recording_url} 
                  controls 
                  className="w-full rounded-lg"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                />
              </CardContent>
            </Card>

            {/* Tabs for different sections */}
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="actions">Action Items</TabsTrigger>
                <TabsTrigger value="moments">Key Moments</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {analysis.executiveSummary || 'Analysis in progress...'}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-lg ${getFitColor(candidateEval.overallFit)}`}>
                        <p className="text-xs font-medium mb-1">Overall Fit</p>
                        <p className="text-2xl font-bold capitalize">{candidateEval.overallFit || 'N/A'}</p>
                      </div>
                      <div className={`p-4 rounded-lg ${getFitColor(decisionGuidance.recommendation)}`}>
                        <p className="text-xs font-medium mb-1">Recommendation</p>
                        <p className="text-2xl font-bold capitalize">
                          {decisionGuidance.recommendation?.replace('_', ' ') || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {candidateEval.strengths && candidateEval.strengths.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold mb-2">Strengths</h4>
                        <ul className="space-y-1">
                          {candidateEval.strengths.map((strength: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {candidateEval.weaknesses && candidateEval.weaknesses.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Areas for Concern</h4>
                        <ul className="space-y-1">
                          {candidateEval.weaknesses.map((weakness: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {candidateEval.redFlags && candidateEval.redFlags.length > 0 && (
                  <Collapsible>
                    <Card>
                      <CardHeader>
                        <CollapsibleTrigger className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                            <CardTitle>
                              {candidateEval.redFlags.length} Red Flag{candidateEval.redFlags.length !== 1 ? 's' : ''} Detected
                            </CardTitle>
                          </div>
                          <ChevronDown className="h-5 w-5 transition-transform" />
                        </CollapsibleTrigger>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-2">
                          {candidateEval.redFlags.map((flag: any, idx: number) => (
                            <Alert key={idx} variant={flag.severity === 'critical' ? 'destructive' : 'default'}>
                              <AlertTitle className="flex items-center gap-2">
                                <Badge variant={getSeverityVariant(flag.severity)}>{flag.type}</Badge>
                                <span className="capitalize">{flag.severity}</span>
                                {flag.timestamp && (
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    [{flag.timestamp}]
                                  </span>
                                )}
                              </AlertTitle>
                              <AlertDescription>{flag.description}</AlertDescription>
                            </Alert>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Action Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysis.actionItems && analysis.actionItems.length > 0 ? (
                      <div className="space-y-3">
                        {analysis.actionItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                            <Checkbox />
                            <div className="flex-1">
                              <p className="font-medium">{item.task}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.owner} · Due: {item.deadline}
                              </p>
                            </div>
                            <Badge variant={getPriorityVariant(item.priority)}>
                              {item.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No action items identified</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="moments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Moments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysis.keyMoments && analysis.keyMoments.length > 0 ? (
                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {analysis.keyMoments.map((moment: any, idx: number) => (
                            <div 
                              key={idx}
                              className="flex gap-3 p-3 hover:bg-muted/50 cursor-pointer rounded-lg border"
                            >
                              <Badge className="shrink-0">{moment.timestamp}</Badge>
                              <div className="flex-1">
                                <p className="font-medium capitalize">{moment.type.replace('_', ' ')}</p>
                                <p className="text-sm text-muted-foreground mt-1">{moment.description}</p>
                                {moment.quote && (
                                  <blockquote className="mt-2 text-sm italic border-l-2 pl-3 text-muted-foreground">
                                    "{moment.quote}"
                                  </blockquote>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No key moments identified</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Skills Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidateEval.skillsAssessment && candidateEval.skillsAssessment.length > 0 ? (
                      <div className="space-y-4">
                        {candidateEval.skillsAssessment.map((skill: any, idx: number) => (
                          <div key={idx} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{skill.skill}</h4>
                              <Badge variant={skill.demonstrated === 'yes' ? 'default' : 'secondary'}>
                                {skill.demonstrated}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star 
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i <= skill.rating 
                                      ? 'fill-primary text-primary' 
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">{skill.evidence}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No skills assessment available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {decisionGuidance.nextSteps && decisionGuidance.nextSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {decisionGuidance.nextSteps.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysis.followUpEmail && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Follow-Up Email</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                    <p className="text-sm font-medium">{analysis.followUpEmail.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {analysis.followUpEmail.body}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => {
                    navigator.clipboard.writeText(analysis.followUpEmail.body);
                    toast.success('Email copied to clipboard');
                  }}>
                    Copy Email
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
