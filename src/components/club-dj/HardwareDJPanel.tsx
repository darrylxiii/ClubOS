import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Radio, Usb, Mic, Volume2, Wifi, WifiOff, AudioLines, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useHardwareCapture, type AudioAnalysis } from '@/hooks/useHardwareCapture';
import { useDJStream } from '@/hooks/useDJStream';
import { useWebMIDI } from '@/hooks/useWebMIDI';

// ── Waveform Visualizer ────────────────────────────────────────────────────────

function LiveWaveform({ analysis }: { analysis: AudioAnalysis | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis) return;

    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const { frequencyData } = analysis;
    const barCount = 64;
    const barWidth = width / barCount;
    const gap = 1;

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * frequencyData.length);
      const val = frequencyData[idx] / 255;
      const barHeight = val * height;

      // Gradient from primary to accent based on frequency
      const hue = 270 + (i / barCount) * 60; // Purple to pink
      ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${0.4 + val * 0.6})`;

      ctx.beginPath();
      ctx.roundRect(
        i * barWidth + gap / 2,
        height - barHeight,
        barWidth - gap,
        barHeight,
        2
      );
      ctx.fill();
    }
  }, [analysis]);

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={120}
      className="w-full h-[120px] rounded-xl"
    />
  );
}

// ── Level Meters ───────────────────────────────────────────────────────────────

function LevelMeter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-24 bg-black/40 rounded-full overflow-hidden relative">
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ backgroundColor: color }}
          animate={{ height: `${value * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium uppercase">{label}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface HardwareDJPanelProps {
  liveSessionId: string | null;
  isLive: boolean;
}

export function HardwareDJPanel({ liveSessionId, isLive }: HardwareDJPanelProps) {
  const hardware = useHardwareCapture();
  const stream = useDJStream();
  const midi = useWebMIDI(liveSessionId); // Captures MIDI + broadcasts to listeners

  // Enumerate devices on mount
  useEffect(() => {
    hardware.refreshDevices();
  }, [hardware.refreshDevices]);

  const handleGoLive = async () => {
    if (!liveSessionId) return;

    // Start hardware capture
    const audioStream = await hardware.startCapture();
    if (!audioStream) return;

    // Publish to LiveKit
    await stream.startStream(audioStream, liveSessionId);
  };

  const handleStopStream = async () => {
    await stream.stopStream();
    hardware.stopCapture();
  };

  const isActive = hardware.isCapturing && stream.isStreaming;
  const bass = hardware.analysis?.bass || 0;
  const mid = hardware.analysis?.mid || 0;
  const treble = hardware.analysis?.treble || 0;
  const rms = hardware.analysis?.rms || 0;

  return (
    <div className="space-y-6">
      {/* Device Selection */}
      <Card className="p-6 bg-black/20 backdrop-blur-xl border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Usb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Audio Input Device</h3>
            <p className="text-sm text-muted-foreground">
              Connect your XDJ-AZ via USB-C and select it below
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Select
            value={hardware.selectedDeviceId || ''}
            onValueChange={hardware.selectDevice}
          >
            <SelectTrigger className="flex-1 bg-black/30 border-white/10">
              <SelectValue placeholder="Select audio device..." />
            </SelectTrigger>
            <SelectContent>
              {hardware.devices.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  <div className="flex items-center gap-2">
                    <Mic className="h-3.5 w-3.5" />
                    {d.label}
                  </div>
                </SelectItem>
              ))}
              {hardware.devices.length === 0 && (
                <SelectItem value="_none" disabled>
                  No audio devices found
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={hardware.refreshDevices}
            className="border-white/10"
          >
            <AudioLines className="h-4 w-4" />
          </Button>
        </div>

        {midi.isConnected && (
          <p className="text-sm text-green-400 mt-2">MIDI: {midi.deviceName}</p>
        )}
        {hardware.error && (
          <p className="text-sm text-red-400 mt-2">{hardware.error}</p>
        )}
        {stream.error && (
          <p className="text-sm text-red-400 mt-2">{stream.error}</p>
        )}
      </Card>

      {/* Live Waveform + Meters */}
      <Card className="p-6 bg-black/20 backdrop-blur-xl border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isActive ? (
                <Wifi className="h-4 w-4 text-green-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {isActive ? 'Streaming Live' : 'Not Streaming'}
              </span>
            </div>
            {isActive && (
              <>
                <Badge variant="outline" className="border-red-500/50 text-red-400">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1.5" />
                  LIVE
                </Badge>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {stream.listenerCount}
                </div>
              </>
            )}
          </div>

          {stream.roomName && (
            <Badge variant="secondary" className="font-mono text-xs">
              {stream.roomName}
            </Badge>
          )}
        </div>

        {/* Waveform */}
        <div className="bg-black/40 rounded-xl p-1 mb-4">
          {isActive ? (
            <LiveWaveform analysis={hardware.analysis} />
          ) : (
            <div className="w-full h-[120px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {hardware.selectedDeviceId
                  ? 'Start streaming to see live audio'
                  : 'Select an audio device to begin'}
              </p>
            </div>
          )}
        </div>

        {/* Level Meters */}
        <div className="flex items-end justify-center gap-6">
          <LevelMeter label="Bass" value={bass} color="hsl(270, 80%, 65%)" />
          <LevelMeter label="Mid" value={mid} color="hsl(290, 80%, 65%)" />
          <LevelMeter label="Treble" value={treble} color="hsl(320, 80%, 65%)" />
          <div className="w-px h-20 bg-white/10" />
          <LevelMeter label="Level" value={rms} color={rms > 0.85 ? 'hsl(0, 80%, 60%)' : 'hsl(150, 80%, 55%)'} />
        </div>
      </Card>

      {/* Stream Controls */}
      {isLive && (
        <div className="flex gap-3">
          {!isActive ? (
            <Button
              onClick={handleGoLive}
              disabled={!hardware.selectedDeviceId || stream.isConnecting}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-14 text-lg"
            >
              {stream.isConnecting ? (
                <>
                  <Radio className="h-5 w-5 mr-2 animate-pulse" />
                  Connecting...
                </>
              ) : (
                <>
                  <Radio className="h-5 w-5 mr-2" />
                  Start Hardware Stream
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleStopStream}
              variant="outline"
              className="flex-1 border-red-500/50 hover:bg-red-500/20 h-14 text-lg"
            >
              <WifiOff className="h-5 w-5 mr-2" />
              Stop Stream
            </Button>
          )}
        </div>
      )}

      {!isLive && (
        <p className="text-center text-sm text-muted-foreground">
          Press "Go Live" first to create a broadcast session, then start the hardware stream.
        </p>
      )}
    </div>
  );
}
