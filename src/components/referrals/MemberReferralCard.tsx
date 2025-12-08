import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Euro, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { ReferralPolicy, ReferralEarning } from "@/hooks/useReferralSystem";
import { formatDistanceToNow } from "date-fns";

interface MemberReferralCardProps {
  policy: ReferralPolicy;
  earnings: ReferralEarning[];
}

export function MemberReferralCard({ policy, earnings }: MemberReferralCardProps) {
  const memberEarnings = earnings.filter(e => 
    policy.id === e.policy_id || 
    (policy.referred_member_id && e.candidate?.id === policy.referred_member_id)
  );
  
  const projectedReward = memberEarnings.reduce((sum, e) => sum + (e.weighted_amount || 0), 0);
  const earnedReward = memberEarnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + (e.earned_amount || 0), 0);

  // Get current stage from most recent earning
  const currentEarning = memberEarnings[0];
  const currentStage = currentEarning?.application?.status || 'Invited';

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'hired':
        return 'bg-success/10 text-success border-success/30';
      case 'offer':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'interview':
        return 'bg-info/10 text-info border-info/30';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="glass-card hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarImage src={policy.referred_member?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {policy.referred_member?.full_name?.charAt(0) || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">
                {policy.referred_member?.full_name || 'Invited Member'}
              </h4>
              <Badge variant="outline" className={getStageColor(currentStage)}>
                {currentStage}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Referred {formatDistanceToNow(new Date(policy.claimed_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Reward */}
          <div className="text-right flex-shrink-0">
            {earnedReward > 0 ? (
              <>
                <div className="flex items-center gap-1 justify-end text-success">
                  <Euro className="h-4 w-4" />
                  <span className="text-lg font-bold">{formatCurrency(earnedReward)}</span>
                </div>
                <p className="text-xs text-success">Earned</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 justify-end text-muted-foreground">
                  <Euro className="h-4 w-4" />
                  <span className="text-lg font-bold">{formatCurrency(projectedReward)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Projected</p>
              </>
            )}
          </div>
        </div>

        {/* Note about limited visibility */}
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50 italic">
          Limited details shown for member privacy
        </p>
      </CardContent>
    </Card>
  );
}
