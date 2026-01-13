import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Sun, ThumbsUp, HelpCircle, ThumbsDown, Plane,
  Archive, RefreshCw, Sparkles, Mail, Filter, Search,
  CheckCircle, Clock, Zap, AlarmClock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VirtualReplyList } from "./VirtualReplyList";
import { ReplyDetailDrawer } from "./ReplyDetailDrawer";
import { SmartReplyButtons } from "@/components/email/SmartReplyButtons";
import { BulkReplyActions } from "./BulkReplyActions";
import { SnoozeDialog } from "./SnoozeDialog";
import type { CRMEmailReply } from "@/types/crm-enterprise";

// Smart category tabs configuration
const SMART_CATEGORIES = [
  { id: 'all', label: 'All', icon: Mail, color: 'text-foreground' },
  { id: 'hot', label: 'Hot', icon: Flame, color: 'text-red-500', filter: ['hot_lead'] },
  { id: 'warm', label: 'Warm', icon: Sun, color: 'text-orange-500', filter: ['warm_lead', 'interested'] },
  { id: 'questions', label: 'Questions', icon: HelpCircle, color: 'text-blue-500', filter: ['question'] },
  { id: 'objections', label: 'Objections', icon: ThumbsDown, color: 'text-amber-500', filter: ['objection'] },
  { id: 'ooo', label: 'OOO', icon: Plane, color: 'text-cyan-500', filter: ['out_of_office', 'auto_reply'] },
  { id: 'negative', label: 'Not Interested', icon: ThumbsDown, color: 'text-muted-foreground', filter: ['not_interested', 'unsubscribe'] },
];

interface SmartReplyInboxProps {
  onReplySelect?: (reply: CRMEmailReply) => void;
}

