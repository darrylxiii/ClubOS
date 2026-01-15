import { useState, useMemo } from "react";
import { Email } from "@/hooks/useEmails";
import { EmailRow } from "./EmailRow";
import { EmailRowSkeleton } from "./EmailRowSkeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, Mail, MailOpen } from "lucide-react";
import { notify } from "@/lib/notify";
import { InboxZero } from "./InboxZero";
import { AnimatePresence, motion } from "framer-motion";
import { isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

// Helper to group emails by date
const groupEmailsByDate = (emails: Email[]) => {
  const groups: Record<string, Email[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };

  emails.forEach((email) => {
    const date = new Date(email.email_date);
    if (isToday(date)) {
      groups.today.push(email);
    } else if (isYesterday(date)) {
      groups.yesterday.push(email);
    } else if (isThisWeek(date)) {
      groups.thisWeek.push(email);
    } else if (isThisMonth(date)) {
      groups.thisMonth.push(email);
    } else {
      groups.older.push(email);
    }
  });

  return groups;
};

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
  hasMore,
  onLoadMore,
  loadingMore
}: EmailListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Group emails for display
  const groupedEmails = useMemo(() => groupEmailsByDate(emails), [emails]);

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
    let successCount = 0;

    // Optimistic UI updates could happen here, but for now we'll rely on parent
    const promises = ids.map(async (id) => {
      try {
        if (action === "archive") await onArchive(id);
        else if (action === "delete") await onDelete(id);
        else if (action === "read") await onMarkAsRead(id);
        else if (action === "unread") await onMarkAsUnread(id);
        successCount++;
      } catch (_e) {
        console.error(e);
      }
    });

    await Promise.all(promises);

    // Clear selection after action
    if (successCount > 0) {
      setSelectedIds(new Set());
      const actionLabel = action === "read" ? "marked as read" :
        action === "unread" ? "marked as unread" :
          action === "archive" ? "archived" : "deleted";
      notify.success(`${successCount} email${successCount !== 1 ? 's' : ''} ${actionLabel}`);
    }
  };

  // Empty State
  if (!loading && emails.length === 0) {
    return (
      <div className="h-full">
        <InboxZero onReset={onLoadMore} />
      </div>
    );
  }

  // Render a section with title
  const renderSection = (title: string, items: Email[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-2 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
        <div>
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((email) => (
              <motion.div
                key={email.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 500, damping: 40, mass: 1 }}
              >
                <EmailRow
                  email={email}
                  isSelected={selectedEmailId === email.id}
                  isChecked={selectedIds.has(email.id)}
                  onSelect={() => onEmailSelect(email)}
                  onToggleCheck={() => toggleSelection(email.id)}
                  onToggleStar={onToggleStar}
                  onArchive={onArchive}
                  onMarkAsRead={onMarkAsRead}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Selection Toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border bg-muted/30 overflow-hidden"
          >
            <div className="p-2 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs sm:text-sm text-foreground font-medium ml-2 whitespace-nowrap mr-2">
                {selectedIds.size} selected
              </span>
              <div className="h-4 w-px bg-border mx-2" />
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction("archive")} className="text-muted-foreground hover:text-foreground">
                <Archive className="h-4 w-4 mr-2" /> Archive
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction("delete")} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction("read")} className="text-muted-foreground hover:text-foreground">
                <MailOpen className="h-4 w-4 mr-2" /> Read
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction("unread")} className="text-muted-foreground hover:text-foreground">
                <Mail className="h-4 w-4 mr-2" /> Unread
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main List Header (Select All) */}
      {emails.length > 0 && (
        <div className="border-b border-border p-2 px-4 flex items-center sticky top-0 bg-background z-20 h-10">
          <div className="flex items-center group cursor-pointer hover:opacity-80 transition-opacity" onClick={toggleSelectAll}>
            <Checkbox
              checked={selectedIds.size === emails.length && emails.length > 0}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-xs font-medium text-muted-foreground ml-3 cursor-pointer select-none">
              Select All
            </label>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {emails.length} messages
          </div>
        </div>
      )}

      {/* Scrollable List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-2 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <EmailRowSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="pb-20">
            {renderSection("Today", groupedEmails.today)}
            {renderSection("Yesterday", groupedEmails.yesterday)}
            {renderSection("This Week", groupedEmails.thisWeek)}
            {renderSection("This Month", groupedEmails.thisMonth)}
            {renderSection("Older", groupedEmails.older)}

            {hasMore && (
              <div className="p-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load More Emails"}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
