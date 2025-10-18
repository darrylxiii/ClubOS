import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';

interface Transcript {
  id: string;
  text: string;
  timestamp_ms: number;
  is_final: boolean;
  participant_id: string;
}

interface TranscriptionPanelProps {
  meetingId: string;
}

export function TranscriptionPanel({ meetingId }: TranscriptionPanelProps) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);

  // In a real implementation, this would use Speech-to-Text API
  // For now, we'll show a placeholder

  const downloadTranscript = () => {
    const text = transcripts
      .map(t => `[${new Date(t.timestamp_ms).toLocaleTimeString()}] ${t.text}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${meetingId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {transcripts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Transcription will appear here during the meeting</p>
          </div>
        ) : (
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
        )}
      </ScrollArea>

      {transcripts.length > 0 && (
        <div className="p-4 border-t border-white/10">
          <Button onClick={downloadTranscript} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Transcript
          </Button>
        </div>
      )}
    </div>
  );
}