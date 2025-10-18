import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DiagnosticCheck {
  name: string;
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'warning';
  message?: string;
}

interface PreCallDiagnosticsProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function PreCallDiagnostics({ onComplete, onCancel }: PreCallDiagnosticsProps) {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([
    { name: 'Camera Access', status: 'pending' },
    { name: 'Microphone Access', status: 'pending' },
    { name: 'Internet Connection', status: 'pending' },
    { name: 'Browser Compatibility', status: 'pending' }
  ]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [troubleshooting, setTroubleshooting] = useState<Record<number, string>>({});

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getTroubleshootingTip = (checkIndex: number, status: string): string => {
    const tips = {
      0: {
        failed: '📹 Camera access denied. Go to browser settings → Privacy → Camera and allow access for this site.',
        warning: '⚠️ Camera detected but quality may be low. Ensure good lighting and clean your lens.'
      },
      1: {
        failed: '🎤 Microphone access denied. Go to browser settings → Privacy → Microphone and enable permissions.',
        warning: '⚠️ Microphone working but may have background noise. Try using headphones for better quality.'
      },
      2: {
        failed: '📡 No internet connection. Check your WiFi or ethernet connection and try again.',
        warning: '⚠️ Connection is slow. Consider closing other apps, moving closer to router, or switching to ethernet.'
      },
      3: {
        failed: '🌐 Browser not supported. Use latest Chrome, Edge, Safari, or Firefox for best experience.',
        warning: '⚠️ Browser compatibility limited. Update to latest version for all features.'
      }
    };
    return tips[checkIndex as keyof typeof tips]?.[status as 'failed' | 'warning'] || '';
  };

  const runDiagnostics = async () => {
    // Check camera
    updateCheck(0, 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      stream.getTracks().forEach(track => track.stop());
      
      updateCheck(0, 'passed', `Camera: ${settings.width}x${settings.height}`);
    } catch (error: any) {
      const tip = getTroubleshootingTip(0, 'failed');
      updateCheck(0, 'failed', error.name === 'NotAllowedError' ? 'Permission denied' : 'Camera unavailable');
      setTroubleshooting(prev => ({ ...prev, 0: tip }));
    }
    setOverallProgress(25);

    // Check microphone
    updateCheck(1, 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = stream.getAudioTracks()[0];
      stream.getTracks().forEach(track => track.stop());
      
      updateCheck(1, 'passed', 'Microphone is working');
    } catch (error: any) {
      const tip = getTroubleshootingTip(1, 'failed');
      updateCheck(1, 'failed', error.name === 'NotAllowedError' ? 'Permission denied' : 'Microphone unavailable');
      setTroubleshooting(prev => ({ ...prev, 1: tip }));
    }
    setOverallProgress(50);

    // Check internet connection with detailed metrics
    updateCheck(2, 'checking');
    try {
      const start = Date.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
      const latency = Date.now() - start;
      
      // Check bandwidth estimate
      const connection = (navigator as any).connection;
      const bandwidth = connection?.downlink || 'unknown';
      
      if (latency < 50 && (bandwidth === 'unknown' || bandwidth > 5)) {
        updateCheck(2, 'passed', `Excellent (${latency}ms, ${bandwidth}Mbps)`);
      } else if (latency < 150 && (bandwidth === 'unknown' || bandwidth > 2)) {
        updateCheck(2, 'passed', `Good (${latency}ms, ${bandwidth}Mbps)`);
      } else if (latency < 300) {
        const tip = getTroubleshootingTip(2, 'warning');
        updateCheck(2, 'warning', `Slow (${latency}ms, ${bandwidth}Mbps)`);
        setTroubleshooting(prev => ({ ...prev, 2: tip }));
      } else {
        const tip = getTroubleshootingTip(2, 'warning');
        updateCheck(2, 'warning', `Poor (${latency}ms)`);
        setTroubleshooting(prev => ({ ...prev, 2: tip }));
      }
    } catch (error) {
      const tip = getTroubleshootingTip(2, 'failed');
      updateCheck(2, 'failed', 'No connection detected');
      setTroubleshooting(prev => ({ ...prev, 2: tip }));
    }
    setOverallProgress(75);

    // Check browser compatibility
    updateCheck(3, 'checking');
    const isCompatible = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasScreenShare = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    
    if (isCompatible && hasScreenShare) {
      updateCheck(3, 'passed', 'All features supported');
    } else if (isCompatible) {
      const tip = getTroubleshootingTip(3, 'warning');
      updateCheck(3, 'warning', 'Limited features available');
      setTroubleshooting(prev => ({ ...prev, 3: tip }));
    } else {
      const tip = getTroubleshootingTip(3, 'failed');
      updateCheck(3, 'failed', 'Browser not supported');
      setTroubleshooting(prev => ({ ...prev, 3: tip }));
    }
    setOverallProgress(100);
  };

  const updateCheck = (index: number, status: DiagnosticCheck['status'], message?: string) => {
    setChecks(prev => prev.map((check, i) => 
      i === index ? { ...check, status, message } : check
    ));
  };

  const allPassed = checks.every(c => c.status === 'passed' || c.status === 'warning');
  const anyFailed = checks.some(c => c.status === 'failed');

  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-background">
      <Card className="max-w-2xl w-full p-8 space-y-6 glass-card">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Pre-Call Diagnostics</h2>
          <p className="text-muted-foreground">
            Checking your device and connection quality...
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={overallProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {overallProgress}% complete
          </p>
        </div>

        {/* Checks */}
        <div className="space-y-4">
          {checks.map((check, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                {check.status === 'pending' && (
                  <div className="h-6 w-6 rounded-full bg-muted" />
                )}
                {check.status === 'checking' && (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                )}
                {check.status === 'passed' && (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                )}
                {check.status === 'warning' && (
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                )}
                {check.status === 'failed' && (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                
                <div className="flex-1">
                  <p className="font-medium">{check.name}</p>
                  {check.message && (
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                  )}
                  {troubleshooting[index] && (
                    <p className="text-xs mt-1 p-2 rounded bg-muted/50 text-muted-foreground">
                      {troubleshooting[index]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onComplete}
            disabled={!allPassed && anyFailed}
            className="flex-1"
          >
            {anyFailed ? 'Fix Issues to Continue' : 'Join Call'}
          </Button>
        </div>
      </Card>
    </div>
  );
}