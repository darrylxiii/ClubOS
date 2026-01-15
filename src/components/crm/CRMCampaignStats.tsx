import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Mail, Eye, MessageSquare } from 'lucide-react';
import { useCRMAnalytics } from '@/hooks/useCRMAnalytics';

interface CRMCampaignStatsProps {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
}

export function CRMCampaignStats({ dateRange = 'month' }: CRMCampaignStatsProps) {
  const { data, loading } = useCRMAnalytics({ dateRange });

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const campaigns = data?.campaignPerformance || [];
  const topCampaigns = campaigns.slice(0, 5);

  // Calculate totals
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.opened, 0);
  const totalReplied = campaigns.reduce((sum, c) => sum + c.replied, 0);

  const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const avgReplyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Campaign Performance
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {campaigns.length} campaigns
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 pb-3 border-b border-border/30">
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <Mail className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{totalSent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Sent</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <Eye className="w-4 h-4 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">{avgOpenRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Open Rate</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <MessageSquare className="w-4 h-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{avgReplyRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Reply Rate</p>
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="space-y-3">
          {topCampaigns.length > 0 ? (
            topCampaigns.map((campaign, index) => (
              <motion.div
                key={campaign.campaignId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm truncate flex-1">
                    {campaign.campaignName}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ml-2 ${
                      campaign.replyRate >= 5 
                        ? 'border-green-500/50 text-green-500' 
                        : campaign.replyRate >= 2 
                        ? 'border-yellow-500/50 text-yellow-500' 
                        : 'border-gray-500/50 text-gray-500'
                    }`}
                  >
                    {campaign.replyRate.toFixed(1)}% reply
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{campaign.sent} sent</span>
                  <span>{campaign.opened} opened</span>
                  <span>{campaign.replied} replied</span>
                </div>
                <Progress 
                  value={campaign.openRate} 
                  className="h-1 mt-2" 
                />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No campaigns yet</p>
              <p className="text-xs">Import your first campaign to see stats</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
