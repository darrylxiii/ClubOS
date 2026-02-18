import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { useRevenueAnalytics, type PeriodType } from "@/hooks/useRevenueAnalytics";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import {
  DollarSign, TrendingUp, TrendingDown, ArrowRight, CalendarIcon,
  Users, Building2, Briefcase, FileText, Target, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import type { DateRange as DayPickerRange } from "react-day-picker";

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: 'custom', label: 'Custom' },
];

const DeltaBadge = ({ value }: { value: number }) => {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full",
      positive ? "text-emerald-500 bg-emerald-500/10" : "text-destructive bg-destructive/10"
    )}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}{value}%
    </span>
  );
};

const AnimatedValue = ({ value, prefix = '', suffix = '' }: { value: string; prefix?: string; suffix?: string }) => (
  <motion.span
    key={value}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="inline-block"
  >
    {prefix}{value}{suffix}
  </motion.span>
);

const MetricCard = ({ label, value, delta, icon: Icon }: {
  label: string; value: string; delta?: number; icon?: React.ElementType;
}) => (
  <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-card/50 border border-border/50">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold"><AnimatedValue value={value} /></span>
      {delta !== undefined && <DeltaBadge value={delta} />}
    </div>
  </div>
);

export const RevenueGrowthWidget = () => {
  const [period, setPeriod] = useState<PeriodType>('thisMonth');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>();
  const [datePickerRange, setDatePickerRange] = useState<DayPickerRange | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data, isLoading } = useRevenueAnalytics(period, customRange);
  const { settings } = usePlatformSettings();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('nl-NL', {
      style: 'currency', currency: settings.currency || 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);

  const handlePeriodChange = (p: PeriodType) => {
    if (p === 'custom') {
      setShowDatePicker(true);
      setPeriod(p);
    } else {
      setShowDatePicker(false);
      setPeriod(p);
    }
  };

  const handleDateSelect = (range: DayPickerRange | undefined) => {
    setDatePickerRange(range);
    if (range?.from && range?.to) {
      setCustomRange({ start: range.from, end: range.to });
      setShowDatePicker(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-[200px] w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-subtle rounded-2xl overflow-hidden">
      {/* Premium gradient header */}
      <div className="h-1 bg-gradient-to-r from-premium/60 via-premium to-premium/60" />

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-premium/10">
              <DollarSign className="h-4 w-4 text-premium" />
            </div>
            Revenue & Growth
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/admin/kpi-command-center">
              Details <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardTitle>

        {/* Period selector */}
        <div className="flex flex-wrap gap-1 mt-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                period === p.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date picker */}
        {period === 'custom' && showDatePicker && (
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="mt-2 text-xs w-full justify-start">
                <CalendarIcon className="h-3 w-3 mr-2" />
                {datePickerRange?.from ? (
                  datePickerRange.to ? (
                    `${format(datePickerRange.from, 'dd MMM')} — ${format(datePickerRange.to, 'dd MMM yyyy')}`
                  ) : format(datePickerRange.from, 'dd MMM yyyy')
                ) : 'Select date range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={datePickerRange}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Custom range display */}
        {period === 'custom' && customRange && !showDatePicker && (
          <button
            onClick={() => setShowDatePicker(true)}
            className="mt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <CalendarIcon className="h-3 w-3 inline mr-1" />
            {format(customRange.start, 'dd MMM')} — {format(customRange.end, 'dd MMM yyyy')}
          </button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={period + (customRange?.start?.toISOString() || '')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Primary revenue number */}
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">
                Total Revenue ({data?.totalHires || 0} placements)
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-premium">
                  <AnimatedValue value={formatCurrency(data?.totalRevenue || 0)} />
                </span>
                {data && <DeltaBadge value={data.revenueDelta} />}
              </div>
            </div>

            {/* Metrics strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricCard
                label="Avg / Placement"
                value={formatCurrency(data?.avgRevenuePerPlacement || 0)}
                delta={data?.avgRevenueDelta}
              />
              <MetricCard
                label="Per Working Day"
                value={formatCurrency(data?.revenuePerWorkingDay || 0)}
                delta={data?.revenuePerDayDelta}
              />
              <MetricCard
                label="Best Month"
                value={`${formatCurrency(data?.bestMonthRevenue || 0)}`}
                icon={Zap}
              />
              <MetricCard
                label="Placements"
                value={String(data?.totalHires || 0)}
                delta={data?.hiresDelta}
                icon={Target}
              />
            </div>

            {/* Chart */}
            {data?.chartData && data.chartData.length > 0 && (
              <div className="h-[200px] -mx-2">
                <DynamicChart
                  type="composed"
                  data={data.chartData}
                  height={200}
                  config={{
                    bars: [{
                      dataKey: 'revenue',
                      fill: 'hsl(var(--primary) / 0.3)',
                      name: 'Revenue',
                      radius: [4, 4, 0, 0],
                    }],
                    lines: [
                      {
                        dataKey: 'hires',
                        stroke: 'hsl(var(--chart-2))',
                        strokeWidth: 2,
                        name: 'Placements',
                        dot: false,
                        type: 'monotone',
                      },
                      {
                        dataKey: 'prevRevenue',
                        stroke: 'hsl(var(--muted-foreground) / 0.3)',
                        strokeWidth: 1,
                        name: 'Previous Period',
                        dot: false,
                        type: 'monotone',
                      },
                    ],
                    xAxisDataKey: 'label',
                    xAxisTick: { fontSize: 10 },
                    showTooltip: true,
                    showGrid: false,
                    tooltip: {
                      formatter: (value: number, name: string) => {
                        if (name === 'Placements') return [value, name];
                        return [formatCurrency(value), name];
                      },
                    },
                  }}
                />
              </div>
            )}

            {/* Growth indicators */}
            {data?.growth && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Users', value: data.growth.users, icon: Users },
                  { label: 'Companies', value: data.growth.companies, icon: Building2 },
                  { label: 'Jobs', value: data.growth.jobs, icon: Briefcase },
                  { label: 'Applications', value: data.growth.applications, icon: FileText },
                ].map((g) => (
                  <div key={g.label} className="text-center p-2 rounded-lg bg-card/50 border border-border/50">
                    <g.icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                    <DeltaBadge value={g.value} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{g.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pipeline intelligence */}
            <div className="p-3 rounded-xl bg-premium/5 border border-premium/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Weighted Pipeline</p>
                  <p className="text-lg font-bold text-premium">
                    <AnimatedValue value={formatCurrency(data?.totalPipelineValue || 0)} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Expected Closings</p>
                  <p className="text-lg font-bold">{data?.expectedClosings || 0}</p>
                </div>
              </div>

              {/* Mini funnel */}
              <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/30">
                {data?.pipeline.map((stage, i) => {
                  const total = data.pipeline.reduce((s, p) => s + p.count, 0);
                  const width = total > 0 ? (stage.count / total) * 100 : 25;
                  const colors = [
                    'bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4',
                  ];
                  return (
                    <div
                      key={stage.stage}
                      className={cn("h-full transition-all", colors[i])}
                      style={{ width: `${width}%` }}
                      title={`${stage.stage}: ${stage.count} (${Math.round(stage.probability * 100)}%)`}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-4 gap-1 text-center">
                {data?.pipeline.map((stage) => (
                  <div key={stage.stage}>
                    <p className="text-[10px] text-muted-foreground">{stage.stage}</p>
                    <p className="text-xs font-medium">{stage.count}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(stage.weightedValue)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Forecasting */}
            {period === 'thisMonth' && data && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <div>
                  <p className="text-[11px] text-muted-foreground">Projected Month-End</p>
                  <p className="font-semibold text-sm">
                    <AnimatedValue value={formatCurrency(data.projectedMonthEnd)} />
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Day {data.daysElapsed}/{data.daysInMonth}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
