import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface InviteStats {
  totalSent: number;
  pending: number;
  accepted: number;
  conversionRate: number;
}

function deriveStats(invites: Array<{
  is_active: boolean | null;
  uses_count: number | null;
  max_uses: number | null;
  used_at: string | null;
  expires_at: string;
}>): InviteStats {
  const totalSent = invites.length;
  const accepted = invites.filter(i =>
    i.used_at || (i.uses_count && i.max_uses && i.uses_count >= i.max_uses)
  ).length;
  const expired = invites.filter(i =>
    !i.used_at && i.is_active && new Date(i.expires_at) < new Date()
  ).length;
  const revoked = invites.filter(i => !i.is_active && !i.used_at).length;
  const pending = totalSent - accepted - expired - revoked;
  const conversionRate = totalSent > 0 ? (accepted / totalSent) * 100 : 0;

  return { totalSent, pending, accepted, conversionRate };
}

export function InviteStatsCards() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['invite-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invite_codes')
        .select('is_active, uses_count, max_uses, used_at, expires_at')
        .eq('created_by', user.id);

      if (error) throw error;
      return deriveStats(data || []);
    },
    enabled: !!user,
    staleTime: 30000,
  });

  if (isLoading) {
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
      value: `${(stats?.conversionRate ?? 0).toFixed(1)}%`,
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
