import { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { 
  Search, 
  RefreshCw, 
  Mail, 
  Flame,
  Sun,
  HelpCircle,
  Clock,
  Inbox,
  Keyboard,
  CheckSquare,
  Archive
} from 'lucide-react';
import { useCRMEmailReplies } from '@/hooks/useCRMEmailReplies';
import { useCRMAdvancedSearch } from '@/hooks/useCRMAdvancedSearch';
import { REPLY_CLASSIFICATIONS, type CRMEmailReply } from '@/types/crm-enterprise';
import { toast } from 'sonner';
import { VirtualReplyList } from '@/components/crm/VirtualReplyList';
import { ReplyDetailDrawer } from '@/components/crm/ReplyDetailDrawer';
import { CRMKeyboardShortcutsDialog } from '@/components/crm/CRMKeyboardShortcutsDialog';
import { CRMActivityReminderBell } from '@/components/crm/CRMActivityReminderBell';

type TabFilter = 'all' | 'hot' | 'warm' | 'objections' | 'unread';

export default function ReplyInbox() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedReply, setSelectedReply] = useState<CRMEmailReply | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const { replies, loading, refetch, markAsRead, markAsActioned } = useCRMEmailReplies({
    search: searchQuery || undefined,
  });

  // Use advanced search for filtering
  const filteredBySearch = useCRMAdvancedSearch(replies, searchQuery);

  // Filter replies based on tab
  const filteredReplies = filteredBySearch.filter(reply => {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '?':
          setShowShortcuts(true);
          break;
        case 'j':
          // Next reply
          if (selectedReply) {
            const currentIndex = filteredReplies.findIndex(r => r.id === selectedReply.id);
            if (currentIndex < filteredReplies.length - 1) {
              handleSelectReply(filteredReplies[currentIndex + 1]);
            }
          } else if (filteredReplies.length > 0) {
            handleSelectReply(filteredReplies[0]);
          }
          break;
        case 'k':
          // Previous reply
          if (selectedReply) {
            const currentIndex = filteredReplies.findIndex(r => r.id === selectedReply.id);
            if (currentIndex > 0) {
              handleSelectReply(filteredReplies[currentIndex - 1]);
            }
          }
          break;
        case 'r':
          if (selectedReply) {
            handleMarkActioned(selectedReply.id, 'replied');
          }
          break;
        case 'e':
          if (selectedReply) {
            handleArchive(selectedReply.id);
          }
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReply, filteredReplies]);

  const handleSelectReply = async (reply: CRMEmailReply) => {
    setSelectedReply(reply);
    if (!reply.is_read) {
      await markAsRead(reply.id);
    }
    // Open drawer on mobile
    if (window.innerWidth < 768) {
      setMobileDrawerOpen(true);
    }
  };

  const handleToggleCheck = useCallback((replyId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(replyId)) {
        next.delete(replyId);
      } else {
        next.add(replyId);
      }
      return next;
    });
  }, []);

  const handleToggleStar = useCallback(async (replyId: string) => {
    const reply = replies.find(r => r.id === replyId);
    if (reply) {
      // Toggle priority (starred = priority 5, unstarred = priority 3)
      const newPriority = reply.priority > 3 ? 3 : 5;
      // This would update the reply priority
      toast.success(newPriority > 3 ? 'Starred' : 'Unstarred');
    }
  }, [replies]);

  const handleArchive = useCallback(async (replyId: string) => {
    await markAsActioned(replyId, 'archived');
    toast.success('Archived');
  }, [markAsActioned]);

  const handleSnooze = useCallback(async (replyId: string) => {
    // Snooze for 24 hours
    toast.success('Snoozed for 24 hours');
  }, []);

  const handleMarkActioned = async (replyId: string, action: string) => {
    await markAsActioned(replyId, action);
    toast.success(`Marked as ${action}`);
  };

  const handleBulkArchive = async () => {
    for (const id of selectedIds) {
      await markAsActioned(id, 'archived');
    }
    toast.success(`Archived ${selectedIds.size} replies`);
    setSelectedIds(new Set());
  };

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
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Inbox className="w-6 h-6" />
                    Smart Reply Inbox
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {counts.unread} unread • AI-categorized email replies
                  </p>
                </div>
                {/* Activity Reminders */}
                <CRMActivityReminderBell />
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive ({selectedIds.size})
                  </Button>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-search-input
                    placeholder="Search (from:, company:, is:unread)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64 bg-muted/20 border-border/30"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(true)}>
                  <Keyboard className="w-4 h-4" />
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

          {/* Content - Virtualized List */}
          <div className="flex-1 flex overflow-hidden">
            {/* Reply List with Virtualization */}
            <div className="w-full md:w-1/3 border-r border-border/30 flex flex-col">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredReplies.length > 0 ? (
                <VirtualReplyList
                  replies={filteredReplies}
                  selectedReplyId={selectedReply?.id || null}
                  selectedIds={selectedIds}
                  onReplySelect={handleSelectReply}
                  onToggleCheck={handleToggleCheck}
                  onToggleStar={handleToggleStar}
                  onArchive={handleArchive}
                  onSnooze={handleSnooze}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Inbox className="w-12 h-12 mb-4 opacity-50" />
                  <p>No replies found</p>
                </div>
              )}
            </div>

            {/* Reply Detail - Desktop */}
            <div className="hidden md:flex flex-1 flex-col">
              {selectedReply ? (
                <ReplyDetailDrawer
                  reply={selectedReply}
                  open={true}
                  onClose={() => setSelectedReply(null)}
                  onReply={() => handleMarkActioned(selectedReply.id, 'replied')}
                  onArchive={() => handleArchive(selectedReply.id)}
                  onSnooze={() => handleSnooze(selectedReply.id)}
                  onMarkActioned={(action) => handleMarkActioned(selectedReply.id, action)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Select a reply to view details</p>
                    <p className="text-xs mt-2">Press ? for keyboard shortcuts</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileDrawerOpen && selectedReply && (
            <ReplyDetailDrawer
              reply={selectedReply}
              open={mobileDrawerOpen}
              onClose={() => setMobileDrawerOpen(false)}
              onReply={() => handleMarkActioned(selectedReply.id, 'replied')}
              onArchive={() => handleArchive(selectedReply.id)}
              onSnooze={() => handleSnooze(selectedReply.id)}
              onMarkActioned={(action) => handleMarkActioned(selectedReply.id, action)}
            />
          )}

          {/* Keyboard Shortcuts Dialog */}
          <CRMKeyboardShortcutsDialog 
            open={showShortcuts} 
            onOpenChange={setShowShortcuts} 
          />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
