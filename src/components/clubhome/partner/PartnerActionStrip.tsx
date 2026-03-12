import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Calendar, MessageSquare, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAggregatedReviewQueue } from "@/hooks/useAggregatedReviewQueue";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isToday, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function PartnerActionStrip() {
  const { totalPending, overdueCount, isLoading: reviewsLoading } = useAggregatedReviewQueue();
  const { user } = useAuth();

  const { data: todayCount = 0, isLoading: interviewsLoading } = useQuery({
    queryKey: ['interviews-today-count', user?.id],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('scheduled_start', startOfDay)
        .lt('scheduled_start', endOfDay);

      return count || 0;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = reviewsLoading || interviewsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50">
        <Skeleton className="h-10 w-full sm:w-48" />
        <Skeleton className="h-10 w-full sm:w-48" />
        <div className="flex-1" />
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
      {/* Pending reviews indicator */}
      {totalPending > 0 ? (
        <Link
          to="/company-applications"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 hover:bg-warning/15 transition-colors group"
        >
          <Users className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">
            {totalPending} review{totalPending !== 1 ? 's' : ''} pending
          </span>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              {overdueCount} overdue
            </Badge>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">No pending reviews</span>
        </div>
      )}

      {/* Today's interviews */}
      {todayCount > 0 && (
        <Link
          to="/meetings"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
        >
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {todayCount} interview{todayCount !== 1 ? 's' : ''} today
          </span>
        </Link>
      )}

      <div className="flex-1" />

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" asChild>
          <Link to="/company-jobs/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New Role
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/messages">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Messages
          </Link>
        </Button>
      </div>
    </div>
  );
}
