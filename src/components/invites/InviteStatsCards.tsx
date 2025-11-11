import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface InviteStats {
  totalSent: number;
  pending: number;
  accepted: number;
  conversionRate: number;
}

export function InviteStatsCards() {
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch invitation statistics
      const { data: invitations, error } = await supabase
        .from('candidate_invitations')
        .select('status, created_at')
        .eq('invited_by', user.id);

      if (error) throw error;

      const totalSent = invitations?.length || 0;
      const accepted = invitations?.filter(inv => inv.status === 'accepted').length || 0;
      const pending = invitations?.filter(inv => inv.status === 'pending').length || 0;
      const conversionRate = totalSent > 0 ? (accepted / totalSent) * 100 : 0;

      setStats({
        totalSent,
        pending,
        accepted,
        conversionRate,
      });
    } catch (error) {
      console.error('Error loading invite stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Invites Sent",
      value: stats?.totalSent || 0,
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-600/10",
    },
    {
      title: "Pending",
      value: stats?.pending || 0,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
    },
    {
      title: "Accepted",
      value: stats?.accepted || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-600/10",
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50 hover:border-border transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
