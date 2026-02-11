import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, ThumbsUp, ThumbsDown, Meh, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { useNPSSurveys } from "@/hooks/useQuantumKPIs";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const NPSPulseWidget = () => {
  const { data: surveys, isLoading } = useNPSSurveys();

  const npsMetrics = useMemo(() => {
    if (!surveys || surveys.length === 0) {
      return { score: null, promoters: 0, passives: 0, detractors: 0, trend: 0 };
    }

    const promoters = surveys.filter((s: any) => s.nps_score >= 9).length;
    const passives = surveys.filter((s: any) => s.nps_score >= 7 && s.nps_score <= 8).length;
    const detractors = surveys.filter((s: any) => s.nps_score <= 6).length;
    const total = surveys.length;

    const score = Math.round(((promoters - detractors) / total) * 100);

    // Calculate 30-day trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSurveys = surveys.filter((s: any) => new Date(s.response_date) >= thirtyDaysAgo);
    const oldSurveys = surveys.filter((s: any) => new Date(s.response_date) < thirtyDaysAgo);

    let trend = 0;
    if (recentSurveys.length > 0 && oldSurveys.length > 0) {
      const recentPromoters = recentSurveys.filter((s: any) => s.nps_score >= 9).length;
      const recentDetractors = recentSurveys.filter((s: any) => s.nps_score <= 6).length;
      const recentScore = ((recentPromoters - recentDetractors) / recentSurveys.length) * 100;

      const oldPromoters = oldSurveys.filter((s: any) => s.nps_score >= 9).length;
      const oldDetractors = oldSurveys.filter((s: any) => s.nps_score <= 6).length;
      const oldScore = ((oldPromoters - oldDetractors) / oldSurveys.length) * 100;

      trend = Math.round(recentScore - oldScore);
    }

    return { score, promoters, passives, detractors, trend };
  }, [surveys]);

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 50) return "text-emerald-500";
    if (score >= 0) return "text-amber-500";
    return "text-rose-500";
  };

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            NPS Pulse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            NPS Pulse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className={`text-4xl font-bold ${getScoreColor(npsMetrics.score)}`}>
              {npsMetrics.score !== null ? npsMetrics.score : "--"}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {npsMetrics.trend !== 0 && (
                <>
                  {npsMetrics.trend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-rose-500" />
                  )}
                  <span className={`text-xs ${npsMetrics.trend > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {npsMetrics.trend > 0 ? "+" : ""}{npsMetrics.trend} pts
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground ml-1">
                ({surveys?.length || 0} responses)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-emerald-500/10">
              <ThumbsUp className="h-3 w-3 mx-auto text-emerald-500 mb-1" />
              <div className="text-sm font-bold text-emerald-500">{npsMetrics.promoters}</div>
              <div className="text-[9px] text-muted-foreground">Promoters</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/10">
              <Meh className="h-3 w-3 mx-auto text-amber-500 mb-1" />
              <div className="text-sm font-bold text-amber-500">{npsMetrics.passives}</div>
              <div className="text-[9px] text-muted-foreground">Passives</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-rose-500/10">
              <ThumbsDown className="h-3 w-3 mx-auto text-rose-500 mb-1" />
              <div className="text-sm font-bold text-rose-500">{npsMetrics.detractors}</div>
              <div className="text-[9px] text-muted-foreground">Detractors</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
