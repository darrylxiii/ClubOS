import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmails, Email } from "@/hooks/useEmails";
import { useKeyboardShortcuts, EMAIL_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useAdvancedSearch } from "@/hooks/useAdvancedSearch";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { EmailSidebar } from "./EmailSidebar";
import { EmailList } from "./EmailList";
import { EmailDetail } from "./EmailDetail";
import { EmailDetailDrawer } from "./EmailDetailDrawer";
import { EmailComposer } from "./EmailComposer";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { AdvancedSearchInput } from "./AdvancedSearchInput";
import { PriorityInboxTabs } from "./intelligence/PriorityInboxTabs";
import { AICommandPalette } from "./intelligence/AICommandPalette";
import { QuickActionsBar } from "./intelligence/QuickActionsBar";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Mail, Settings as SettingsIcon, ArrowLeft, HelpCircle, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function EmailInbox() {
  const [filter, setFilter] = useState("inbox");
  const [priorityTab, setPriorityTab] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { executeWithUndo } = useUndoableAction();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const isMobile = useMobileDetection();

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

      // Auto-sync on first load if never synced
      const needsSync = connections?.some((c) => !c.last_sync_at);
      if (needsSync && !syncing && connections && connections.length > 0) {
        console.log("Initial sync - fetching last 90 days of emails...");
        setIsInitialSync(true);
        // Allow edge functions to deploy
        setTimeout(async () => {
          await syncEmails();
          setIsInitialSync(false);
        }, 3000);
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
    console.log('[EmailInbox] Email selected:', email.id, 'Current filter:', filter);
    setSelectedEmail(email);
    
    // Mark as read only if in inbox and unread
    if (!email.is_read && filter === "inbox") {
      setTimeout(() => markAsRead(email.id), 100);
    }
  };

  // Clear selection when filter changes
  useEffect(() => {
    console.log('[EmailInbox] Filter changed to:', filter, 'Clearing selection');
    setSelectedEmail(null);
  }, [filter]);

  // Preserve selected email when emails array updates
  useEffect(() => {
    if (selectedEmail) {
      const updatedEmail = emails.find(e => e.id === selectedEmail.id);
      if (updatedEmail) {
        console.log('[EmailInbox] Updating selected email from emails array');
        setSelectedEmail(updatedEmail);
      } else {
        // Email not in current filter - fetch it directly to show updates
        console.log('[EmailInbox] Selected email not in filter, fetching directly');
        const fetchEmail = async () => {
          const { data, error } = await supabase
            .from("emails")
            .select("*")
            .eq("id", selectedEmail.id)
            .single();
          
          if (data && !error) {
            setSelectedEmail(data);
          } else {
            // Email was deleted or moved - clear selection
            console.log('[EmailInbox] Selected email no longer exists, clearing');
            setSelectedEmail(null);
          }
        };
        fetchEmail();
      }
    }
  }, [emails, selectedEmail?.id]);

  const handleSnooze = () => {
    if (!selectedEmail) return;
    
    // Snooze for 3 hours
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 3);
    
    snoozeEmail(selectedEmail.id, snoozeUntil);
    toast({
      title: "Email snoozed",
      description: "This email will reappear in 3 hours",
    });
    setSelectedEmail(null);
  };

  const handleArchive = async () => {
    if (!selectedEmail) return;
    
    const emailToArchive = selectedEmail;
    setSelectedEmail(null);
    
    await executeWithUndo({
      description: "Email archived",
      execute: async () => {
        await archiveEmail(emailToArchive.id);
      },
      undo: async () => {
        // Restore from archive
        await supabase
          .from("emails")
          .update({ status: "inbox", archived_at: null })
          .eq("id", emailToArchive.id);
      },
    });
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;
    
    const emailToDelete = selectedEmail;
    setSelectedEmail(null);
    
    await executeWithUndo({
      description: "Email moved to trash",
      execute: async () => {
        await deleteEmail(emailToDelete.id);
      },
      undo: async () => {
        // Restore from trash
        await supabase
          .from("emails")
          .update({ status: "inbox", deleted_at: null })
          .eq("id", emailToDelete.id);
      },
    });
  };

  // Bulk actions
  const handleBulkArchive = async () => {
    const promises = Array.from(selectedEmailIds).map(id => archiveEmail(id));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    toast({ title: `Archived ${selectedEmailIds.size} emails` });
  };

  const handleBulkDelete = async () => {
    const promises = Array.from(selectedEmailIds).map(id => deleteEmail(id));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    toast({ title: `Deleted ${selectedEmailIds.size} emails` });
  };

  const handleBulkSnooze = async () => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 24);
    const promises = Array.from(selectedEmailIds).map(id => snoozeEmail(id, snoozeUntil));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    toast({ title: `Snoozed ${selectedEmailIds.size} emails` });
  };

  const handleBulkMarkAsRead = async () => {
    const promises = Array.from(selectedEmailIds).map(id => markAsRead(id));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    toast({ title: `Marked ${selectedEmailIds.size} emails as read` });
  };

  const handleBulkMarkAsUnread = async () => {
    const promises = Array.from(selectedEmailIds).map(id => markAsUnread(id));
    await Promise.all(promises);
    setSelectedEmailIds(new Set());
    toast({ title: `Marked ${selectedEmailIds.size} emails as unread` });
  };

  // Show empty state if no connections
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

  // Show loading or syncing state
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
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)]">
      {/* Top Bar - Mobile Optimized */}
      <div className="border-b border-border p-2 sm:p-3 md:p-4 flex items-center gap-2 flex-wrap">
        {/* Hamburger menu for mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden min-h-[44px] min-w-[44px] flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <AdvancedSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search emails..."
          className="flex-1 min-w-[150px] sm:min-w-[200px] max-w-2xl"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={syncEmails}
          disabled={syncing}
          className="min-h-[44px]"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""} sm:mr-2`} />
          <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowShortcuts(true)}
          className="min-h-[44px] min-w-[44px]"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Priority Tabs - Only show in inbox */}
      {filter === "inbox" && (
        <PriorityInboxTabs
          activeTab={priorityTab}
          onTabChange={setPriorityTab}
          counts={tabCounts}
        />
      )}

      {/* Main Content - Mobile responsive layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
        {/* Floating Compose Button - Mobile only */}
        <Button
          onClick={() => setComposerOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Mail className="h-6 w-6" />
        </Button>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px] md:hidden">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Menu</SheetTitle>
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

        {/* Desktop Sidebar - Hidden on mobile, visible on md+ */}
        <div className={cn(
          "hidden md:block md:w-64 lg:w-72 xl:w-80 max-w-[320px] flex-shrink-0 border-r border-border overflow-x-hidden",
          selectedEmail && "lg:hidden xl:block"
        )}>
          <EmailSidebar
            currentFilter={filter}
            onFilterChange={setFilter}
            labels={labels}
            unreadCount={unreadCount}
            onCompose={() => setComposerOpen(true)}
          />
        </div>

        {/* Email List - Full width on mobile when no email selected */}
        <div className={cn(
          "w-full md:flex-1 md:max-w-[420px] lg:max-w-[480px] border-r border-border overflow-y-auto overflow-x-hidden flex-shrink-0",
          selectedEmail && "hidden lg:block"
        )}>
          <EmailList
            emails={displayedEmails}
            selectedEmailId={selectedEmail?.id || null}
            onEmailSelect={handleEmailSelect}
            onToggleStar={toggleStar}
            onArchive={(id) => executeWithUndo({
              description: "Email archived",
              execute: async () => await archiveEmail(id),
              undo: async () => {
                await supabase.from("emails").update({ status: "inbox", archived_at: null }).eq("id", id);
              },
            })}
            onDelete={(id) => executeWithUndo({
              description: "Email moved to trash",
              execute: async () => await deleteEmail(id),
              undo: async () => {
                await supabase.from("emails").update({ status: "inbox", deleted_at: null }).eq("id", id);
              },
            })}
            onMarkAsRead={markAsRead}
            onMarkAsUnread={markAsUnread}
            loading={loading}
          />
        </div>

        {/* Email Detail - Full screen on mobile, flex on desktop */}
        {selectedEmail && (
          <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
            {/* Mobile back button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden m-2 min-h-[44px] flex-shrink-0"
              onClick={() => setSelectedEmail(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inbox
            </Button>
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
          </div>
        )}

        {/* Empty state when no email selected */}
        {!selectedEmail && (
          <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
            <p>Select an email to read</p>
          </div>
        )}
      </div>

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

      <AICommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
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
