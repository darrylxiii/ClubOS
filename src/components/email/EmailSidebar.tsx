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
    <div className="w-64 border-r border-border bg-background flex flex-col">
      <div className="p-4 space-y-3">
        <Button onClick={onCompose} className="w-full" size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Compose
        </Button>
        {lastSync && (
          <p className="text-xs text-muted-foreground text-center">
            Last sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={currentFilter === folder.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onFilterChange(folder.id)}
            >
              <folder.icon className="mr-2 h-4 w-4" />
              <span className="flex-1 text-left">{folder.label}</span>
              {folder.count !== undefined && folder.count > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {folder.count}
                </Badge>
              )}
            </Button>
          ))}

          {labels.length > 0 && (
            <>
              <div className="px-3 py-2 mt-4 text-xs font-semibold text-muted-foreground">
                Labels
              </div>
              {labels.map((label) => (
                <Button
                  key={label.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => onFilterChange(`label:${label.id}`)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-left">{label.name}</span>
                </Button>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
