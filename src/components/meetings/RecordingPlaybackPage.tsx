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
import { Progress } from '@/components/ui/progress';
import { 
  Play, Download, Share2, AlertTriangle, Star, 
  CheckCircle2, Clock, User, ChevronDown, ArrowLeft,
  RefreshCw, FileText, Mic, Video
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';

export default function RecordingPlaybackPage() {
  const { recordingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [retriggeringAnalysis, setRetriggeringAnalysis] = useState(false);

  useEffect(() => {
    if (recordingId) {
      loadRecording();
    }
  }, [recordingId]);

  const loadRecording = async () => {
    try {
      // First try to get by recording ID directly
      const { data: recordingData, error } = await supabase
        .from('meeting_recordings_extended' as any)
        .select('*')
        .eq('id', recordingId)
        .maybeSingle();

      if (error) throw error;

      if (recordingData) {
        const rec = recordingData as Record<string, any>;
        // Fetch meeting info if available
        if (rec.meeting_id) {
          const { data: meetingData } = await supabase
            .from('meetings')
            .select('title, meeting_type, scheduled_start, host_id')
            .eq('id', rec.meeting_id)
            .single();
          
          setRecording({ ...rec, meeting: meetingData });
        } else if (rec.live_channel_id) {
          // Fetch channel info for Live Hub recordings
          const { data: channelData } = await supabase
            .from('live_channels')
            .select('name, channel_type')
            .eq('id', rec.live_channel_id)
            .single();
          
          setRecording({ 
            ...rec, 
            meeting: { 
              title: channelData?.name || 'Live Hub Recording',
              meeting_type: channelData?.channel_type || 'voice',
              scheduled_start: rec.created_at
            }
          });
        } else {
          setRecording(rec);
        }
      }
    } catch (error) {
      console.error('Error loading recording:', error);
      toast.error('Failed to load recording');
    } finally {
      setLoading(false);
    }
  };

  const retriggerAnalysis = async () => {
    if (!recording) return;
    
    setRetriggeringAnalysis(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-meeting-recording-advanced', {
        body: { recordingId: recording.id }
      });

      if (error) throw error;
      
      toast.success('Analysis started - refresh in a few minutes');
      
      // Update status locally
      setRecording((prev: any) => ({
        ...prev,
        processing_status: 'processing'
      }));
    } catch (error) {
      console.error('Failed to retrigger analysis:', error);
      toast.error('Failed to start analysis');
    } finally {
      setRetriggeringAnalysis(false);
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

  const getPriorityVariant = (priority: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const exportTranscript = () => {
    if (!recording?.transcript) {
      toast.error('No transcript available');
      return;
    }
    
    const blob = new Blob([recording.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${recording.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
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
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recording Not Found</AlertTitle>
            <AlertDescription>
              This recording could not be found or you don't have access to it.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const analysis = recording.ai_summary || {};
  const candidateEval = analysis.candidateEvaluation || {};
  const decisionGuidance = analysis.decisionGuidance || {};
  const sourceType = recording.source_type === 'live_hub' ? 'Live Hub' : 'TQC Meeting';

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {recording.meeting?.title || 'Recording'}
              </h1>
              <Badge variant="secondary">{sourceType}</Badge>
              {recording.processing_status === 'processing' && (
                <Badge variant="outline" className="animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportTranscript} variant="outline" size="sm" disabled={!recording.transcript}>
                <FileText className="h-4 w-4 mr-2" />
                Export Transcript
              </Button>
              <Button onClick={() => toast.info('PDF export coming soon')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {recording.meeting?.scheduled_start 
                ? format(new Date(recording.meeting.scheduled_start), 'MMM d, yyyy')
                : format(new Date(recording.created_at), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              {Math.round(recording.duration_seconds / 60)} minutes
            </span>
            {recording.participants && recording.participants.length > 0 && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {recording.participants.length} participants
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video/Audio Player */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                {recording.recording_url ? (
                  <video 
                    src={recording.recording_url} 
                    controls 
                    className="w-full rounded-lg"
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  />
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Recording not available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Status */}
            {recording.processing_status === 'pending' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Analysis Pending</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>AI analysis has not started yet.</span>
                  <Button 
                    size="sm" 
                    onClick={retriggerAnalysis}
                    disabled={retriggeringAnalysis}
                  >
                    {retriggeringAnalysis ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Analysis
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Tabs for different sections */}
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="moments">Key Moments</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-5 w-5" />
                      Full Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      {recording.transcript ? (
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                          {recording.transcript}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          Transcript not available yet. Analysis may be in progress.
                        </p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {analysis.executiveSummary || 'Analysis in progress...'}
                    </p>

                    {(candidateEval.overallFit || decisionGuidance.recommendation) && (
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
                    )}

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
                                <p className="font-medium capitalize">{moment.type?.replace('_', ' ')}</p>
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
                                    i <= (skill.rating || 0)
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
            {/* Next Steps */}
            {decisionGuidance.nextSteps && decisionGuidance.nextSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {decisionGuidance.nextSteps.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            {recording.participants && recording.participants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recording.participants.map((name: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recording Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recording Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{Math.round(recording.duration_seconds / 60)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Size</span>
                  <span>{Math.round(recording.file_size_bytes / 1024 / 1024)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span>{sourceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize">
                    {recording.processing_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
