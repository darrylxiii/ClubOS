import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Users, 
  Mail, 
  Eye, 
  MessageSquare, 
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InstantlyCampaign } from '@/hooks/useInstantlyData';
import { formatDistanceToNow } from 'date-fns';

interface InstantlyCampaignCardProps {
  campaign: InstantlyCampaign;
  onViewLeads: (campaignId: string) => void;
  onSync: (campaignId: string) => void;
  syncing: boolean;
}

export function InstantlyCampaignCard({ 
  campaign, 
  onViewLeads, 
  onSync,
  syncing 
}: InstantlyCampaignCardProps) {
  const [expanded, setExpanded] = useState(false);

  const openRate = campaign.total_sent > 0 
    ? (campaign.total_opened / campaign.total_sent) * 100 
    : 0;
  const replyRate = campaign.total_sent > 0 
    ? (campaign.total_replied / campaign.total_sent) * 100 
    : 0;
  const bounceRate = campaign.total_sent > 0 
    ? (campaign.total_bounced / campaign.total_sent) * 100 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'paused': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card className="p-4 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30 hover:border-border/50 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{campaign.name}</h3>
              <Badge variant="outline" className={getStatusColor(campaign.status)}>
                {campaign.status === 'active' && <Play className="h-3 w-3 mr-1" />}
                {campaign.status === 'paused' && <Pause className="h-3 w-3 mr-1" />}
                {campaign.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {campaign.leads_count.toLocaleString()} leads
              </span>
              <span>
                Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSync(campaign.id)}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Mail className="h-3 w-3" />
              <span className="text-xs">Sent</span>
            </div>
            <div className="font-semibold">{campaign.total_sent.toLocaleString()}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
              <Eye className="h-3 w-3" />
              <span className="text-xs">Opens</span>
            </div>
            <div className="font-semibold">{openRate.toFixed(1)}%</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/10">
            <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
              <MessageSquare className="h-3 w-3" />
              <span className="text-xs">Replies</span>
            </div>
            <div className="font-semibold">{replyRate.toFixed(1)}%</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
              <span className="text-xs">Bounces</span>
            </div>
            <div className="font-semibold">{bounceRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-2 mb-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Open Rate</span>
              <span>{openRate.toFixed(1)}%</span>
            </div>
            <Progress value={openRate} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Reply Rate</span>
              <span>{replyRate.toFixed(1)}%</span>
            </div>
            <Progress value={replyRate} className="h-1.5 [&>div]:bg-emerald-500" />
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/30 pt-4 mt-4"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Detailed Stats</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opened</span>
                    <span>{campaign.total_opened.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clicked</span>
                    <span>{campaign.total_clicked.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Replied</span>
                    <span>{campaign.total_replied.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bounced</span>
                    <span>{campaign.total_bounced.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unsubscribed</span>
                    <span>{campaign.total_unsubscribed.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Sync Info</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-xs">
                      {campaign.sync_status || 'pending'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span>
                      {campaign.last_synced_at 
                        ? formatDistanceToNow(new Date(campaign.last_synced_at), { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onViewLeads(campaign.id)}
            >
              <Users className="h-4 w-4 mr-2" />
              View All Leads
            </Button>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}
