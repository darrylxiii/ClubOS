import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck, MoreVertical, Reply } from "lucide-react";

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    is_read?: boolean;
    media_url?: string;
    media_type?: string;
    sender?: {
      full_name: string | null;
      avatar_url: string | null;
    };
    read_receipts?: Array<{
      user_id: string;
      read_at: string;
    }>;
  };
  isCurrentUser: boolean;
  isGroup?: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MessageBubble = ({
  message,
  isCurrentUser,
  isGroup,
  onReply,
  onEdit,
  onDelete,
}: MessageBubbleProps) => {
  const senderName = message.sender?.full_name || "Unknown User";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const readCount = message.read_receipts?.length || 0;
  const allRead = readCount > 0;

  return (
    <div
      className={cn(
        "flex gap-3 mb-4 group",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col gap-1 max-w-[70%]", isCurrentUser && "items-end")}>
        {(!isCurrentUser || isGroup) && (
          <span className="text-xs text-muted-foreground font-medium px-1">
            {senderName}
          </span>
        )}

        <div className="relative">
          <div
            className={cn(
              "rounded-2xl px-4 py-2 shadow-sm backdrop-blur-sm",
              isCurrentUser
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground border border-border/50"
            )}
          >
            {message.media_url && (
              <div className="mb-2">
                {message.media_type?.startsWith("image") ? (
                  <img
                    src={message.media_url}
                    alt="Attachment"
                    className="rounded-lg max-w-sm"
                  />
                ) : (
                  <a
                    href={message.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline"
                  >
                    View attachment
                  </a>
                )}
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>

          <div className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity absolute top-0",
            isCurrentUser ? "-left-8" : "-right-8"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
                {onReply && (
                  <DropdownMenuItem onClick={onReply}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {isCurrentUser && onEdit && (
                  <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                )}
                {isCurrentUser && onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className={cn("flex items-center gap-1 px-1", isCurrentUser && "flex-row-reverse")}>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), "HH:mm")}
          </span>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground">
              {allRead ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
