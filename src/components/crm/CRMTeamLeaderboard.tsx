import { motion } from "framer-motion";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Users, Euro, Target } from "lucide-react";

interface CRMTeamLeaderboardProps {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
}

const RANK_ICONS = [Trophy, Medal, Award];
const RANK_COLORS = ['text-yellow-400', 'text-gray-400', 'text-amber-600'];

export function CRMTeamLeaderboard({ dateRange = 'month' }: CRMTeamLeaderboardProps) {
  const { data, loading } = useCRMAnalytics({ dateRange });

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Team Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const team = data?.ownerPerformance || [];

  if (team.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No team data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by revenue
  const sortedTeam = [...team].sort((a, b) => b.revenue - a.revenue);

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Team Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedTeam.slice(0, 5).map((member, index) => {
          const RankIcon = RANK_ICONS[index] || Award;
          const rankColor = RANK_COLORS[index] || 'text-muted-foreground';

          return (
            <motion.div
              key={member.ownerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted/20'
              }`}
            >
              <div className="flex items-center justify-center w-8">
                <RankIcon className={`h-5 w-5 ${rankColor}`} />
              </div>

              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {member.ownerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{member.ownerName}</h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {member.prospects}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {member.deals} won
                  </span>
                </div>
              </div>

              <div className="text-right">
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  <Euro className="h-3 w-3 mr-1" />
                  {(member.revenue / 1000).toFixed(0)}k
                </Badge>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
