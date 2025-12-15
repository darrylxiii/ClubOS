import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
  const [audioLevel, setAudioLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

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

    // Check microphone and setup VU meter
    updateCheck(1, 'checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analysis
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      // Animation loop for VU meter
      const updateLevel = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setAudioLevel(prev => {
          // Smooth decay
          const target = Math.min(100, (average / 128) * 100);
          return prev * 0.8 + target * 0.2;
        });

        rafRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      updateCheck(1, 'passed', 'Microphone active - say something!');
    } catch (error: any) {
      const tip = getTroubleshootingTip(1, 'failed');
      updateCheck(1, 'failed', error.name === 'NotAllowedError' ? 'Permission denied' : 'Microphone unavailable');
      setTroubleshooting(prev => ({ ...prev, 1: tip }));
    }
    setOverallProgress(50);

    // Check internet connection
    updateCheck(2, 'checking');
    try {
      const start = Date.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
      const latency = Date.now() - start;

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

  const playTestSound = () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Play a pleasant "ding"
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);

    toast.info('Playing test sound...', { duration: 1000 });
  };

  const allPassed = checks.every(c => c.status === 'passed' || c.status === 'warning');
  const anyFailed = checks.some(c => c.status === 'failed');
  const isComplete = overallProgress === 100;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-2xl"
        >
          <Card className="p-8 space-y-6 bg-gray-900/90 border-gray-700/50 backdrop-blur-sm shadow-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-white">Pre-Call Diagnostics</h2>
              <p className="text-gray-400">
                Checking your device and connection quality...
              </p>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <Progress value={overallProgress} className="h-2" />
              <p className="text-sm text-gray-400 text-center">
                {overallProgress}% complete
              </p>
            </div>

            {/* Checks */}
            <div className="space-y-4">
              {checks.map((check, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {check.status === 'pending' && (
                      <div className="h-6 w-6 rounded-full bg-gray-700" />
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
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-medium text-white">{check.name}</p>
                        {index === 1 && check.status === 'passed' && (
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-400">Input Level:</span>
                            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-75 ease-out"
                                style={{ width: `${audioLevel}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {index === 1 && check.status === 'passed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-4 h-6 text-xs bg-gray-800 border-gray-700 hover:bg-gray-700"
                            onClick={playTestSound}
                          >
                            Test Speakers
                          </Button>
                        )}
                      </div>

                      {check.message && (
                        <p className="text-sm text-gray-400">{check.message}</p>
                      )}

                      {troubleshooting[index] && (
                        <p className="text-xs mt-1 p-2 rounded bg-gray-800/50 text-gray-300">
                          {troubleshooting[index]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning message if issues detected */}
            {anyFailed && isComplete && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-400">
                  ⚠️ Some checks failed. You can still join the call, but your experience may be limited.
                  We recommend fixing the issues above first.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              {!isComplete && (
                <Button
                  onClick={onComplete}
                  variant="ghost"
                  className="flex-1"
                >
                  Skip Checks
                </Button>
              )}
              <Button
                onClick={onComplete}
                disabled={!isComplete && !anyFailed}
                className="flex-1"
              >
                {anyFailed ? 'Join Anyway' : isComplete ? 'Join Call' : 'Please Wait...'}
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
