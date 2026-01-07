import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { LEVEL_ICONS } from '@/hooks/useEmployeeGamification';

interface RecruiterLevelCardProps {
  currentLevel: string;
  totalXp: number;
  levelProgress: number;
  xpToNextLevel: number;
  currentStreak: number;
  isLoading?: boolean;
}

export function RecruiterLevelCard({
  currentLevel,
  totalXp,
  levelProgress,
  xpToNextLevel,
  currentStreak,
  isLoading,
}: RecruiterLevelCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded-full w-12 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const levelIcon = LEVEL_ICONS[currentLevel] || '🔍';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Trophy className="h-4 w-4" />
          Your Level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-5xl mb-2"
          >
            {levelIcon}
          </motion.div>
          <h3 className="text-2xl font-bold">{currentLevel}</h3>
          <p className="text-sm text-muted-foreground">{totalXp.toLocaleString()} XP</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress to next level</span>
            <span>{xpToNextLevel.toLocaleString()} XP to go</span>
          </div>
          <Progress value={levelProgress} className="h-2" />
        </div>

        {currentStreak > 0 && (
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">{currentStreak} day streak</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
