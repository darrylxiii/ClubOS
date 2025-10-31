import { useState } from "react";
import { Email } from "@/hooks/useEmails";
import { EmailRow } from "./EmailRow";
import { EmailRowSkeleton } from "./EmailRowSkeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, Mail, MailOpen } from "lucide-react";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (email: Email) => void;
  onToggleStar: (emailId: string, starred: boolean) => void;
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onMarkAsRead: (emailId: string) => void;
  onMarkAsUnread: (emailId: string) => void;
  loading?: boolean;
}

export function EmailList({
  emails,
  selectedEmailId,
  onEmailSelect,
  onToggleStar,
  onArchive,
  onDelete,
  onMarkAsRead,
  onMarkAsUnread,
  loading = false,
}: EmailListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (emailId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(emailId)) {
      newSet.delete(emailId);
    } else {
      newSet.add(emailId);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const handleBulkAction = async (
    action: "archive" | "delete" | "read" | "unread"
  ) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      if (action === "archive") await onArchive(id);
      else if (action === "delete") await onDelete(id);
      else if (action === "read") await onMarkAsRead(id);
      else if (action === "unread") await onMarkAsUnread(id);
    }
    setSelectedIds(new Set());
  };

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No emails</h3>
          <p className="text-sm text-muted-foreground">
            Your inbox is empty or syncing for the first time
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {selectedIds.size > 0 && (
        <div className="border-b border-border p-2 flex items-center gap-2 bg-muted/50">
          <span className="text-sm text-muted-foreground ml-2">
            {selectedIds.size} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkAction("archive")}
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkAction("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkAction("read")}
          >
            <MailOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkAction("unread")}
          >
            <Mail className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="border-b border-border p-2 flex items-center">
        <Checkbox
          checked={selectedIds.size === emails.length && emails.length > 0}
          onCheckedChange={toggleSelectAll}
          className="ml-2"
        />
        <span className="text-sm text-muted-foreground ml-3">
          {emails.length} emails
        </span>
      </div>

      <ScrollArea className="flex-1 scroll-smooth">
        <div>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <EmailRowSkeleton key={i} />
            ))
          ) : (
            emails.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                isSelected={email.id === selectedEmailId}
                isChecked={selectedIds.has(email.id)}
                onSelect={() => onEmailSelect(email)}
                onToggleCheck={() => toggleSelection(email.id)}
                onToggleStar={onToggleStar}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
