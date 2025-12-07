import { Card } from "@/components/ui/card";
import { Clock, DollarSign, TrendingUp, Calendar, Users, CheckCircle } from "lucide-react";
import { TimeStats } from "@/hooks/useTimeTracking";

interface QuickTimeStatsProps {
  stats: TimeStats;
  showTeamStats?: boolean;
  teamStats?: TimeStats;
}

export function QuickTimeStats({ stats, showTeamStats, teamStats }: QuickTimeStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Personal Stats */}
      <Card className="p-4 border border-border/50 bg-gradient-to-br from-card/90 to-card/60">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">This Week</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.thisWeekHours.toFixed(1)}h
        </div>
      </Card>

      <Card className="p-4 border border-border/50 bg-gradient-to-br from-card/90 to-card/60">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">This Month</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.thisMonthHours.toFixed(1)}h
        </div>
      </Card>

      <Card className="p-4 border border-border/50 bg-gradient-to-br from-card/90 to-card/60">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Total Earnings</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          €{stats.totalEarnings.toLocaleString()}
        </div>
      </Card>

      <Card className="p-4 border border-border/50 bg-gradient-to-br from-card/90 to-card/60">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">All Time</span>
        </div>
        <div className="text-2xl font-bold text-foreground">
          {stats.totalHours.toFixed(1)}h
        </div>
      </Card>

      {/* Team Stats (for managers) */}
      {showTeamStats && teamStats && (
        <>
          <Card className="p-4 border border-border/50 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Team This Week</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {teamStats.thisWeekHours.toFixed(1)}h
            </div>
          </Card>

          <Card className="p-4 border border-border/50 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {teamStats.pendingApprovals}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
