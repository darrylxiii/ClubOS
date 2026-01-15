import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralLeaderboard, type LeaderboardPeriod } from "@/hooks/useReferralLeaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const periodLabels: Record<LeaderboardPeriod, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all_time: "All Time",
};

const PodiumPosition = ({ 
  entry, 
  position, 
  isCurrentUser 
}: { 
  entry: any; 
  position: 1 | 2 | 3; 
  isCurrentUser: boolean;
}) => {
  const heights = { 1: "h-32", 2: "h-24", 3: "h-20" };
  const colors = { 
    1: "from-amber-400 to-amber-600", 
    2: "from-slate-300 to-slate-500", 
    3: "from-amber-600 to-amber-800" 
  };
  const icons = { 1: Crown, 2: Medal, 3: Award };
  const Icon = icons[position];
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={cn(
        "flex flex-col items-center",
        position === 1 ? "order-2" : position === 2 ? "order-1" : "order-3"
      )}
    >
      <div className="relative mb-2">
        <Avatar className={cn(
          "border-2",
          position === 1 ? "h-16 w-16 border-amber-400" : "h-12 w-12 border-muted",
          isCurrentUser && "ring-2 ring-primary ring-offset-2"
        )}>
          <AvatarImage src={entry?.avatar_url} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {entry?.display_name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute -bottom-1 -right-1 rounded-full p-1",
          `bg-gradient-to-br ${colors[position]}`
        )}>
          <Icon className="h-3 w-3 text-white" />
        </div>
      </div>
      
      <span className="text-xs font-medium text-foreground truncate max-w-[80px] text-center">
        {entry?.display_name || "—"}
      </span>
      <span className="text-xs text-muted-foreground">
        €{(entry?.total_earned || 0).toLocaleString()}
      </span>
      
      <div className={cn(
        "w-20 mt-2 rounded-t-lg bg-gradient-to-t flex items-end justify-center pb-2",
        heights[position],
        colors[position]
      )}>
        <span className="text-2xl font-bold text-white">{position}</span>
      </div>
    </motion.div>
  );
};

export function ReferralLeaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const { data: leaderboard, isLoading } = useReferralLeaderboard(period);
  const { user } = useAuth();
  
  const currentUserEntry = leaderboard?.find(e => e.user_id === user?.id);
  const top3 = leaderboard?.slice(0, 3) || [];
  const rest = leaderboard?.slice(3, 50) || [];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-amber-500" />
            Referral Leaderboard
          </CardTitle>
        </div>
        
        <Tabs value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)} className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            {Object.entries(periodLabels).map(([key, label]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Podium */}
        {isLoading ? (
          <div className="flex justify-center items-end gap-4 h-48">
            {[2, 1, 3].map((pos) => (
              <div key={pos} className="flex flex-col items-center gap-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className={cn("w-20 rounded-t-lg", pos === 1 ? "h-32" : pos === 2 ? "h-24" : "h-20")} />
              </div>
            ))}
          </div>
        ) : top3.length > 0 ? (
          <div className="flex justify-center items-end gap-4">
            {[2, 1, 3].map((pos) => (
              <PodiumPosition 
                key={pos}
                entry={top3[pos - 1]}
                position={pos as 1 | 2 | 3}
                isCurrentUser={top3[pos - 1]?.user_id === user?.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No referrals yet this {period.replace('_', ' ')}</p>
            <p className="text-sm">Be the first to climb the leaderboard!</p>
          </div>
        )}

        {/* Current User Position */}
        {currentUserEntry && currentUserEntry.rank_position > 3 && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                  #{currentUserEntry.rank_position}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUserEntry.avatar_url || undefined} />
                  <AvatarFallback>{currentUserEntry.display_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">Your Position</p>
                  <p className="text-xs text-muted-foreground">
                    {currentUserEntry.successful_placements} placements • {currentUserEntry.success_rate}% success
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">€{currentUserEntry.total_earned.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{currentUserEntry.total_referred} referrals</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Ranking List */}
        {rest.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <AnimatePresence>
              {rest.map((entry, index) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg transition-colors",
                    entry.user_id === user?.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                      {entry.rank_position}
                    </span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {entry.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.successful_placements} placements
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      €{entry.total_earned.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {entry.success_rate}%
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
