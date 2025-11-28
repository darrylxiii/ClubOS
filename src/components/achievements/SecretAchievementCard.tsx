import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SecretAchievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  hint_text: string;
  rarity: string;
  points: number;
  is_unlocked: boolean;
  unlocked_at?: string;
}

interface SecretAchievementCardProps {
  achievement: SecretAchievement;
}

export const SecretAchievementCard = ({ achievement }: SecretAchievementCardProps) => {
  const rarityColors: Record<string, string> = {
    rare: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    epic: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    legendary: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
    quantum: 'from-primary/20 to-accent/20 border-primary/30',
  };

  if (!achievement.is_unlocked) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Card className="p-6 cursor-pointer hover:border-primary/30 transition-all bg-card/50 backdrop-blur-sm border-dashed">
            <div className="flex items-center justify-center gap-4">
              <div className="p-3 rounded-xl bg-muted/50">
                <EyeOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-lg">??? Secret Achievement</h4>
                <p className="text-sm text-muted-foreground">Locked and hidden</p>
                <Badge variant="outline" className="mt-2">Secret</Badge>
              </div>
            </div>
          </Card>
        </DialogTrigger>

        <DialogContent className="glass sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5" />
              Secret Achievement
            </DialogTitle>
            <DialogDescription>
              This achievement is hidden until unlocked. Here's a hint...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm italic text-center">"{achievement.hint_text}"</p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reward</span>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {achievement.points} XP
              </Badge>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground">
                Keep exploring The Quantum Club to uncover this secret!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Unlocked secret achievement
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card
          className={`
            p-6 cursor-pointer hover:scale-105 transition-all
            bg-gradient-to-br ${rarityColors[achievement.rarity]} border-2
            shadow-lg hover:shadow-xl
          `}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                Secret Unlocked
              </Badge>
              <Badge variant="outline" className="capitalize">
                {achievement.rarity}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-6xl animate-float">{achievement.icon_emoji}</div>
              <div className="flex-1 space-y-1">
                <h4 className="font-bold text-lg">{achievement.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {achievement.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">You discovered this secret!</span>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                +{achievement.points} XP
              </Badge>
            </div>
          </div>
        </Card>
      </DialogTrigger>

      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center">
              <span className="text-6xl animate-float">{achievement.icon_emoji}</span>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">{achievement.name}</DialogTitle>
          <DialogDescription className="text-center">
            {achievement.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm italic text-center">"{achievement.hint_text}"</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rarity</span>
            <Badge variant="outline" className="capitalize">
              {achievement.rarity}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Points Earned</span>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {achievement.points} XP
            </Badge>
          </div>

          {achievement.unlocked_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Unlocked</span>
              <span>{new Date(achievement.unlocked_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
