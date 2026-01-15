import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmails, Email } from "@/hooks/useEmails";
import { useKeyboardShortcuts, EMAIL_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useAdvancedSearch } from "@/hooks/useAdvancedSearch";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { notify } from "@/lib/notify";
import { EmailSidebar } from "./EmailSidebar";
import { EmailList } from "./EmailList";
import { EmailDetail } from "./EmailDetail";
import { EmailComposer } from "./EmailComposer";
import { useIsMobile } from "@/hooks/use-mobile";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { AdvancedSearchInput } from "./AdvancedSearchInput";
import { PriorityInboxTabs } from "./intelligence/PriorityInboxTabs";
import { AICommandRegistry } from "./intelligence/AICommandPalette";
import { QuickActionsBar } from "./intelligence/QuickActionsBar";
import { useCommand } from "@/contexts/CommandContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Mail, Settings as SettingsIcon, Menu, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export function EmailInbox() {
  const [filter, setFilter] = useState("inbox");
  const [priorityTab, setPriorityTab] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Handle '?' key for shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is pressing '?' (Shift + /) and not in an input
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { user } = useAuth();
  const { executeWithUndo } = useUndoableAction();
  const { toggle: toggleCommandPalette } = useCommand();
  const isMobile = useIsMobile();

  const {
    emails,
    labels,
    loading,
    syncing,
    syncEmails,
    markAsRead,
    markAsUnread,
    toggleStar,
    archiveEmail,
    deleteEmail,
    snoozeEmail,
    loadMore,
    hasMore,
    loadingMore,
  } = useEmails(filter);

  // Check if user has email connections
  const [hasConnections, setHasConnections] = useState<boolean | null>(null);
  const [isInitialSync, setIsInitialSync] = useState(false);

  useEffect(() => {
    const checkConnections = async () => {
      if (!user) return;

      const { data: connections } = await supabase
        .from("email_connections")
        .select("id, last_sync_at")
        .eq("user_id", user.id)
        .eq("is_active", true);

      setHasConnections((connections?.length || 0) > 0);

      // Auto-sync logic
      const neverSynced = connections?.some((c) => !c.last_sync_at);

      if (connections && connections.length > 0 && !syncing) {
        if (neverSynced) {
          // First time ever: show special initial sync UI
          console.log("Initial sync - fetching last 90 days of emails...");
          setIsInitialSync(true);
          setTimeout(async () => {
            await syncEmails();
            setIsInitialSync(false);
          }, 1000); // Reduced from 3000ms to 1000ms for snappier feel
        } else {
          // Regular auto-sync on visit
          console.log("Auto-syncing emails...");
          syncEmails();
        }
      }
    };

    checkConnections();
  }, [user]);

  const unreadCount = emails.filter((e) => !e.is_read).length;

  // Advanced search with operators
  const filteredEmails = useAdvancedSearch(emails, searchQuery);

  // Filter by priority tab when in inbox view
  const displayedEmails = useMemo(() => {
    if (filter !== "inbox") return filteredEmails;

    // Show all emails when "all" tab is active
    if (priorityTab === "all") return filteredEmails;

    return filteredEmails.filter((email) => {
      const inboxType = email.inbox_type === 'primary' ? 'fyi' : (email.inbox_type || "fyi");

      switch (priorityTab) {
        case "important":
          return inboxType === "important";
        case "action":
          return inboxType === "action";
        case "fyi":
          return inboxType === "fyi";
        case "newsletters":
          return inboxType === "newsletters";
        case "low":
          return inboxType === "low";
        default:
          return true;
      }
    });
  }, [filteredEmails, filter, priorityTab]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const inboxEmails = filteredEmails.filter(e => !e.archived_at && !e.deleted_at);
    return {
      all: inboxEmails.length,
      important: inboxEmails.filter(e => e.inbox_type === "important").length,
      actionRequired: inboxEmails.filter(e => e.inbox_type === "action").length,
      fyi: inboxEmails.filter(e => e.inbox_type === "fyi" || e.inbox_type === "primary" || !e.inbox_type).length,
      newsletters: inboxEmails.filter(e => e.inbox_type === "newsletters").length,
      lowPriority: inboxEmails.filter(e => e.inbox_type === "low").length,
    };
  }, [filteredEmails]);

  // Keyboard shortcuts
  const selectedIndex = displayedEmails.findIndex((e) => e.id === selectedEmail?.id);

  useKeyboardShortcuts([
    {
      key: EMAIL_SHORTCUTS.COMPOSE.key,
      description: EMAIL_SHORTCUTS.COMPOSE.description,
      action: () => setComposerOpen(true),
    },
    {
      key: EMAIL_SHORTCUTS.NEXT.key,
      description: EMAIL_SHORTCUTS.NEXT.description,
      action: () => {
        if (selectedIndex < displayedEmails.length - 1) {
          handleEmailSelect(displayedEmails[selectedIndex + 1]);
        }
      },
    },
    {
      key: EMAIL_SHORTCUTS.PREV.key,
      description: EMAIL_SHORTCUTS.PREV.description,
      action: () => {
        if (selectedIndex > 0) {
          handleEmailSelect(displayedEmails[selectedIndex - 1]);
        }
      },
    },
    {
      key: EMAIL_SHORTCUTS.ARCHIVE.key,
      description: EMAIL_SHORTCUTS.ARCHIVE.description,
      action: () => selectedEmail && handleArchive(),
    },
    {
      key: EMAIL_SHORTCUTS.DELETE.key,
      description: EMAIL_SHORTCUTS.DELETE.description,
      action: () => selectedEmail && handleDelete(),
    },
    {
      key: EMAIL_SHORTCUTS.STAR.key,
      description: EMAIL_SHORTCUTS.STAR.description,
      action: () => selectedEmail && toggleStar(selectedEmail.id, !selectedEmail.is_starred),
    },
    {
      key: EMAIL_SHORTCUTS.REPLY.key,
      description: EMAIL_SHORTCUTS.REPLY.description,
      action: () => selectedEmail && setComposerOpen(true),
    },
    {
      key: EMAIL_SHORTCUTS.SEARCH.key,
      description: EMAIL_SHORTCUTS.SEARCH.description,
      action: () => {
        // Focus the search input
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        input?.focus();
      },
    },
    {
      key: EMAIL_SHORTCUTS.HELP.key,
      description: EMAIL_SHORTCUTS.HELP.description,
      action: () => setShowShortcuts(true),
    },
  ]);

  const handleEmailSelect = (email: Email) => {
    // console.log('[EmailInbox] Email selected:', email.id);
    setSelectedEmail(email);

    // Mark as read only if in inbox and unread
    if (!email.is_read && filter === "inbox") {
      setTimeout(() => markAsRead(email.id), 100);
    }
  };

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedEmail(null);
  }, [filter]);

  // Preserve selected email when emails array updates
  useEffect(() => {
    if (selectedEmail) {
      const updatedEmail = emails.find(e => e.id === selectedEmail.id);
      if (updatedEmail) {
        setSelectedEmail(updatedEmail);
      } else {
        // Fetch to confirm existence if moved
        const fetchEmail = async () => {
          const { data, error } = await supabase
            .from("emails")
            .select("*")
            .eq("id", selectedEmail.id)
            .single();

          if (data && !error) {
            setSelectedEmail(data);
          } else {
            setSelectedEmail(null);
          }
        };
        fetchEmail();
      }
    }
  }, [emails, selectedEmail?.id]);

  const handleSnooze = () => {
    if (!selectedEmail) return;
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 3);
    snoozeEmail(selectedEmail.id, snoozeUntil);
    notify.success("Email snoozed", { description: "This email will reappear in 3 hours" });
    setSelectedEmail(null);
  };

  const handleArchive = async () => {
    if (!selectedEmail) return;
    const emailToArchive = selectedEmail;
    setSelectedEmail(null);
    await executeWithUndo({
      description: "Email archived",
      execute: async () => await archiveEmail(emailToArchive.id),
      undo: async () => await supabase.from("emails").update({ status: "inbox", archived_at: null }).eq("id", emailToArchive.id),
    });
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;
    const emailToDelete = selectedEmail;
    setSelectedEmail(null);
    await executeWithUndo({
      description: "Email moved to trash",
      execute: async () => await deleteEmail(emailToDelete.id),
      undo: async () => await supabase.from("emails").update({ status: "inbox", deleted_at: null }).eq("id", emailToDelete.id),
    });
  };

  const handleBulkArchive = async () => {
    const promises = Array.from(selectedEmailIds).map(id => archiveEmail(id));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    notify.success(`Archived ${selectedEmailIds.size} emails`);
  };

  const handleBulkDelete = async () => {
    const promises = Array.from(selectedEmailIds).map(id => deleteEmail(id));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    notify.success(`Deleted ${selectedEmailIds.size} emails`);
  };

  const handleBulkSnooze = async () => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 24);
    const promises = Array.from(selectedEmailIds).map(id => snoozeEmail(id, snoozeUntil));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    notify.success(`Snoozed ${selectedEmailIds.size} emails`);
  };

  const handleBulkMarkAsRead = async () => {
    const promises = Array.from(selectedEmailIds).map(id => markAsRead(id));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    notify.success(`Marked ${selectedEmailIds.size} emails as read`);
  };

  const handleBulkMarkAsUnread = async () => {
    const promises = Array.from(selectedEmailIds).map(id => markAsUnread(id));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    notify.success(`Marked ${selectedEmailIds.size} emails as unread`);
  };

  if (hasConnections === false && !loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4 sm:p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Mail className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-center">Connect Your Email</CardTitle>
            <CardDescription className="text-center">
              Connect Gmail or Outlook to manage your emails from The Quantum Club
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Your email inbox is empty. Connect an email account to get started.
            </p>
            <Link to="/settings">
              <Button className="w-full">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Go to Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasConnections && emails.length === 0 && (loading || syncing)) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4 sm:p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <RefreshCw className="h-12 w-12 mx-auto animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-lg">
                {isInitialSync ? "Initial sync in progress..." : "Syncing your emails..."}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {isInitialSync
                  ? "Fetching your last 90 days of emails. This may take 30-60 seconds."
                  : "This may take a moment. We're fetching your latest emails."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] bg-background">
      {/* Top Bar - Premium App Feel */}
      <div className="border-b border-border p-3 flex items-center gap-3 bg-card/50 backdrop-blur-sm z-10 sticky top-0 h-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className={cn(
          "flex-1 flex items-center transition-all duration-300",
          isSearchExpanded ? "absolute inset-0 z-20 bg-background px-2" : ""
        )}>
          {isSearchExpanded && (
            <Button variant="ghost" size="icon" onClick={() => setIsSearchExpanded(false)} className="mr-2 md:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className={cn(
            "relative w-full max-w-2xl transition-all",
            !isSearchExpanded && "hidden md:block"
          )}>
            <AdvancedSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search emails..."
              className="w-full bg-muted/50 border-transparent hover:bg-muted focus:bg-background transition-all"
            />
          </div>

          {!isSearchExpanded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchExpanded(true)}
              className="md:hidden ml-auto"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className={cn("flex items-center gap-2", isSearchExpanded && "hidden")}>
          <Button
            variant="outline"
            size="sm"
            onClick={syncEmails}
            disabled={syncing}
            className="hidden sm:flex transition-all active:scale-95"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={syncEmails}
            disabled={syncing}
            className="sm:hidden"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Main Content - Resizable Three-Pane Layout */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className="h-full flex flex-col">
            <div className={cn("flex-1 overflow-hidden", selectedEmail ? "hidden" : "block")}>
              {filter === "inbox" && (
                <div className="px-2 pt-2">
                  <PriorityInboxTabs
                    activeTab={priorityTab}
                    onTabChange={setPriorityTab}
                    counts={tabCounts}
                  />
                </div>
              )}
              <EmailList
                emails={displayedEmails}
                selectedEmailId={selectedEmail?.id || null}
                onEmailSelect={handleEmailSelect}
                onToggleStar={toggleStar}
                onArchive={(id) => executeWithUndo({
                  description: "Email archived",
                  execute: async () => await archiveEmail(id),
                  undo: async () => await supabase.from("emails").update({ status: "inbox", archived_at: null }).eq("id", id)
                })}
                onDelete={(id) => executeWithUndo({
                  description: "Email moved to trash",
                  execute: async () => await deleteEmail(id),
                  undo: async () => await supabase.from("emails").update({ status: "inbox", deleted_at: null }).eq("id", id)
                })}
                onMarkAsRead={markAsRead}
                onMarkAsUnread={markAsUnread}
                loading={loading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                loadingMore={loadingMore}
              />
            </div>

            {selectedEmail && (
              <div className="h-full flex flex-col bg-background">
                <div className="border-b p-2 flex items-center">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                    <X className="mr-2 h-4 w-4" /> Back
                  </Button>
                </div>
                <EmailDetail
                  email={selectedEmail}
                  onReply={() => setComposerOpen(true)}
                  onForward={() => setComposerOpen(true)}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onSnooze={handleSnooze}
                  onMarkAsUnread={() => markAsUnread(selectedEmail.id)}
                  onToggleStar={(starred) => toggleStar(selectedEmail.id, starred)}
                />
              </div>
            )}
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full items-stretch">
            <ResizablePanel defaultSize={18} minSize={14} maxSize={20} className="hidden md:block bg-muted/10">
              <EmailSidebar
                currentFilter={filter}
                onFilterChange={setFilter}
                labels={labels}
                unreadCount={unreadCount}
                onCompose={() => setComposerOpen(true)}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={32} minSize={25} maxSize={40} className="bg-background min-w-[350px]">
              <div className="h-full flex flex-col">
                {filter === "inbox" && (
                  <div className="px-3 pt-2">
                    <PriorityInboxTabs
                      activeTab={priorityTab}
                      onTabChange={setPriorityTab}
                      counts={tabCounts}
                    />
                  </div>
                )}
                <EmailList
                  emails={displayedEmails}
                  selectedEmailId={selectedEmail?.id || null}
                  onEmailSelect={handleEmailSelect}
                  onToggleStar={toggleStar}
                  onArchive={(id) => executeWithUndo({
                    description: "Email archived",
                    execute: async () => await archiveEmail(id),
                    undo: async () => await supabase.from("emails").update({ status: "inbox", archived_at: null }).eq("id", id)
                  })}
                  onDelete={(id) => executeWithUndo({
                    description: "Email moved to trash",
                    execute: async () => await deleteEmail(id),
                    undo: async () => await supabase.from("emails").update({ status: "inbox", deleted_at: null }).eq("id", id)
                  })}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  loading={loading}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  loadingMore={loadingMore}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={50} minSize={30}>
              {selectedEmail ? (
                <EmailDetail
                  key={selectedEmail.id}
                  email={selectedEmail}
                  onReply={() => setComposerOpen(true)}
                  onForward={() => setComposerOpen(true)}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onSnooze={handleSnooze}
                  onMarkAsUnread={() => markAsUnread(selectedEmail.id)}
                  onToggleStar={(starred) => toggleStar(selectedEmail.id, starred)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/5/50">
                  <div className="text-center">
                    <div className="bg-muted p-4 rounded-full w-fit mx-auto mb-4">
                      <Mail className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">Select an email to read</h3>
                    <p className="max-w-xs mx-auto mt-2 text-sm text-muted-foreground">
                      Choose an email from the list to view its contents.
                    </p>
                  </div>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {isMobile && !composerOpen && (
        <Button
          onClick={() => setComposerOpen(true)}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-transform active:scale-95"
        >
          <Mail className="h-6 w-6" />
        </Button>
      )}

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[280px] md:hidden">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Mailboxes</SheetTitle>
          </SheetHeader>
          <EmailSidebar
            currentFilter={filter}
            onFilterChange={(newFilter) => {
              setFilter(newFilter);
              setMobileSidebarOpen(false);
            }}
            labels={labels}
            unreadCount={unreadCount}
            onCompose={() => {
              setComposerOpen(true);
              setMobileSidebarOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <EmailComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        replyTo={
          selectedEmail
            ? {
              email: selectedEmail.from_email,
              subject: selectedEmail.subject,
            }
            : undefined
        }
      />

      <KeyboardShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />

      <AICommandRegistry
        selectedEmail={selectedEmail}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onSnooze={handleSnooze}
        onStar={() => selectedEmail && toggleStar(selectedEmail.id, !selectedEmail.is_starred)}
        onReply={() => setComposerOpen(true)}
      />

      <QuickActionsBar
        selectedCount={selectedEmailIds.size}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onSnooze={handleBulkSnooze}
        onMarkAsRead={handleBulkMarkAsRead}
        onMarkAsUnread={handleBulkMarkAsUnread}
        onClearSelection={() => setSelectedEmailIds(new Set())}
      />
    </div>
  );
}
