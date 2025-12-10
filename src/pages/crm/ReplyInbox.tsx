import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  RefreshCw, 
  Mail, 
  Archive,
  CheckCircle,
  Clock,
  Flame,
  Sun,
  HelpCircle,
  ThumbsDown,
  Inbox,
  Star,
  Reply,
  ExternalLink
} from 'lucide-react';
import { useCRMEmailReplies } from '@/hooks/useCRMEmailReplies';
import { REPLY_CLASSIFICATIONS, type CRMEmailReply, type ReplyClassification } from '@/types/crm-enterprise';
import { formatDistanceToNow, format } from 'date-fns';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type TabFilter = 'all' | 'hot' | 'warm' | 'objections' | 'unread';

export default function ReplyInbox() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedReply, setSelectedReply] = useState<CRMEmailReply | null>(null);

  const { replies, loading, refetch, markAsRead, markAsActioned } = useCRMEmailReplies({
    search: searchQuery || undefined,
  });

  // Filter replies based on tab
  const filteredReplies = replies.filter(reply => {
    switch (activeTab) {
      case 'hot':
        return reply.classification === 'hot_lead';
      case 'warm':
        return ['warm_lead', 'interested'].includes(reply.classification);
      case 'objections':
        return ['objection', 'question', 'not_interested'].includes(reply.classification);
      case 'unread':
        return !reply.is_read;
      default:
        return true;
    }
  });

  // Count badges
  const counts = {
    all: replies.length,
    hot: replies.filter(r => r.classification === 'hot_lead').length,
    warm: replies.filter(r => ['warm_lead', 'interested'].includes(r.classification)).length,
    objections: replies.filter(r => ['objection', 'question', 'not_interested'].includes(r.classification)).length,
    unread: replies.filter(r => !r.is_read).length,
  };

  const handleSelectReply = async (reply: CRMEmailReply) => {
    setSelectedReply(reply);
    if (!reply.is_read) {
      await markAsRead(reply.id);
    }
  };

  const handleMarkActioned = async (replyId: string, action: string) => {
    await markAsActioned(replyId, action);
    toast.success(`Marked as ${action}`);
  };

  const classificationConfig = REPLY_CLASSIFICATIONS.find(
    c => c.value === selectedReply?.classification
  );

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 px-6 py-4 border-b border-border/30 bg-gradient-to-r from-card/50 to-transparent backdrop-blur-xl"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Inbox className="w-6 h-6" />
                  Smart Reply Inbox
                </h1>
                <p className="text-sm text-muted-foreground">
                  {counts.unread} unread • AI-categorized email replies
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search replies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48 bg-muted/20 border-border/30"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)} className="mt-4">
              <TabsList className="bg-muted/20">
                <TabsTrigger value="all" className="gap-2">
                  <Mail className="w-4 h-4" />
                  All
                  {counts.all > 0 && (
                    <Badge variant="secondary" className="text-xs">{counts.all}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="hot" className="gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  Hot
                  {counts.hot > 0 && (
                    <Badge variant="destructive" className="text-xs">{counts.hot}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="warm" className="gap-2">
                  <Sun className="w-4 h-4 text-orange-500" />
                  Warm
                  {counts.warm > 0 && (
                    <Badge className="text-xs bg-orange-500">{counts.warm}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="objections" className="gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  Objections
                  {counts.objections > 0 && (
                    <Badge className="text-xs bg-amber-500">{counts.objections}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Unread
                  {counts.unread > 0 && (
                    <Badge variant="outline" className="text-xs">{counts.unread}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Reply List */}
            <div className="w-full md:w-1/3 border-r border-border/30 flex flex-col">
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredReplies.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {filteredReplies.map((reply) => (
                      <ReplyListItem
                        key={reply.id}
                        reply={reply}
                        isSelected={selectedReply?.id === reply.id}
                        onClick={() => handleSelectReply(reply)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Inbox className="w-12 h-12 mb-4 opacity-50" />
                    <p>No replies found</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Reply Detail */}
            <div className="hidden md:flex flex-1 flex-col">
              <AnimatePresence mode="wait">
                {selectedReply ? (
                  <motion.div
                    key={selectedReply.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Reply Header */}
                    <div className="p-6 border-b border-border/30">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-lg font-semibold">{selectedReply.from_name || selectedReply.from_email}</h2>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                classificationConfig && `bg-${classificationConfig.color}-500/20 text-${classificationConfig.color}-400`
                              )}
                            >
                              {classificationConfig?.emoji} {classificationConfig?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{selectedReply.from_email}</p>
                          {selectedReply.prospect_company && (
                            <p className="text-sm text-muted-foreground">{selectedReply.prospect_company}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={`/crm/prospects/${selectedReply.prospect_id}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Prospect
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-medium">{selectedReply.subject}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Received {format(new Date(selectedReply.received_at), 'PPp')}
                        </p>
                      </div>
                    </div>

                    {/* Reply Body */}
                    <ScrollArea className="flex-1 p-6">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {selectedReply.body_text?.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>

                      {/* AI Analysis */}
                      {selectedReply.ai_summary && (
                        <Card className="mt-6 bg-primary/5 border-primary/20">
                          <CardContent className="p-4">
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <Star className="w-4 h-4 text-primary" />
                              AI Summary
                            </h4>
                            <p className="text-sm text-muted-foreground">{selectedReply.ai_summary}</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Suggested Reply */}
                      {selectedReply.suggested_reply && (
                        <Card className="mt-4 bg-green-500/5 border-green-500/20">
                          <CardContent className="p-4">
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <Reply className="w-4 h-4 text-green-500" />
                              Suggested Reply
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {selectedReply.suggested_reply}
                            </p>
                            <Button size="sm" className="mt-3" asChild>
                              <a href={`mailto:${selectedReply.from_email}?subject=Re: ${selectedReply.subject}`}>
                                Use as Template
                              </a>
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </ScrollArea>

                    {/* Actions */}
                    <div className="p-4 border-t border-border/30 flex items-center gap-2">
                      <Button 
                        onClick={() => handleMarkActioned(selectedReply.id, 'replied')}
                        disabled={selectedReply.is_actioned}
                      >
                        <Reply className="w-4 h-4 mr-2" />
                        Mark as Replied
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleMarkActioned(selectedReply.id, 'archived')}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </Button>
                      {selectedReply.is_actioned && (
                        <Badge variant="outline" className="ml-auto">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Actioned: {selectedReply.action_taken}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex items-center justify-center text-muted-foreground"
                  >
                    <div className="text-center">
                      <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Select a reply to view details</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </RoleGate>
    </AppLayout>
  );
}

interface ReplyListItemProps {
  reply: CRMEmailReply;
  isSelected: boolean;
  onClick: () => void;
}

function ReplyListItem({ reply, isSelected, onClick }: ReplyListItemProps) {
  const classification = REPLY_CLASSIFICATIONS.find(c => c.value === reply.classification);

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "w-full p-4 text-left hover:bg-muted/20 transition-colors",
        isSelected && "bg-primary/10 border-l-2 border-primary",
        !reply.is_read && "bg-muted/10"
      )}
      whileHover={{ x: 4 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {!reply.is_read && (
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
            <span className={cn(
              "text-sm truncate",
              !reply.is_read && "font-semibold"
            )}>
              {reply.from_name || reply.from_email}
            </span>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {formatDistanceToNow(new Date(reply.received_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm truncate text-muted-foreground">{reply.subject}</p>
          <p className="text-xs truncate text-muted-foreground/70 mt-1">
            {reply.body_preview || reply.body_text?.substring(0, 100)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Badge 
          variant="outline" 
          className="text-[10px] px-1.5 py-0"
        >
          {classification?.emoji} {classification?.label}
        </Badge>
        {reply.urgency === 'high' && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            Urgent
          </Badge>
        )}
      </div>
    </motion.button>
  );
}
