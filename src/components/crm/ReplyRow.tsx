import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Flame, Archive, Clock } from "lucide-react";
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
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityBorder = () => {
    if (reply.classification === 'hot_lead') return "border-l-4 border-l-destructive";
    if (reply.classification === 'warm_lead') return "border-l-4 border-l-orange-500";
    if (reply.urgency === 'high') return "border-l-4 border-l-amber-500";
    return "";
  };

  // Mobile swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (onArchive) onArchive(reply.id);
    },
    onSwipedRight: () => {
      if (onSnooze) onSnooze(reply.id);
    },
    trackMouse: false,
    trackTouch: true,
  });

  return (
    <div
      {...swipeHandlers}
      className={cn(
        "flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-border/30 hover:bg-accent/50 cursor-pointer transition-all duration-200 ease-in-out",
        isSelected && "bg-primary/10 border-l-2 border-l-primary",
        !reply.is_read && "bg-muted/30",
        getPriorityBorder()
      )}
      onClick={onSelect}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={() => onToggleCheck()}
        onClick={(e) => e.stopPropagation()}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
        className="text-muted-foreground hover:text-yellow-500 transition-all duration-200"
      >
        <Star
          className={cn(
            "h-4 w-4 transition-all duration-200",
            reply.priority > 3 && "fill-yellow-500 text-yellow-500 scale-110"
          )}
        />
      </button>

      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
        <AvatarFallback className="text-xs bg-primary/20 text-primary">
          {getInitials(reply.from_name || reply.from_email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-1 min-w-0 overflow-hidden">
          {!reply.is_read && (
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          )}
          <span
            className={cn(
              "font-medium truncate flex-1 min-w-0 max-w-[150px] sm:max-w-[200px] md:max-w-full text-sm sm:text-base",
              !reply.is_read && "font-semibold"
            )}
          >
            {reply.from_name || reply.from_email}
          </span>
          
          {reply.classification === 'hot_lead' && (
            <Flame className="w-4 h-4 text-red-500 shrink-0" />
          )}
          
          <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatDistanceToNow(new Date(reply.received_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Mobile timestamp */}
        <div className="sm:hidden text-xs text-muted-foreground mb-1">
          {formatDistanceToNow(new Date(reply.received_at), {
            addSuffix: true,
          })}
        </div>

        <div
          className={cn(
            "text-xs sm:text-sm truncate mb-1 min-w-0 overflow-hidden",
            !reply.is_read ? "font-medium" : "text-muted-foreground"
          )}
        >
          {reply.subject}
        </div>

        <div className="text-xs text-muted-foreground line-clamp-1 min-w-0 overflow-hidden">
          {reply.ai_summary || reply.body_preview || reply.body_text?.substring(0, 100)}
        </div>

        <div className="flex items-center gap-2 mt-2">
          {classification && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0"
            >
              {classification.emoji} {classification.label}
            </Badge>
          )}
          {reply.urgency === 'high' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Urgent
            </Badge>
          )}
          {reply.prospect_company && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {reply.prospect_company}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
