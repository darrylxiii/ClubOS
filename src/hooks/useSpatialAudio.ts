import { useState, useCallback, useRef, useEffect } from 'react';

interface ParticipantPosition {
  participantId: string;
  x: number; // -1 to 1 (left to right)
  y: number; // -1 to 1 (bottom to top)
  z: number; // -1 to 1 (back to front)
}

interface SpatialAudioOptions {
  enabled: boolean;
  roomSize: 'small' | 'medium' | 'large';
  listenerPosition?: { x: number; y: number; z: number };
}

interface SpatialAudioState {
  isActive: boolean;
  participantCount: number;
  isSupported: boolean;
}

// 3D spatial audio positioning for immersive meeting experience
export function useSpatialAudio(options: SpatialAudioOptions = { enabled: true, roomSize: 'medium' }) {
  const [state, setState] = useState<SpatialAudioState>({
    isActive: false,
    participantCount: 0,
    isSupported: typeof AudioContext !== 'undefined' && typeof PannerNode !== 'undefined'
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const listenerRef = useRef<AudioListener | null>(null);
  const pannerNodesRef = useRef<Map<string, PannerNode>>(new Map());
  const sourceNodesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const convolverRef = useRef<ConvolverNode | null>(null);
  const outputStreamRef = useRef<Map<string, MediaStream>>(new Map());

  // Room impulse response settings
  const getRoomSettings = useCallback(() => {
    switch (options.roomSize) {
      case 'small':
        return {
          rolloffFactor: 1.5,
          refDistance: 1,
          maxDistance: 10,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0.5,
          reverbTime: 0.3
        };
      case 'large':
        return {
          rolloffFactor: 0.5,
          refDistance: 3,
          maxDistance: 50,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0.3,
          reverbTime: 1.5
        };
      default: // medium
        return {
          rolloffFactor: 1,
          refDistance: 2,
          maxDistance: 25,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0.4,
          reverbTime: 0.8
        };
    }
  }, [options.roomSize]);

  // Generate simple reverb impulse response
  const generateReverbImpulse = useCallback((ctx: AudioContext, duration: number, decay: number): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const envelope = Math.exp(-i / (sampleRate * decay));
        channelData[i] = (Math.random() * 2 - 1) * envelope;
      }
    }
    
    return impulse;
  }, []);

  // Initialize audio context and listener
  const initialize = useCallback(async () => {
    if (!options.enabled || !state.isSupported) return;

    try {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      const ctx = audioContextRef.current;
      
      // Set up listener (user's position)
      listenerRef.current = ctx.listener;
      
      if (listenerRef.current.positionX) {
        // New API
        const pos = options.listenerPosition || { x: 0, y: 0, z: 0 };
        listenerRef.current.positionX.value = pos.x;
        listenerRef.current.positionY.value = pos.y;
        listenerRef.current.positionZ.value = pos.z;
        listenerRef.current.forwardX.value = 0;
        listenerRef.current.forwardY.value = 0;
        listenerRef.current.forwardZ.value = -1;
        listenerRef.current.upX.value = 0;
        listenerRef.current.upY.value = 1;
        listenerRef.current.upZ.value = 0;
      } else {
        // Legacy API
        const pos = options.listenerPosition || { x: 0, y: 0, z: 0 };
        listenerRef.current.setPosition(pos.x, pos.y, pos.z);
        listenerRef.current.setOrientation(0, 0, -1, 0, 1, 0);
      }

      // Create reverb
      const roomSettings = getRoomSettings();
      convolverRef.current = ctx.createConvolver();
      convolverRef.current.buffer = generateReverbImpulse(ctx, roomSettings.reverbTime, 2);

      setState(prev => ({ ...prev, isActive: true }));
    } catch (error) {
      console.error('[SpatialAudio] Failed to initialize:', error);
    }
  }, [options.enabled, options.listenerPosition, state.isSupported, getRoomSettings, generateReverbImpulse]);

  // Add participant audio with spatial positioning
  const addParticipant = useCallback((
    participantId: string,
    stream: MediaStream,
    position: { x: number; y: number; z: number }
  ): MediaStream | null => {
    if (!audioContextRef.current || !options.enabled) {
      return stream;
    }

    try {
      const ctx = audioContextRef.current;
      const roomSettings = getRoomSettings();

      // Create source from participant's stream
      const source = ctx.createMediaStreamSource(stream);
      sourceNodesRef.current.set(participantId, source);

      // Create panner for 3D positioning
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF'; // Head-related transfer function for realistic 3D
      panner.distanceModel = 'inverse';
      panner.refDistance = roomSettings.refDistance;
      panner.maxDistance = roomSettings.maxDistance;
      panner.rolloffFactor = roomSettings.rolloffFactor;
      panner.coneInnerAngle = roomSettings.coneInnerAngle;
      panner.coneOuterAngle = roomSettings.coneOuterAngle;
      panner.coneOuterGain = roomSettings.coneOuterGain;

      // Set position
      if (panner.positionX) {
        panner.positionX.value = position.x * 5; // Scale for room size
        panner.positionY.value = position.y * 2;
        panner.positionZ.value = position.z * 3;
      } else {
        panner.setPosition(position.x * 5, position.y * 2, position.z * 3);
      }

      pannerNodesRef.current.set(participantId, panner);

      // Create gain for individual volume control
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      gainNodesRef.current.set(participantId, gain);

      // Connect: source -> panner -> gain -> destination
      source.connect(panner);
      panner.connect(gain);
      
      // Create output stream
      const destination = ctx.createMediaStreamDestination();
      gain.connect(destination);

      // Optionally add reverb (wet/dry mix)
      if (convolverRef.current) {
        const reverbGain = ctx.createGain();
        reverbGain.gain.value = 0.2; // 20% reverb
        gain.connect(reverbGain);
        reverbGain.connect(convolverRef.current);
        convolverRef.current.connect(destination);
      }

      outputStreamRef.current.set(participantId, destination.stream);
      
      setState(prev => ({ ...prev, participantCount: pannerNodesRef.current.size }));

      return destination.stream;
    } catch (error) {
      console.error('[SpatialAudio] Failed to add participant:', error);
      return stream;
    }
  }, [options.enabled, getRoomSettings]);

  // Update participant position
  const updatePosition = useCallback((participantId: string, position: { x: number; y: number; z: number }) => {
    const panner = pannerNodesRef.current.get(participantId);
    if (!panner) return;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(position.x * 5, audioContextRef.current?.currentTime || 0);
      panner.positionY.setValueAtTime(position.y * 2, audioContextRef.current?.currentTime || 0);
      panner.positionZ.setValueAtTime(position.z * 3, audioContextRef.current?.currentTime || 0);
    } else {
      panner.setPosition(position.x * 5, position.y * 2, position.z * 3);
    }
  }, []);

  // Calculate position from video grid layout
  const calculateGridPosition = useCallback((
    index: number,
    totalParticipants: number,
    columns: number
  ): { x: number; y: number; z: number } => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const rows = Math.ceil(totalParticipants / columns);

    // Normalize to -1 to 1 range
    const x = columns > 1 ? (col / (columns - 1)) * 2 - 1 : 0;
    const y = rows > 1 ? 1 - (row / (rows - 1)) * 2 : 0;
    const z = 0; // All participants at same depth

    return { x, y, z };
  }, []);

  // Update all participant positions based on grid layout
  const updateGridLayout = useCallback((
    participants: string[],
    columns: number = 3
  ) => {
    participants.forEach((participantId, index) => {
      const position = calculateGridPosition(index, participants.length, columns);
      updatePosition(participantId, position);
    });
  }, [calculateGridPosition, updatePosition]);

  // Set individual participant volume
  const setParticipantVolume = useCallback((participantId: string, volume: number) => {
    const gain = gainNodesRef.current.get(participantId);
    if (gain && audioContextRef.current) {
      gain.gain.setValueAtTime(
        Math.max(0, Math.min(2, volume)),
        audioContextRef.current.currentTime
      );
    }
  }, []);

  // Remove participant
  const removeParticipant = useCallback((participantId: string) => {
    const source = sourceNodesRef.current.get(participantId);
    const panner = pannerNodesRef.current.get(participantId);
    const gain = gainNodesRef.current.get(participantId);

    source?.disconnect();
    panner?.disconnect();
    gain?.disconnect();

    sourceNodesRef.current.delete(participantId);
    pannerNodesRef.current.delete(participantId);
    gainNodesRef.current.delete(participantId);
    outputStreamRef.current.delete(participantId);

    setState(prev => ({ ...prev, participantCount: pannerNodesRef.current.size }));
  }, []);

  // Cleanup all
  const cleanup = useCallback(() => {
    pannerNodesRef.current.forEach((_, id) => removeParticipant(id));
    convolverRef.current?.disconnect();
    
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    setState(prev => ({ ...prev, isActive: false, participantCount: 0 }));
  }, [removeParticipant]);

  // Initialize on mount if enabled
  useEffect(() => {
    if (options.enabled) {
      initialize();
    }
    return () => {
      cleanup();
    };
  }, [options.enabled, initialize, cleanup]);

  return {
    initialize,
    addParticipant,
    removeParticipant,
    updatePosition,
    updateGridLayout,
    setParticipantVolume,
    cleanup,
    isActive: state.isActive,
    participantCount: state.participantCount,
    isSupported: state.isSupported
  };
}
