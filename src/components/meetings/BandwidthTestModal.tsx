/**
 * Pre-Join Bandwidth Test Modal
 * Shows bandwidth test results before joining a meeting
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useBandwidthTest, VideoCapability } from '@/hooks/useBandwidthTest';
import { cn } from '@/lib/utils';
import { Wifi, Download, Upload, Clock, Activity, CheckCircle2, AlertTriangle, XCircle, Headphones, Video, Loader2 } from 'lucide-react';

interface BandwidthTestModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: (capability: VideoCapability, useAudioOnly: boolean) => void;
}

export function BandwidthTestModal({
  open,
  onClose,
  onContinue
}: BandwidthTestModalProps) {
  const {
    isRunning,
    progress,
    result,
    error,
    runTest,
    getCapabilityDescription,
    getCapabilityColor
  } = useBandwidthTest();

  const [hasStarted, setHasStarted] = useState(false);

  // Auto-run test when modal opens
  useEffect(() => {
    if (open && !hasStarted && !result) {
      setHasStarted(true);
      runTest();
    }
  }, [open, hasStarted, result, runTest]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setHasStarted(false);
    }
  }, [open]);

  const getCapabilityIcon = (capability: VideoCapability) => {
    switch (capability) {
      case '1080p':
      case '720p':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case '480p':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case '360p':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'audio-only':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleContinue = (audioOnly: boolean = false) => {
    if (result) {
      onContinue(result.videoCapability, audioOnly);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Connection Test
          </DialogTitle>
          <DialogDescription>
            Testing your network connection for optimal video quality
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Testing connection...</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {progress < 50 ? 'Measuring download speed...' : 'Measuring upload speed...'}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !isRunning && (
            <div className="space-y-4">
              {/* Capability Badge */}
              <div className="flex items-center justify-center">
                <div className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border',
                  result.videoCapability === '1080p' && 'bg-green-500/10 border-green-500/30',
                  result.videoCapability === '720p' && 'bg-green-500/10 border-green-500/30',
                  result.videoCapability === '480p' && 'bg-yellow-500/10 border-yellow-500/30',
                  result.videoCapability === '360p' && 'bg-orange-500/10 border-orange-500/30',
                  result.videoCapability === 'audio-only' && 'bg-red-500/10 border-red-500/30'
                )}>
                  {getCapabilityIcon(result.videoCapability)}
                  <div>
                    <div className={cn('font-semibold', getCapabilityColor(result.videoCapability))}>
                      {result.videoCapability.toUpperCase()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getCapabilityDescription(result.videoCapability)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Download className="h-4 w-4 text-blue-500" />
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs">Download</div>
                    <div className="font-mono font-medium">{result.downloadMbps} Mbps</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Upload className="h-4 w-4 text-emerald-500" />
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs">Upload</div>
                    <div className="font-mono font-medium">{result.uploadMbps} Mbps</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs">Latency</div>
                    <div className={cn(
                      'font-mono font-medium',
                      result.latency > 200 && 'text-yellow-500',
                      result.latency > 400 && 'text-red-500'
                    )}>
                      {result.latency} ms
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <div className="text-sm">
                    <div className="text-muted-foreground text-xs">Jitter</div>
                    <div className={cn(
                      'font-mono font-medium',
                      result.jitter > 30 && 'text-yellow-500',
                      result.jitter > 60 && 'text-red-500'
                    )}>
                      {result.jitter} ms
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning for poor connection */}
              {!result.isAdequateForVideo && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-yellow-500">Limited Bandwidth</div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      Your connection may not support video. Consider joining with audio only for a better experience.
                    </div>
                  </div>
                </div>
              )}

              {/* Recommended Settings */}
              {result.isAdequateForVideo && (
                <div className="text-xs text-muted-foreground text-center">
                  Recommended: {result.recommendedSettings.maxWidth}×{result.recommendedSettings.maxHeight} @ {result.recommendedSettings.maxFramerate}fps
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {error && !isRunning && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-red-500">Test Failed</div>
                <div className="text-muted-foreground text-xs">{error}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {result && !isRunning && (
            <>
              {!result.isAdequateForVideo ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleContinue(true)}
                    className="w-full sm:w-auto"
                  >
                    <Headphones className="h-4 w-4 mr-2" />
                    Join Audio Only
                  </Button>
                  <Button
                    onClick={() => handleContinue(false)}
                    className="w-full sm:w-auto"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Try with Video
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => runTest()}
                    className="w-full sm:w-auto"
                  >
                    Retest
                  </Button>
                  <Button
                    onClick={() => handleContinue(false)}
                    className="w-full sm:w-auto"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Join Meeting
                  </Button>
                </>
              )}
            </>
          )}
          
          {isRunning && (
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Skip Test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
