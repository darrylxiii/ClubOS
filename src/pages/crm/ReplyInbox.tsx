import { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
  Archive
} from 'lucide-react';
import { useCRMEmailReplies } from '@/hooks/useCRMEmailReplies';
import { useCRMAdvancedSearch } from '@/hooks/useCRMAdvancedSearch';
import { CRMRealtimeProvider, useCRMRealtime } from '@/components/crm/CRMRealtimeProvider';
import { type CRMEmailReply } from '@/types/crm-enterprise';
import { toast } from 'sonner';
import { VirtualReplyList } from '@/components/crm/VirtualReplyList';
import { ReplyDetailDrawer } from '@/components/crm/ReplyDetailDrawer';
import { ReplyDetailPanel } from '@/components/crm/ReplyDetailPanel';
import { CRMKeyboardShortcutsDialog } from '@/components/crm/CRMKeyboardShortcutsDialog';
import { CRMActivityReminderBell } from '@/components/crm/CRMActivityReminderBell';
import { useIsMobile } from '@/hooks/use-mobile';

type TabFilter = 'all' | 'hot' | 'warm' | 'objections' | 'unread';

function ReplyInboxContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedReply, setSelectedReply] = useState<CRMEmailReply | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const { replyChanges, lastUpdate } = useCRMRealtime();

  const { replies, loading, refetch, markAsRead, markAsActioned } = useCRMEmailReplies({
    search: searchQuery || undefined,
  });

  const filteredBySearch = useCRMAdvancedSearch(replies, searchQuery);

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
        case 'j': {
          const currentIndex = selectedReply ? filteredReplies.findIndex(r => r.id === selectedReply.id) : -1;
          if (currentIndex < filteredReplies.length - 1) {
            handleSelectReply(filteredReplies[currentIndex + 1]);
          }
          break;
        }
        case 'k': {
          if (selectedReply) {
            const currentIndex = filteredReplies.findIndex(r => r.id === selectedReply.id);
            if (currentIndex > 0) {
              handleSelectReply(filteredReplies[currentIndex - 1]);
            }
          }
          break;
        }
        case 'r':
          if (selectedReply) handleMarkActioned(selectedReply.id, 'replied');
          break;
        case 'e':
          if (selectedReply) handleArchive(selectedReply.id);
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
    if (isMobile) {
      setMobileDrawerOpen(true);
    }
  };

  const handleToggleCheck = useCallback((replyId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(replyId)) next.delete(replyId);
      else next.add(replyId);
      return next;
    });
  }, []);

  const handleToggleStar = useCallback(async (replyId: string) => {
    const reply = replies.find(r => r.id === replyId);
    if (reply) {
      const newPriority = reply.priority > 3 ? 3 : 5;
      toast.success(newPriority > 3 ? 'Starred' : 'Unstarred');
    }
  }, [replies]);

  const handleArchive = useCallback(async (replyId: string) => {
    await markAsActioned(replyId, 'archived');
    toast.success('Archived');
  }, [markAsActioned]);

  const handleSnooze = useCallback(async (replyId: string) => {
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-border/30 bg-card/50 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Inbox className="w-5 h-5" />
                Smart Reply Inbox
              </h1>
              <p className="text-xs text-muted-foreground">
                {counts.unread > 0 && <span className="text-primary font-medium">{counts.unread} unread</span>}
                {counts.unread > 0 && ' · '}
                AI-categorized replies
                {lastUpdate && <span className="ml-1 text-primary">· Live</span>}
              </p>
            </div>
            <CRMActivityReminderBell />
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                <Archive className="w-4 h-4 mr-1" />
                Archive ({selectedIds.size})
              </Button>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                data-search-input
                placeholder="Search replies... (press /)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-56 h-8 text-sm bg-muted/20 border-border/30"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowShortcuts(true)}>
              <Keyboard className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)} className="mt-3">
          <TabsList className="bg-muted/20 h-8">
            <TabsTrigger value="all" className="gap-1.5 text-xs h-7 px-3">
              <Mail className="w-3.5 h-3.5" />
              All
              {counts.all > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts.all}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="hot" className="gap-1.5 text-xs h-7 px-3">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              Hot
              {counts.hot > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1">{counts.hot}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="warm" className="gap-1.5 text-xs h-7 px-3">
              <Sun className="w-3.5 h-3.5 text-orange-500" />
              Warm
              {counts.warm > 0 && <Badge className="text-[10px] h-4 px-1 bg-orange-500">{counts.warm}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="objections" className="gap-1.5 text-xs h-7 px-3">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              Objections
              {counts.objections > 0 && <Badge className="text-[10px] h-4 px-1 bg-amber-500">{counts.objections}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5 text-xs h-7 px-3">
              <Clock className="w-3.5 h-3.5" />
              Unread
              {counts.unread > 0 && <Badge variant="outline" className="text-[10px] h-4 px-1">{counts.unread}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content: List + Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Reply list panel */}
        <div className="w-full md:w-[420px] md:min-w-[320px] md:max-w-[480px] border-r border-border/30 flex flex-col bg-card/20">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
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
              <Inbox className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No replies found</p>
            </div>
          )}
        </div>

        {/* Desktop inline detail panel */}
        <div className="hidden md:flex flex-1 flex-col bg-background">
          {selectedReply ? (
            <ReplyDetailPanel
              reply={selectedReply}
              onClose={() => setSelectedReply(null)}
              onReply={() => handleMarkActioned(selectedReply.id, 'replied')}
              onArchive={() => handleArchive(selectedReply.id)}
              onSnooze={() => handleSnooze(selectedReply.id)}
              onMarkActioned={(action) => handleMarkActioned(selectedReply.id, action)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Select a reply to view details</p>
                <p className="text-xs mt-1.5 text-muted-foreground/60">
                  Use <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">j</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">k</kbd> to navigate · <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">?</kbd> for all shortcuts
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobile && mobileDrawerOpen && selectedReply && (
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

      <CRMKeyboardShortcutsDialog 
        open={showShortcuts} 
        onOpenChange={setShowShortcuts} 
      />
    </div>
  );
}

export default function ReplyInbox() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <CRMRealtimeProvider onReplyUpdate={() => {}}>
          <ReplyInboxContent />
        </CRMRealtimeProvider>
      </RoleGate>
    </AppLayout>
  );
}
