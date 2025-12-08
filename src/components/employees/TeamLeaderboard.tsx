import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamLeaderboard, Period } from "@/hooks/useTeamAnalytics";
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Medal,
  TrendingUp,
  Users,
  DollarSign
} from "lucide-react";

export function TeamLeaderboard() {
  const [period, setPeriod] = useState<Period>('monthly');
  const { data: leaderboard, isLoading } = useTeamLeaderboard(period);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-amber-500/20 border-amber-500/50 text-amber-500';
      case 2: return 'bg-gray-400/20 border-gray-400/50 text-gray-400';
      case 3: return 'bg-orange-600/20 border-orange-600/50 text-orange-600';
      default: return 'bg-muted/50 border-border/50 text-muted-foreground';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="text-sm font-bold">{rank}</span>;
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Team Leaderboard
          </CardTitle>
          <div className="flex gap-1">
            {(['weekly', 'monthly', 'quarterly', 'annual'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  period === p 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !leaderboard?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No data for this period</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-4 p-3 rounded-lg border ${getRankStyle(index + 1)}`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
                  {getRankIcon(index + 1)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>
                    {member.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {member.candidates_sourced} sourced
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {member.placements} placed
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {member.revenue.toLocaleString()}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {member.placements} hires
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
