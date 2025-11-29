import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  rarity: string;
  category: string;
  points: number;
  unlock_criteria?: any;
  unlocked_at?: string | null;
  animation_effect?: string;
  is_unlocked?: boolean;
  progress?: any;
}

interface Progress {
  progress_value: number;
  target_value: number;
  last_updated: string;
}

interface AchievementProgressCardProps {
  achievement: Achievement;
  progress?: Progress;
  onActionClick?: () => void;
}

export const AchievementProgressCard = ({
  achievement,
  progress,
  onActionClick,
}: AchievementProgressCardProps) => {
  const progressPercentage = progress
    ? Math.min((progress.progress_value / progress.target_value) * 100, 100)
    : 0;

  const remainingActions = progress
    ? Math.max(progress.target_value - progress.progress_value, 0)
    : achievement.unlock_criteria.count || 1;

  const rarityColors: Record<string, string> = {
    common: 'border-gray-500/30 bg-gray-500/5',
    rare: 'border-blue-500/30 bg-blue-500/5',
    epic: 'border-purple-500/30 bg-purple-500/5',
    legendary: 'border-orange-500/30 bg-orange-500/5',
    quantum: 'border-primary/30 bg-primary/5',
  };

  const getActionText = () => {
    const criteria = achievement.unlock_criteria;
    const typeMap: Record<string, string> = {
      applications: 'Apply to jobs',
      courses: 'Complete courses',
      referrals: 'Refer friends',
      posts: 'Create posts',
      messages_sent: 'Send messages',
      jobs_saved: 'Save jobs',
      profile_completion: 'Complete profile',
    };
    return typeMap[criteria.type] || 'Take action';
  };

  const estimateTimeToUnlock = () => {
    if (!progress || progressPercentage >= 100) return null;
    
    // Simple estimation based on last update
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(progress.last_updated).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceUpdate === 0 || progress.progress_value === 0) {
      return 'Start now to unlock!';
    }

    const ratePerDay = progress.progress_value / daysSinceUpdate;
    const daysToComplete = Math.ceil(remainingActions / ratePerDay);

    if (daysToComplete < 1) return 'Less than a day';
    if (daysToComplete === 1) return '~1 day';
    if (daysToComplete < 7) return `~${daysToComplete} days`;
    if (daysToComplete < 30) return `~${Math.ceil(daysToComplete / 7)} weeks`;
    return `~${Math.ceil(daysToComplete / 30)} months`;
  };

  return (
    <Card
      className={`
        relative overflow-hidden border-2 transition-all duration-300 hover:scale-105
        ${rarityColors[achievement.rarity]}
      `}
    >
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted/30">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="p-6 pt-8 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="text-6xl grayscale opacity-60">{achievement.icon_emoji}</div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-lg leading-tight">{achievement.name}</h4>
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {achievement.description}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {achievement.rarity}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {achievement.points} XP
              </Badge>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">
              {progress?.progress_value || 0} / {progress?.target_value || 1}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Remaining */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{remainingActions} more to unlock</span>
          </div>
          {estimateTimeToUnlock() && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{estimateTimeToUnlock()}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {onActionClick && (
          <Button
            onClick={onActionClick}
            variant="outline"
            className="w-full gap-2 group"
          >
            <span>{getActionText()}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        )}

        {/* Last Progress Update */}
        {progress && (
          <p className="text-xs text-muted-foreground text-center">
            Last progress: {formatDistanceToNow(new Date(progress.last_updated), { addSuffix: true })}
          </p>
        )}
      </div>
    </Card>
  );
};
