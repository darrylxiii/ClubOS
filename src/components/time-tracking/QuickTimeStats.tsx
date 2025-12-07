import { Card } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp, Users } from "lucide-react";
import { TimeStats } from "@/hooks/useTimeTracking";

interface QuickTimeStatsProps {
  stats: TimeStats;
  showTeamStats?: boolean;
  teamStats?: TimeStats;
}

export function QuickTimeStats({ stats, showTeamStats, teamStats }: QuickTimeStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* This Week */}
      <Card className="p-4 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold text-foreground">
              {stats.thisWeekHours.toFixed(1)}h
            </p>
          </div>
        </div>
      </Card>

      {/* This Month */}
      <Card className="p-4 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-foreground">
              {stats.thisMonthHours.toFixed(1)}h
            </p>
          </div>
        </div>
      </Card>

      {/* Billable Hours */}
      <Card className="p-4 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Billable Hours</p>
            <p className="text-2xl font-bold text-foreground">
              {stats.billableHours.toFixed(1)}h
            </p>
          </div>
        </div>
      </Card>

      {/* All Time */}
      <Card className="p-4 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">All Time</p>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalHours.toFixed(0)}h
            </p>
          </div>
        </div>
      </Card>

      {/* Team Stats (if manager) */}
      {showTeamStats && teamStats && (
        <Card className="p-4 border border-border/50 md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team This Week</p>
              <p className="text-2xl font-bold text-foreground">
                {teamStats.thisWeekHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
