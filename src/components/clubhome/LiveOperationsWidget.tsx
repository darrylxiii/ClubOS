import { Radio, Circle, Clock, User } from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import { useLiveOperations, OnlineMember, ActiveAvatarSession } from "@/hooks/useLiveOperations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDuration(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

const statusDotColor: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-400",
};

const healthDotColor: Record<string, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-400",
  overdue: "bg-red-500",
};

const riskDotColor: Record<string, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-400",
  high: "bg-red-500",
};

// --- Sub-components ---

function MemberAvatar({ member }: { member: OnlineMember }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Avatar
              className={cn(
                "h-8 w-8 border-2 border-background transition-shadow",
                member.recentlyActive && "ring-2 ring-primary/40 animate-pulse"
              )}
            >
              <AvatarImage src={member.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                statusDotColor[member.status]
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">{member.full_name}</p>
          <p className="text-muted-foreground">
            {member.status === "online"
              ? member.recentlyActive
                ? "Active now"
                : `Active ${member.lastSeenMinutes}m ago`
              : `Away · ${member.lastSeenMinutes}m ago`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SessionRow({ session }: { session: ActiveAvatarSession }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* Account avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={session.accountAvatarUrl ?? undefined} />
        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
          {getInitials(session.accountLabel)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{session.accountLabel}</span>
          {/* Risk dot */}
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              riskDotColor[session.riskLevel ?? "low"]
            )}
          />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="h-2.5 w-2.5" />
          <span className="truncate">{session.operatorName}</span>
          {session.jobTitle && (
            <>
              <span className="mx-0.5">·</span>
              <span className="truncate">
                {session.companyName ? `${session.companyName} — ` : ""}
                {session.jobTitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Duration + health */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            healthDotColor[session.healthStatus]
          )}
        />
        <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          <span>{formatDuration(session.startedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// --- Main Widget ---

export function LiveOperationsWidget() {
  const { onlineMembers, offlineCount, activeSessions, isLoading } = useLiveOperations();

  const onlineCount = useMemo(
    () => onlineMembers.length + activeSessions.length,
    [onlineMembers, activeSessions]
  );

  const headerBadge = (
    <Badge variant="outline" className="text-[10px] gap-1 font-normal">
      <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
      {onlineCount} active
    </Badge>
  );

  const isEmpty = onlineMembers.length === 0 && activeSessions.length === 0;

  return (
    <DashboardWidget
      title="Live Operations"
      icon={Radio}
      iconClassName="text-primary"
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="No team members online and no active sessions"
      headerAction={!isLoading && !isEmpty ? headerBadge : undefined}
    >
      <div className="space-y-3">
        {/* Section 1: Team Online — always visible */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Team Online
          </p>
          {onlineMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2 items-center">
              {onlineMembers.map((m) => (
                <MemberAvatar key={m.id} member={m} />
              ))}
              {offlineCount > 0 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  +{offlineCount} offline
                </span>
              )}
            </div>
          ) : (
            !isLoading && (
              <p className="text-[10px] text-muted-foreground">No team members online</p>
            )
          )}
        </div>

        {/* Divider when both sections have content */}
        {onlineMembers.length > 0 && activeSessions.length > 0 && (
          <Separator className="opacity-50" />
        )}

        {/* Section 2: Accounts Active */}
        {activeSessions.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Accounts Active
            </p>
            <div className="divide-y divide-border/50">
              {activeSessions.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
