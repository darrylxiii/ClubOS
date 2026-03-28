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
  Users, Building2, Briefcase, FileText, Target, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

const PERIOD_VALUES: PeriodType[] = ['thisMonth', 'lastMonth', '3m', '6m', 'ytd', '1y', 'custom'];

const PERIOD_I18N_KEYS: Record<PeriodType, string> = {
  thisMonth: 'home.revenue.thisMonth',
  lastMonth: 'home.revenue.lastMonth',
  '3m': 'home.revenue.3m',
  '6m': 'home.revenue.6m',
  ytd: 'home.revenue.ytd',
  '1y': 'home.revenue.1y',
  custom: 'home.revenue.custom',
};

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

/* ── Period selector shared between collapsed & expanded ── */
const PeriodSelector = ({
  period, onPeriodChange, customRange, showDatePicker, setShowDatePicker,
  datePickerRange, onDateSelect, t,
}: {
  period: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
  customRange?: { start: Date; end: Date };
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  datePickerRange: DayPickerRange | undefined;
  onDateSelect: (range: DayPickerRange | undefined) => void;
  t: TFunction<'common'>;
}) => (
  <div>
    <div className="flex flex-wrap gap-1">
      {PERIOD_VALUES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPeriodChange(p)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
            period === p
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {t(PERIOD_I18N_KEYS[p])}
        </button>
      ))}
    </div>

    {period === 'custom' && showDatePicker && (
      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="mt-2 text-xs w-full justify-start">
            <CalendarIcon className="h-3 w-3 mr-2" />
            {datePickerRange?.from ? (
              datePickerRange.to ? (
                `${format(datePickerRange.from, 'dd MMM')} — ${format(datePickerRange.to, 'dd MMM yyyy')}`
              ) : format(datePickerRange.from, 'dd MMM yyyy')
            ) : t('home.revenue.selectDateRange')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={datePickerRange}
            onSelect={onDateSelect}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    )}

    {period === 'custom' && customRange && !showDatePicker && (
      <button
        type="button"
        onClick={() => setShowDatePicker(true)}
        className="mt-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <CalendarIcon className="h-3 w-3 inline mr-1" />
        {format(customRange.start, 'dd MMM')} — {format(customRange.end, 'dd MMM yyyy')}
      </button>
    )}
  </div>
);

