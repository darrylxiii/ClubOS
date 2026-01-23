import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Mail, Phone, Video, Linkedin, Users, ChevronDown, ChevronUp, Star, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type UnifiedCommunication = Database['public']['Tables']['unified_communications']['Row'];

interface UnifiedCommunicationTimelineProps {
  communications: UnifiedCommunication[];
  loading?: boolean;
  maxHeight?: string;
}

const channelConfig = {
  whatsapp: { icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-500/10', label: 'WhatsApp' },
  email: { icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Email' },
  phone: { icon: Phone, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Phone' },
  meeting: { icon: Video, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Meeting' },
  linkedin: { icon: Linkedin, color: 'text-sky-500', bg: 'bg-sky-500/10', label: 'LinkedIn' },
  in_person: { icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'In Person' },
  other: { icon: MessageSquare, color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'Other' }
};

const sentimentConfig = {
  positive: { icon: ThumbsUp, color: 'text-green-500', label: 'Positive' },
  negative: { icon: ThumbsDown, color: 'text-red-500', label: 'Negative' },
  neutral: { icon: null, color: 'text-muted-foreground', label: 'Neutral' }
};

function getSentimentLabel(score: number | null): 'positive' | 'negative' | 'neutral' {
  if (score === null) return 'neutral';
  if (score >= 0.3) return 'positive';
  if (score <= -0.3) return 'negative';
  return 'neutral';
}

export function UnifiedCommunicationTimeline({ 
  communications, 
  loading,
  maxHeight = '600px' 
}: UnifiedCommunicationTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No communications yet</p>
          <p className="text-sm text-muted-foreground/70">
            Messages, emails, and meetings will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className="pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          <AnimatePresence>
            {communications.map((comm, index) => {
              const channel = channelConfig[comm.channel as keyof typeof channelConfig] || channelConfig.other;
              const ChannelIcon = channel.icon;
              const sentiment = getSentimentLabel(comm.sentiment_score);
              const sentimentInfo = sentimentConfig[sentiment];
              const SentimentIcon = sentimentInfo.icon;
              const isExpanded = expandedIds.has(comm.id);
              const isKeyMoment = !!(comm as any).key_moment_type;

              return (
                <motion.div
                  key={comm.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-12"
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-3 top-4 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
                    channel.bg,
                    isKeyMoment && "ring-2 ring-yellow-500 ring-offset-2 ring-offset-background"
                  )}>
                    <div className={cn("w-2 h-2 rounded-full", channel.color.replace('text-', 'bg-'))} />
                  </div>

                  <Card className={cn(
                    "transition-all hover:shadow-md",
                    isKeyMoment && "border-yellow-500/50 bg-yellow-500/5"
                  )}>
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded", channel.bg)}>
                            <ChannelIcon className={cn("h-4 w-4", channel.color)} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{channel.label}</span>
                              {isKeyMoment && (
                                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                                  <Star className="h-3 w-3 mr-1" />
                                  {((comm as any).key_moment_type || '').replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {comm.created_at ? format(new Date(comm.created_at), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs", comm.direction === 'inbound' ? 'bg-blue-500/10' : 'bg-green-500/10')}>
                            {comm.direction === 'inbound' ? '← In' : '→ Out'}
                          </Badge>
                          {SentimentIcon && (
                            <SentimentIcon className={cn("h-4 w-4", sentimentInfo.color)} />
                          )}
                        </div>
                      </div>

                      {/* Subject */}
                      {comm.subject && (
                        <p className="font-medium text-sm mb-1">{comm.subject}</p>
                      )}

                      {/* Content preview */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {comm.content_preview || comm.content_summary || 'No content available'}
                      </p>

                      {/* Topics */}
                      {comm.key_topics && (comm.key_topics as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(comm.key_topics as string[]).slice(0, 3).map((topic, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Expand button */}
                      {(comm.ai_analysis || comm.content_summary) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => toggleExpanded(comm.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Show AI analysis
                            </>
                          )}
                        </Button>
                      )}

                      {/* Expanded content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 mt-3 border-t space-y-2">
                              {comm.content_summary && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                                  <p className="text-sm">{comm.content_summary}</p>
                                </div>
                              )}
                              {comm.ai_analysis && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Analysis</p>
                                  <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(comm.ai_analysis, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </ScrollArea>
  );
}
