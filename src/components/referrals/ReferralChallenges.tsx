import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, Trophy, Users, Target, Gift, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralChallenges } from "@/hooks/useReferralLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatTimeRemaining(timeStr: string | null): string {
  if (!timeStr) return "Ended";
  
  // Parse PostgreSQL interval format
  const match = timeStr.match(/(\d+) days? (\d+):(\d+):(\d+)/);
  if (match) {
    const [, days, hours] = match;
    if (parseInt(days) > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  }
  
  // Simple hours format
  const hoursMatch = timeStr.match(/(\d+):(\d+):(\d+)/);
  if (hoursMatch) {
    const [, hours, minutes] = hoursMatch;
    if (parseInt(hours) > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  }
  
  return "Ending soon";
}

const challengeTypeIcons: Record<string, any> = {
  volume: Zap,
  speed: Clock,
  company_specific: Target,
  category: Gift,
};

const ChallengeCard = ({ challenge }: { challenge: any }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  
  const Icon = challengeTypeIcons[challenge.challenge_type] || Zap;
  const isJoined = challenge.user_rank !== null;
  const timeRemaining = formatTimeRemaining(challenge.time_remaining);
  const isEnding = timeRemaining.includes('h') && !timeRemaining.includes('d');
  
  const handleJoin = async () => {
    if (!user?.id) return;
    
    setIsJoining(true);
    try {
      const { error } = await supabase
        .from('referral_challenge_participants')
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
        });
      
      if (error) throw error;
      
      toast({
        title: "Joined Challenge!",
        description: `You're now competing in "${challenge.title}"`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to join challenge",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className={cn(
        "border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30",
        isEnding && "border-amber-500/50"
      )}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isEnding ? "bg-amber-500/20" : "bg-primary/20"
              )}>
                <Icon className={cn(
                  "h-5 w-5",
                  isEnding ? "text-amber-500" : "text-primary"
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{challenge.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {challenge.description}
                </p>
              </div>
            </div>
            
            <Badge variant={isEnding ? "destructive" : "secondary"} className="shrink-0">
              <Clock className="h-3 w-3 mr-1" />
              {timeRemaining}
            </Badge>
          </div>

          {/* Rewards */}
          <div className="flex items-center gap-4 text-sm">
            {challenge.reward_pool > 0 && (
              <div className="flex items-center gap-1 text-primary">
                <Gift className="h-4 w-4" />
                <span className="font-semibold">€{challenge.reward_pool.toLocaleString()}</span>
                <span className="text-muted-foreground">pool</span>
              </div>
            )}
            {challenge.bonus_percentage > 0 && (
              <div className="flex items-center gap-1 text-amber-500">
                <Zap className="h-4 w-4" />
                <span className="font-semibold">+{challenge.bonus_percentage}%</span>
                <span className="text-muted-foreground">bonus</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground ml-auto">
              <Users className="h-4 w-4" />
              <span>{challenge.participants_count} joined</span>
            </div>
          </div>

          {/* Progress / Join */}
          {isJoined ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your position</span>
                <span className="font-semibold text-foreground">
                  #{challenge.user_rank} of {challenge.participants_count}
                </span>
              </div>
              {challenge.user_progress && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-foreground">
                      {challenge.user_progress.referrals}
                    </p>
                    <p className="text-xs text-muted-foreground">Referrals</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-foreground">
                      {challenge.user_progress.placements}
                    </p>
                    <p className="text-xs text-muted-foreground">Placements</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-primary">
                      €{challenge.user_progress.earnings}
                    </p>
                    <p className="text-xs text-muted-foreground">Earned</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button 
              onClick={handleJoin} 
              disabled={isJoining}
              className="w-full"
            >
              {isJoining ? "Joining..." : "Join Challenge"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export function ReferralChallenges() {
  const { data: challenges, isLoading } = useReferralChallenges();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Active Challenges</h3>
          <p className="text-muted-foreground text-sm">
            Check back soon for new referral challenges and competitions!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Active Challenges</h2>
        <Badge variant="secondary" className="ml-auto">
          {challenges.length} active
        </Badge>
      </div>
      
      <AnimatePresence>
        {challenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </AnimatePresence>
    </div>
  );
}
