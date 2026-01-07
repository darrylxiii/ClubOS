import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Phone, 
  FileText, 
  DollarSign, 
  Bot, 
  Heart, 
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Target
} from 'lucide-react';
import { useGroupedSalesKPIs, useCalculateSalesKPIs, SalesKPI } from '@/hooks/useSalesKPIs';
import { toast } from 'sonner';

const kpiLabels: Record<string, string> = {
  initial_conversations: 'Initial Conversations',
  qualified_conversations: 'Qualified Conversations',
  qualification_rate: 'Qualification Rate',
  discovery_calls_held: 'Discovery Calls Held',
  proposals_sent: 'Proposals Sent',
  deals_closed_won: 'Deals Closed (Won)',
  win_rate: 'Win Rate',
  total_revenue: 'Total Revenue',
};

function formatValue(kpi: SalesKPI): string {
  const name = kpi.kpi_name;
  const value = kpi.value;
  
  if (name.includes('rate') || name.includes('ratio') || name === 'win_rate') {
    return `${value}%`;
  }
  if (name.includes('value') || name.includes('revenue')) {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }
  return value.toLocaleString();
}

function TrendIndicator({ kpi }: { kpi: SalesKPI }) {
  if (!kpi.trend_direction || kpi.trend_direction === 'stable') {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  if (kpi.trend_direction === 'up') {
    return (
      <div className="flex items-center text-green-500">
        <ArrowUpRight className="h-4 w-4" />
        <span className="text-xs">{kpi.trend_percentage}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center text-red-500">
      <ArrowDownRight className="h-4 w-4" />
      <span className="text-xs">{kpi.trend_percentage}%</span>
    </div>
  );
}

function StatusBadge({ kpi }: { kpi: SalesKPI }) {
  const value = kpi.value;
  const warning = kpi.threshold_warning;
  const critical = kpi.threshold_critical;
  const target = kpi.target_value;
  
  if (critical !== undefined && critical !== null && value <= critical) {
    return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Critical</Badge>;
  }
  if (warning !== undefined && warning !== null && value <= warning) {
    return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
  }
  if (target !== undefined && target !== null && value >= target) {
    return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />On Target</Badge>;
  }
  return null;
}

export function SalesKPIContent() {
  const [periodType, setPeriodType] = useState('monthly');
  const { data: groupedKpis, isLoading, refetch } = useGroupedSalesKPIs(periodType);
  const calculateKpis = useCalculateSalesKPIs();
  
  const handleCalculate = async () => {
    try {
      await calculateKpis.mutateAsync({ period_type: periodType });
      toast.success('Sales KPIs calculated successfully');
      refetch();
    } catch {
      toast.error('Failed to calculate KPIs');
    }
  };

  const getKPI = (category: string, name: string) => 
    groupedKpis?.[category]?.find((k: SalesKPI) => k.kpi_name === name);
  
  const conversations = getKPI('conversational', 'initial_conversations')?.value || 0;
  const qualified = getKPI('conversational', 'qualified_conversations')?.value || 0;
  const meetings = getKPI('meetings', 'discovery_calls_held')?.value || 0;
  const proposals = getKPI('proposals', 'proposals_sent')?.value || 0;
  const closed = getKPI('closing', 'deals_closed_won')?.value || 0;
  const revenue = getKPI('closing', 'total_revenue')?.value || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sales Performance</h3>
          <p className="text-sm text-muted-foreground">Conversion metrics from conversation to cash</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleCalculate} disabled={calculateKpis.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${calculateKpis.isPending ? 'animate-spin' : ''}`} />
            Calculate
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Conversations</span>
                </div>
                <p className="text-2xl font-bold mt-1">{conversations}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Qualified</span>
                </div>
                <p className="text-2xl font-bold mt-1">{qualified}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Meetings</span>
                </div>
                <p className="text-2xl font-bold mt-1">{meetings}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Proposals</span>
                </div>
                <p className="text-2xl font-bold mt-1">{proposals}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Closed Won</span>
                </div>
                <p className="text-2xl font-bold mt-1">{closed}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Revenue</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(revenue)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales Funnel Conversion</CardTitle>
              <CardDescription>Stage-to-stage conversion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                {[
                  { from: 'Conversations', to: 'Qualified', rate: conversations ? (qualified / conversations * 100) : 0 },
                  { from: 'Qualified', to: 'Meetings', rate: qualified ? (meetings / qualified * 100) : 0 },
                  { from: 'Meetings', to: 'Proposals', rate: meetings ? (proposals / meetings * 100) : 0 },
                  { from: 'Proposals', to: 'Closed', rate: proposals ? (closed / proposals * 100) : 0 },
                ].map((stage, idx, arr) => (
                  <React.Fragment key={stage.from}>
                    <div className="flex-1 text-center">
                      <p className="text-xs text-muted-foreground">{stage.from}</p>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.min(stage.rate, 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-sm font-medium">{stage.rate.toFixed(1)}%</p>
                    </div>
                    {idx < arr.length - 1 && (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground rotate-45 flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
