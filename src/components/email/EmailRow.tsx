import { Email } from "@/hooks/useEmails";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { isToday, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSwipeable } from "react-swipeable";

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

  // SAFE DATE PARSING
  let dateObj = new Date(email.email_date);
  if (isNaN(dateObj.getTime())) {
    try {
      // Fallback to created_at or current date if invalid
      dateObj = new Date(email.created_at || new Date());
    } catch (e) {
      dateObj = new Date();
    }
  }

  const displayDate = isToday(dateObj)
    ? format(dateObj, 'h:mm a')
    : format(dateObj, 'MMM d');

  return (
    <div
      {...swipeHandlers}
      className={cn(
        "group flex items-start gap-3 p-3 border-b border-border/60 hover:bg-muted/50 cursor-pointer transition-colors relative",
        isSelected && "bg-muted border-l-2 border-l-primary pl-[10px]",
        !email.is_read ? "bg-background" : "bg-muted/10 opacity-90"
      )}
      onClick={onSelect}
    >
      {/* Selection Checkbox - Only visible on hover or checked */}
      <div className={cn(
        "pt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute left-2 top-3 z-10",
        isChecked && "opacity-100"
      )}>
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggleCheck()}
          onClick={(e) => e.stopPropagation()}
          className="bg-background"
        />
      </div>

      {/* Avatar (Hidden when checkbox is shown on hover) */}
      <div className={cn(
        "pt-0.5 transition-opacity group-hover:opacity-0",
        isChecked && "opacity-0"
      )}>
        <Avatar className="h-9 w-9 border border-border/50">
          {email.from_avatar_url ? (
            <AvatarImage
              src={email.from_avatar_url}
              alt={email.from_name || email.from_email}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {getInitials(email.from_name || email.from_email)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 min-w-0 space-y-1">

        {/* Header Row: Sender + Date */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate max-w-[180px]",
              !email.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground"
            )}
          >
            {email.from_name || email.from_email}
          </span>
          <span className={cn(
            "text-xs whitespace-nowrap flex-shrink-0",
            !email.is_read ? "text-primary font-bold" : "text-muted-foreground/80"
          )}
          >
            {displayDate}
          </span>
        </div>

        {/* Subject */}
        <div className={cn(
          "text-sm leading-snug truncate pr-6",
          !email.is_read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
        )}>
          {email.subject}
        </div>

        {/* Snippet */}
        <div className="text-xs text-muted-foreground/90 line-clamp-1 pr-4">
          {email.ai_summary || email.snippet}
        </div>

        {/* Badges Row */}
        {(email.ai_category || (email.ai_priority && email.ai_priority >= 4)) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {email.ai_priority && email.ai_priority >= 4 && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px] font-medium uppercase tracking-wider">High Priority</Badge>
            )}
            {email.ai_category && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground font-medium border-border">
                {email.ai_category.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Star Action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(email.id, !email.is_starred);
        }}
        className={cn(
          "absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity",
          email.is_starred && "opacity-100"
        )}
      >
        <Star
          className={cn(
            "h-4 w-4 transition-all duration-200",
            email.is_starred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-foreground"
          )}
        />
      </button>
    </div>
  );
}
