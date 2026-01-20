import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Play, DollarSign, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { T } from "@/components/T";

interface TimeStats {
  hoursThisWeek: number;
  earnings: number;
  hasActiveTimer: boolean;
}

interface TimeTrackingWidgetProps {
  role: 'candidate' | 'partner' | 'admin';
  companyId?: string;
}

export const TimeTrackingWidget = ({ role, companyId }: TimeTrackingWidgetProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TimeStats>({ hoursThisWeek: 0, earnings: 0, hasActiveTimer: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTimeStats();
    }
  }, [user, companyId]);

  const fetchTimeStats = async () => {
    if (!user) return;

    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      let query = supabase
        .from('time_entries')
        .select('duration_seconds, hourly_rate, is_running')
        .gte('start_time', startOfWeek.toISOString());

      if (role === 'candidate') {
        query = query.eq('user_id', user.id);
      } else if (role === 'partner' && companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data } = await query;

      if (data) {
        const totalSeconds = data.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0);
        const totalEarnings = data.reduce((acc, entry) => {
          const hours = (entry.duration_seconds || 0) / 3600;
          return acc + (hours * (entry.hourly_rate || 0));
        }, 0);
        const hasActiveTimer = data.some(entry => entry.is_running);

        setStats({
          hoursThisWeek: Math.round(totalSeconds / 3600 * 10) / 10,
          earnings: Math.round(totalEarnings),
          hasActiveTimer
        });
      }
    } catch (error) {
      console.error('Error fetching time stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          {role === 'candidate' ? (
            <T k="common:dashboard.timeTracking.myTime" fallback="My Time Tracking" />
          ) : (
            <T k="common:dashboard.timeTracking.teamTime" fallback="Team Time Tracking" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{stats.hoursThisWeek}h</div>
            <div className="text-xs text-muted-foreground">
              <T k="common:dashboard.timeTracking.thisWeek" fallback="This Week" />
            </div>
          </div>
          {role === 'candidate' ? (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-green-500">€{stats.earnings}</div>
              <div className="text-xs text-muted-foreground">
                <T k="common:dashboard.timeTracking.earnings" fallback="Earnings" />
              </div>
            </div>
          ) : (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground">
                <T k="common:dashboard.timeTracking.teamHours" fallback="Team Hours" />
              </div>
            </div>
          )}
        </div>

        {stats.hasActiveTimer && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-600 dark:text-green-400">
              <T k="common:dashboard.timeTracking.timerRunning" fallback="Timer running" />
            </span>
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/time-tracking">
            <Play className="h-4 w-4 mr-2" />
            {stats.hasActiveTimer ? (
              <T k="common:dashboard.timeTracking.viewTimer" fallback="View Timer" />
            ) : (
              <T k="common:dashboard.timeTracking.startTracking" fallback="Start Tracking" />
            )}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
