import { Card } from "@/components/ui/card";
import { Calendar, Clock, CalendarDays, Brain, Timer } from "lucide-react";

interface MeetingStatsBarProps {
  upcomingCount: number;
  todayCount: number;
  weekCount: number;
  analyzedCount: number;
  hoursTranscribed: number;
}

export function MeetingStatsBar({
  upcomingCount,
  todayCount,
  weekCount,
  analyzedCount,
  hoursTranscribed,
}: MeetingStatsBarProps) {
  const stats = [
    { label: 'Upcoming', value: upcomingCount, icon: Calendar, color: 'text-blue-600' },
    { label: 'Today', value: todayCount, icon: Clock, color: 'text-purple-600' },
    { label: 'This Week', value: weekCount, icon: CalendarDays, color: 'text-green-600' },
    { label: 'Analyzed', value: analyzedCount, icon: Brain, color: 'text-amber-600' },
    { label: 'Hours Recorded', value: hoursTranscribed.toFixed(1), icon: Timer, color: 'text-indigo-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
