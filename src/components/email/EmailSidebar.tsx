import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  Trash2,
  Archive,
  Plus,
} from "lucide-react";
import { EmailLabel } from "@/hooks/useEmails";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { NeedsAttentionWidget } from "./NeedsAttentionWidget";

interface EmailSidebarProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  labels: EmailLabel[];
  unreadCount: number;
  onCompose: () => void;
}

export function EmailSidebar({
  currentFilter,
  onFilterChange,
  labels,
  unreadCount,
  onCompose,
}: EmailSidebarProps) {
  const { user } = useAuth();
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastSync = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("email_connections")
        .select("last_sync_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("last_sync_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.last_sync_at) {
        setLastSync(data.last_sync_at);
      }
    };

    fetchLastSync();
    const interval = setInterval(fetchLastSync, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [user]);

  const folders = [
    { id: "inbox", label: "Inbox", icon: Inbox, count: unreadCount },
    { id: "starred", label: "Starred", icon: Star },
    { id: "snoozed", label: "Snoozed", icon: Clock },
    { id: "sent", label: "Sent", icon: Send },
    { id: "drafts", label: "Drafts", icon: FileText },
    { id: "archived", label: "Archived", icon: Archive },
    { id: "trash", label: "Trash", icon: Trash2 },
  ];

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 flex-shrink-0">
        <Button onClick={onCompose} className="w-full text-xs sm:text-sm" size="sm">
          <Plus className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Compose
        </Button>
        {lastSync && (
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center truncate px-1">
            Last sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 sm:space-y-1 p-1 sm:p-2">
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={currentFilter === folder.id ? "secondary" : "ghost"}
              className="w-full justify-start text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 min-w-0"
              onClick={() => onFilterChange(folder.id)}
            >
              <folder.icon className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{folder.label}</span>
              {folder.count !== undefined && folder.count > 0 && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs flex-shrink-0">
                  {folder.count}
                </Badge>
              )}
            </Button>
          ))}

          {/* Needs Attention Widget */}
          <div className="border-t border-border my-2 sm:my-3" />
          <div className="px-1 sm:px-2">
            <NeedsAttentionWidget />
          </div>
          <div className="border-t border-border my-2 sm:my-3" />

          {labels.length > 0 && (
            <>
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 mt-2 sm:mt-4 text-[10px] sm:text-xs font-semibold text-muted-foreground">
                Labels
              </div>
              {labels.map((label) => (
                <Button
                  key={label.id}
                  variant="ghost"
                  className="w-full justify-start text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 min-w-0"
                  onClick={() => onFilterChange(`label:${label.id}`)}
                >
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-1.5 sm:mr-2 flex-shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-left truncate">{label.name}</span>
                </Button>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
