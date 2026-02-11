import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, DollarSign, ArrowRight, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useReferralStats } from "@/hooks/useReferralSystem";
import { Skeleton } from "@/components/ui/skeleton";
import { T } from "@/components/T";
import { motion } from "framer-motion";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const ReferralStatsWidget = () => {
  const { data: stats, isLoading } = useReferralStats();

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasReferrals = (stats?.activePipelines || 0) > 0 || (stats?.yourEarnings || 0) > 0;

  return (
    <Card className="glass-subtle rounded-2xl overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <T k="common:referrals.title" fallback="Your Referrals" />
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          <T k="common:referrals.subtitle" fallback="Earn by referring talent & companies" />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasReferrals ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div 
                className="text-center p-3 rounded-lg bg-muted/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Users className="h-3 w-3" />
                </div>
                <p className="text-lg font-bold">{stats?.activePipelines || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </motion.div>
              <motion.div 
                className="text-center p-3 rounded-lg bg-muted/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                </div>
                <p className="text-lg font-bold text-green-500">{formatCurrency(stats?.projectedEarnings || 0)}</p>
                <p className="text-xs text-muted-foreground">Projected</p>
              </motion.div>
              <motion.div 
                className="text-center p-3 rounded-lg bg-muted/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                </div>
                <p className="text-lg font-bold text-primary">{formatCurrency(stats?.yourEarnings || 0)}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </motion.div>
            </div>

            <Button asChild className="w-full" variant="glass">
              <Link to="/referrals">
                <T k="common:referrals.viewAll" fallback="View All Referrals" />
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <Share2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              <T k="common:referrals.empty" fallback="Start earning by referring friends and companies" />
            </p>
            <Button asChild size="sm">
              <Link to="/referrals">
                <T k="common:referrals.startReferring" fallback="Start Referring" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
