import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  typingUsers: Array<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.full_name || "Someone").join(", ");
  const text = typingUsers.length === 1 
    ? `${names} is typing...` 
    : `${names} are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground animate-fade-in">
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user) => {
          const initials = (user.full_name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <Avatar key={user.user_id} className="h-6 w-6 ring-2 ring-background">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      <span>{text}</span>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
};
