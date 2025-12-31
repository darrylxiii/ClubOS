/**
 * Recording Compositor Hook
 * Canvas-based multi-stream recording composition
 * Creates professional-quality meeting recordings with all participants
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface CompositorParticipant {
  id: string;
  name: string;
  stream: MediaStream | null;
  videoElement?: HTMLVideoElement;
  isSpeaking?: boolean;
  isScreenShare?: boolean;
}

export interface CompositorConfig {
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;  // bps
  audioBitrate: number;  // bps
  layout: 'grid' | 'spotlight' | 'sidebar';
  backgroundColor: string;
  showNames: boolean;
  showSpeakingIndicator: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  size: number;
  error: string | null;
}

const DEFAULT_CONFIG: CompositorConfig = {
  width: 1920,
  height: 1080,
  frameRate: 30,
  videoBitrate: 5000000,  // 5 Mbps
  audioBitrate: 128000,   // 128 kbps
  layout: 'grid',
  backgroundColor: '#0f0f0f',
  showNames: true,
  showSpeakingIndicator: true
};

export function useRecordingCompositor(initialConfig: Partial<CompositorConfig> = {}) {
  const [config, setConfig] = useState<CompositorConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const effectiveConfig = config;
  
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    size: 0,
    error: null
  });
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const participantsRef = useRef<Map<string, CompositorParticipant>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize the canvas compositor
   */
  const initialize = useCallback((): HTMLCanvasElement => {
    // Create hidden canvas for composition
    const canvas = document.createElement('canvas');
    canvas.width = effectiveConfig.width;
    canvas.height = effectiveConfig.height;
    
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true // Better performance
    });
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    canvasRef.current = canvas;
    ctxRef.current = ctx;
    
    // Initialize audio mixer
    audioContextRef.current = new AudioContext();
    audioDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
    
    logger.debug('Compositor initialized', { componentName: 'Compositor', config: effectiveConfig });
    
    return canvas;
  }, [effectiveConfig]);

  /**
   * Add a participant to the compositor
   */
  const addParticipant = useCallback((participant: CompositorParticipant): void => {
    participantsRef.current.set(participant.id, participant);
    
    // Create video element for this participant
    if (participant.stream) {
      const videoElement = document.createElement('video');
      videoElement.srcObject = participant.stream;
      videoElement.muted = true; // We mix audio separately
      videoElement.playsInline = true;
      videoElement.play().catch(err => logger.warn('Video play failed', { componentName: 'Compositor', error: err }));
      
      participant.videoElement = videoElement;
      
      // Mix audio into composition
      if (audioContextRef.current && audioDestinationRef.current) {
        try {
          const source = audioContextRef.current.createMediaStreamSource(participant.stream);
          source.connect(audioDestinationRef.current);
        } catch (error) {
          logger.warn('Failed to add audio source', { componentName: 'Compositor', error });
        }
      }
    }
    
    logger.debug('Added participant', { componentName: 'Compositor', participantId: participant.id });
  }, []);

  /**
   * Remove a participant from the compositor
   */
  const removeParticipant = useCallback((participantId: string): void => {
    const participant = participantsRef.current.get(participantId);
    if (participant?.videoElement) {
      participant.videoElement.pause();
      participant.videoElement.srcObject = null;
    }
    participantsRef.current.delete(participantId);
    console.log('[Compositor] Removed participant:', participantId);
  }, []);

  /**
   * Update participant speaking state
   */
  const updateSpeakingState = useCallback((participantId: string, isSpeaking: boolean): void => {
    const participant = participantsRef.current.get(participantId);
    if (participant) {
      participant.isSpeaking = isSpeaking;
    }
  }, []);

  /**
   * Calculate grid positions for participants
   */
  const calculateGridLayout = useCallback((participantCount: number, canvasWidth: number, canvasHeight: number) => {
    const positions: { x: number; y: number; width: number; height: number }[] = [];
    
    if (participantCount === 0) return positions;
    
    // Calculate optimal grid dimensions
    let cols = Math.ceil(Math.sqrt(participantCount));
    let rows = Math.ceil(participantCount / cols);
    
    // Special cases for better layouts
    if (participantCount === 2) {
      cols = 2;
      rows = 1;
    } else if (participantCount === 4) {
      cols = 2;
      rows = 2;
    }
    
    const cellWidth = canvasWidth / cols;
    const cellHeight = canvasHeight / rows;
    const padding = 8;
    
    for (let i = 0; i < participantCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      positions.push({
        x: col * cellWidth + padding,
        y: row * cellHeight + padding,
        width: cellWidth - padding * 2,
        height: cellHeight - padding * 2
      });
    }
    
    return positions;
  }, []);

  /**
   * Calculate spotlight layout (active speaker large, others small)
   */
  const calculateSpotlightLayout = useCallback((
    participantCount: number,
    activeSpeakerId: string | null,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
    const participants = Array.from(participantsRef.current.values());
    
    if (participantCount === 0) return positions;
    
    const padding = 8;
    const sidebarWidth = 200;
    const sidebarItemHeight = 150;
    
    // Find active speaker or use first participant
    const speakerId = activeSpeakerId || participants[0]?.id;
    
    participants.forEach((p, index) => {
      if (p.id === speakerId) {
        // Main spotlight area
        positions.set(p.id, {
          x: padding,
          y: padding,
          width: canvasWidth - sidebarWidth - padding * 3,
          height: canvasHeight - padding * 2
        });
      } else {
        // Sidebar position
        const sidebarIndex = index > participants.findIndex(pp => pp.id === speakerId) ? index - 1 : index;
        positions.set(p.id, {
          x: canvasWidth - sidebarWidth - padding,
          y: padding + sidebarIndex * (sidebarItemHeight + padding),
          width: sidebarWidth,
          height: sidebarItemHeight
        });
      }
    });
    
    return positions;
  }, []);

  /**
   * Render a single frame to the canvas
   */
  const renderFrame = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    
    const participants = Array.from(participantsRef.current.values());
    const { width, height, backgroundColor, showNames, showSpeakingIndicator, layout } = effectiveConfig;
    
    // Clear canvas with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    if (participants.length === 0) {
      // Show "waiting" message
      ctx.fillStyle = '#666';
      ctx.font = '24px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for participants...', width / 2, height / 2);
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }
    
    // Calculate positions based on layout
    let positions: { x: number; y: number; width: number; height: number }[];
    
    if (layout === 'spotlight') {
      const speakerId = participants.find(p => p.isSpeaking)?.id || participants[0]?.id;
      const spotlightPositions = calculateSpotlightLayout(participants.length, speakerId, width, height);
      positions = participants.map(p => spotlightPositions.get(p.id) || { x: 0, y: 0, width: 0, height: 0 });
    } else {
      positions = calculateGridLayout(participants.length, width, height);
    }
    
    // Render each participant
    participants.forEach((participant, index) => {
      const pos = positions[index];
      if (!pos) return;
      
      // Draw rounded rectangle background
      ctx.fillStyle = '#1a1a1a';
      roundRect(ctx, pos.x, pos.y, pos.width, pos.height, 12);
      ctx.fill();
      
      // Draw video frame
      if (participant.videoElement && participant.videoElement.readyState >= 2) {
        ctx.save();
        
        // Clip to rounded rectangle
        ctx.beginPath();
        roundRect(ctx, pos.x, pos.y, pos.width, pos.height, 12);
        ctx.clip();
        
        // Calculate aspect-ratio-preserving dimensions
        const videoWidth = participant.videoElement.videoWidth;
        const videoHeight = participant.videoElement.videoHeight;
        const scale = Math.max(pos.width / videoWidth, pos.height / videoHeight);
        const scaledWidth = videoWidth * scale;
        const scaledHeight = videoHeight * scale;
        const offsetX = pos.x + (pos.width - scaledWidth) / 2;
        const offsetY = pos.y + (pos.height - scaledHeight) / 2;
        
        ctx.drawImage(participant.videoElement, offsetX, offsetY, scaledWidth, scaledHeight);
        ctx.restore();
      } else {
        // Show placeholder with initial
        ctx.fillStyle = '#333';
        ctx.beginPath();
        roundRect(ctx, pos.x, pos.y, pos.width, pos.height, 12);
        ctx.fill();
        
        const initial = participant.name.charAt(0).toUpperCase();
        ctx.fillStyle = '#666';
        ctx.font = `bold ${Math.min(pos.width, pos.height) / 3}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial, pos.x + pos.width / 2, pos.y + pos.height / 2);
      }
      
      // Draw speaking indicator
      if (showSpeakingIndicator && participant.isSpeaking) {
        ctx.strokeStyle = '#22c55e'; // Green border
        ctx.lineWidth = 4;
        ctx.beginPath();
        roundRect(ctx, pos.x, pos.y, pos.width, pos.height, 12);
        ctx.stroke();
      }
      
      // Draw name label
      if (showNames) {
        const labelHeight = 32;
        const labelY = pos.y + pos.height - labelHeight;
        
        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(pos.x, labelY);
        ctx.lineTo(pos.x + pos.width, labelY);
        ctx.lineTo(pos.x + pos.width, pos.y + pos.height - 12);
        ctx.quadraticCurveTo(pos.x + pos.width, pos.y + pos.height, pos.x + pos.width - 12, pos.y + pos.height);
        ctx.lineTo(pos.x + 12, pos.y + pos.height);
        ctx.quadraticCurveTo(pos.x, pos.y + pos.height, pos.x, pos.y + pos.height - 12);
        ctx.closePath();
        ctx.fill();
        
        // Name text
        ctx.fillStyle = '#fff';
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        const maxNameWidth = pos.width - 24;
        let displayName = participant.name;
        if (ctx.measureText(displayName).width > maxNameWidth) {
          while (ctx.measureText(displayName + '...').width > maxNameWidth && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '...';
        }
        
        ctx.fillText(displayName, pos.x + 12, labelY + labelHeight / 2);
      }
    });
    
    // Continue rendering loop
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [effectiveConfig, calculateGridLayout, calculateSpotlightLayout]);

  /**
   * Helper function to draw rounded rectangles
   */
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  /**
   * Start recording
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      if (!canvasRef.current) {
        initialize();
      }
      
      if (!canvasRef.current || !audioDestinationRef.current) {
        throw new Error('Compositor not initialized');
      }
      
      // Get canvas stream
      const canvasStream = canvasRef.current.captureStream(effectiveConfig.frameRate);
      
      // Combine video and audio
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDestinationRef.current.stream.getAudioTracks()
      ]);
      
      // Create MediaRecorder with optimal settings
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
      
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: effectiveConfig.videoBitrate,
        audioBitsPerSecond: effectiveConfig.audioBitrate
      });
      
      recordedChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          setState(prev => ({
            ...prev,
            size: recordedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0)
          }));
        }
      };
      
      recorder.onerror = (event: any) => {
        console.error('[Compositor] Recording error:', event);
        setState(prev => ({ ...prev, error: 'Recording error occurred' }));
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect data every second
      
      // Start rendering loop
      renderFrame();
      
      // Start duration counter
      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000)
        }));
      }, 1000);
      
      setState({
        isRecording: true,
        duration: 0,
        size: 0,
        error: null
      });
      
      console.log('[Compositor] Recording started with', mimeType);
    } catch (error: any) {
      console.error('[Compositor] Failed to start recording:', error);
      setState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  }, [effectiveConfig, initialize, renderFrame]);

  /**
   * Stop recording and return the blob
   */
  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No active recording'));
        return;
      }
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        
        // Cleanup
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
        
        setState(prev => ({ ...prev, isRecording: false }));
        
        console.log('[Compositor] Recording stopped, size:', blob.size);
        resolve(blob);
      };
      
      mediaRecorderRef.current.stop();
    });
  }, []);

  /**
   * Cleanup resources
   */
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    participantsRef.current.forEach(p => {
      if (p.videoElement) {
        p.videoElement.pause();
        p.videoElement.srcObject = null;
      }
    });
    participantsRef.current.clear();
    
    canvasRef.current = null;
    ctxRef.current = null;
    
    console.log('[Compositor] Cleaned up');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Change the layout during recording
   */
  const setLayout = useCallback((layout: 'grid' | 'spotlight' | 'sidebar') => {
    setConfig(prev => ({ ...prev, layout }));
  }, []);

  return {
    state,
    initialize,
    addParticipant,
    removeParticipant,
    updateSpeakingState,
    startRecording,
    stopRecording,
    cleanup,
    setLayout,
    canvas: canvasRef.current
  };
}
