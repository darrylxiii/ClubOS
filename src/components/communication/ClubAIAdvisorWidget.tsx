import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, ChevronUp, ChevronDown, AlertTriangle, TrendingUp, Clock, Lightbulb, Sparkles, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCrossChannelPatterns } from '@/hooks/useCrossChannelPatterns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClubAIAdvisorWidgetProps {
  entityType?: string;
  entityId?: string;
  context?: 'profile' | 'inbox' | 'pipeline' | 'general';
  className?: string;
}

interface Advice {
  type: 'alert' | 'tip' | 'insight' | 'action';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel?: string;
  onAction?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function ClubAIAdvisorWidget({
  entityType,
  entityId,
  context = 'general',
  className
}: ClubAIAdvisorWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [question, setQuestion] = useState('');
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { activeAlerts, getHighPriorityAlerts } = useCrossChannelPatterns(entityType, entityId);

  // Generate contextual advices based on patterns and context
  useEffect(() => {
    const newAdvices: Advice[] = [];

    // Add pattern-based alerts
    const highPriority = getHighPriorityAlerts();
    highPriority.forEach(pattern => {
      if (pattern.pattern_type === 'going_cold') {
        newAdvices.push({
          type: 'alert',
          title: 'Going Cold Alert',
          message: `This ${pattern.entity_type} hasn't responded in a while. Consider reaching out via their preferred channel.`,
          priority: 'high',
          actionLabel: 'Send Message',
        });
      } else if (pattern.pattern_type === 'ready_to_convert') {
        newAdvices.push({
          type: 'insight',
          title: 'High Conversion Signal',
          message: 'Strong buying signals detected across channels. Now is a good time to move forward.',
          priority: 'high',
          actionLabel: 'View Details',
        });
      }
    });

    // Add context-specific tips
    if (context === 'inbox') {
      newAdvices.push({
        type: 'tip',
        title: 'Response Time Matters',
        message: 'Replying within 2 hours increases engagement by 40%.',
        priority: 'low',
      });
    }

    if (context === 'profile' && !entityId) {
      newAdvices.push({
        type: 'tip',
        title: 'Complete the Timeline',
        message: 'Add past interactions to build a complete picture of this relationship.',
        priority: 'medium',
      });
    }

    setAdvices(newAdvices);
  }, [activeAlerts, context, entityId, getHighPriorityAlerts]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const hasAlerts = advices.some(a => a.type === 'alert' && a.priority === 'high');

  const iconConfig = {
    alert: { icon: AlertTriangle, color: 'text-red-500' },
    tip: { icon: Lightbulb, color: 'text-yellow-500' },
    insight: { icon: TrendingUp, color: 'text-green-500' },
    action: { icon: Clock, color: 'text-blue-500' },
  };

  const handleAskClubAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage = question.trim();
    setQuestion('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build context-aware messages
      const contextInfo = context !== 'general' 
        ? `\n\nContext: User is viewing the ${context} section.${entityType ? ` Entity type: ${entityType}.` : ''}${entityId ? ` Entity ID: ${entityId}.` : ''}`
        : '';

      const messages = [
        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage + contextInfo }
      ];

      const { data, error } = await supabase.functions.invoke('club-ai-chat', {
        body: {
          messages,
          userId: user?.id,
          context: {
            widgetContext: context,
            entityType,
            entityId,
            isQuickAdvice: true
          }
        }
      });

      if (error) throw error;

      const assistantMessage = data?.response || data?.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Error asking Club AI:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg",
          "bg-gradient-to-br from-primary to-primary/80",
          "hover:shadow-xl transition-all",
          hasAlerts && "animate-pulse",
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bot className="h-6 w-6 text-primary-foreground" />
        {hasAlerts && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
            !
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={cn(
        "fixed bottom-6 right-6 z-50 w-80",
        className
      )}
    >
      <Card className="shadow-2xl border-primary/20 overflow-hidden">
        <CardHeader className="p-3 bg-gradient-to-r from-primary to-primary/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Club AI Advisor</h3>
                <p className="text-[10px] text-white/70">Powered by AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
            >
              <CardContent className="p-0">
                <ScrollArea className="h-64 p-3" ref={scrollRef}>
                  {/* Show advices when no chat messages */}
                  {chatMessages.length === 0 && (
                    <>
                      {advices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8">
                          <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">Ask me anything</p>
                          <p className="text-xs text-muted-foreground/70">
                            I can help with career advice, interview prep, and more
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {advices.map((advice, index) => {
                            const config = iconConfig[advice.type];
                            const Icon = config.icon;

                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                  "p-3 rounded-lg border",
                                  advice.priority === 'high' && "bg-red-500/5 border-red-500/20",
                                  advice.priority === 'medium' && "bg-yellow-500/5 border-yellow-500/20",
                                  advice.priority === 'low' && "bg-muted/50 border-border"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs font-medium">{advice.title}</p>
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[10px] px-1.5",
                                          advice.priority === 'high' && "border-red-500/50 text-red-500",
                                          advice.priority === 'medium' && "border-yellow-500/50 text-yellow-500"
                                        )}
                                      >
                                        {advice.priority}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{advice.message}</p>
                                    {advice.actionLabel && (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 mt-2 text-xs"
                                        onClick={advice.onAction}
                                      >
                                        {advice.actionLabel} →
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Chat messages */}
                  {chatMessages.length > 0 && (
                    <div className="space-y-3">
                      {chatMessages.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "p-3 rounded-lg text-xs",
                            msg.role === 'user' 
                              ? "bg-primary/10 ml-4" 
                              : "bg-muted/50 mr-4"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </motion.div>
                      ))}
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mr-4"
                        >
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs text-muted-foreground">Club AI is thinking...</span>
                        </motion.div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Ask QUIN */}
                <div className="p-3 border-t bg-muted/30">
                  <form onSubmit={handleAskClubAI} className="flex gap-2">
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask Club AI anything..."
                      className="h-8 text-xs"
                      disabled={isLoading}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="h-8 w-8 flex-shrink-0"
                      disabled={isLoading || !question.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
