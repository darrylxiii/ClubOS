import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  Play, 
  Clock, 
  Calendar, 
  Users, 
  FileText, 
  Sparkles, 
  Trash2, 
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MeetingRecordingExtended } from '@/hooks/useMeetingRecordings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MeetingRecordingCardProps {
  recording: MeetingRecordingExtended;
  onDelete?: (id: string) => void;
  onDownload?: (recording: MeetingRecordingExtended) => void;
  onRefresh?: () => void;
}

export function MeetingRecordingCard({ 
  recording, 
  onDelete, 
  onDownload,
  onRefresh
}: MeetingRecordingCardProps) {
  const navigate = useNavigate();
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-meeting-recording-advanced', {
        body: { recordingId: recording.id, reanalyze: true }
      });
      if (error) throw error;
      toast.success('Re-analysis started');
      onRefresh?.();
    } catch (err) {
      toast.error('Failed to start re-analysis');
      console.error(err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getStatusBadge = () => {
    switch (recording.processing_status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
      case 'transcribing':
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500/50">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Transcribing
          </Badge>
        );
      case 'analyzing':
        return (
          <Badge variant="outline" className="text-purple-500 border-purple-500/50">
            <Sparkles className="h-3 w-3 mr-1" />
            Analyzing
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/50">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getSourceTypeBadge = () => {
    switch (recording.source_type) {
      case 'tqc_meeting':
        return <Badge variant="secondary">TQC Meeting</Badge>;
      case 'live_hub':
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">Live Hub</Badge>;
      case 'conversation_call':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Call</Badge>;
      default:
        return null;
    }
  };

  const title = recording.title || recording.meeting?.title || 'Untitled Recording';
  const participantCount = Array.isArray(recording.participants) ? recording.participants.length : 0;
  const hasTranscript = !!recording.transcript;
  const hasAnalysis = !!recording.ai_analysis || !!recording.executive_summary;

  const handleViewRecording = () => {
    navigate(`/recording/${recording.id}`);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-accent/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="relative w-32 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/20 to-primary/20">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            {recording.recording_url && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={handleViewRecording}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            )}
            {/* Duration overlay */}
            {recording.duration_seconds && (
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(recording.duration_seconds)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base truncate">{title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(recording.recorded_at), 'MMM d, yyyy')}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{formatDistanceToNow(new Date(recording.recorded_at), { addSuffix: true })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getSourceTypeBadge()}
                {getStatusBadge()}
              </div>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              {participantCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              
              {hasTranscript && (
                <div className="flex items-center gap-1 text-green-500">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Transcript</span>
                </div>
              )}
              
              {hasAnalysis && (
                <div className="flex items-center gap-1 text-purple-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Analysis</span>
                </div>
              )}
            </div>

            {/* Executive summary preview */}
            {recording.executive_summary && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {recording.executive_summary}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button 
                size="sm" 
                onClick={handleViewRecording}
                disabled={recording.processing_status === 'failed' && !recording.recording_url}
              >
                <Play className="h-4 w-4 mr-1" />
                {recording.processing_status === 'completed' ? 'View Recording' : 'View Details'}
              </Button>
              
              {recording.processing_status === 'pending' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleReanalyze}
                  disabled={isReanalyzing}
                >
                  {isReanalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  {isReanalyzing ? 'Starting...' : 'Start Analysis'}
                </Button>
              )}
              
              {recording.recording_url && onDownload && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onDownload(recording)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              {(recording.processing_status === 'failed' || recording.processing_status === 'completed') && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleReanalyze}
                  disabled={isReanalyzing}
                >
                  {isReanalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              )}
              
              {onDelete && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(recording.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
