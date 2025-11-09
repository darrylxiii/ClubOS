import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Users, TrendingUp } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export function BookingQuickStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
    totalHours: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      const weekStart = startOfWeek(new Date()).toISOString();
      const weekEnd = endOfWeek(new Date()).toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      // Today's bookings
      const { count: todayCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .eq("status", "confirmed")
        .gte("scheduled_start", todayStart)
        .lte("scheduled_start", todayEnd);

      // This week's bookings
      const { count: weekCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .eq("status", "confirmed")
        .gte("scheduled_start", weekStart)
        .lte("scheduled_start", weekEnd);

      // This month's bookings
      const { data: monthBookings } = await supabase
        .from("bookings")
        .select("scheduled_start, scheduled_end")
        .eq("user_id", user?.id)
        .eq("status", "confirmed")
        .gte("scheduled_start", monthStart)
        .lte("scheduled_start", monthEnd);

      // Calculate total hours
      const totalMinutes = monthBookings?.reduce((acc, booking) => {
        const start = new Date(booking.scheduled_start);
        const end = new Date(booking.scheduled_end);
        const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
        return acc + minutes;
      }, 0) || 0;

      setStats({
        todayCount: todayCount || 0,
        weekCount: weekCount || 0,
        monthCount: monthBookings?.length || 0,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Today",
      value: stats.todayCount,
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      label: "This Week",
      value: stats.weekCount,
      icon: Clock,
      color: "text-green-500",
    },
    {
      label: "This Month",
      value: stats.monthCount,
      icon: Users,
      color: "text-purple-500",
    },
    {
      label: "Total Hours",
      value: `${stats.totalHours}h`,
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
