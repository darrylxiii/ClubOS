import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, TrendingUp, DollarSign, Users, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export const ReferralNetworkWidget = () => {
  // Note: candidate_referrals table not yet in schema - showing placeholder
  const stats = {
    totalReferrals: 0,
    projectedEarnings: 0,
    paidOut: 0,
    pendingPayouts: 0,
    successfulReferrals: 0,
    successRate: 0,
  };
  const isLoading = false;

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Referral Network
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-4 w-4 text-primary" />
              Referral Network
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {stats?.successRate || 0}% success
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500 mb-1" />
              <div className="text-lg font-bold">{stats?.totalReferrals || 0}</div>
              <div className="text-[10px] text-muted-foreground">Total Referrals</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-500 mb-1" />
              <div className="text-lg font-bold">{stats?.successfulReferrals || 0}</div>
              <div className="text-[10px] text-muted-foreground">Hired</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10">
              <DollarSign className="h-4 w-4 text-amber-500 mb-1" />
              <div className="text-sm font-bold">{formatCurrency(stats?.projectedEarnings || 0)}</div>
              <div className="text-[10px] text-muted-foreground">Projected</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <DollarSign className="h-4 w-4 text-green-500 mb-1" />
              <div className="text-sm font-bold">{formatCurrency(stats?.paidOut || 0)}</div>
              <div className="text-[10px] text-muted-foreground">Paid Out</div>
            </div>
          </div>

          {/* Pending Payouts Alert */}
          {(stats?.pendingPayouts || 0) > 0 && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Pending payouts
                </span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(stats?.pendingPayouts || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Action */}
          <Button variant="glass" size="sm" className="w-full" asChild>
            <Link to="/referrals">
              Manage Referrals
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
