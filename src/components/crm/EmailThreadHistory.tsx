import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Mail, Send, MessageSquare, Smile, Meh, Frown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmailMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  subject: string;
  body: string;
  sentAt: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  opened?: boolean;
  clicked?: boolean;
}

interface EmailThreadHistoryProps {
  emails: EmailMessage[];
  prospectName: string;
}

export function EmailThreadHistory({ emails, prospectName }: EmailThreadHistoryProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([emails[0]?.id]));

  const toggleExpand = (id: string) => {
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

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-4 h-4 text-emerald-500" />;
      case 'negative': return <Frown className="w-4 h-4 text-red-500" />;
      default: return <Meh className="w-4 h-4 text-amber-500" />;
    }
  };

  if (emails.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No email conversations yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email History
          <Badge variant="secondary" className="ml-auto">
            {emails.length} messages
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {emails.map((email, index) => {
          const isExpanded = expandedIds.has(email.id);
          const isOutbound = email.direction === 'outbound';

          return (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "border rounded-lg overflow-hidden",
                isOutbound ? "border-blue-500/30 bg-blue-500/5" : "border-emerald-500/30 bg-emerald-500/5"
              )}
            >
              <button
                onClick={() => toggleExpand(email.id)}
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/10 transition-colors"
              >
                <div className={cn(
                  "p-2 rounded-full",
                  isOutbound ? "bg-blue-500/20" : "bg-emerald-500/20"
                )}>
                  {isOutbound ? (
                    <Send className={cn("w-4 h-4", isOutbound ? "text-blue-500" : "text-emerald-500")} />
                  ) : (
                    <Mail className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {isOutbound ? `To: ${prospectName}` : `From: ${prospectName}`}
                    </span>
                    {email.sentiment && getSentimentIcon(email.sentiment)}
                    {email.opened && (
                      <Badge variant="outline" className="text-[10px]">Opened</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{email.subject}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(email.sentAt), 'MMM d, h:mm a')}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-border/30">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        {email.body.split('\n').map((line, i) => (
                          <p key={i} className="my-1">{line || <br />}</p>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
