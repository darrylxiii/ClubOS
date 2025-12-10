import { motion } from "framer-motion";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Mail, MousePointer, Reply } from "lucide-react";

interface CRMCohortAnalysisProps {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
}

export function CRMCohortAnalysis({ dateRange = 'month' }: CRMCohortAnalysisProps) {
  const { data, loading } = useCRMAnalytics({ dateRange });

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const campaigns = data?.campaignPerformance || [];

  if (campaigns.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No campaign data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxSent = Math.max(...campaigns.map(c => c.sent), 1);

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Campaign Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaigns.slice(0, 5).map((campaign, index) => {
          const barWidth = (campaign.sent / maxSent) * 100;
          const replyRateColor = campaign.replyRate >= 5 
            ? 'text-green-400' 
            : campaign.replyRate >= 2 
              ? 'text-amber-400' 
              : 'text-red-400';

          return (
            <motion.div
              key={campaign.campaignId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 rounded-lg bg-muted/20 border border-border/30"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-sm">{campaign.campaignName}</h4>
                </div>
                <Badge variant="outline" className={replyRateColor}>
                  {campaign.replyRate.toFixed(1)}% Reply
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{campaign.sent} sent</span>
                </div>
                <div className="flex items-center gap-1">
                  <MousePointer className="h-3 w-3 text-blue-400" />
                  <span>{campaign.openRate.toFixed(1)}% open</span>
                </div>
                <div className="flex items-center gap-1">
                  <Reply className="h-3 w-3 text-green-400" />
                  <span>{campaign.replied} replies</span>
                </div>
              </div>

              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="h-full bg-primary/70 rounded-full"
                />
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
