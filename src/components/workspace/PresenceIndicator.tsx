import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePagePresence } from "@/hooks/usePagePresence";
import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  pageId: string;
  maxVisible?: number;
}

export function PresenceIndicator({ pageId, maxVisible = 3 }: PresenceIndicatorProps) {
  const { viewers } = usePagePresence(pageId);

  if (viewers.length === 0) return null;

  const visibleViewers = viewers.slice(0, maxVisible);
  const remainingCount = viewers.length - maxVisible;

  return (
    <div className="flex items-center -space-x-2">
      {visibleViewers.map((viewer, index) => (
        <Tooltip key={viewer.id}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative rounded-full ring-2 ring-background",
                viewer.is_editing && "ring-primary"
              )}
              style={{ zIndex: maxVisible - index }}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={viewer.user_avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {viewer.user_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              {viewer.is_editing && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-sm">
              {viewer.user_name}
              {viewer.is_editing && <span className="text-muted-foreground ml-1">(editing)</span>}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
      
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative rounded-full ring-2 ring-background bg-muted flex items-center justify-center h-7 w-7">
              <span className="text-xs font-medium">+{remainingCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-sm">
              {viewers.slice(maxVisible).map((v) => v.user_name).join(", ")}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
