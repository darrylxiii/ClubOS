import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Calendar, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useStrategistAssignment } from "@/hooks/usePartnerAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

interface PartnerStrategistStripProps {
  companyId: string;
}

export function PartnerStrategistStrip({ companyId }: PartnerStrategistStripProps) {
  const { data: assignment, isLoading } = useStrategistAssignment(companyId);
  const assignmentData = assignment as any;
  const strategist = assignmentData?.strategist;

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/50">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  if (!strategist) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50">
        <div className="p-2 rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Your Talent Strategist</p>
          <p className="text-xs text-muted-foreground">
            A strategist will be assigned to your account shortly
          </p>
        </div>
      </div>
    );
  }

  const initials = (strategist.full_name || 'TS')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <Avatar className="h-10 w-10 border-2 border-primary/20">
        <AvatarImage src={strategist.avatar_url} alt={strategist.full_name} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{strategist.full_name}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
            Strategist
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Your dedicated talent partner at The Quantum Club
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" asChild>
          <Link to="/messages">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Message
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild className="hidden sm:inline-flex">
          <Link to="/meetings">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Schedule
          </Link>
        </Button>
      </div>
    </div>
  );
}
