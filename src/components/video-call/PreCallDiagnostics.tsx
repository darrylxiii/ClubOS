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

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    // Check camera
    updateCheck(0, 'checking');
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      updateCheck(0, 'passed', 'Camera is working');
    } catch (error) {
      updateCheck(0, 'failed', 'Camera access denied');
    }
    setOverallProgress(25);

    // Check microphone
    updateCheck(1, 'checking');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      updateCheck(1, 'passed', 'Microphone is working');
    } catch (error) {
      updateCheck(1, 'failed', 'Microphone access denied');
    }
    setOverallProgress(50);

    // Check internet connection
    updateCheck(2, 'checking');
    try {
      const start = Date.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      const latency = Date.now() - start;
      
      if (latency < 100) {
        updateCheck(2, 'passed', `Excellent connection (${latency}ms)`);
      } else if (latency < 300) {
        updateCheck(2, 'warning', `Good connection (${latency}ms)`);
      } else {
        updateCheck(2, 'warning', `Slow connection (${latency}ms)`);
      }
    } catch (error) {
      updateCheck(2, 'failed', 'No internet connection');
    }
    setOverallProgress(75);

    // Check browser compatibility
    updateCheck(3, 'checking');
    const isCompatible = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (isCompatible) {
      updateCheck(3, 'passed', 'Browser is compatible');
    } else {
      updateCheck(3, 'failed', 'Browser not supported');
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
                
                <div>
                  <p className="font-medium">{check.name}</p>
                  {check.message && (
                    <p className="text-sm text-muted-foreground">{check.message}</p>
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