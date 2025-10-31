import { useState } from "react";
import { useEmails, Email } from "@/hooks/useEmails";
import { EmailSidebar } from "./EmailSidebar";
import { EmailList } from "./EmailList";
import { EmailDetail } from "./EmailDetail";
import { EmailComposer } from "./EmailComposer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function EmailInbox() {
  const [filter, setFilter] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

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

  const unreadCount = emails.filter((e) => !e.is_read).length;

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      await markAsRead(email.id);
    }
  };

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

        <EmailList
          emails={filteredEmails}
          selectedEmailId={selectedEmail?.id || null}
          onEmailSelect={handleEmailSelect}
          onToggleStar={toggleStar}
          onArchive={archiveEmail}
          onDelete={deleteEmail}
          onMarkAsRead={markAsRead}
          onMarkAsUnread={markAsUnread}
        />

        {selectedEmail ? (
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
