import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string;
  revenue: number;
  deals: number;
  rank: number;
  previousRank?: number;
  isCurrentUser?: boolean;
}

interface TeamLeaderboardProps {
  members: TeamMember[];
  className?: string;
}

const rankConfig = {
  1: {
    icon: Trophy,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  2: {
    icon: Medal,
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/30',
  },
  3: {
    icon: Award,
    color: 'text-amber-700',
    bg: 'bg-amber-700/10',
    border: 'border-amber-700/30',
  },
};

// Mock data for demonstration
const mockMembers: TeamMember[] = [
  { id: '1', name: 'Alex van der Berg', revenue: 245000, deals: 12, rank: 1, previousRank: 2 },
  { id: '2', name: 'Maria Santos', revenue: 198000, deals: 9, rank: 2, previousRank: 1 },
  { id: '3', name: 'Jan de Vries', revenue: 167000, deals: 11, rank: 3, previousRank: 4 },
  { id: '4', name: 'Sophie Mueller', revenue: 145000, deals: 8, rank: 4, previousRank: 3, isCurrentUser: true },
  { id: '5', name: 'Thomas Johnson', revenue: 132000, deals: 7, rank: 5, previousRank: 6 },
  { id: '6', name: 'Emma Brown', revenue: 98000, deals: 5, rank: 6, previousRank: 5 },
];

export function TeamLeaderboard({ members = mockMembers, className }: TeamLeaderboardProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    }
    return `€${amount}`;
  };

  const getRankChange = (current: number, previous?: number) => {
    if (!previous) return null;
    const change = previous - current;
    if (change === 0) return null;
    return change;
  };

  return (
    <Card variant="elevated" className={cn('p-6 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-heading-sm font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-premium" />
            Team Leaderboard
          </h3>
          <p className="text-label-sm text-muted-foreground">
            Revenue contribution this period
          </p>
        </div>
        <Badge variant="outline">This Month</Badge>
      </div>

      {/* Leaderboard */}
      <ScrollArea className="h-[320px] pr-4">
        <div className="space-y-2">
          {members.map((member, index) => {
            const config = rankConfig[member.rank as keyof typeof rankConfig];
            const RankIcon = config?.icon;
            const rankChange = getRankChange(member.rank, member.previousRank);

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl transition-all',
                  member.isCurrentUser
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-muted/50'
                )}
              >
                {/* Rank */}
                <div className="w-10 flex items-center justify-center">
                  {config ? (
                    <div className={cn('p-2 rounded-lg', config.bg)}>
                      <RankIcon className={cn('h-5 w-5', config.color)} />
                    </div>
                  ) : (
                    <span className="text-heading-sm font-bold text-muted-foreground">
                      {member.rank}
                    </span>
                  )}
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback>
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-label-md font-medium truncate flex items-center gap-2">
                      {member.name}
                      {member.isCurrentUser && (
                        <Badge variant="secondary" className="text-label-xs">
                          You
                        </Badge>
                      )}
                    </p>
                    <p className="text-label-sm text-muted-foreground">
                      {member.deals} deals closed
                    </p>
                  </div>
                </div>

                {/* Revenue & Trend */}
                <div className="text-right space-y-1">
                  <p className="text-heading-sm font-bold">
                    {formatCurrency(member.revenue)}
                  </p>
                  {rankChange !== null && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'inline-flex items-center gap-1 text-label-xs font-medium',
                        rankChange > 0 ? 'text-success' : 'text-destructive'
                      )}
                    >
                      <TrendingUp
                        className={cn(
                          'h-3 w-3',
                          rankChange < 0 && 'rotate-180'
                        )}
                      />
                      {Math.abs(rankChange)} {rankChange > 0 ? 'up' : 'down'}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="pt-4 border-t border-border/50 text-center">
        <p className="text-label-sm text-muted-foreground">
          Updated daily based on closed deals
        </p>
      </div>
    </Card>
  );
}
