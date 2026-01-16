import { Button } from "@/components/ui/button";
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
  AlertCircle,
  Hash,
  ChevronDown,
} from "lucide-react";
import { EmailLabel } from "@/hooks/useEmails";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0);
  const [labelsOpen, setLabelsOpen] = useState(true);

  // Fetch 'Needs Attention' count
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('ai_priority', 5) // Assuming 5 is critical/needs attention
        .is('archived_at', null)
        .is('deleted_at', null); // Fix: Replaced .is('deleted_at', null) with .is('deleted_at', null) in syntax mind, actually standard eq is better if not null
      // Actually, usually .is('deleted_at', null) - Supabase syntax: .is('column', null)

      if (count !== null) setNeedsAttentionCount(count);
    };
    fetchCount();
  }, [user]);

  const mainFolders = [
    { id: "inbox", label: "Inbox", icon: Inbox, count: unreadCount, variant: "default" },
    { id: "needs_attention", label: "Needs Attention", icon: AlertCircle, count: needsAttentionCount, variant: "destructive" },
    { id: "starred", label: "Starred", icon: Star },
    { id: "snoozed", label: "Snoozed", icon: Clock },
    { id: "sent", label: "Sent", icon: Send },
    { id: "drafts", label: "Drafts", icon: FileText },
  ];

  const secondaryFolders = [
    { id: "archived", label: "All Mail", icon: Archive }, // 'Archived' serves as All Mail usually
    { id: "trash", label: "Trash", icon: Trash2 },
  ];

  return (
    <div className="flex flex-col h-full bg-muted/10 border-r border-border/40">
      <div className="p-4">
        <Button onClick={onCompose} className="w-full shadow-sm hover:shadow transition-all bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Compose
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-6 pb-4">

          {/* Main Folders */}
          <div className="space-y-1">
            {mainFolders.map((folder) => (
              <Button
                key={folder.id}
                variant={currentFilter === folder.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start font-normal h-9",
                  currentFilter === folder.id && "bg-accent text-accent-foreground font-medium"
                )}
                onClick={() => onFilterChange(folder.id)}
              >
                <folder.icon className={cn(
                  "mr-3 h-4 w-4",
                  folder.id === 'needs_attention' ? "text-destructive" : "text-muted-foreground",
                  currentFilter === folder.id && "text-foreground"
                )} />
                <span className="flex-1 text-left">{folder.label}</span>
                {folder.count !== undefined && folder.count > 0 && (
                  <span className={cn(
                    "ml-auto text-xs font-medium",
                    folder.id === 'needs_attention' ? "text-destructive" :
                      folder.id === 'inbox' ? "text-primary" : "text-muted-foreground"
                  )}>
                    {folder.count}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Labels Section */}
          {labels.length > 0 && (
            <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between items-center h-8 hover:bg-transparent px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Labels
                  <ChevronDown className={cn("h-3 w-3 transition-transform", labelsOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 transition-all">
                {labels.map((label) => (
                  <Button
                    key={label.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start font-normal h-8 text-sm",
                      currentFilter === `label:${label.id}` && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => onFilterChange(`label:${label.id}`)}
                  >
                    <Hash className="mr-3 h-3.5 w-3.5 text-muted-foreground/70" />
                    <span className="flex-1 text-left truncate text-muted-foreground/90">{label.name}</span>
                    <div
                      className="w-2 h-2 rounded-full ring-1 ring-border"
                      style={{ backgroundColor: label.color ?? undefined }}
                    />
                  </Button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Secondary Folders */}
          <div className="space-y-1 pt-4 border-t border-border/50">
            {secondaryFolders.map((folder) => (
              <Button
                key={folder.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start font-normal h-9 text-muted-foreground hover:text-foreground",
                  currentFilter === folder.id && "bg-accent text-accent-foreground font-medium"
                )}
                onClick={() => onFilterChange(folder.id)}
              >
                <folder.icon className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">{folder.label}</span>
              </Button>
            ))}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