/* ── Full expanded content (rendered inside Dialog) ── */
const RevenueFullContent = ({
  data, formatCurrency, period, t,
}: {
  data: ReturnType<typeof useRevenueAnalytics>['data'];
  formatCurrency: (v: number) => string;
  period: PeriodType;
  t: TFunction<'common'>;
}) => {
  const placementsLabel = t('home.revenue.placements');
  const chartRevenue = t('home.revenue.chartRevenue');
  const chartPrevious = t('home.revenue.chartPreviousPeriod');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-muted-foreground mb-0.5">
          {t('home.revenue.totalRevenueWithPlacements', { count: data?.totalHires || 0 })}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-premium">
            <AnimatedValue value={formatCurrency(data?.totalRevenue || 0)} />
          </span>
          {data && <DeltaBadge value={data.revenueDelta} />}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label={t('home.revenue.avgPerPlacement')} value={formatCurrency(data?.avgRevenuePerPlacement || 0)} delta={data?.avgRevenueDelta} />
        <MetricCard label={t('home.revenue.perWorkingDay')} value={formatCurrency(data?.revenuePerWorkingDay || 0)} delta={data?.revenuePerDayDelta} />
        <MetricCard label={t('home.revenue.bestMonth')} value={formatCurrency(data?.bestMonthRevenue || 0)} icon={Zap} />
        <MetricCard label={t('home.revenue.placements')} value={String(data?.totalHires || 0)} delta={data?.hiresDelta} icon={Target} />
      </div>

      {data?.chartData && data.chartData.length > 0 && (
        <div className="h-[200px] -mx-2">
          <DynamicChart
            type="composed"
            data={data.chartData}
            height={200}
            config={{
              bars: [{ dataKey: 'revenue', fill: 'hsl(var(--primary) / 0.3)', name: chartRevenue, radius: [4, 4, 0, 0] }],
              lines: [
                { dataKey: 'hires', stroke: 'hsl(var(--chart-2))', strokeWidth: 2, name: placementsLabel, dot: false, type: 'monotone' },
                { dataKey: 'prevRevenue', stroke: 'hsl(var(--muted-foreground) / 0.3)', strokeWidth: 1, name: chartPrevious, dot: false, type: 'monotone' },
              ],
              xAxisDataKey: 'label',
              xAxisTick: { fontSize: 10 },
              showTooltip: true,
              showGrid: false,
              tooltip: {
                formatter: (value: number, name: string) => {
                  if (name === placementsLabel) return [value, name];
                  return [formatCurrency(value), name];
                },
              },
            }}
          />
        </div>
      )}

      {data?.growth && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: t('home.revenue.users'), value: data.growth.users, icon: Users },
            { label: t('home.revenue.companies'), value: data.growth.companies, icon: Building2 },
            { label: t('home.revenue.openJobsLabel'), value: data.growth.jobs, icon: Briefcase },
            { label: t('home.revenue.applications'), value: data.growth.applications, icon: FileText },
          ].map((g) => (
            <div key={g.label} className="text-center p-2 rounded-lg bg-card/50 border border-border/50">
              <g.icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
              <DeltaBadge value={g.value} />
              <p className="text-[10px] text-muted-foreground mt-0.5">{g.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 rounded-xl bg-premium/5 border border-premium/20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">{t('home.revenue.weightedPipeline')}</p>
            <p className="text-lg font-bold text-premium">
              <AnimatedValue value={formatCurrency(data?.totalPipelineValue || 0)} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">{t('home.revenue.expectedClosings')}</p>
            <p className="text-lg font-bold">{data?.expectedClosings || 0}</p>
          </div>
        </div>

        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/30">
          {data?.pipeline.map((stage, i) => {
            const total = data.pipeline.reduce((s, p) => s + p.count, 0);
            const width = total > 0 ? (stage.count / total) * 100 : 25;
            const colors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4'];
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

      {period === 'thisMonth' && data && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
          <div>
            <p className="text-[11px] text-muted-foreground">{t('home.revenue.projectedMonthEnd')}</p>
            <p className="font-semibold text-sm">
              <AnimatedValue value={formatCurrency(data.projectedMonthEnd)} />
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {t('home.revenue.dayProgress', { current: data.daysElapsed, total: data.daysInMonth })}
          </span>
        </div>
      )}
    </div>
  );
};

/* ── Main widget: collapsed card + expanded dialog ── */
export const RevenueGrowthWidget = () => {
  const { t } = useTranslation('common');
  const [period, setPeriod] = useState<PeriodType>('thisMonth');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>();
  const [datePickerRange, setDatePickerRange] = useState<DayPickerRange | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-[60px] w-full mt-2" />
        </CardContent>
      </Card>
    );
  }

  const periodSelectorProps = {
    period,
    onPeriodChange: handlePeriodChange,
    customRange,
    showDatePicker,
    setShowDatePicker,
    datePickerRange,
    onDateSelect: handleDateSelect,
    t,
  };

  return (
    <Card className="glass-subtle rounded-2xl overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-premium/60 via-premium to-premium/60" />

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-premium/10">
              <DollarSign className="h-4 w-4 text-premium" />
            </div>
            {t('home.revenue.title')}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? t('home.revenue.collapse') : t('home.revenue.expandAnalytics')}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/admin/kpi-command-center">
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardTitle>

        <PeriodSelector {...periodSelectorProps} />
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-premium">
            <AnimatedValue value={formatCurrency(data?.totalRevenue || 0)} />
          </span>
          {data && <DeltaBadge value={data.revenueDelta} />}
        </div>

        {data?.chartData && data.chartData.length > 0 && (
          <div className="h-[60px] -mx-2">
            <DynamicChart
              type="area"
              data={data.chartData}
              height={60}
              config={{
                areas: [{ dataKey: 'revenue', fill: 'hsl(var(--primary) / 0.15)', stroke: 'hsl(var(--primary))', fillOpacity: 0.3 }],
                xAxisDataKey: 'label',
                xAxisTick: false,
                showTooltip: false,
                showGrid: false,
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between p-2 rounded-lg bg-premium/10 border border-premium/20">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{t('revenueGrowthWidget.pipeline')}</p>
            <p className="text-sm font-semibold text-premium">{formatCurrency(data?.totalPipelineValue || 0)}</p>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {t('home.revenue.expectedWithCount', { count: data?.expectedClosings || 0 })}
          </span>
        </div>
      </CardContent>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-border/20">
              <RevenueFullContent data={data} formatCurrency={formatCurrency} period={period} t={t} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
