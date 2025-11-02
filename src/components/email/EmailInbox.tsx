import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmails, Email } from "@/hooks/useEmails";
import { useKeyboardShortcuts, EMAIL_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useAdvancedSearch } from "@/hooks/useAdvancedSearch";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { EmailSidebar } from "./EmailSidebar";
import { EmailList } from "./EmailList";
import { EmailDetail } from "./EmailDetail";
import { EmailComposer } from "./EmailComposer";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { NeedsAttentionWidget } from "./NeedsAttentionWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Search, Mail, Settings as SettingsIcon, ArrowLeft, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function EmailInbox() {
  const [filter, setFilter] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { executeWithUndo } = useUndoableAction();
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard shortcuts
  const selectedIndex = filteredEmails.findIndex((e) => e.id === selectedEmail?.id);
  
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
        if (selectedIndex < filteredEmails.length - 1) {
          handleEmailSelect(filteredEmails[selectedIndex + 1]);
        }
      },
    },
    {
      key: EMAIL_SHORTCUTS.PREV.key,
      description: EMAIL_SHORTCUTS.PREV.description,
      action: () => {
        if (selectedIndex > 0) {
          handleEmailSelect(filteredEmails[selectedIndex - 1]);
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
      action: () => searchInputRef.current?.focus(),
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

  const filteredEmailsForDisplay = searchQuery
    ? filteredEmails
    : emails;

  // Show empty state if no connections
  if (hasConnections === false && !loading) {
    return (
      <div className="h-screen flex items-center justify-center p-8">
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
      <div className="h-screen flex items-center justify-center p-8">
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
    <div className="flex flex-col h-full md:h-screen">
      {/* Top Bar */}
      <div className="border-b border-border p-3 md:p-4 flex items-center gap-2 md:gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search emails (try: from:, is:unread, has:attachment)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={syncEmails}
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowShortcuts(true)}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content - Mobile responsive layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar - Collapsible on mobile */}
        <div className={cn(
          "md:block",
          selectedEmail && "hidden md:block"
        )}>
          <div className="space-y-4 p-4">
            <EmailSidebar
              currentFilter={filter}
              onFilterChange={setFilter}
              labels={labels}
              unreadCount={unreadCount}
              onCompose={() => setComposerOpen(true)}
            />
            <NeedsAttentionWidget />
          </div>
        </div>

        {/* Email List - Hidden when email selected on mobile */}
        <div className={cn(
          "w-full md:w-96 border-r border-border",
          selectedEmail && "hidden md:block"
        )}>
          <EmailList
            emails={filteredEmailsForDisplay}
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
          <div className="flex-1 overflow-y-auto">
            {/* Mobile back button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden m-2"
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
    </div>
  );
}
