import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, TrendingUp, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface DossierView {
  id: string;
  viewed_at: string;
  viewer: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  candidate: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    title: string | null;
  } | null;
}

interface TopViewed {
  candidate_id: string;
  candidate_name: string;
  candidate_avatar: string | null;
  view_count: number;
}

export function DossierActivityWidget({ companyId }: { companyId: string }) {
  const { data: recentViews, isLoading } = useQuery({
    queryKey: ['dossier-activity', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossier_views' as any)
        .select(`
          id,
          viewed_at,
          viewer:profiles!dossier_views_viewer_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          candidate:candidate_profiles!dossier_views_candidate_id_fkey(
            id,
            full_name,
            avatar_url,
            title
          )
        `)
        .eq('company_id', companyId)
        .order('viewed_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as unknown as DossierView[];
    },
    enabled: !!companyId,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  const { data: weekStats } = useQuery({
    queryKey: ['dossier-week-stats', companyId],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('dossier_views' as any)
        .select('candidate_id')
        .eq('company_id', companyId)
        .gte('viewed_at', weekAgo.toISOString());

      if (error) throw error;
      
      const views = data || [];
      const uniqueCandidates = new Set(views.map((v: any) => v.candidate_id));
      
      // Count views per candidate
      const candidateCounts: Record<string, number> = {};
      views.forEach((v: any) => {
        candidateCounts[v.candidate_id] = (candidateCounts[v.candidate_id] || 0) + 1;
      });

      return {
        totalViews: views.length,
        uniqueCandidates: uniqueCandidates.size,
        topCandidates: Object.entries(candidateCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([id, count]) => ({ id, count }))
      };
    },
    enabled: !!companyId
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-primary" />
            Profile Views
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActivity = recentViews && recentViews.length > 0;

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            Profile Views
          </div>
          {weekStats && weekStats.totalViews > 0 && (
            <Badge variant="secondary" className="text-xs">
              {weekStats.totalViews} this week
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week Summary */}
        {weekStats && weekStats.totalViews > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-3 rounded-lg border border-primary/20 bg-primary/5"
          >
            <div className="p-2 rounded-full bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">
                Your team viewed <span className="text-primary">{weekStats.totalViews}</span> candidate profiles
              </p>
              <p className="text-xs text-muted-foreground">
                {weekStats.uniqueCandidates} unique candidates reviewed this week
              </p>
            </div>
          </motion.div>
        )}

        {!hasActivity ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-muted/30"
          >
            <div className="p-2 rounded-full bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No Recent Activity</p>
              <p className="text-sm text-muted-foreground">
                Browse candidates to see their profiles here
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Views</p>
              {recentViews.slice(0, 3).map((view, index) => (
                <motion.div
                  key={view.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={view.candidate?.avatar_url || ''} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {view.candidate?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {view.candidate?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Viewed by {view.viewer?.full_name?.split(' ')[0] || 'team member'} • {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button 
              variant="ghost" 
              className="w-full justify-between text-sm hover:bg-primary/5"
              asChild
            >
              <Link to="/candidates">
                Browse All Candidates
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
