import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Lightbulb, 
  Star, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ClosedJobInsightsProps {
  companyId: string;
  jobTitle?: string;
  className?: string;
}

export const ClosedJobInsights = memo(({ 
  companyId, 
  jobTitle,
  className 
}: ClosedJobInsightsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: insights, isLoading } = useQuery({
    queryKey: ["closed-job-insights", companyId, jobTitle],
    queryFn: async () => {
      // Get closures for same company
      const { data: closures, error } = await supabase
        .from("job_closures")
        .select(`
          id,
          closure_type,
          time_to_fill_days,
          key_learnings,
          what_went_well,
          what_could_improve,
          recommendations_for_future,
          candidate_quality_rating,
          client_responsiveness_rating,
          market_difficulty_rating,
          actual_salary,
          placement_fee,
          jobs:job_id (
            id,
            title,
            company_id
          )
        `)
        .eq("jobs.company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Filter out current job and non-matching
      const relevantClosures = (closures || []).filter(c => c.jobs?.company_id === companyId);
      
      if (relevantClosures.length === 0) return null;

      // Aggregate insights
      const hiredCount = relevantClosures.filter(c => c.closure_type === "hired").length;
      const avgTimeToFill = relevantClosures
        .filter(c => c.time_to_fill_days)
        .reduce((acc, c, _, arr) => acc + (c.time_to_fill_days || 0) / arr.length, 0);
      
      // Collect all learnings
      const allLearnings = relevantClosures
        .flatMap(c => c.key_learnings || [])
        .reduce((acc: Record<string, number>, learning: string) => {
          acc[learning] = (acc[learning] || 0) + 1;
          return acc;
        }, {});

      // Sort by frequency
      const topLearnings = Object.entries(allLearnings)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([learning]) => learning);

      // Get recent recommendations
      const recommendations = relevantClosures
        .filter(c => c.recommendations_for_future)
        .slice(0, 3)
        .map(c => c.recommendations_for_future);

      // Average ratings
      const avgRatings = {
        candidateQuality: relevantClosures
          .filter(c => c.candidate_quality_rating)
          .reduce((acc, c, _, arr) => acc + (c.candidate_quality_rating || 0) / arr.length, 0),
        clientResponsiveness: relevantClosures
          .filter(c => c.client_responsiveness_rating)
          .reduce((acc, c, _, arr) => acc + (c.client_responsiveness_rating || 0) / arr.length, 0),
        marketDifficulty: relevantClosures
          .filter(c => c.market_difficulty_rating)
          .reduce((acc, c, _, arr) => acc + (c.market_difficulty_rating || 0) / arr.length, 0),
      };

      return {
        totalClosures: relevantClosures.length,
        hiredCount,
        successRate: relevantClosures.length > 0 ? Math.round((hiredCount / relevantClosures.length) * 100) : 0,
        avgTimeToFill: Math.round(avgTimeToFill),
        topLearnings,
        recommendations,
        avgRatings,
      };
    },
    enabled: !!companyId,
    staleTime: 300000, // 5 minutes
  });

  if (isLoading || !insights || insights.totalClosures === 0) {
    return null;
  }

  return (
    <Card className={cn("border-amber-500/20 bg-amber-500/5", className)}>
      <CardHeader 
        className="pb-2 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Insights from {insights.totalClosures} Past Role{insights.totalClosures !== 1 ? "s" : ""}</span>
          </div>
          <ChevronRight 
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )} 
          />
        </CardTitle>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-4 pt-0">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-lg font-bold text-green-600">{insights.successRate}%</div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-lg font-bold">{insights.avgTimeToFill}</div>
                  <div className="text-xs text-muted-foreground">Avg Days</div>
                </div>
                <div className="p-2 rounded-lg bg-background/50">
                  <div className="text-lg font-bold">{insights.hiredCount}</div>
                  <div className="text-xs text-muted-foreground">Placements</div>
                </div>
              </div>

              {/* Top Learnings */}
              {insights.topLearnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Key Learnings
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.topLearnings.map((learning, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0"
                      >
                        {learning}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Recent Recommendations
                  </p>
                  <div className="space-y-1.5">
                    {insights.recommendations.map((rec, i) => (
                      <p 
                        key={i} 
                        className="text-xs text-muted-foreground bg-background/50 p-2 rounded"
                      >
                        "{rec}"
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Average Ratings */}
              {(insights.avgRatings.candidateQuality > 0 || 
                insights.avgRatings.clientResponsiveness > 0 || 
                insights.avgRatings.marketDifficulty > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Avg Ratings
                  </p>
                  <div className="flex gap-4 text-xs">
                    {insights.avgRatings.candidateQuality > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Quality:</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{insights.avgRatings.candidateQuality.toFixed(1)}</span>
                      </div>
                    )}
                    {insights.avgRatings.clientResponsiveness > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Client:</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{insights.avgRatings.clientResponsiveness.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed preview */}
      {!isExpanded && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              {insights.successRate}% success
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{insights.avgTimeToFill} days avg
            </span>
            {insights.topLearnings.length > 0 && (
              <span>{insights.topLearnings.length} learnings</span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
});

ClosedJobInsights.displayName = "ClosedJobInsights";
