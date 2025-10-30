import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Transcript {
  id: string;
  text: string;
  timestamp_ms: number;
  is_final: boolean;
  participant_id: string;
  participant_name: string | null;
  confidence: number | null;
}

interface LiveTranscriptionPanelProps {
  meetingId: string;
}

export function LiveTranscriptionPanel({ meetingId }: LiveTranscriptionPanelProps) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [botActive, setBotActive] = useState(false);

  useEffect(() => {
    loadTranscripts();
    checkBotStatus();

    // Subscribe to real-time transcript updates
    const channel = supabase
      .channel(`meeting-${meetingId}-transcripts`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_transcripts',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          console.log('New transcript:', payload.new);
          setTranscripts(prev => [...prev, payload.new as Transcript]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_transcripts',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          console.log('Updated transcript:', payload.new);
          setTranscripts(prev => 
            prev.map(t => t.id === payload.new.id ? payload.new as Transcript : t)
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [meetingId]);

  const loadTranscripts = async () => {
    const { data, error } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('timestamp_ms', { ascending: true });

    if (error) {
      console.error('Error loading transcripts:', error);
      return;
    }

    setTranscripts(data || []);
  };

  const checkBotStatus = async () => {
    const { data } = await supabase
      .from('meeting_bot_sessions')
      .select('connection_status')
      .eq('meeting_id', meetingId)
      .is('left_at', null)
      .single();

    setBotActive(data?.connection_status === 'connected' || data?.connection_status === 'recording');
  };

  const downloadTranscript = () => {
    const formatTime = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const text = transcripts
      .filter(t => t.is_final)
      .map(t => `[${formatTime(t.timestamp_ms)}] ${t.participant_name || 'Unknown'}: ${t.text}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${meetingId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded');
  };

  return (
    <div className="flex flex-col h-full">
      {botActive && (
        <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20">
          <div className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-purple-500 animate-pulse" />
            <span className="text-purple-500 font-medium">QUIN Notetaker Active</span>
            <Badge variant="outline" className="ml-auto text-xs">Recording</Badge>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
        {transcripts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Live transcription will appear here</p>
            {!botActive && (
              <p className="text-xs mt-2">Enable QUIN Notetaker when creating meetings</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {transcripts.map((transcript) => (
              <div key={transcript.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {new Date(transcript.timestamp_ms).toLocaleTimeString()}
                  </span>
                  <span className="font-medium text-foreground">
                    {transcript.participant_name || 'Unknown'}
                  </span>
                  {!transcript.is_final && (
                    <Badge variant="secondary" className="text-xs">
                      Interim
                    </Badge>
                  )}
                  {transcript.confidence && transcript.is_final && (
                    <span className="text-xs">
                      {Math.round(transcript.confidence * 100)}% confident
                    </span>
                  )}
                </div>
                <p className={transcript.is_final ? '' : 'italic opacity-70'}>
                  {transcript.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {transcripts.filter(t => t.is_final).length > 0 && (
        <div className="p-4 border-t border-border">
          <Button onClick={downloadTranscript} className="w-full" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Transcript
          </Button>
        </div>
      )}
    </div>
  );
}
