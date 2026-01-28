import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Lightbulb, 
  MessageSquare,
  Copy,
  Check,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import type { CandidateOffer } from '@/hooks/useCandidateOffers';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface OfferNegotiationChatProps {
  offer: CandidateOffer;
  onClose?: () => void;
}

const SUGGESTED_PROMPTS = [
  "What's a reasonable counter-offer for this salary?",
  "How do I negotiate for more equity?",
  "Draft an email to ask for a higher bonus",
  "What's my leverage in this negotiation?",
  "Is this offer competitive for my experience level?",
];

export function OfferNegotiationChat({ offer, onClose }: OfferNegotiationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial context message
  useEffect(() => {
    const company = offer.job?.companies?.name || 'the company';
    const role = offer.job?.title || 'the position';
    const salary = offer.base_salary 
      ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(offer.base_salary)
      : 'not specified';

    setMessages([{
      id: 'initial',
      role: 'assistant',
      content: `I'm QUIN, your AI negotiation advisor. I see you have an offer from **${company}** for the **${role}** position with a base salary of **${salary}**.

I can help you:
• Evaluate if this offer is competitive
• Suggest counter-offer strategies
• Draft professional negotiation emails
• Identify your leverage points

What would you like to discuss?`,
      timestamp: new Date(),
    }]);
  }, [offer]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context for AI
      const context = {
        offer: {
          company: offer.job?.companies?.name,
          role: offer.job?.title,
          location: offer.job?.location,
          baseSalary: offer.base_salary,
          bonus: offer.bonus_percentage,
          equity: offer.equity_percentage,
          totalComp: offer.total_compensation,
          percentile: offer.salary_percentile,
          marketScore: offer.market_competitiveness_score,
          benchmark: offer.benchmark_comparison,
        },
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      };

      const response = await supabase.functions.invoke('quin-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `You are QUIN, The Quantum Club's AI career advisor specializing in salary negotiation. 
              
You're helping a candidate evaluate and negotiate a job offer. Here's the offer context:
- Company: ${context.offer.company || 'Unknown'}
- Role: ${context.offer.role || 'Unknown'}
- Base Salary: €${context.offer.baseSalary?.toLocaleString() || 'Not specified'}
- Bonus: ${context.offer.bonus || 0}%
- Equity: ${context.offer.equity || 0}%
- Total Comp: €${context.offer.totalComp?.toLocaleString() || 'Not specified'}
- Market Percentile: ${context.offer.percentile || 'Unknown'}th
- Competitiveness Score: ${context.offer.marketScore || 'Unknown'}%

Guidelines:
1. Be supportive but realistic
2. Provide specific, actionable advice
3. When drafting emails, make them professional but confident
4. Reference market data when available
5. Consider the Dutch job market context
6. Keep responses concise but helpful
7. Use markdown formatting for clarity`
            },
            ...context.conversationHistory,
            { role: 'user', content: content }
          ],
        },
      });

      if (response.error) throw response.error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data?.message || response.data?.content || 'I apologize, I encountered an issue. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      notify.error('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      notify.success('Copied to clipboard');
    } catch {
      notify.error('Failed to copy');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh]">
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">QUIN Negotiation Advisor</CardTitle>
              <p className="text-xs text-muted-foreground">
                AI-powered offer negotiation support
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            {messages.length} messages
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-1 last:mb-0">{line}</p>
                    ))}
                  </div>
                  {message.role === 'assistant' && (
                    <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => copyToClipboard(message.content, message.id)}
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.slice(0, 3).map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about negotiation strategies..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
