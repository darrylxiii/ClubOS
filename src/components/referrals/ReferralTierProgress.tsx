import { motion } from "framer-motion";
import { Medal, Award, Trophy, Crown, Gem, ChevronRight, Check, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserReferralTier, useAllReferralTiers } from "@/hooks/useReferralLeaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const tierIcons: Record<string, any> = {
  medal: Medal,
  award: Award,
  trophy: Trophy,
  crown: Crown,
  gem: Gem,
};

const TierBadge = ({ 
  tierName, 
  badgeIcon, 
  badgeColor, 
  isActive,
  isUnlocked,
  size = "default"
}: { 
  tierName: string; 
  badgeIcon: string; 
  badgeColor: string;
  isActive: boolean;
  isUnlocked: boolean;
  size?: "default" | "large";
}) => {
  const Icon = tierIcons[badgeIcon] || Award;
  const sizeClasses = size === "large" ? "h-12 w-12" : "h-8 w-8";
  const iconSize = size === "large" ? "h-6 w-6" : "h-4 w-4";
  
  return (
    <div className={cn(
      "relative rounded-full flex items-center justify-center transition-all",
      sizeClasses,
      isActive 
        ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
        : isUnlocked 
          ? "opacity-100" 
          : "opacity-40 grayscale"
    )} style={{ backgroundColor: badgeColor }}>
      <Icon className={cn(iconSize, "text-white")} />
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export function ReferralTierProgress() {
  const { user } = useAuth();
  const { data: currentTier, isLoading: tierLoading } = useUserReferralTier(user?.id);
  const { data: allTiers, isLoading: tiersLoading } = useAllReferralTiers();

  if (tierLoading || tiersLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentTierLevel = currentTier?.tier_level || 1;
  const perks = Array.isArray(currentTier?.perks) ? currentTier.perks : [];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Award className="h-5 w-5 text-primary" />
          Your Referral Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Tier Display */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30"
        >
          <TierBadge 
            tierName={currentTier?.tier_name || "Bronze"}
            badgeIcon={currentTier?.badge_icon || "medal"}
            badgeColor={currentTier?.badge_color || "#CD7F32"}
            isActive={true}
            isUnlocked={true}
            size="large"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">
                {currentTier?.tier_name || "Bronze"} Member
              </h3>
              <Badge 
                className="text-xs"
                style={{ 
                  backgroundColor: `${currentTier?.badge_color}20`,
                  color: currentTier?.badge_color,
                  borderColor: currentTier?.badge_color
                }}
              >
                {currentTier?.bonus_percentage || 10}% Bonus
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {currentTier?.next_tier_name 
                ? `${currentTier.placements_to_next} more placements to ${currentTier.next_tier_name}`
                : "Maximum tier reached!"}
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        {currentTier?.next_tier_name && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to {currentTier.next_tier_name}</span>
              <span className="font-medium text-foreground">{Math.round(currentTier.progress_percentage || 0)}%</span>
            </div>
            <Progress 
              value={currentTier.progress_percentage || 0} 
              className="h-2"
            />
          </div>
        )}

        {/* Tier Journey */}
        <div className="flex items-center justify-between gap-1 pt-2">
          {allTiers?.map((tier, index) => {
            const isUnlocked = tier.tier_level <= currentTierLevel;
            const isActive = tier.tier_level === currentTierLevel;
            
            return (
              <div key={tier.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <TierBadge 
                    tierName={tier.tier_name}
                    badgeIcon={tier.badge_icon}
                    badgeColor={tier.badge_color}
                    isActive={isActive}
                    isUnlocked={isUnlocked}
                  />
                  <span className={cn(
                    "text-xs",
                    isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}>
                    {tier.tier_name}
                  </span>
                </div>
                {index < (allTiers?.length || 0) - 1 && (
                  <ChevronRight className={cn(
                    "h-4 w-4 mx-1",
                    tier.tier_level < currentTierLevel ? "text-primary" : "text-muted-foreground/30"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Current Perks */}
        <div className="space-y-2 pt-2">
          <h4 className="text-sm font-medium text-foreground">Your Perks</h4>
          <div className="grid gap-2">
            {perks.map((perk, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="h-4 w-4 text-primary" />
                {perk}
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
