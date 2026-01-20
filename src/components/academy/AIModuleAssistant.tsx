import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles, Lock } from "lucide-react";
import { notify } from "@/lib/notify";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIModuleAssistantProps {
  moduleContext?: {
    title: string;
    description?: string;
    content?: string;
    courseTitle?: string;
    learningPathTitle?: string;
  };
}

export function AIModuleAssistant({ moduleContext }: AIModuleAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Get auth token for authenticated users
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/module-ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            moduleContext,
          }),
        }
      );

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let line of lines) {
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || !line.trim()) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages([
                ...newMessages,
                { role: 'assistant', content: assistantContent }
              ]);
            }
          } catch (e) {
            // Incomplete JSON, continue
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let line of buffer.split('\n')) {
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || !line.trim()) continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages([
                ...newMessages,
                { role: 'assistant', content: assistantContent }
              ]);
            }
          } catch (e) {
            // Ignore
          }
        }
      }

      setIsLoading(false);
      
      // Show auth prompt after guest's first AI response
      if (!user && guestMessageCount === 1) {
        setTimeout(() => setShowAuthPrompt(true), 2000);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      notify.error(error instanceof Error ? error.message : "Failed to get AI response");
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Guest users: allow 1 demo message only
    if (!user) {
      if (guestMessageCount >= 1) {
        setShowAuthPrompt(true);
        return;
      }
      setGuestMessageCount(prev => prev + 1);
    }

    const userMessage = input.trim();
    setInput('');
    await streamChat(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="squircle p-6 h-[600px] flex flex-col relative">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">AI Learning Assistant</h3>
          <p className="text-xs text-muted-foreground">
            {!user ? 'Try 1 free demo question' : 'Ask anything about this module'}
          </p>
        </div>
        {!user && (
          <div className="text-xs text-muted-foreground">
            Demo: {guestMessageCount}/1
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              I'm here to help you understand this module better!
            </p>
            <p className="text-xs text-muted-foreground">
              Ask me questions, request examples, or get deeper explanations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="p-2 rounded-lg bg-primary/10 h-fit">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="p-2 rounded-lg bg-primary/10 h-fit">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={!user && guestMessageCount >= 1 ? "Sign in to continue..." : "Ask a question about this module..."}
          className="resize-none"
          rows={2}
          disabled={isLoading || (!user && guestMessageCount >= 1)}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || (!user && guestMessageCount >= 1)}
          size="icon"
          className="h-auto"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (!user && guestMessageCount >= 1) ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Auth Prompt Overlay - Option C */}
      {showAuthPrompt && !user && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 rounded-lg z-10">
          <Card className="p-6 text-center max-w-sm">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Continue with AI Assistant</h3>
            <p className="text-muted-foreground mb-4">
              Sign in to unlock unlimited AI conversations and full learning capabilities
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/auth')} size="lg" className="w-full">
                Sign In to Continue
              </Button>
              <Button 
                onClick={() => setShowAuthPrompt(false)} 
                variant="ghost" 
                size="sm"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
