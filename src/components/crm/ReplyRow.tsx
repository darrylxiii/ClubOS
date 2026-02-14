import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useSwipeable } from "react-swipeable";
import type { CRMEmailReply } from "@/types/crm-enterprise";
import { REPLY_CLASSIFICATIONS } from "@/types/crm-enterprise";

interface ReplyRowProps {
  reply: CRMEmailReply;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onToggleStar: () => void;
  onArchive?: (replyId: string) => void;
  onSnooze?: (replyId: string) => void;
}

export function ReplyRow({
  reply,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  onToggleStar,
  onArchive,
  onSnooze,
}: ReplyRowProps) {
  const classification = REPLY_CLASSIFICATIONS.find(c => c.value === reply.classification);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getPriorityAccent = () => {
    if (reply.classification === 'hot_lead') return "border-l-2 border-l-destructive";
    if (reply.classification === 'warm_lead') return "border-l-2 border-l-orange-500";
    if (reply.urgency === 'high') return "border-l-2 border-l-amber-500";
    return "border-l-2 border-l-transparent";
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => onArchive?.(reply.id),
    onSwipedRight: () => onSnooze?.(reply.id),
    trackMouse: false,
    trackTouch: true,
  });

  const senderName = reply.from_name || reply.from_email;
  const timeAgo = formatDistanceToNow(new Date(reply.received_at), { addSuffix: true });

  return (
    <div
      {...swipeHandlers}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-150",
        "border-b border-border/20 hover:bg-accent/40",
        getPriorityAccent(),
        isSelected && "bg-primary/10",
      )}
      onClick={onSelect}
    >
      {/* Left controls */}
      <div className="flex items-center gap-2 pt-0.5 flex-shrink-0">
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggleCheck()}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4"
        />
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
          className="text-muted-foreground hover:text-yellow-500 transition-colors"
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              reply.priority > 3 && "fill-yellow-500 text-yellow-500"
            )}
          />
        </button>
      </div>

      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
        <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-medium">
          {getInitials(senderName)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Row 1: Sender + company + timestamp */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {!reply.is_read && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            )}
            <span className={cn(
              "text-sm truncate",
              !reply.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"
            )}>
              {senderName}
            </span>
            {reply.prospect_company && (
              <span className="text-xs text-muted-foreground truncate flex-shrink-0 max-w-[120px]">
                · {reply.prospect_company}
              </span>
            )}
            {reply.classification === 'hot_lead' && (
              <Flame className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
            {timeAgo}
          </span>
        </div>

        {/* Row 2: Subject */}
        <div className={cn(
          "text-sm truncate mb-0.5",
          !reply.is_read ? "font-medium text-foreground/90" : "text-muted-foreground"
        )}>
          {reply.subject}
        </div>

        {/* Row 3: Preview */}
        <div className="text-xs text-muted-foreground/70 line-clamp-1">
          {reply.ai_summary || reply.body_preview || reply.body_text?.substring(0, 120)}
        </div>

        {/* Row 4: Badge (single) */}
        {(classification || reply.urgency === 'high') && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {classification && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[18px] font-normal">
                {classification.emoji} {classification.label}
              </Badge>
            )}
            {reply.urgency === 'high' && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-[18px] font-normal">
                Urgent
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
