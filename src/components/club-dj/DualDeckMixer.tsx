import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2, Headphones } from "lucide-react";
import { useAudioManager } from "@/hooks/useAudioManager";

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

  // Deck B
  const audioRefB = useRef<HTMLAudioElement>(null);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [volumeB, setVolumeB] = useState([75]);
  const [eqLowB, setEqLowB] = useState([50]);
  const [eqMidB, setEqMidB] = useState([50]);
  const [eqHighB, setEqHighB] = useState([50]);
  const [progressB, setProgressB] = useState(0);
  const [pitchB, setPitchB] = useState([0]);

  // Crossfader
  const [crossfader, setCrossfader] = useState([50]);

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
    if (audioRefA.current && audioRefB.current) {
      audioRefB.current.currentTime = audioRefA.current.currentTime;
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
    setPitch: (val: number[]) => void
  ) => (
    <div className="flex-1 rounded-3xl bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-xl border border-white/10 p-6 space-y-4">
      {/* Deck Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold ${
            deck === 'A' ? 'bg-blue-500' : 'bg-orange-500'
          }`}>
            {deck}
          </div>
          <div className="text-sm font-mono">
            {track ? `${Math.floor(track.duration_seconds || 0 / 60)}:${String(Math.floor(track.duration_seconds || 0 % 60)).padStart(2, '0')}` : '--:--'}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Headphones className="h-4 w-4" />
        </Button>
      </div>

      {/* Track Info */}
      <div className="min-h-[80px]">
        {track ? (
          <div className="space-y-1">
            <div className="font-bold truncate">{track.title}</div>
            <div className="text-sm text-muted-foreground truncate">{track.artist}</div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No track loaded</div>
        )}
      </div>

      {/* Waveform Progress */}
      <div className="h-16 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
        <div 
          className={`h-full transition-all ${deck === 'A' ? 'bg-blue-500/30' : 'bg-orange-500/30'}`}
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs font-mono">{progress.toFixed(0)}%</div>
        </div>
      </div>

      {/* Play Controls */}
      <div className="flex items-center justify-center gap-3">
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

      {/* Pitch Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">TEMPO</span>
          <span className="font-mono">{pitch[0] > 0 ? '+' : ''}{pitch[0].toFixed(1)}%</span>
        </div>
        <Slider
          value={pitch}
          onValueChange={setPitch}
          min={-8}
          max={8}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* EQ Section */}
      <div className="grid grid-cols-3 gap-3">
        {/* Low */}
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground">LOW</div>
          <div className="h-24 flex items-end justify-center">
            <div className="w-full relative">
              <Slider
                value={eqLow}
                onValueChange={setEqLow}
                max={100}
                step={1}
                orientation="vertical"
                className="h-20"
              />
            </div>
          </div>
          <div className="text-xs text-center font-mono">{eqLow[0]}</div>
        </div>

        {/* Mid */}
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground">MID</div>
          <div className="h-24 flex items-end justify-center">
            <div className="w-full relative">
              <Slider
                value={eqMid}
                onValueChange={setEqMid}
                max={100}
                step={1}
                orientation="vertical"
                className="h-20"
              />
            </div>
          </div>
          <div className="text-xs text-center font-mono">{eqMid[0]}</div>
        </div>

        {/* High */}
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground">HIGH</div>
          <div className="h-24 flex items-end justify-center">
            <div className="w-full relative">
              <Slider
                value={eqHigh}
                onValueChange={setEqHigh}
                max={100}
                step={1}
                orientation="vertical"
                className="h-20"
              />
            </div>
          </div>
          <div className="text-xs text-center font-mono">{eqHigh[0]}</div>
        </div>
      </div>

      {/* Volume Fader */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-10 text-right">{volume[0]}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Deck Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deck A */}
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
          setPitchA
        )}

        {/* Deck B */}
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
          setPitchB
        )}
      </div>

      {/* Crossfader Section */}
      <div className="rounded-3xl bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/10 p-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-blue-500 flex items-center justify-center text-xs font-bold">A</div>
              <span className="text-sm font-medium">CROSSFADER</span>
              <div className="h-6 w-6 rounded bg-orange-500 flex items-center justify-center text-xs font-bold">B</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={syncDecks}
              disabled={!trackA || !trackB}
            >
              SYNC
            </Button>
          </div>
          
          <div className="relative">
            <Slider
              value={crossfader}
              onValueChange={setCrossfader}
              max={100}
              step={1}
              className="w-full h-12"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-2">
              <div className={`text-xs font-bold transition-opacity ${crossfader[0] <= 50 ? 'opacity-100' : 'opacity-30'}`}>
                A
              </div>
              <div className={`text-xs font-bold transition-opacity ${crossfader[0] >= 50 ? 'opacity-100' : 'opacity-30'}`}>
                B
              </div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>A: {crossfader[0] <= 50 ? 100 : ((100 - crossfader[0]) / 50 * 100).toFixed(0)}%</span>
            <span>B: {crossfader[0] >= 50 ? 100 : (crossfader[0] / 50 * 100).toFixed(0)}%</span>
          </div>
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
