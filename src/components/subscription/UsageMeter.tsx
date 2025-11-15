import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp } from "lucide-react";
import { useTierLimit } from "@/hooks/useTierLimit";
import { useNavigate } from "react-router-dom";

interface UsageMeterProps {
  limitType: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function UsageMeter({ limitType, title, description, icon }: UsageMeterProps) {
  const navigate = useNavigate();
  const { data: limit, isLoading } = useTierLimit(limitType);

  if (isLoading || !limit) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded" />
            <div className="h-2 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isUnlimited = limit.limit === -1;
  const percentage = isUnlimited ? 0 : (limit.usage / limit.limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = !limit.allowed;

  return (
    <Card className={isAtLimit ? "border-red-500/50" : isNearLimit ? "border-amber-500/50" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant={isUnlimited ? "secondary" : isAtLimit ? "destructive" : "default"}>
            {limit.tier}
          </Badge>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {isUnlimited ? (
          <div className="text-center py-4">
            <p className="text-2xl font-bold mb-1">Unlimited</p>
            <p className="text-sm text-muted-foreground">No usage limits on your current plan</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usage</span>
                <span className="font-medium">
                  {limit.usage} / {limit.limit}
                </span>
              </div>
              <Progress
                value={percentage}
                className={isAtLimit ? "bg-red-500/20" : isNearLimit ? "bg-amber-500/20" : ""}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{percentage.toFixed(0)}% used</span>
                <span>{limit.remaining} remaining</span>
              </div>
            </div>

            {isAtLimit && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                      Limit Reached
                    </p>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80">
                      You've reached your plan limit. Upgrade to continue using this feature.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isNearLimit && !isAtLimit && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                      Approaching Limit
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                      You're using {percentage.toFixed(0)}% of your plan. Consider upgrading.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(isAtLimit || isNearLimit) && (
              <Button
                onClick={() => navigate("/pricing")}
                className="w-full"
                variant={isAtLimit ? "default" : "outline"}
              >
                Upgrade Plan
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
