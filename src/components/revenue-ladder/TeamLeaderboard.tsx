import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamRevenue, TeamMemberRevenue } from '@/hooks/useTeamRevenue';

interface TeamLeaderboardProps {
  className?: string;
  year?: number;
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

const currentYear = new Date().getFullYear();
const yearOptions = [
  { value: 'all', label: 'All Time' },
  { value: String(currentYear), label: String(currentYear) },
  { value: String(currentYear - 1), label: String(currentYear - 1) },
  { value: String(currentYear - 2), label: String(currentYear - 2) },
];

export function TeamLeaderboard({ className, year }: TeamLeaderboardProps) {
  const [selectedYear, setSelectedYear] = useState<string>(
    year ? String(year) : String(currentYear - 1) // Default to last year since current year may have less data
  );
  
  const yearParam = selectedYear === 'all' ? 'all' : Number(selectedYear);
  const { data: members = [], isLoading } = useTeamRevenue(yearParam);
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

  if (isLoading) {
    return (
      <Card variant="elevated" className={cn('p-6 space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card variant="elevated" className={cn('p-6 text-center', className)}>
        <div className="space-y-3 py-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-heading-sm font-medium">No revenue data yet</p>
          <p className="text-body-sm text-muted-foreground">
            Team contributions will appear here once placements are recorded.
          </p>
        </div>
      </Card>
    );
  }

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
            Revenue contribution {selectedYear === 'all' ? 'all time' : selectedYear}
          </p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px] h-8">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          Based on sourced/closed placements • 50/50 split attribution
        </p>
      </div>
    </Card>
  );
}
