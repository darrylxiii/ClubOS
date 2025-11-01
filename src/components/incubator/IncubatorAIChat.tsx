import { memo, useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface IncubatorAIChatProps {
  context: any;
  onInteraction: (interaction: any) => void;
}

export const IncubatorAIChat = memo(({ context, onInteraction }: IncubatorAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `I'm your AI strategy advisor for this assessment. I know your scenario and can help with:

• **Unit economics** - Calculate payback, margins, CAC
• **Market sizing** - Estimate TAM/SAM/SOM for your industry
• **GTM strategy** - Channel recommendations for your constraints
• **Budget planning** - How to allocate your $${(context.scenario?.budget / 1000).toFixed(0)}k
• **Risk mitigation** - Identify and test key assumptions
• **Section drafting** - Help write specific plan sections

What would you like to work on?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setIsLoading(true);

    // Create placeholder for assistant response
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/incubator-ai-chat`;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(m => ({
            role: m.role,
            content: m.content,
          })),
          scenario: context.scenario,
          frameAnswers: context.frameAnswers,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit reached. Please wait a moment.');
          setMessages(prev => prev.filter(m => m.id !== assistantId));
          return;
        }
        if (response.status === 402) {
          toast.error('AI credits depleted. Please add funds.');
          setMessages(prev => prev.filter(m => m.id !== assistantId));
          return;
        }
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';

      if (!reader) throw new Error('No response body');

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
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              fullContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }

      // Log the interaction
      onInteraction({
        message: messageText,
        tool: 'chat',
        response: fullContent,
        tokens: fullContent.length,
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get AI response');
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <Card className={`max-w-[80%] p-3 ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : ''
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </Card>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <Card className="p-3">
                <p className="text-sm text-muted-foreground">Analyzing your question...</p>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask for help with calculations, strategy, or specific sections..."
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
});

IncubatorAIChat.displayName = 'IncubatorAIChat';
