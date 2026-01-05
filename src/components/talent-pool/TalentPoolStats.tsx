import { Card, CardContent } from '@/components/ui/card';
import { Users, Flame, ThermometerSun, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TalentPoolStats as Stats } from '@/hooks/useTalentPool';
import { Skeleton } from '@/components/ui/skeleton';

interface TalentPoolStatsProps {
  stats: Stats;
  isLoading?: boolean;
  onStatClick?: (filter: string) => void;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  onClick?: () => void;
  isLoading?: boolean;
}

function StatCard({ title, value, icon, colorClass, onClick, isLoading }: StatCardProps) {
  return (
    <Card
      variant="interactive"
      className={cn(
        'cursor-pointer transition-all duration-200',
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', colorClass)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TalentPoolStats({ stats, isLoading, onStatClick }: TalentPoolStatsProps) {
  const statCards = [
    {
      title: 'Total Pool',
      value: stats.total,
      icon: <Users className="h-5 w-5 text-primary" />,
      colorClass: 'bg-primary/10',
      filter: 'all',
    },
    {
      title: 'Hot',
      value: stats.hot,
      icon: <Flame className="h-5 w-5 text-red-400" />,
      colorClass: 'bg-red-500/10',
      filter: 'hot',
    },
    {
      title: 'Warm',
      value: stats.warm,
      icon: <ThermometerSun className="h-5 w-5 text-orange-400" />,
      colorClass: 'bg-orange-500/10',
      filter: 'warm',
    },
    {
      title: 'Strategic',
      value: stats.strategic,
      icon: <Target className="h-5 w-5 text-purple-400" />,
      colorClass: 'bg-purple-500/10',
      filter: 'strategic',
    },
    {
      title: 'High Move Probability',
      value: stats.highMoveProbability,
      icon: <TrendingUp className="h-5 w-5 text-green-400" />,
      colorClass: 'bg-green-500/10',
      filter: 'high-move',
    },
    {
      title: 'Needs Attention',
      value: stats.needsAttention,
      icon: <AlertCircle className="h-5 w-5 text-yellow-400" />,
      colorClass: 'bg-yellow-500/10',
      filter: 'needs-attention',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {statCards.map((card) => (
        <StatCard
          key={card.filter}
          title={card.title}
          value={card.value}
          icon={card.icon}
          colorClass={card.colorClass}
          onClick={onStatClick ? () => onStatClick(card.filter) : undefined}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
