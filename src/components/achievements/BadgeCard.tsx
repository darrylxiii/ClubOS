import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Sparkles, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  rarity: string;
  category: string;
  unlocked_at: string | null;
  animation_effect: string;
  points: number;
  is_unlocked: boolean;
  progress?: any;
}

interface BadgeCardProps {
  achievement: Achievement;
  isTimeline?: boolean;
}

export const BadgeCard = ({ achievement, isTimeline = false }: BadgeCardProps) => {
  const rarityColors: Record<string, string> = {
    common: "from-gray-500/20 to-gray-600/20 border-gray-500/30",
    rare: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    epic: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
    legendary: "from-orange-500/20 to-red-500/20 border-orange-500/30",
    quantum: "from-primary/20 to-accent/20 border-primary/30",
  };

  const rarityGlow: Record<string, string> = {
    common: "shadow-gray-500/20",
    rare: "shadow-blue-500/30",
    epic: "shadow-purple-500/40",
    legendary: "shadow-orange-500/50",
    quantum: "shadow-primary/60",
  };

  const handleShare = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card
          className={`
            relative overflow-hidden cursor-pointer transition-all duration-300
            ${
              achievement.is_unlocked
                ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} border-2 hover:scale-105 ${rarityGlow[achievement.rarity]}`
                : "bg-muted/30 border-2 border-border/50 opacity-60 hover:opacity-80"
            }
            ${isTimeline ? "w-40 h-48 flex-shrink-0" : ""}
          `}
        >
          {/* Animated background effect for unlocked */}
          {achievement.is_unlocked && (
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/10 to-transparent animate-pulse" />
          )}

          <div className="relative p-4 h-full flex flex-col items-center justify-center gap-3">
            {/* Icon */}
            <div
              className={`text-6xl ${
                achievement.is_unlocked ? "animate-float" : "grayscale"
              }`}
            >
              {achievement.is_unlocked ? achievement.icon_emoji : "🔒"}
            </div>

            {/* Name */}
            <div className="text-center">
              <h4 className="font-semibold text-sm mb-1 line-clamp-2">{achievement.name}</h4>
              <Badge variant="outline" className="text-xs capitalize">
                {achievement.rarity}
              </Badge>
            </div>

            {/* Lock indicator */}
            {!achievement.is_unlocked && (
              <Lock className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
            )}

            {/* Unlocked date */}
            {achievement.unlocked_at && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(achievement.unlocked_at), { addSuffix: true })}</span>
              </div>
            )}
          </div>
        </Card>
      </DialogTrigger>

      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div
              className={`h-24 w-24 rounded-2xl bg-gradient-to-br ${
                rarityColors[achievement.rarity]
              } border-2 flex items-center justify-center quantum-ripple`}
            >
              <span className="text-6xl animate-float">{achievement.icon_emoji}</span>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">{achievement.name}</DialogTitle>
          <DialogDescription className="text-center">
            {achievement.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Category</span>
            <Badge variant="outline" className="capitalize">
              {achievement.category}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rarity</span>
            <Badge variant="outline" className="capitalize">
              {achievement.rarity}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Points</span>
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

          {!achievement.is_unlocked && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground text-center">
                🔒 Complete the challenge to unlock this achievement
              </p>
            </div>
          )}

          {achievement.is_unlocked && (
            <Button onClick={handleShare} className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Share Achievement
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
