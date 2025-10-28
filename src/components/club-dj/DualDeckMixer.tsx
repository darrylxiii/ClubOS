import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2, Headphones, Zap, Waves } from "lucide-react";
import { useAudioManager } from "@/hooks/useAudioManager";
import { Label } from "@/components/ui/label";

interface Track {
  id: string;
  title: string;
  artist: string;
  file_url: string;
  cover_image_url?: string;
  duration_seconds?: number;
}

interface DualDeckMixerProps {
  trackA?: Track;
  trackB?: Track;
  onTrackEnd?: (deck: 'A' | 'B') => void;
}

export function DualDeckMixer({ trackA, trackB, onTrackEnd }: DualDeckMixerProps) {
  const { play: managedPlay, pause: managedPause } = useAudioManager('dj');
  
  // Deck A
  const audioRefA = useRef<HTMLAudioElement>(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [volumeA, setVolumeA] = useState([75]);
  const [eqLowA, setEqLowA] = useState([50]);
  const [eqMidA, setEqMidA] = useState([50]);
  const [eqHighA, setEqHighA] = useState([50]);
  const [progressA, setProgressA] = useState(0);
  const [pitchA, setPitchA] = useState([0]);
  const [filterA, setFilterA] = useState([0]);
  const [echoA, setEchoA] = useState([0]);

  // Deck B
  const audioRefB = useRef<HTMLAudioElement>(null);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [volumeB, setVolumeB] = useState([75]);
  const [eqLowB, setEqLowB] = useState([50]);
  const [eqMidB, setEqMidB] = useState([50]);
  const [eqHighB, setEqHighB] = useState([50]);
  const [progressB, setProgressB] = useState(0);
  const [pitchB, setPitchB] = useState([0]);
  const [filterB, setFilterB] = useState([0]);
  const [echoB, setEchoB] = useState([0]);

  // Crossfader
  const [crossfader, setCrossfader] = useState([50]);
  const [syncEnabled, setSyncEnabled] = useState(false);

  // Load tracks
  useEffect(() => {
    if (trackA && audioRefA.current) {
      audioRefA.current.src = trackA.file_url;
      audioRefA.current.load();
    }
  }, [trackA]);

  useEffect(() => {
    if (trackB && audioRefB.current) {
      audioRefB.current.src = trackB.file_url;
      audioRefB.current.load();
    }
  }, [trackB]);

  // Apply volume and pitch to Deck A
  useEffect(() => {
    if (audioRefA.current) {
      const crossfaderVolume = crossfader[0] <= 50 ? 1 : (100 - crossfader[0]) / 50;
      audioRefA.current.volume = (volumeA[0] / 100) * crossfaderVolume;
      audioRefA.current.playbackRate = 1 + (pitchA[0] / 100) * 0.16; // ±16% pitch range
    }
  }, [volumeA, crossfader, pitchA]);

  // Apply volume and pitch to Deck B
  useEffect(() => {
    if (audioRefB.current) {
      const crossfaderVolume = crossfader[0] >= 50 ? 1 : crossfader[0] / 50;
      audioRefB.current.volume = (volumeB[0] / 100) * crossfaderVolume;
      audioRefB.current.playbackRate = 1 + (pitchB[0] / 100) * 0.16;
    }
  }, [volumeB, crossfader, pitchB]);

  const togglePlayA = async () => {
    if (!audioRefA.current || !trackA) return;
    
    if (isPlayingA) {
      managedPause(audioRefA.current);
      setIsPlayingA(false);
    } else {
      try {
        await managedPlay(audioRefA.current);
        setIsPlayingA(true);
      } catch (err) {
        console.error('Play error:', err);
      }
    }
  };

  const togglePlayB = async () => {
    if (!audioRefB.current || !trackB) return;
    
    if (isPlayingB) {
      managedPause(audioRefB.current);
      setIsPlayingB(false);
    } else {
      try {
        await managedPlay(audioRefB.current);
        setIsPlayingB(true);
      } catch (err) {
        console.error('Play error:', err);
      }
    }
  };

  const syncDecks = () => {
    if (audioRefA.current && audioRefB.current && isPlayingA) {
      audioRefB.current.currentTime = audioRefA.current.currentTime;
      // Match tempo
      setPitchB(pitchA);
      setSyncEnabled(true);
      setTimeout(() => setSyncEnabled(false), 2000);
    }
  };

  const renderDeck = (
    deck: 'A' | 'B',
    track: Track | undefined,
    isPlaying: boolean,
    togglePlay: () => void,
    volume: number[],
    setVolume: (val: number[]) => void,
    eqLow: number[],
    setEqLow: (val: number[]) => void,
    eqMid: number[],
    setEqMid: (val: number[]) => void,
    eqHigh: number[],
    setEqHigh: (val: number[]) => void,
    progress: number,
    pitch: number[],
    setPitch: (val: number[]) => void,
    filter: number[],
    setFilter: (val: number[]) => void,
    echo: number[],
    setEcho: (val: number[]) => void
  ) => (
    <div className="flex-1 rounded-3xl bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 p-4 space-y-4">
      {/* Deck Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg ${
            deck === 'A' ? 'bg-blue-500' : 'bg-orange-500'
          }`}>
            {deck}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Headphones className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-mono">
          {track ? `${Math.floor((track.duration_seconds || 0) / 60)}:${String(Math.floor((track.duration_seconds || 0) % 60)).padStart(2, '0')}` : '--:--'}
        </div>
      </div>

      {/* Waveform Progress */}
      <div className="h-20 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
        <div 
          className={`h-full transition-all ${deck === 'A' ? 'bg-blue-500/40' : 'bg-orange-500/40'}`}
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {track ? (
            <>
              <div className="font-bold text-sm truncate max-w-[90%]">{track.title}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[90%]">{track.artist}</div>
            </>
          ) : (
            <div className="text-muted-foreground text-xs">No track loaded</div>
          )}
        </div>
      </div>

      {/* Play Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          size="icon"
          variant="outline"
          className="h-12 w-12 rounded-full"
          onClick={() => {
            if (deck === 'A' && audioRefA.current) {
              audioRefA.current.currentTime = 0;
            } else if (deck === 'B' && audioRefB.current) {
              audioRefB.current.currentTime = 0;
            }
          }}
          disabled={!track}
          title="Cue"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        
        <Button
          size="icon"
          className={`h-16 w-16 rounded-full ${
            deck === 'A' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'
          }`}
          onClick={togglePlay}
          disabled={!track}
        >
          {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
        </Button>
      </div>

      {/* Tempo Slider */}
      <div className="space-y-2 px-2">
        <Label className="text-xs text-muted-foreground">TEMPO</Label>
        <div className="flex items-center gap-3">
          <Slider
            value={pitch}
            onValueChange={setPitch}
            min={-8}
            max={8}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-12 text-right">
            {pitch[0] > 0 ? '+' : ''}{pitch[0].toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Effects Section */}
      <div className="grid grid-cols-2 gap-3 px-2">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <Label className="text-xs text-muted-foreground">FILTER</Label>
          </div>
          <Slider
            value={filter}
            onValueChange={setFilter}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="text-xs font-mono text-center">{filter[0]}</div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Waves className="h-3 w-3 text-cyan-500" />
            <Label className="text-xs text-muted-foreground">ECHO</Label>
          </div>
          <Slider
            value={echo}
            onValueChange={setEcho}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="text-xs font-mono text-center">{echo[0]}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Main Layout - DJAY Style */}
      <div className="flex gap-4">
        {/* Left Deck */}
        <div className="flex-1">
          {renderDeck(
            'A',
            trackA,
            isPlayingA,
            togglePlayA,
            volumeA,
            setVolumeA,
            eqLowA,
            setEqLowA,
            eqMidA,
            setEqMidA,
            eqHighA,
            setEqHighA,
            progressA,
            pitchA,
            setPitchA,
            filterA,
            setFilterA,
            echoA,
            setEchoA
          )}
        </div>

        {/* Center Mixer Section */}
        <div className="w-80 rounded-3xl bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/10 p-6 space-y-6">
          {/* Sync Button */}
          <Button
            className={`w-full h-14 text-lg font-bold transition-all ${
              syncEnabled 
                ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                : 'bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600'
            }`}
            onClick={syncDecks}
            disabled={!trackA || !trackB || !isPlayingA}
          >
            {syncEnabled ? '✓ SYNCED' : 'SYNC'}
          </Button>

          {/* EQ & Volume Faders - Vertical */}
          <div className="grid grid-cols-4 gap-3 h-72">
            {/* Deck A EQ */}
            <div className="space-y-2">
              <Label className="text-xs text-blue-400 text-center block">A-LOW</Label>
              <div className="h-full flex flex-col items-center justify-end">
                <Slider
                  value={eqLowA}
                  onValueChange={setEqLowA}
                  max={100}
                  step={1}
                  orientation="vertical"
                  className="h-48"
                />
                <span className="text-xs font-mono mt-2">{eqLowA[0]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-blue-400 text-center block">A-HIGH</Label>
              <div className="h-full flex flex-col items-center justify-end">
                <Slider
                  value={eqHighA}
                  onValueChange={setEqHighA}
                  max={100}
                  step={1}
                  orientation="vertical"
                  className="h-48"
                />
                <span className="text-xs font-mono mt-2">{eqHighA[0]}</span>
              </div>
            </div>

            {/* Deck B EQ */}
            <div className="space-y-2">
              <Label className="text-xs text-orange-400 text-center block">B-LOW</Label>
              <div className="h-full flex flex-col items-center justify-end">
                <Slider
                  value={eqLowB}
                  onValueChange={setEqLowB}
                  max={100}
                  step={1}
                  orientation="vertical"
                  className="h-48"
                />
                <span className="text-xs font-mono mt-2">{eqLowB[0]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-orange-400 text-center block">B-HIGH</Label>
              <div className="h-full flex flex-col items-center justify-end">
                <Slider
                  value={eqHighB}
                  onValueChange={setEqHighB}
                  max={100}
                  step={1}
                  orientation="vertical"
                  className="h-48"
                />
                <span className="text-xs font-mono mt-2">{eqHighB[0]}</span>
              </div>
            </div>
          </div>

          {/* Volume Faders */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-blue-400 flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                DECK A
              </Label>
              <Slider
                value={volumeA}
                onValueChange={setVolumeA}
                max={100}
                step={1}
                className="w-full"
              />
              <span className="text-xs font-mono block text-center">{volumeA[0]}%</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-orange-400 flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                DECK B
              </Label>
              <Slider
                value={volumeB}
                onValueChange={setVolumeB}
                max={100}
                step={1}
                className="w-full"
              />
              <span className="text-xs font-mono block text-center">{volumeB[0]}%</span>
            </div>
          </div>

          {/* Crossfader */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-6 w-6 rounded bg-blue-500 flex items-center justify-center text-xs font-bold">A</div>
              <Label className="text-xs font-medium">CROSSFADER</Label>
              <div className="h-6 w-6 rounded bg-orange-500 flex items-center justify-center text-xs font-bold">B</div>
            </div>
            
            <Slider
              value={crossfader}
              onValueChange={setCrossfader}
              max={100}
              step={1}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{crossfader[0] <= 50 ? 100 : ((100 - crossfader[0]) / 50 * 100).toFixed(0)}%</span>
              <span>{crossfader[0] >= 50 ? 100 : (crossfader[0] / 50 * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Right Deck */}
        <div className="flex-1">
          {renderDeck(
            'B',
            trackB,
            isPlayingB,
            togglePlayB,
            volumeB,
            setVolumeB,
            eqLowB,
            setEqLowB,
            eqMidB,
            setEqMidB,
            eqHighB,
            setEqHighB,
            progressB,
            pitchB,
            setPitchB,
            filterB,
            setFilterB,
            echoB,
            setEchoB
          )}
        </div>
      </div>

      {/* Hidden Audio Elements */}
      <audio
        ref={audioRefA}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          setProgressA((audio.currentTime / audio.duration) * 100);
        }}
        onEnded={() => {
          setIsPlayingA(false);
          onTrackEnd?.('A');
        }}
      />
      <audio
        ref={audioRefB}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          setProgressB((audio.currentTime / audio.duration) * 100);
        }}
        onEnded={() => {
          setIsPlayingB(false);
          onTrackEnd?.('B');
        }}
      />
    </div>
  );
}
