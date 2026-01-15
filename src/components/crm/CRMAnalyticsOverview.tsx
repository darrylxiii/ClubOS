import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';
import { useCRMAnalytics } from '@/hooks/useCRMAnalytics';
import { CRMFunnelChart } from './CRMFunnelChart';
import { CRMRevenueForecast } from "./CRMRevenueForecast";
import { CampaignROIDashboard } from "@/components/analytics/CampaignROIDashboard";
import { formatCurrency } from '@/lib/revenueCalculations';
import { useState } from 'react';

export function CRMAnalyticsOverview() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | '3months'>('month');
  const { data, loading } = useCRMAnalytics({ dateRange });

  const overview = data?.overview;

  const statCards = [
    {
      label: 'Total Prospects',
      value: overview?.totalProspects || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Hot Leads',
      value: overview?.hotLeads || 0,
      icon: Zap,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Meetings Booked',
      value: overview?.meetingsBooked || 0,
      icon: Calendar,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Conversion Rate',
      value: `${(overview?.conversionRate || 0).toFixed(1)}%`,
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Deals Won',
      value: overview?.dealsWon || 0,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(overview?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Analytics Overview
        </h2>
        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="3months">Quarter</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30 hover:border-border/50 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    {loading ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-lg font-bold">{stat.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CRMRevenueForecast />
        <CRMFunnelChart dateRange={dateRange} />
      </div>

      {/* Trends and Campaign Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <CRMRevenueForecast />
        </div>
        <div className="col-span-3">
          {/* Future: Sales Rep Leaderboard or Activity Feed */}
        </div>
      </div>

      <div className="mt-8">
        <CampaignROIDashboard />
      </div>
    </div>
  );
}
