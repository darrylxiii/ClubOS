import { Email } from "@/hooks/useEmails";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useSwipeable } from "react-swipeable";
import { PriorityBadge } from "./intelligence/PriorityBadge";

interface EmailRowProps {
  email: Email;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onToggleStar: (emailId: string, starred: boolean) => void;
  onArchive?: (emailId: string) => void;
  onMarkAsRead?: (emailId: string) => void;
}

export function EmailRow({
  email,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  onToggleStar,
  onArchive,
  onMarkAsRead,
}: EmailRowProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityColor = (priority: number | null) => {
    if (!priority) return "";
    if (priority >= 4) return "border-l-4 border-l-destructive";
    if (priority >= 3) return "border-l-4 border-l-orange-500";
    return "";
  };

  // Mobile swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (onArchive) onArchive(email.id);
    },
    onSwipedRight: () => {
      if (onMarkAsRead) onMarkAsRead(email.id);
    },
    trackMouse: false,
    trackTouch: true,
  });

  return (
    <div
      {...swipeHandlers}
      className={cn(
        "flex items-center gap-3 p-3 border-b border-border hover:bg-accent/50 cursor-pointer transition-all duration-200 ease-in-out",
        isSelected && "bg-accent",
        !email.is_read && "bg-muted/30",
        getPriorityColor(email.ai_priority)
      )}
      onClick={onSelect}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={(checked) => {
          onToggleCheck();
        }}
        onClick={(e) => e.stopPropagation()}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(email.id, !email.is_starred);
        }}
        className="text-muted-foreground hover:text-yellow-500 transition-all duration-200"
      >
        <Star
          className={cn(
            "h-4 w-4 transition-all duration-200",
            email.is_starred && "fill-yellow-500 text-yellow-500 scale-110"
          )}
        />
      </button>

      <Avatar className="h-10 w-10">
        {email.from_avatar_url ? (
          <AvatarImage 
            src={email.from_avatar_url} 
            alt={email.from_name || email.from_email}
            onError={(e) => {
              // Hide broken image, fallback will show
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <AvatarFallback className="text-xs">
          {getInitials(email.from_name || email.from_email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "font-medium truncate",
              !email.is_read && "font-semibold"
            )}
          >
            {email.from_name || email.from_email}
          </span>
          {email.ai_priority_score !== undefined && email.ai_priority_score >= 60 && (
            <PriorityBadge
              score={email.ai_priority_score}
              reason={email.ai_priority_reason}
              size="sm"
            />
          )}
          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
            {formatDistanceToNow(new Date(email.email_date), {
              addSuffix: true,
            })}
          </span>
        </div>

        <div
          className={cn(
            "text-sm truncate mb-1",
            !email.is_read ? "font-medium" : "text-muted-foreground"
          )}
        >
          {email.subject}
        </div>

        <div className="text-xs text-muted-foreground truncate">
          {email.ai_summary || email.snippet}
        </div>

        {email.ai_category && (
          <div className="mt-1">
            <Badge variant="secondary" className="text-xs">
              {email.ai_category.replace(/_/g, " ")}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
