import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Eye, 
  MessageSquare, 
  Users, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Target,
  DollarSign,
  Shield
} from 'lucide-react';
import { useCRMCampaigns } from '@/hooks/useCRMCampaigns';
import { useCRMProspects } from '@/hooks/useCRMProspects';
import { useCRMEmailReplies } from '@/hooks/useCRMEmailReplies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';

interface KPI {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sparklineData?: number[];
}

export function OutreachKPIGrid() {
  const { campaigns, loading: campaignsLoading } = useCRMCampaigns({ limit: 100 });
  const { prospects, loading: prospectsLoading } = useCRMProspects({ limit: 100 });
  const { replies, loading: repliesLoading } = useCRMEmailReplies({ limit: 100 });

  const { data: accountHealth } = useQuery({
    queryKey: ['account-health-summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('instantly_account_health')
        .select('health_score');
      return (data ?? []).reduce((sum, a) => sum + (a.health_score || 0), 0) / ((data ?? []).length || 1) || 0;
    }
  });

  const loading = campaignsLoading || prospectsLoading || repliesLoading;

  // Calculate KPIs
  const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.total_opens || 0), 0);
  const totalReplied = campaigns.reduce((sum, c) => sum + (c.total_replies || 0), 0);
  const openRate = totalSent > 0 ? (totalOpened / totalSent * 100) : 0;
  const replyRate = totalSent > 0 ? (totalReplied / totalSent * 100) : 0;
  
  const hotLeads = prospects.filter(p => p.reply_sentiment === 'hot').length;
  const meetingsBooked = prospects.filter(p => p.stage === 'meeting_booked').length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const unreadReplies = replies.filter(r => !r.is_read).length;

  // Generate sparkline data
  const generateSparkline = (base: number, variance: number = 0.2) => {
    return Array.from({ length: 7 }, () => 
      Math.max(0, base * (1 + (Math.random() - 0.5) * variance))
    );
  };

  const kpis: KPI[] = [
    {
      label: 'Send Velocity',
      value: `${(totalSent / 7).toFixed(0)}/day`,
      change: 12,
      icon: Mail,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      sparklineData: generateSparkline(totalSent / 7)
    },
    {
      label: 'Open Rate',
      value: `${openRate.toFixed(1)}%`,
      change: 3.2,
      icon: Eye,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      sparklineData: generateSparkline(openRate)
    },
    {
      label: 'Reply Rate',
      value: `${replyRate.toFixed(1)}%`,
      change: -1.5,
      icon: MessageSquare,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      sparklineData: generateSparkline(replyRate)
    },
    {
      label: 'Hot Leads',
      value: hotLeads,
      change: 25,
      icon: Zap,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      sparklineData: generateSparkline(hotLeads)
    },
    {
      label: 'Meetings Booked',
      value: meetingsBooked,
      change: 8,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      sparklineData: generateSparkline(meetingsBooked)
    },
    {
      label: 'Active Campaigns',
      value: activeCampaigns,
      icon: Target,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      label: 'Unread Replies',
      value: unreadReplies,
      icon: MessageSquare,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      label: 'Total Prospects',
      value: prospects.length,
      change: 15,
      icon: Users,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      sparklineData: generateSparkline(prospects.length)
    },
    {
      label: 'Avg Response Time',
      value: '2.4h',
      change: -18,
      icon: Clock,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: 'Conversion Rate',
      value: `${(meetingsBooked / Math.max(1, prospects.length) * 100).toFixed(1)}%`,
      change: 5,
      icon: TrendingUp,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10'
    },
    {
      label: 'Pipeline Value',
      value: `€${(prospects.reduce((sum, p) => sum + (p.deal_value || 0), 0) / 1000).toFixed(0)}K`,
      change: 22,
      icon: DollarSign,
      color: 'text-lime-500',
      bgColor: 'bg-lime-500/10'
    },
    {
      label: 'Account Health',
      value: `${(accountHealth || 0).toFixed(0)}%`,
      icon: Shield,
      color: accountHealth && accountHealth >= 70 ? 'text-green-500' : 'text-yellow-500',
      bgColor: accountHealth && accountHealth >= 70 ? 'bg-green-500/10' : 'bg-yellow-500/10'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30 hover:border-border/50 transition-all">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-1.5 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                {kpi.change !== undefined && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1.5 ${kpi.change >= 0 ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}`}
                  >
                    {kpi.change >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {Math.abs(kpi.change)}%
                  </Badge>
                )}
              </div>
              
              {loading ? (
                <Skeleton className="h-7 w-16 mb-1" />
              ) : (
                <p className="text-xl font-bold">{kpi.value}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>

              {/* Sparkline */}
              {kpi.sparklineData && (
                <div className="h-8 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpi.sparklineData.map((v, i) => ({ value: v }))}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={`hsl(var(--primary))`}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
