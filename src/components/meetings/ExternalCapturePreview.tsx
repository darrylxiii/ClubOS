/**
 * Live preview component for external meeting screen capture
 */
import { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExternalCapturePreviewProps {
  stream: MediaStream | null;
  isCapturing: boolean;
  duration: number;
  hasAudio: boolean;
  onStop: () => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ExternalCapturePreview({
  stream,
  isCapturing,
  duration,
  hasAudio,
  onStop,
  className
}: ExternalCapturePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream || !isCapturing) {
    return null;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0 relative">
        {/* Video preview */}
        <div className="relative bg-background/80 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-48 object-contain bg-black"
          />
          
          {/* Recording indicator overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-destructive/90 text-destructive-foreground px-2 py-1 rounded-md">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-medium">REC</span>
            </div>
            
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              <Clock className="w-3 h-3 mr-1" />
              {formatDuration(duration)}
            </Badge>
          </div>

          {/* Audio indicator */}
          <div className="absolute top-2 right-2">
            {hasAudio ? (
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                <Mic className="w-3 h-3 mr-1" />
                Audio
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                <MicOff className="w-3 h-3 mr-1" />
                No Audio
              </Badge>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-3 border-t bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {!hasAudio && (
                <div className="flex items-center gap-1 text-accent-foreground">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs">Transcript may be limited without audio</span>
                </div>
              )}
            </div>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={onStop}
              className="gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Recording
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
