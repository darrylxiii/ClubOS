import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, TrendingUp, Trophy, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface RecruiterStats {
  id: string;
  full_name: string;
  avatar_url: string | null;
  placements_count: number;
  sourced_count: number;
}

export const RecruiterTeamWidget = () => {
  const { data: teamStats, isLoading } = useQuery({
    queryKey: ['recruiter-team-stats'],
    queryFn: async () => {
      // Get all recruiters/strategists
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');
      
      if (profilesError) throw profilesError;
      
      // Get sourced applications count per recruiter
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('sourced_by, status');
      
      if (appsError) throw appsError;
      
      // Aggregate stats
      const statsMap: Record<string, { sourced: number; placements: number }> = {};
      
      applications?.forEach(app => {
        if (app.sourced_by) {
          if (!statsMap[app.sourced_by]) {
            statsMap[app.sourced_by] = { sourced: 0, placements: 0 };
          }
          statsMap[app.sourced_by].sourced++;
          if (app.status === 'hired') {
            statsMap[app.sourced_by].placements++;
          }
        }
      });
      
      // Build recruiter stats
      const recruiterStats: RecruiterStats[] = (profiles || [])
        .map(p => ({
          id: p.id,
          full_name: p.full_name || 'Unknown',
          avatar_url: p.avatar_url,
          placements_count: statsMap[p.id]?.placements || 0,
          sourced_count: statsMap[p.id]?.sourced || 0,
        }))
        .sort((a, b) => b.placements_count - a.placements_count)
        .slice(0, 5);
      
      // Calculate totals
      const totalSourced = Object.values(statsMap).reduce((sum, s) => sum + s.sourced, 0);
      const totalPlacements = Object.values(statsMap).reduce((sum, s) => sum + s.placements, 0);
      const placementRate = totalSourced > 0 ? Math.round((totalPlacements / totalSourced) * 100) : 0;
      
      return {
        recruiters: recruiterStats,
        totalSourced,
        totalPlacements,
        placementRate,
        teamSize: profiles?.length || 0,
      };
    },
    refetchInterval: 300000,
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Target className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <div className="text-lg font-bold">{teamStats?.totalSourced || 0}</div>
              <div className="text-[10px] text-muted-foreground">Sourced</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Trophy className="h-4 w-4 mx-auto text-amber-500 mb-1" />
              <div className="text-lg font-bold">{teamStats?.totalPlacements || 0}</div>
              <div className="text-[10px] text-muted-foreground">Placements</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <TrendingUp className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
              <div className="text-lg font-bold">{teamStats?.placementRate || 0}%</div>
              <div className="text-[10px] text-muted-foreground">Rate</div>
            </div>
          </div>

          {/* Top Performers */}
          {teamStats?.recruiters && teamStats.recruiters.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Top Performers</div>
              {teamStats.recruiters.slice(0, 3).map((recruiter, index) => (
                <div 
                  key={recruiter.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white">1</span>
                        </div>
                      )}
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={recruiter.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {recruiter.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="text-sm font-medium truncate max-w-[100px]">
                      {recruiter.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {recruiter.sourced_count} sourced
                    </span>
                    <span className="font-bold text-emerald-500">
                      {recruiter.placements_count} placed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No recruiter activity yet
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
