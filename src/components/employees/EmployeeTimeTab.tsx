import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";

interface EmployeeTimeTabProps {
  userId: string;
}

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  description: string | null;
  is_billable: boolean | null;
  is_running: boolean | null;
}

interface WeeklyStats {
  totalHours: number;
  billableHours: number;
  entriesCount: number;
}

export function EmployeeTimeTab({ userId }: EmployeeTimeTabProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  
  const currentWeekStart = startOfWeek(subWeeks(new Date(), -weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ['employee-time-entries', userId, weekOffset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, start_time, end_time, duration_seconds, description, is_billable, is_running')
        .eq('user_id', userId)
        .gte('start_time', currentWeekStart.toISOString())
        .lte('start_time', currentWeekEnd.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!userId,
  });

  const { data: monthStats } = useQuery({
    queryKey: ['employee-month-stats', userId],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('time_entries')
        .select('duration_seconds, is_billable')
        .eq('user_id', userId)
        .gte('start_time', monthStart.toISOString());

      if (error) throw error;

      const entries = data || [];
      return {
        totalHours: entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 3600,
        billableHours: entries.filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 3600,
        entriesCount: entries.length,
      };
    },
    enabled: !!userId,
  });

  const weeklyStats: WeeklyStats = {
    totalHours: (timeEntries || []).reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 3600,
    billableHours: (timeEntries || []).filter(e => e.is_billable).reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 3600,
    entriesCount: timeEntries?.length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-20 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{monthStats?.totalHours.toFixed(1) || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billable Hours</p>
                <p className="text-2xl font-bold">{monthStats?.billableHours.toFixed(1) || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Entries</p>
                <p className="text-2xl font-bold">{monthStats?.entriesCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Time Entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Time Entries</CardTitle>
              <CardDescription>
                {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setWeekOffset(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setWeekOffset(0)}
                disabled={weekOffset === 0}
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setWeekOffset(prev => prev + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">
              Total: <span className="font-medium text-foreground">{weeklyStats.totalHours.toFixed(1)}h</span>
            </span>
            <span className="text-muted-foreground">
              Billable: <span className="font-medium text-green-500">{weeklyStats.billableHours.toFixed(1)}h</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {!timeEntries || timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No time entries for this week.
            </p>
          ) : (
            <div className="space-y-3">
              {timeEntries.map(entry => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {entry.description || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.start_time), 'EEE, MMM d • h:mm a')}
                      {entry.end_time && ` - ${format(new Date(entry.end_time), 'h:mm a')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.is_billable && (
                      <Badge variant="secondary" className="text-xs">Billable</Badge>
                    )}
                    {entry.is_running && (
                      <Badge variant="default" className="text-xs animate-pulse">Running</Badge>
                    )}
                    <span className="font-mono text-sm font-medium">
                      {entry.duration_seconds 
                        ? `${(entry.duration_seconds / 3600).toFixed(1)}h` 
                        : '--'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
