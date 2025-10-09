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
    <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground/90 animate-fade-in glass-subtle rounded-2xl border border-border/30 shadow-glass-sm max-w-fit">
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user) => {
          const initials = (user.full_name || "?")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <Avatar key={user.user_id} className="h-7 w-7 ring-2 ring-background shadow-glass-sm">
              <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      <span className="text-foreground/80">{text}</span>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce shadow-glow" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce shadow-glow" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce shadow-glow" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
};
