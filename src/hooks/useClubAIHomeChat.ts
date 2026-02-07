import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseClubAIHomeChatReturn {
  messages: Message[];
  isLoading: boolean;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  sendMessage: (input: string) => Promise<void>;
  quickActions: string[];
  clearMessages: () => void;
}

const CANDIDATE_QUICK_ACTIONS = [
  "What should I do today?",
  "Prepare me for my next interview",
  "Find matching jobs",
  "How is my profile?",
];

const PARTNER_QUICK_ACTIONS = [
  "Pipeline summary",
  "Who needs attention?",
  "Interview schedule today",
  "Candidate recommendations",
];

const ADMIN_QUICK_ACTIONS = [
  "Platform health check",
  "Revenue this month",
  "Active searches overview",
  "At-risk relationships",
];

export function useClubAIHomeChat(): UseClubAIHomeChatReturn {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const quickActions = (() => {
    switch (currentRole) {
      case 'admin':
      case 'strategist':
        return ADMIN_QUICK_ACTIONS;
      case 'partner':
        return PARTNER_QUICK_ACTIONS;
      default:
        return CANDIDATE_QUICK_ACTIONS;
    }
  })();

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isLoading || !user) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setIsExpanded(true);

    // Abort any previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
            userId: user.id,
          }),
          signal: abortRef.current.signal,
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.');
          throw new Error('Rate limited');
        }
        if (resp.status === 402) {
          toast.error('AI credits exhausted. Please add funds.');
          throw new Error('Credits exhausted');
        }
        throw new Error(`Request failed: ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final buffer flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '' || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Club AI chat error:', err);
      if (!assistantContent) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'I encountered an issue. Please try again.' },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, user]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    isExpanded,
    setIsExpanded,
    sendMessage,
    quickActions,
    clearMessages,
  };
}
