import { useEffect, useState, useRef } from 'react';
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
  CheckCircle2, Clock, User, ChevronDown, ArrowLeft,
  RefreshCw, FileText, Mic, Video, BarChart3, Scissors, Mail, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';
import { TimestampedTranscript } from './TimestampedTranscript';
import { SpeakingMetricsPanel } from './SpeakingMetricsPanel';
import { RecordingClipCreator } from './RecordingClipCreator';
import { GenerateDossierButton } from './GenerateDossierButton';
import { AIHighlightClips } from './AIHighlightClips';
import { ShareRecordingDialog } from './ShareRecordingDialog';

export default function RecordingPlaybackPage() {
  const { recordingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState<any>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [retriggeringAnalysis, setRetriggeringAnalysis] = useState(false);
  const [triggeringTranscription, setTriggeringTranscription] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Clip creator state
  const [clipDialogOpen, setClipDialogOpen] = useState(false);
  const [clipData, setClipData] = useState({ startMs: 0, endMs: 0, text: '' });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (recordingId) {
      loadRecording();
    }
  }, [recordingId]);

  // Real-time subscription for status updates
  useEffect(() => {
    if (!recording?.id) return;

    const channel = supabase
      .channel(`recording-${recording.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_recordings_extended',
          filter: `id=eq.${recording.id}`
        },
        (payload) => {
          console.log('[Recording] Real-time update received:', payload.new);
          setRecording((prev: any) => ({ ...prev, ...payload.new }));

          // Show appropriate toast based on status
          const newStatus = (payload.new as any).processing_status;
          if (newStatus === 'completed') {
            toast.success('Analysis completed!');
          } else if (newStatus === 'failed') {
            toast.error(`Processing failed: ${(payload.new as any).processing_error || 'Unknown error'}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recording?.id]);

  const loadRecording = async () => {
    try {
      const { data: recordingData, error } = await supabase
        .from('meeting_recordings_extended' as any)
        .select('*')
        .eq('id', recordingId)
        .maybeSingle();

      if (error) throw error;

      if (recordingData) {
        const rec = recordingData as Record<string, any>;
        if (rec.meeting_id) {
          const { data: meetingData } = await supabase
            .from('meetings')
            .select('title, meeting_type, scheduled_start, host_id')
            .eq('id', rec.meeting_id)
            .single();
          
          setRecording({ ...rec, meeting: meetingData });
        } else if (rec.live_channel_id) {
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

  const triggerTranscription = async () => {
    if (!recording) return;
    
    setTriggeringTranscription(true);
    try {
      const { error } = await supabase.functions.invoke('transcribe-recording', {
        body: { recordingId: recording.id, chainAnalysis: true }
      });

      if (error) throw error;
      
      toast.success('Transcription started - this may take a few minutes');
      setRecording((prev: any) => ({ ...prev, processing_status: 'transcribing' }));
      
      // Poll for updates
      setTimeout(() => loadRecording(), 10000);
    } catch (error) {
      console.error('Failed to trigger transcription:', error);
      toast.error('Failed to start transcription');
    } finally {
      setTriggeringTranscription(false);
    }
  };

  const retriggerAnalysis = async () => {
    if (!recording) return;
    
    setRetriggeringAnalysis(true);
    try {
      // First ensure transcript exists
      if (!recording.transcript || recording.transcript.length < 50) {
        toast.info('Starting transcription first...');
        await triggerTranscription();
        return;
      }

      const { error } = await supabase.functions.invoke('analyze-meeting-recording-advanced', {
        body: { recordingId: recording.id }
      });

      if (error) throw error;
      
      toast.success('Analysis started - refresh in a few minutes');
      setRecording((prev: any) => ({ ...prev, processing_status: 'analyzing' }));
      
      // Poll for updates
      setTimeout(() => loadRecording(), 15000);
    } catch (error) {
      console.error('Failed to retrigger analysis:', error);
      toast.error('Failed to start analysis');
    } finally {
      setRetriggeringAnalysis(false);
    }
  };

  const sendSummaryEmail = async () => {
    if (!recording) return;
    
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-meeting-summary-email', {
        body: { recordingId: recording.id }
      });

      if (error) throw error;
      toast.success('Summary email sent successfully');
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Failed to send summary email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSeek = (timeMs: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeMs / 1000;
      videoRef.current.play();
    }
  };

  const handleCreateClip = (startMs: number, endMs: number, text: string) => {
    setClipData({ startMs, endMs, text });
    setClipDialogOpen(true);
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

  const handleExportPDF = async () => {
    if (!recording?.id) return;
    
    setExportingPDF(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recording-pdf', {
        body: { recordingId: recording.id }
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast.success('PDF report generated');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Button variant="ghost" onClick={() => navigate('/meetings?tab=history')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recordings
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
          <Button variant="ghost" onClick={() => navigate('/meetings?tab=history')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recordings
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

  const analysis = recording.ai_analysis || {};
  const candidateEval = analysis.candidateEvaluation || {};
  const decisionGuidance = analysis.decisionGuidance || {};
  const sourceType = recording.source_type === 'live_hub' ? 'Live Hub' : 'TQC Meeting';
  const transcriptJson = recording.transcript_json || null;
  const speakingMetrics = recording.speaking_metrics || null;
  
  // Build participants for metrics panel
  const participants = (recording.participants || []).map((name: string, idx: number) => ({
    id: `participant-${idx}`,
    name,
    role: idx === 0 ? 'host' : 'participant'
  }));

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate('/meetings?tab=history')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Recordings
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {recording.title || recording.meeting?.title || 'Recording'}
              </h1>
              <Badge variant="secondary">{sourceType}</Badge>
              {recording.processing_status === 'transcribing' && (
                <Badge variant="outline" className="animate-pulse border-blue-500/50 text-blue-500">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Transcribing...
                </Badge>
              )}
              {recording.processing_status === 'analyzing' && (
                <Badge variant="outline" className="animate-pulse border-purple-500/50 text-purple-500">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <GenerateDossierButton 
                recordingId={recording.id}
                meetingId={recording.meeting_id}
              />
              <Button onClick={sendSummaryEmail} variant="outline" size="sm" disabled={sendingEmail || !recording.ai_analysis}>
                <Mail className="h-4 w-4 mr-2" />
                {sendingEmail ? 'Sending...' : 'Email Summary'}
              </Button>
              <Button onClick={exportTranscript} variant="outline" size="sm" disabled={!recording.transcript}>
                <FileText className="h-4 w-4 mr-2" />
                Export Transcript
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="sm" disabled={exportingPDF}>
                <Download className={`h-4 w-4 mr-2 ${exportingPDF ? 'animate-spin' : ''}`} />
                {exportingPDF ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button onClick={() => setShareDialogOpen(true)} variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
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
              {Math.round((recording.duration_seconds || 0) / 60)} minutes
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
                  videoError ? (
                    <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4 p-6">
                      <AlertTriangle className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground text-center">
                        Video playback failed. The file may be corrupted or in an unsupported format.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = recording.recording_url;
                          a.download = `recording-${recording.id}.webm`;
                          a.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download & Play Locally
                      </Button>
                    </div>
                  ) : (
                    <video 
                      ref={videoRef}
                      src={recording.recording_url} 
                      controls 
                      className="w-full rounded-lg"
                      onTimeUpdate={(e) => setCurrentTimeMs(e.currentTarget.currentTime * 1000)}
                      onError={() => setVideoError(true)}
                    />
                  )
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Recording not available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processing Status Alerts */}
            {recording.processing_status === 'pending' && !recording.transcript && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Transcript Required</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>This recording needs to be transcribed before AI analysis can begin.</span>
                  <Button 
                    size="sm" 
                    onClick={triggerTranscription}
                    disabled={triggeringTranscription}
                    className="ml-4"
                  >
                    {triggeringTranscription ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4 mr-2" />
                    )}
                    Generate Transcript
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {recording.processing_status === 'pending' && recording.transcript && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Analysis Pending</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>Transcript available. Ready for AI analysis.</span>
                  <Button 
                    size="sm" 
                    onClick={retriggerAnalysis}
                    disabled={retriggeringAnalysis}
                    className="ml-4"
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

            {recording.processing_status === 'transcribing' && (
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                <AlertTitle>Transcribing Audio</AlertTitle>
                <AlertDescription>
                  Converting speech to text using OpenAI Whisper. This typically takes 1-3 minutes...
                </AlertDescription>
              </Alert>
            )}

            {(recording.processing_status === 'analyzing' || recording.processing_status === 'processing') && (
              <Alert className="border-purple-500/50 bg-purple-500/10">
                <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
                <AlertTitle>AI Analysis in Progress</AlertTitle>
                <AlertDescription>
                  Generating summary, action items, key moments, and skills assessment...
                </AlertDescription>
              </Alert>
            )}

            {recording.processing_status === 'failed' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Processing Failed</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>{recording.processing_error || 'An error occurred during processing.'}</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={triggerTranscription}
                    disabled={triggeringTranscription}
                    className="ml-4"
                  >
                    {triggeringTranscription ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Tabs */}
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="w-full grid grid-cols-7">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="highlights" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Highlights
                </TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="moments">Key Moments</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
              </TabsList>

              {/* AI Highlights Tab - NEW */}
              <TabsContent value="highlights" className="space-y-4">
                <AIHighlightClips recordingId={recording.id} />
              </TabsContent>

              {/* Timestamped Transcript Tab */}
              <TabsContent value="transcript" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-5 w-5" />
                      Synced Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transcriptJson ? (
                      <TimestampedTranscript
                        transcriptJson={transcriptJson}
                        currentTimeMs={currentTimeMs}
                        onSeek={handleSeek}
                        onCreateClip={handleCreateClip}
                      />
                    ) : recording.transcript ? (
                      <ScrollArea className="h-96">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                          {recording.transcript}
                        </pre>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12 space-y-4">
                        <Mic className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <div>
                          <p className="text-muted-foreground mb-2">
                            No transcript available yet.
                          </p>
                          <p className="text-sm text-muted-foreground/70 mb-4">
                            {recording.processing_status === 'transcribing' 
                              ? 'Transcription is in progress...' 
                              : 'Click below to generate a transcript using AI.'}
                          </p>
                        </div>
                        {recording.processing_status !== 'transcribing' && recording.recording_url && (
                          <Button 
                            onClick={triggerTranscription}
                            disabled={triggeringTranscription}
                          >
                            {triggeringTranscription ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Mic className="h-4 w-4 mr-2" />
                            )}
                            Generate Transcript
                          </Button>
                        )}
                        {recording.processing_status === 'transcribing' && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Processing audio...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analysis.executiveSummary || recording.executive_summary) ? (
                      <p className="leading-relaxed">
                        {analysis.executiveSummary || recording.executive_summary}
                      </p>
                    ) : (
                      <div className="text-center py-8 space-y-3">
                        <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          {recording.transcript 
                            ? 'Summary will be generated during AI analysis.'
                            : 'Generate a transcript first to enable AI analysis.'}
                        </p>
                        {recording.transcript && recording.processing_status !== 'analyzing' && (
                          <Button 
                            variant="outline"
                            onClick={retriggerAnalysis}
                            disabled={retriggeringAnalysis}
                          >
                            {retriggeringAnalysis ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                          </Button>
                        )}
                      </div>
                    )}

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

                    {candidateEval.strengths?.length > 0 && (
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

                    {candidateEval.weaknesses?.length > 0 && (
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

              {/* Actions Tab */}
              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Action Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analysis.actionItems || recording.action_items)?.length > 0 ? (
                      <div className="space-y-3">
                        {(analysis.actionItems || recording.action_items).map((item: any, idx: number) => (
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

              {/* Key Moments Tab */}
              <TabsContent value="moments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Moments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analysis.keyMoments || recording.key_moments)?.length > 0 ? (
                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {(analysis.keyMoments || recording.key_moments).map((moment: any, idx: number) => (
                            <div 
                              key={idx}
                              className="flex gap-3 p-3 hover:bg-muted/50 cursor-pointer rounded-lg border"
                              onClick={() => moment.timestamp_ms && handleSeek(moment.timestamp_ms)}
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
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateClip(
                                    moment.timestamp_ms || 0,
                                    (moment.timestamp_ms || 0) + 30000,
                                    moment.quote || moment.description
                                  );
                                }}
                              >
                                <Scissors className="h-4 w-4" />
                              </Button>
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

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Skills Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidateEval.skillsAssessment?.length > 0 ? (
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

              {/* Speaking Metrics Tab */}
              <TabsContent value="metrics" className="space-y-4">
                <SpeakingMetricsPanel 
                  metrics={speakingMetrics} 
                  participants={participants}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Next Steps */}
            {decisionGuidance.nextSteps?.length > 0 && (
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
            {recording.participants?.length > 0 && (
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
                  <span>{Math.round((recording.duration_seconds || 0) / 60)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Size</span>
                  <span>{Math.round((recording.file_size_bytes || 0) / 1024 / 1024)} MB</span>
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

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => setClipDialogOpen(true)}
                >
                  <Scissors className="h-4 w-4 mr-2" />
                  Create Clip
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={sendSummaryEmail}
                  disabled={sendingEmail || !recording.ai_summary}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Summary
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Recording
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Clip Creator Dialog */}
      <RecordingClipCreator
        open={clipDialogOpen}
        onOpenChange={setClipDialogOpen}
        recordingId={recording?.id || ''}
        startMs={clipData.startMs}
        endMs={clipData.endMs}
        transcript={clipData.text}
        recordingUrl={recording?.recording_url}
      />

      {/* Share Recording Dialog */}
      <ShareRecordingDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        recordingId={recording?.id || ''}
        recordingTitle={recording?.title || recording?.meeting?.title || 'Recording'}
      />
    </AppLayout>
  );
}