export function SmartReplyInbox({ onReplySelect }: SmartReplyInboxProps) {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReply, setSelectedReply] = useState<CRMEmailReply | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [smartReplies, setSmartReplies] = useState<{ professional?: string; friendly?: string; decline?: string } | null>(null);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [replyToSnooze, setReplyToSnooze] = useState<CRMEmailReply | null>(null);

  // Fetch replies with real-time subscription
  const { data: replies = [], isLoading, refetch } = useQuery({
    queryKey: ['smart-reply-inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_email_replies')
        .select(`
          *,
          prospect:crm_prospects(id, full_name, company_name, email)
        `)
        .eq('is_archived', false)
        .order('received_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        prospect_name: r.prospect?.full_name,
        prospect_company: r.prospect?.company_name
      })) as CRMEmailReply[];
    }
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('smart-reply-inbox')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crm_email_replies'
      }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Filter replies based on category and search
  const filteredReplies = useMemo(() => {
    let filtered = replies;

    // Apply category filter
    if (activeCategory !== 'all') {
      const category = SMART_CATEGORIES.find(c => c.id === activeCategory);
      if (category?.filter) {
        filtered = filtered.filter(r => category.filter!.includes(r.classification));
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.from_name?.toLowerCase().includes(query) ||
        r.from_email?.toLowerCase().includes(query) ||
        r.subject?.toLowerCase().includes(query) ||
        r.body_text?.toLowerCase().includes(query) ||
        r.prospect_company?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [replies, activeCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: replies.length };
    SMART_CATEGORIES.forEach(cat => {
      if (cat.filter) {
        counts[cat.id] = replies.filter(r => cat.filter!.includes(r.classification)).length;
      }
    });
    return counts;
  }, [replies]);

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase
        .from('crm_email_replies')
        .update({ is_read: true })
        .eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-reply-inbox'] })
  });

  const archiveMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase
        .from('crm_email_replies')
        .update({ is_archived: true })
        .eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-reply-inbox'] });
      toast.success('Reply archived');
    }
  });

  const toggleStarMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const reply = replies.find(r => r.id === replyId);
      if (!reply) return;
      const { error } = await supabase
        .from('crm_email_replies')
        .update({ priority: reply.priority > 3 ? 1 : 5 })
        .eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['smart-reply-inbox'] })
  });

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: async ({ replyId, snoozeUntil }: { replyId: string; snoozeUntil: Date }) => {
      const { error } = await supabase
        .from('crm_email_replies')
        .update({
          snoozed_until: snoozeUntil.toISOString(),
          is_archived: true // Temporarily hide from inbox
        })
        .eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-reply-inbox'] });
      toast.success('Reply snoozed');
      setSnoozeDialogOpen(false);
      setReplyToSnooze(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to snooze: ${error.message}`);
    }
  });

  const handleSnooze = (snoozeUntil: Date) => {
    if (replyToSnooze) {
      snoozeMutation.mutate({ replyId: replyToSnooze.id, snoozeUntil });
    }
  };

  // Generate smart replies
  const generateSmartRepliesMutation = useMutation({
    mutationFn: async (reply: CRMEmailReply) => {
      const data = await aiService.generatePersonalizedFollowUp({
        reply_content: reply.content,
        reply_id: reply.id,
        prospect_id: reply.prospect_id,
        classification: reply.classification,
        tone
      });

      setGeneratedReply(data.followUp || null);
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.followUp) {
        setSmartReplies({
          professional: data.followUp.professional,
          friendly: data.followUp.friendly,
          decline: data.followUp.concise
        });
        toast.success('AI replies generated');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate replies: ${error.message}`);
    }
  });

  const handleReplySelect = (reply: CRMEmailReply) => {
    setSelectedReply(reply);
    setIsDrawerOpen(true);
    setSmartReplies(null);

    // Mark as read
    if (!reply.is_read) {
      markReadMutation.mutate(reply.id);
    }

    // Generate smart replies
    generateSmartRepliesMutation.mutate(reply);

    onReplySelect?.(reply);
  };

  const handleToggleCheck = (replyId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(replyId)) {
        next.delete(replyId);
      } else {
        next.add(replyId);
      }
      return next;
    });
  };

  const handleSelectSmartReply = (reply: string, type: string) => {
    if (selectedReply) {
      const mailtoLink = `mailto:${selectedReply.from_email}?subject=Re: ${selectedReply.subject || ''}&body=${encodeURIComponent(reply)}`;
      window.open(mailtoLink, '_blank');
      toast.success(`${type} reply opened in email client`);
    }
  };

  const unreadCount = replies.filter(r => !r.is_read).length;
  const hotCount = categoryCounts['hot'] || 0;

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="border-b border-border/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Smart Reply Inbox</CardTitle>
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread {hotCount > 0 && `• ${hotCount} hot leads`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search replies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>

        {/* Category Tabs */}
        <ScrollArea className="mt-4">
          <div className="flex gap-2">
            {SMART_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isActive = activeCategory === cat.id;
              const Icon = cat.icon;

              return (
                <Button
                  key={cat.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 gap-1.5 ${!isActive ? 'bg-background/50 hover:bg-background/80' : ''}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${!isActive ? cat.color : ''}`} />
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="ml-1 h-5 px-1.5 text-[10px]"
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredReplies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-2">No replies yet</h3>
            <p className="text-sm text-muted-foreground">
              {activeCategory !== 'all'
                ? `No ${activeCategory} replies found. Try a different category.`
                : 'Replies from your email campaigns will appear here.'}
            </p>
          </div>
        ) : (
          <VirtualReplyList
            replies={filteredReplies}
            selectedReplyId={selectedReply?.id || null}
            selectedIds={selectedIds}
            onReplySelect={handleReplySelect}
            onToggleCheck={handleToggleCheck}
            onToggleStar={(id) => toggleStarMutation.mutate(id)}
            onArchive={(id) => archiveMutation.mutate(id)}
          />
        )}
      </CardContent>

      {/* Reply Detail Drawer */}
      <ReplyDetailDrawer
        reply={selectedReply}
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSmartReplies(null);
        }}
        onReply={() => {
          if (selectedReply) {
            window.open(`mailto:${selectedReply.from_email}?subject=Re: ${selectedReply.subject || ''}`);
          }
        }}
        onArchive={() => {
          if (selectedReply) {
            archiveMutation.mutate(selectedReply.id);
            setIsDrawerOpen(false);
          }
        }}
        onSnooze={() => {
          setReplyToSnooze(selectedReply);
          setSnoozeDialogOpen(true);
        }}
        onMarkActioned={(action) => toast.success(`Marked as ${action}`)}
      />

      {/* Smart Reply Buttons in drawer */}
      {isDrawerOpen && selectedReply && (
        <AnimatePresence>
          {generateSmartRepliesMutation.isPending ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed bottom-24 left-4 right-4 z-50"
            >
              <Card className="p-4 border-primary/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                  <span className="text-sm">Generating AI replies...</span>
                </div>
              </Card>
            </motion.div>
          ) : smartReplies ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-24 left-4 right-4 z-50 max-w-lg mx-auto"
            >
              <SmartReplyButtons
                smartReplies={smartReplies}
                onSelectReply={handleSelectSmartReply}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {/* Bulk Actions Bar */}
      <BulkReplyActions
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Snooze Dialog */}
      <SnoozeDialog
        open={snoozeDialogOpen}
        onClose={() => {
          setSnoozeDialogOpen(false);
          setReplyToSnooze(null);
        }}
        onSnooze={handleSnooze}
      />
    </Card>
  );
}
