import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  Mail, 
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CampaignROI {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  total_cost: number;
  total_revenue: number;
  roi_percentage: number;
  cost_per_lead: number;
  cost_per_meeting: number;
  cost_per_conversion: number;
  leads_generated?: number;
  meetings_booked?: number;
  conversions?: number;
  calculated_at: string;
}

export function CampaignROIDashboard() {
  const { data: roiData, isLoading } = useQuery({
    queryKey: ['campaign-roi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_campaign_roi')
        .select('*')
        .order('roi_percentage', { ascending: false });

      if (error) throw error;
      return data as CampaignROI[];
    }
  });

  // Calculate totals
  const totals = roiData?.reduce((acc, item) => ({
    cost: acc.cost + (item.total_cost || 0),
    revenue: acc.revenue + (item.total_revenue || 0),
    leads: acc.leads + (item.leads_generated || 0),
    meetings: acc.meetings + (item.meetings_booked || 0),
    conversions: acc.conversions + (item.conversions || 0)
  }), { cost: 0, revenue: 0, leads: 0, meetings: 0, conversions: 0 }) || { cost: 0, revenue: 0, leads: 0, meetings: 0, conversions: 0 };

  const overallROI = totals.cost > 0 ? ((totals.revenue - totals.cost) / totals.cost * 100) : 0;
  const avgCostPerLead = totals.leads > 0 ? totals.cost / totals.leads : 0;
  const avgCostPerMeeting = totals.meetings > 0 ? totals.cost / totals.meetings : 0;

  const stats = [
    {
      label: 'Total Revenue',
      value: `€${(totals.revenue / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: overallROI > 0 ? '+' : '',
      trendValue: `${overallROI.toFixed(0)}% ROI`
    },
    {
      label: 'Total Spend',
      value: `€${(totals.cost / 1000).toFixed(0)}K`,
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Cost per Lead',
      value: `€${avgCostPerLead.toFixed(0)}`,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Cost per Meeting',
      value: `€${avgCostPerMeeting.toFixed(0)}`,
      icon: Mail,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
  ];

  const chartData = roiData?.slice(0, 10).map(item => ({
    name: item.campaign_name?.slice(0, 15) + '...' || 'Unknown',
    roi: item.roi_percentage || 0,
    revenue: item.total_revenue || 0,
    cost: item.total_cost || 0
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-lg border border-border/50 rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">ROI:</span>
              <span className={`font-medium ${data.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.roi.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Revenue:</span>
              <span>€{data.revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Cost:</span>
              <span>€{data.cost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    {isLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold">{stat.value}</p>
                        {stat.trendValue && (
                          <Badge 
                            variant="outline" 
                            className={overallROI >= 0 ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}
                          >
                            {overallROI >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {stat.trendValue}
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ROI by Campaign Chart */}
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              ROI by Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={index} 
                        fill={entry.roi >= 0 ? 'hsl(var(--primary))' : 'hsl(0, 84%, 60%)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Campaign Performance List */}
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : roiData && roiData.length > 0 ? (
              <div className="space-y-3">
                {roiData.slice(0, 6).map((campaign, index) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium truncate max-w-[200px]">
                        {campaign.campaign_name || 'Unknown Campaign'}
                      </p>
                      <Badge 
                        variant="outline"
                        className={campaign.roi_percentage >= 0 ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}
                      >
                        {campaign.roi_percentage >= 0 ? '+' : ''}{campaign.roi_percentage?.toFixed(0)}% ROI
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>€{campaign.total_revenue?.toLocaleString()} revenue</span>
                      <span>•</span>
                      <span>{campaign.leads_generated} leads</span>
                      <span>•</span>
                      <span>{campaign.meetings_booked} meetings</span>
                    </div>
                    <Progress 
                      value={Math.min(100, Math.max(0, campaign.roi_percentage || 0))} 
                      className="h-1 mt-2"
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No ROI data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
