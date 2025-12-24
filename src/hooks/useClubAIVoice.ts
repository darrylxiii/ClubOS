import { useCallback, useState, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TranscriptMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface UseClubAIVoiceReturn {
  status: 'idle' | 'connecting' | 'connected' | 'error';
  isSpeaking: boolean;
  isListening: boolean;
  transcript: TranscriptMessage[];
  inputVolume: number;
  outputVolume: number;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  error: string | null;
}

export const useClubAIVoice = (): UseClubAIVoiceReturn => {
  const navigate = useNavigate();
  const location = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Client tools that ClubAI can trigger
  const clientTools = {
    navigate_to: ({ path }: { path: string }) => {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      navigate(normalizedPath);
      return `Navigating to ${normalizedPath}`;
    },
    create_task: ({ title, priority = 'medium' }: { title: string; priority?: string }) => {
      // Navigate to tasks page with the task data
      navigate('/tasks', { state: { newTask: { title, priority } } });
      return `Creating task: ${title}`;
    },
    search_platform: ({ query }: { query: string }) => {
      // Trigger command palette with search
      const event = new CustomEvent('open-command-palette', { detail: { query } });
      window.dispatchEvent(event);
      return `Searching for: ${query}`;
    },
    show_notification: ({ title, message, type = 'info' }: { title: string; message: string; type?: string }) => {
      if (type === 'error') {
        toast.error(title, { description: message });
      } else if (type === 'success') {
        toast.success(title, { description: message });
      } else {
        toast.info(title, { description: message });
      }
      return `Notification shown: ${title}`;
    },
    open_command_palette: () => {
      const event = new CustomEvent('open-command-palette');
      window.dispatchEvent(event);
      return 'Command palette opened';
    },
  };

  const conversation = useConversation({
    clientTools,
    onConnect: () => {
      console.log('ClubAI connected');
      setConnectionStatus('connected');
      setError(null);
    },
    onDisconnect: () => {
      console.log('ClubAI disconnected');
      setConnectionStatus('idle');
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
    },
    onMessage: (message: any) => {
      console.log('ClubAI message:', message);
      
      if (message?.type === 'user_transcript') {
        const userText = message?.user_transcription_event?.user_transcript;
        if (userText) {
          setTranscript(prev => [...prev, {
            role: 'user',
            text: userText,
            timestamp: new Date(),
          }]);
        }
      }
      
      if (message?.type === 'agent_response') {
        const agentText = message?.agent_response_event?.agent_response;
        if (agentText) {
          setTranscript(prev => [...prev, {
            role: 'assistant',
            text: agentText,
            timestamp: new Date(),
          }]);
        }
      }
    },
    onError: (err: any) => {
      console.error('ClubAI error:', err);
      setError(typeof err === 'string' ? err : err?.message || 'An error occurred');
      setConnectionStatus('error');
    },
  });

  // Update volume levels periodically when connected
  useEffect(() => {
    if (conversation.status === 'connected') {
      volumeIntervalRef.current = setInterval(() => {
        try {
          setInputVolume(conversation.getInputVolume?.() || 0);
          setOutputVolume(conversation.getOutputVolume?.() || 0);
        } catch (e) {
          // Ignore volume errors
        }
      }, 100);
    }

    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
    };
  }, [conversation.status, conversation]);

  const startSession = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);
      setTranscript([]);

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our edge function
      const { data, error: fnError } = await supabase.functions.invoke('elevenlabs-clubai-token', {
        body: { 
          context: { 
            page: location.pathname,
          } 
        },
      });

      if (fnError || !data?.signedUrl) {
        throw new Error(fnError?.message || 'Failed to get voice session token');
      }

      console.log('Starting ClubAI session with signed URL');
      
      // Start the conversation with the signed URL
      const sessionId = await conversation.startSession({
        signedUrl: data.signedUrl,
      });
      
      sessionIdRef.current = sessionId;

    } catch (err) {
      console.error('Failed to start ClubAI session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start voice session');
      setConnectionStatus('error');
    }
  }, [conversation, location.pathname]);

  const endSession = useCallback(async () => {
    try {
      await conversation.endSession();
      sessionIdRef.current = null;
      setConnectionStatus('idle');
    } catch (err) {
      console.error('Error ending session:', err);
    }
  }, [conversation]);

  return {
    status: connectionStatus,
    isSpeaking: conversation.isSpeaking,
    isListening: conversation.status === 'connected' && !conversation.isSpeaking,
    transcript,
    inputVolume,
    outputVolume,
    startSession,
    endSession,
    error,
  };
};
