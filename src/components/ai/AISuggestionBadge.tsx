import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useAISuggestions } from "@/hooks/useAISuggestions";

export function AISuggestionBadge() {
  const { unreadCount } = useAISuggestions();

  if (unreadCount === 0) return null;

  return (
    <Badge
      variant="default"
      className="absolute -top-2 -right-2 h-6 px-2 bg-primary animate-pulse shadow-lg"
    >
      <Sparkles className="h-3 w-3 mr-1" />
      {unreadCount}
    </Badge>
  );
}
