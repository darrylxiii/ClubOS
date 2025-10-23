import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart3 } from "lucide-react";
import { formatLastActivity } from "@/lib/jobUtils";

interface JobCardLastActivityProps {
  lastActivity: string | null;
  lastActivityUser: {
    name: string;
    avatar: string | null;
  } | null;
}

export const JobCardLastActivity = memo(({
  lastActivity,
  lastActivityUser
}: JobCardLastActivityProps) => {
  return (
    <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-foreground" />
        <span className="text-xs text-muted-foreground">Last Activity</span>
      </div>
      {lastActivityUser ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border border-border/20">
            <AvatarImage 
              src={lastActivityUser.avatar || undefined} 
              alt={lastActivityUser.name}
            />
            <AvatarFallback className="bg-card/40 text-foreground text-xs">
              {lastActivityUser.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {lastActivityUser.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatLastActivity(lastActivity)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm font-bold text-foreground">
          {formatLastActivity(lastActivity)}
        </p>
      )}
    </div>
  );
});

JobCardLastActivity.displayName = 'JobCardLastActivity';
