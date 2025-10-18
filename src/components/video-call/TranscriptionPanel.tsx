import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Transcript {
  id: string;
  text: string;
  timestamp_ms: number;
  is_final: boolean;
  participant_id: string;
}

interface TranscriptionPanelProps {
  transcripts: Transcript[];
  onClose: () => void;
}

export function TranscriptionPanel({ transcripts, onClose }: TranscriptionPanelProps) {
  const downloadTranscript = () => {
    const text = transcripts
      .map(t => `[${new Date(t.timestamp_ms).toLocaleTimeString()}] ${t.text}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="absolute left-0 top-0 bottom-0 w-96 glass-card border-r border-border/20 flex flex-col z-[10001]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <h3 className="font-semibold text-lg">Live Transcription</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={downloadTranscript}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Transcripts */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {transcripts.map((transcript) => (
            <div key={transcript.id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(transcript.timestamp_ms).toLocaleTimeString()}</span>
                {!transcript.is_final && (
                  <Badge variant="secondary" className="text-xs">
                    Interim
                  </Badge>
                )}
              </div>
              <p className={transcript.is_final ? '' : 'italic opacity-70'}>
                {transcript.text}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}