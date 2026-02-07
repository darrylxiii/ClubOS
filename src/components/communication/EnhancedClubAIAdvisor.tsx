import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, ChevronUp, ChevronDown, AlertTriangle, TrendingUp, Clock, MessageSquare, Lightbulb, Sparkles, Send, Loader2, Copy, Check, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCrossChannelPatterns } from '@/hooks/useCrossChannelPatterns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/lib/notify';

interface EnhancedClubAIAdvisorProps {
  entityType?: string;
  entityId?: string;
  entityName?: string;
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
  timestamp: Date;
}

export function EnhancedClubAIAdvisor({
  entityType,
  entityId,
  entityName,
  context = 'general',
  className
}: EnhancedClubAIAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [question, setQuestion] = useState('');
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draftReply, setDraftReply] = useState<string | null>(null);
  const [isDraftingReply, setIsDraftingReply] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const { activeAlerts, getHighPriorityAlerts } = useCrossChannelPatterns(entityType, entityId);

  // Generate contextual advices based on patterns and context
  useEffect(() => {
    const newAdvices: Advice[] = [];

    const highPriority = getHighPriorityAlerts();
    highPriority.forEach(pattern => {
      if (pattern.pattern_type === 'going_cold') {
        newAdvices.push({
          type: 'alert',
          title: 'Going Cold Alert',
          message: `${entityName || 'This contact'} hasn't responded in a while. Consider reaching out via their preferred channel.`,
          priority: 'high',
          actionLabel: 'Draft Reply',
          onAction: () => handleDraftReply('follow-up'),
        });
      } else if (pattern.pattern_type === 'ready_to_convert') {
        newAdvices.push({
          type: 'insight',
          title: 'High Conversion Signal',
          message: 'Strong buying signals detected. Now is a good time to move forward.',
          priority: 'high',
          actionLabel: 'Draft Proposal',
          onAction: () => handleDraftReply('proposal'),
        });
      } else if (pattern.pattern_type === 'needs_escalation') {
        newAdvices.push({
          type: 'alert',
          title: 'Escalation Needed',
          message: 'Multiple unresolved issues detected. Consider escalating to senior team member.',
          priority: 'high',
        });
      }
    });

    if (context === 'inbox') {
      newAdvices.push({
        type: 'tip',
        title: 'Response Time Matters',
        message: 'Replying within 2 hours increases engagement by 40%.',
        priority: 'low',
      });
    }

    setAdvices(newAdvices);
  }, [activeAlerts, context, entityName, getHighPriorityAlerts]);

  const handleDraftReply = async (type: 'follow-up' | 'proposal' | 'custom') => {
    setIsDraftingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke('club-ai-chat', {
        body: {
          message: type === 'follow-up' 
            ? `Draft a professional follow-up message for ${entityName || 'a candidate'} who hasn't responded in a while. Keep it warm, concise, and personalized.`
            : type === 'proposal'
            ? `Draft a message to move forward with ${entityName || 'a candidate'}. Include next steps and a call-to-action.`
            : question,
          context: {
            entityType,
            entityId,
            entityName,
            purpose: 'draft_reply'
          }
        }
      });

      if (error) throw error;
      setDraftReply(data?.reply || data?.message || 'Unable to generate reply');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsDraftingReply(false);
    }
  };

  const handleAskClubAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('club-ai-chat', {
        body: {
          message: question,
          context: {
            entityType,
            entityId,
            entityName,
            purpose: 'communication_advisor',
            previousMessages: chatMessages.slice(-5).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data?.reply || data?.message || 'I apologize, I could not process your request.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyDraft = () => {
    if (draftReply) {
      navigator.clipboard.writeText(draftReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!', description: 'Draft copied to clipboard' });
    }
  };

  const hasAlerts = advices.some(a => a.type === 'alert' && a.priority === 'high');

  const iconConfig = {
    alert: { icon: AlertTriangle, color: 'text-red-500' },
    tip: { icon: Lightbulb, color: 'text-yellow-500' },
    insight: { icon: TrendingUp, color: 'text-green-500' },
    action: { icon: Clock, color: 'text-blue-500' },
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
      className={cn("fixed bottom-6 right-6 z-50 w-96", className)}
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
                <p className="text-[10px] text-white/70">
                  {entityName ? `Helping with ${entityName}` : 'Communication Intelligence'}
                </p>
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
                <ScrollArea className="h-80 p-3">
                  {/* Draft Reply Section */}
                  {draftReply && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary">Draft Reply</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={copyDraft}
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <Textarea
                        value={draftReply}
                        onChange={(e) => setDraftReply(e.target.value)}
                        className="text-xs min-h-[80px] resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={copyDraft}>
                          Use Draft
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDraftReply(null)}>
                          Discard
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Advices */}
                  {advices.length > 0 && (
                    <div className="space-y-3 mb-4">
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
                                      advice.priority === 'high' && "border-red-500/50 text-red-500"
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
                                    disabled={isDraftingReply}
                                  >
                                    {isDraftingReply ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Wand2 className="h-3 w-3 mr-1" />
                                    )}
                                    {advice.actionLabel}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Chat Messages */}
                  {chatMessages.length > 0 && (
                    <div className="space-y-3">
                      {chatMessages.map((msg, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "p-2 rounded-lg text-xs",
                            msg.role === 'user' 
                              ? "bg-primary/10 ml-8" 
                              : "bg-muted mr-8"
                          )}
                        >
                          {msg.content}
                        </motion.div>
                      ))}
                      {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Club AI is thinking...
                        </div>
                      )}
                    </div>
                  )}

                  {advices.length === 0 && chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Ask me anything</p>
                      <p className="text-xs text-muted-foreground/70">
                        I can help draft messages, analyze relationships, and suggest next steps
                      </p>
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t bg-muted/30">
                  <form onSubmit={handleAskClubAI} className="flex gap-2">
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask Club AI or request a draft..."
                      className="h-8 text-xs"
                      disabled={isLoading}
                    />
                    <Button type="submit" size="icon" className="h-8 w-8 flex-shrink-0" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
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
