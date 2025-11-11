import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2, Headphones, Zap, Waves, Mic, Drum, Music2, Guitar, Disc3 } from "lucide-react";
import { useAudioManager } from "@/hooks/useAudioManager";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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
  liveSessionId?: string | null;
  queueTracks?: Array<{ id: string; tracks: Track }>;
}

export function DualDeckMixer({ trackA, trackB, onTrackEnd, liveSessionId, queueTracks = [] }: DualDeckMixerProps) {
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
  const [stemVocalsA, setStemVocalsA] = useState([100]);
  const [stemDrumsA, setStemDrumsA] = useState([100]);
  const [stemBassA, setStemBassA] = useState([100]);
  const [stemOtherA, setStemOtherA] = useState([100]);
  const [rotationA, setRotationA] = useState(0);

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
  const [stemVocalsB, setStemVocalsB] = useState([100]);
  const [stemDrumsB, setStemDrumsB] = useState([100]);
  const [stemBassB, setStemBassB] = useState([100]);
  const [stemOtherB, setStemOtherB] = useState([100]);
  const [rotationB, setRotationB] = useState(0);

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

  // Animate turntable rotation for Deck A
  useEffect(() => {
    if (!isPlayingA) return;
    
    const animate = () => {
      setRotationA(prev => (prev + (1 + pitchA[0] / 100) * 2) % 360);
    };
    
    const interval = setInterval(animate, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isPlayingA, pitchA]);

  // Apply volume and pitch to Deck B
  useEffect(() => {
    if (audioRefB.current) {
      const crossfaderVolume = crossfader[0] >= 50 ? 1 : crossfader[0] / 50;
      audioRefB.current.volume = (volumeB[0] / 100) * crossfaderVolume;
      audioRefB.current.playbackRate = 1 + (pitchB[0] / 100) * 0.16;
    }
  }, [volumeB, crossfader, pitchB]);

  // Animate turntable rotation for Deck B
  useEffect(() => {
    if (!isPlayingB) return;
    
    const animate = () => {
      setRotationB(prev => (prev + (1 + pitchB[0] / 100) * 2) % 360);
    };
    
    const interval = setInterval(animate, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isPlayingB, pitchB]);

  // Update live session current track
  const updateLiveSessionTrack = async (trackId: string) => {
    if (!liveSessionId) return;
    
    try {
      const { error } = await supabase
        .from('live_sessions')
        .update({ current_track_id: trackId })
        .eq('id', liveSessionId);
      
      if (error) {
        console.error('Failed to update live session track:', error);
      }
    } catch (err) {
      console.error('Error updating live session:', err);
    }
  };

  const togglePlayA = async () => {
    if (!audioRefA.current || !trackA) return;
    
    if (isPlayingA) {
      managedPause(audioRefA.current);
      setIsPlayingA(false);
    } else {
      try {
        await managedPlay(audioRefA.current);
        setIsPlayingA(true);
        // Update live session with current track
        if (liveSessionId && trackA.id) {
          await updateLiveSessionTrack(trackA.id);
        }
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
        // Update live session with current track
        if (liveSessionId && trackB.id) {
          await updateLiveSessionTrack(trackB.id);
        }
      } catch (err) {
        console.error('Play error:', err);
      }
    }
  };

  // Auto-advance to next track when current track ends
  const autoAdvance = async (currentDeck: 'A' | 'B') => {
    if (!liveSessionId || !queueTracks.length) {
      onTrackEnd?.(currentDeck);
      return;
    }

    // Find next track in queue
    const currentTrack = currentDeck === 'A' ? trackA : trackB;
    const currentIndex = queueTracks.findIndex(q => q.tracks?.id === currentTrack?.id);
    
    if (currentIndex === -1 || currentIndex >= queueTracks.length - 1) {
      // No more tracks in queue
      console.log('No more tracks to advance to');
      onTrackEnd?.(currentDeck);
      return;
    }

    const nextTrack = queueTracks[currentIndex + 1]?.tracks;
    
    if (!nextTrack) {
      onTrackEnd?.(currentDeck);
      return;
    }

    // Load next track into the opposite deck
    const targetDeck = currentDeck === 'A' ? 'B' : 'A';
    const targetAudioRef = targetDeck === 'A' ? audioRefA : audioRefB;
    const targetSetIsPlaying = targetDeck === 'A' ? setIsPlayingA : setIsPlayingB;

    if (targetAudioRef.current) {
      try {
        // Load and play next track
        targetAudioRef.current.src = nextTrack.file_url;
        targetAudioRef.current.load();
        await managedPlay(targetAudioRef.current);
        targetSetIsPlaying(true);
        
        // Update live session
        await updateLiveSessionTrack(nextTrack.id);
        
        console.log(`Auto-advanced from Deck ${currentDeck} to Deck ${targetDeck}:`, nextTrack.title);
      } catch (err) {
        console.error('Auto-advance error:', err);
      }
    }
    
    onTrackEnd?.(currentDeck);
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
    setEcho: (val: number[]) => void,
    stemVocals: number[],
    setStemVocals: (val: number[]) => void,
    stemDrums: number[],
    setStemDrums: (val: number[]) => void,
    stemBass: number[],
    setStemBass: (val: number[]) => void,
    stemOther: number[],
    setStemOther: (val: number[]) => void,
    rotation: number
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

      {/* CDJ Spinning Turntable */}
      <div className="relative flex items-center justify-center mb-4">
        {/* Turntable Platter */}
        <div className="relative w-56 h-56">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-gray-700 shadow-2xl">
            {/* Rotating vinyl with cover art */}
            <div 
              className="absolute inset-2 rounded-full overflow-hidden transition-transform"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {/* Vinyl texture background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800" />
              
              {/* Grooves effect */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border border-white/5"
                  style={{ 
                    margin: `${i * 8}px`,
                  }}
                />
              ))}
              
              {/* Center label with cover art */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-black border-2 border-gray-600 shadow-xl">
                  {track?.cover_image_url ? (
                    <img 
                      src={track.cover_image_url} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <Disc3 className="w-10 h-10 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Center spindle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-600 border-2 border-gray-500 shadow-inner" />
          </div>
          
          {/* Tonearm indicator */}
          <div 
            className={`absolute top-8 right-8 w-16 h-1 rounded-full origin-right transition-transform ${
              deck === 'A' ? 'bg-blue-500' : 'bg-orange-500'
            }`}
            style={{ 
              transform: `rotate(${progress * 0.45}deg)`,
              boxShadow: '0 0 10px currentColor'
            }}
          />
        </div>
      </div>

      {/* CDJ Display Screen - Waveform */}
      <div className="h-24 rounded-lg bg-gradient-to-b from-cyan-950/60 to-black border border-cyan-500/20 relative overflow-hidden mb-3 shadow-inner">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute w-full h-px bg-cyan-400" style={{ top: `${i * 12.5}%` }} />
          ))}
        </div>
        
        {/* Waveform bars */}
        <div className="absolute inset-0 flex items-end justify-start px-2 pb-2 gap-px">
          {[...Array(80)].map((_, i) => {
            const barProgress = (i / 80) * 100;
            const isPlayed = barProgress <= progress;
            const height = Math.random() * 60 + 20;
            return (
              <div
                key={i}
                className={`flex-1 rounded-t transition-all ${
                  isPlayed 
                    ? deck === 'A' ? 'bg-blue-400' : 'bg-orange-400'
                    : 'bg-cyan-400/40'
                }`}
                style={{ 
                  height: `${height}%`,
                  boxShadow: isPlayed ? '0 0 4px currentColor' : 'none'
                }}
              />
            );
          })}
        </div>
        
        {/* Playhead */}
        <div 
          className={`absolute top-0 bottom-0 w-0.5 ${deck === 'A' ? 'bg-blue-500' : 'bg-orange-500'}`}
          style={{ 
            left: `${progress}%`,
            boxShadow: '0 0 8px currentColor'
          }}
        />
        
        {/* Display Info Overlay */}
        <div className="absolute top-1 left-2 right-2 flex justify-between items-start">
          <div className="text-cyan-300 text-[10px] font-mono tracking-wider">
            {track ? (
              <div className="space-y-0.5">
                <div className="font-bold truncate max-w-[200px]">{track.title}</div>
                <div className="text-cyan-400/70 truncate max-w-[200px]">{track.artist}</div>
              </div>
            ) : (
              <div className="text-cyan-500/50">NO TRACK LOADED</div>
            )}
          </div>
          <div className="text-cyan-300 text-xs font-mono">
            {track ? `${Math.floor((track.duration_seconds || 0) / 60)}:${String(Math.floor((track.duration_seconds || 0) % 60)).padStart(2, '0')}` : '--:--'}
          </div>
        </div>
        
        {/* BPM Display */}
        <div className="absolute bottom-1 right-2 text-cyan-300 text-xs font-mono">
          BPM: {track ? Math.round(128 * (1 + pitch[0] / 100)) : '--'}
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

      {/* STEMS Section */}
      <div className="px-2 pt-2 border-t border-white/10">
        <Label className="text-xs text-muted-foreground mb-3 block text-center">STEMS CONTROL</Label>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <div className="flex flex-col items-center gap-1">
              <Mic className="h-3 w-3 text-purple-400" />
              <Label className="text-[10px] text-muted-foreground">VOX</Label>
            </div>
            <Slider
              value={stemVocals}
              onValueChange={setStemVocals}
              max={100}
              step={1}
              orientation="vertical"
              className="h-16 mx-auto"
            />
            <div className="text-[10px] font-mono text-center">{stemVocals[0]}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex flex-col items-center gap-1">
              <Drum className="h-3 w-3 text-red-400" />
              <Label className="text-[10px] text-muted-foreground">DRM</Label>
            </div>
            <Slider
              value={stemDrums}
              onValueChange={setStemDrums}
              max={100}
              step={1}
              orientation="vertical"
              className="h-16 mx-auto"
            />
            <div className="text-[10px] font-mono text-center">{stemDrums[0]}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex flex-col items-center gap-1">
              <Music2 className="h-3 w-3 text-green-400" />
              <Label className="text-[10px] text-muted-foreground">BASS</Label>
            </div>
            <Slider
              value={stemBass}
              onValueChange={setStemBass}
              max={100}
              step={1}
              orientation="vertical"
              className="h-16 mx-auto"
            />
            <div className="text-[10px] font-mono text-center">{stemBass[0]}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex flex-col items-center gap-1">
              <Guitar className="h-3 w-3 text-blue-400" />
              <Label className="text-[10px] text-muted-foreground">INST</Label>
            </div>
            <Slider
              value={stemOther}
              onValueChange={setStemOther}
              max={100}
              step={1}
              orientation="vertical"
              className="h-16 mx-auto"
            />
            <div className="text-[10px] font-mono text-center">{stemOther[0]}</div>
          </div>
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
            setEchoA,
            stemVocalsA,
            setStemVocalsA,
            stemDrumsA,
            setStemDrumsA,
            stemBassA,
            setStemBassA,
            stemOtherA,
            setStemOtherA,
            rotationA
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
            setEchoB,
            stemVocalsB,
            setStemVocalsB,
            stemDrumsB,
            setStemDrumsB,
            stemBassB,
            setStemBassB,
            stemOtherB,
            setStemOtherB,
            rotationB
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
          autoAdvance('A');
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
          autoAdvance('B');
        }}
      />
    </div>
  );
}
