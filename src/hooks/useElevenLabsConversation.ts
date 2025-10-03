import { useRef, useState, useCallback } from 'react';

interface ConversationConfig {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: Error) => void;
}

export const useElevenLabsConversation = (config: ConversationConfig) => {
  const [status, setStatus] = useState<'disconnected' | 'connected'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>();
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const startSession = useCallback(async ({ url }: { url: string }) => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create audio element for playback
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.autoplay = true;
      }

      // Connect to ElevenLabs WebSocket
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to ElevenLabs');
        setStatus('connected');
        config.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);
          
          config.onMessage?.(message);

          // Handle audio playback
          if (message.type === 'audio' && message.audio) {
            setIsSpeaking(true);
            playAudio(message.audio);
          }
          
          // Handle when agent finishes speaking
          if (message.type === 'agent_response_end') {
            setIsSpeaking(false);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        config.onError?.(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        console.log('Disconnected from ElevenLabs');
        setStatus('disconnected');
        cleanup();
        config.onDisconnect?.();
      };

      // Set up audio streaming from microphone
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = convertFloat32ToPCM16(inputData);
          const base64Audio = arrayBufferToBase64(pcm16);
          
          ws.send(JSON.stringify({
            type: 'audio',
            audio: base64Audio
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      return 'session-' + Date.now();
    } catch (error) {
      console.error('Error starting session:', error);
      config.onError?.(error as Error);
      throw error;
    }
  }, [config]);

  const endSession = useCallback(async () => {
    cleanup();
  }, []);

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setStatus('disconnected');
    setIsSpeaking(false);
  };

  const playAudio = (base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
        };
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  return {
    startSession,
    endSession,
    status,
    isSpeaking
  };
};

// Helper functions
function convertFloat32ToPCM16(float32Array: Float32Array): ArrayBuffer {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
