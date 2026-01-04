import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, TrendingDown, ArrowRight, Trophy, Euro } from "lucide-react";
import { Link } from "react-router-dom";
import { useReferralMetrics } from "@/hooks/useReferralMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export const AdminReferralWidget = () => {
  const { data: metrics, isLoading } = useReferralMetrics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="glass-card h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isPositiveTrend = (metrics?.trend || 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-premium" />
              <span>Referral Network</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/referrals">
                Manage
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Referrals</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{metrics?.totalReferrals || 0}</span>
                {metrics && metrics.trend !== 0 && (
                  <div className={`flex items-center text-xs ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositiveTrend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Successful</p>
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-green-500">{metrics?.successfulReferrals || 0}</span>
                <span className="text-xs text-muted-foreground">
                  ({metrics?.conversionRate || 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* Rewards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-premium/10 border border-premium/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Euro className="h-3 w-3" />
                Pending
              </p>
              <p className="font-semibold text-premium">{formatCurrency(metrics?.pendingRewards || 0)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Paid Out</p>
              <p className="font-semibold">{formatCurrency(metrics?.paidOutRewards || 0)}</p>
            </div>
          </div>

          {/* Top Referrers */}
          {metrics?.topReferrers && metrics.topReferrers.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                Top Referrers
              </p>
              <div className="space-y-1">
                {metrics.topReferrers.slice(0, 3).map((referrer, index) => (
                  <div key={referrer.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{referrer.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {referrer.count} referrals
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Referrers Count */}
          <div className="text-xs text-muted-foreground text-center pt-2">
            {metrics?.activeReferrers || 0} active referrers in network
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
