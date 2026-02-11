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
    // Phase 6: New Voice Client Tools
    schedule_meeting: async ({ title, attendees, duration = 30 }: { title: string; attendees?: string[]; duration?: number }) => {
      navigate('/calendar/new', { 
        state: { 
          prefill: { title, attendees, duration } 
        } 
      });
      return `Opening scheduler for: ${title} (${duration} minutes)`;
    },
    update_application_status: async ({ applicationId, newStatus }: { applicationId: string; newStatus: string }) => {
      try {
        const { error } = await supabase
          .from('applications')
          .update({ status: newStatus })
          .eq('id', applicationId);
        if (error) throw error;
        toast.success('Application Updated', { description: `Status changed to ${newStatus}` });
        return `Updated application to ${newStatus}`;
      } catch (e) {
        toast.error('Update Failed', { description: 'Could not update application status' });
        return `Failed to update application`;
      }
    },
    complete_task: async ({ taskId }: { taskId: string }) => {
      try {
        const { error } = await supabase
          .from('unified_tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', taskId);
        if (error) throw error;
        toast.success('Task Completed');
        return `Task marked as complete`;
      } catch (e) {
        return `Failed to complete task`;
      }
    },
    get_pipeline_summary: async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return 'Please log in to see your pipeline';
        
        const { data: applications } = await supabase
          .from('applications')
          .select('status')
          .eq('user_id', user.user.id);
        
        if (!applications?.length) return 'You have no active applications';
        
        const statusCounts = applications.reduce((acc: Record<string, number>, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {});
        
        const summary = Object.entries(statusCounts)
          .map(([status, count]) => `${count} ${status}`)
          .join(', ');
        
        return `You have ${applications.length} applications: ${summary}`;
      } catch (e) {
        return 'Unable to fetch pipeline data';
      }
    },
    capture_note: async ({ content, context }: { content: string; context?: string }) => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return 'Please log in to save notes';
        
        const { error } = await supabase
          .from('ai_memory')
          .insert({
            user_id: user.user.id,
            content,
            memory_type: 'voice_note',
            context: { source: 'voice', context, capturedAt: new Date().toISOString() },
          });
        
        if (error) throw error;
        toast.success('Note Captured');
        return `Note saved: ${content.substring(0, 50)}...`;
      } catch (e) {
        return 'Failed to save note';
      }
    },
    get_upcoming_interviews: async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return 'Please log in';
        
        // Use applications table for interview stage info
        const { data: interviews } = await supabase
          .from('applications')
          .select('id, status')
          .eq('user_id', user.user.id)
          .eq('status', 'interview')
          .limit(5);
        
        if (!interviews?.length) return 'No upcoming interviews in your pipeline';
        
        return `You have ${interviews.length} applications in interview stage`;
      } catch (e) {
        return 'Unable to fetch interview data';
      }
    },
    quick_follow_up: async ({ candidateName, message }: { candidateName: string; message?: string }) => {
      navigate('/communications', { 
        state: { 
          compose: true, 
          recipient: candidateName,
          prefillMessage: message || `Hi, just following up on our conversation...`
        } 
      });
      return `Opening follow-up composer for ${candidateName}`;
    },
    set_reminder: async ({ text, minutes = 30 }: { text: string; minutes?: number }) => {
      const reminderTime = new Date(Date.now() + minutes * 60 * 1000);
      toast.info('Reminder Set', { 
        description: `"${text}" in ${minutes} minutes`,
        duration: 5000,
      });
      // Store reminder in memory for persistent reminders
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from('ai_memory').insert({
          user_id: user.user.id,
          content: text,
          memory_type: 'reminder',
          context: { reminderTime: reminderTime.toISOString() },
          expires_at: reminderTime.toISOString(),
        });
      }
      return `Reminder set for ${minutes} minutes from now: ${text}`;
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
    onError: (err: unknown) => {
      console.error('ClubAI error:', err);
      setError(typeof err === 'string' ? err : err instanceof Error ? err.message : 'An error occurred');
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
