import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, TrendingDown, ArrowRight, MousePointerClick, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useClubAIAnalytics } from "@/hooks/useClubAIAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export const ClubAIAnalyticsWidget = () => {
  const { data: analytics, isLoading } = useClubAIAnalytics();

  if (isLoading) {
    return (
      <Card className="glass-card h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const isPositiveTrend = (analytics?.trend || 0) >= 0;

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
              <Sparkles className="h-4 w-4 text-premium" />
              <span>Club AI Analytics</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/admin/analytics">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {/* Main Metric */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Interactions</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{analytics?.totalInteractions || 0}</span>
                {analytics && analytics.trend !== 0 && (
                  <div className={`flex items-center text-xs ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositiveTrend ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(analytics.trend)}%
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                <span className="text-xs">{analytics?.uniqueUsers || 0} users</span>
              </div>
            </div>
          </div>

          {/* CTR Metric */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <MousePointerClick className="h-3 w-3" />
                Click-through Rate
              </span>
              <span className="font-medium">{analytics?.clickThroughRate || 0}%</span>
            </div>
            <Progress value={analytics?.clickThroughRate || 0} className="h-1.5" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-muted-foreground">Recommendations</p>
              <p className="font-semibold">{analytics?.recommendationsSent || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-muted-foreground">Acted Upon</p>
              <p className="font-semibold">{analytics?.recommendationsClicked || 0}</p>
            </div>
          </div>

          {/* Helpful Ratio */}
          {analytics && analytics.helpfulRatio > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1">User Satisfaction</p>
              <div className="flex items-center gap-2">
                <Progress value={analytics.helpfulRatio} className="h-1.5 flex-1" />
                <span className="text-xs font-medium">{analytics.helpfulRatio}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
