import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmails, Email } from "@/hooks/useEmails";
import { EmailSidebar } from "./EmailSidebar";
import { EmailList } from "./EmailList";
import { EmailDetail } from "./EmailDetail";
import { EmailComposer } from "./EmailComposer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Search, Mail, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export function EmailInbox() {
  const [filter, setFilter] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

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
        console.log('[EmailInbox] Selected email not found in current filter, keeping current');
      }
    }
  }, [emails]);

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
    await archiveEmail(selectedEmail.id);
    toast({ title: "Email archived" });
    setSelectedEmail(null);
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;
    await deleteEmail(selectedEmail.id);
    toast({ title: "Email moved to trash" });
    setSelectedEmail(null);
  };

  const filteredEmails = searchQuery
    ? emails.filter(
        (e) =>
          e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.from_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.from_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
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
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-border p-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <EmailSidebar
          currentFilter={filter}
          onFilterChange={setFilter}
          labels={labels}
          unreadCount={unreadCount}
          onCompose={() => setComposerOpen(true)}
        />

        <div className="w-96 border-r border-border">
          <EmailList
            emails={filteredEmails}
            selectedEmailId={selectedEmail?.id || null}
            onEmailSelect={handleEmailSelect}
            onToggleStar={toggleStar}
            onArchive={archiveEmail}
            onDelete={deleteEmail}
            onMarkAsRead={markAsRead}
            onMarkAsUnread={markAsUnread}
            loading={loading}
          />
        </div>

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
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select an email to read
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
    </div>
  );
}
