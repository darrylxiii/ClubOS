import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  Briefcase, 
  Star,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface FreelancerDashboardProps {
  userId: string;
}

export function FreelancerDashboard({ userId }: FreelancerDashboardProps) {
  // Fetch proposals stats
  const { data: proposalsStats } = useQuery({
    queryKey: ['freelancer-proposals', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_proposals')
        .select('status')
        .eq('freelancer_id', userId);
      
      if (error) throw error;
      
      const active = data?.filter((p: any) => p.status === 'pending' || p.status === 'under_review').length || 0;
      const accepted = data?.filter((p: any) => p.status === 'accepted').length || 0;
      const rejected = data?.filter((p: any) => p.status === 'rejected').length || 0;
      const total = data?.length || 0;
      const winRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
      
      return { active, accepted, rejected, total, winRate };
    }
  });

  // Fetch contracts stats
  const { data: contractsStats } = useQuery({
    queryKey: ['freelancer-contracts', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_contracts')
        .select('status, total_amount')
        .eq('freelancer_id', userId);
      
      if (error) throw error;
      
      const active = data?.filter((c: any) => c.status === 'active').length || 0;
      const completed = data?.filter((c: any) => c.status === 'completed').length || 0;
      const totalEarnings = data
        ?.filter((c: any) => c.status === 'completed')
        ?.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0) || 0;
      
      return { active, completed, totalEarnings };
    }
  });

  // Fetch reviews/ratings
  const { data: ratingsStats } = useQuery({
    queryKey: ['freelancer-ratings', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_reviews')
        .select('overall_rating')
        .eq('reviewee_id', userId)
        .eq('review_type', 'client_to_freelancer');
      
      if (error) throw error;
      
      const ratings = data?.map((r: any) => r.overall_rating) || [];
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length 
        : 0;
      
      return { avgRating: avgRating.toFixed(1), totalReviews: ratings.length };
    }
  });

  const stats = [
    {
      label: "Active Proposals",
      value: proposalsStats?.active || 0,
      icon: Briefcase,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Projects Completed",
      value: contractsStats?.completed || 0,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Average Rating",
      value: ratingsStats?.avgRating || "N/A",
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      label: "Total Earnings",
      value: `€${(contractsStats?.totalEarnings || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-600/10"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Proposal Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <span className="text-sm font-medium">{proposalsStats?.winRate || 0}%</span>
              </div>
              <Progress value={proposalsStats?.winRate || 0} />
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{proposalsStats?.active || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{proposalsStats?.accepted || 0}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{proposalsStats?.rejected || 0}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Active Projects</h3>
          {contractsStats?.active === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No active projects</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse projects to submit your first proposal
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Contracts</span>
                <Badge variant="default">{contractsStats?.active}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Reviews</span>
                <span className="text-sm font-medium">{ratingsStats?.totalReviews || 0}</span>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-bold">{ratingsStats?.avgRating || "—"}</span>
                <span className="text-sm text-muted-foreground">/ 5.0</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
