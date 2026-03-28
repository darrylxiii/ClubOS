import { useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { useMyPerformanceData } from "@/hooks/useMyPerformanceData";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";
import { MyPerformanceOverview } from "@/components/employees/MyPerformanceOverview";
import { TargetsProgressCard } from "@/components/employees/TargetsProgressCard";
import { CommissionsTracker } from "@/components/employees/CommissionsTracker";
import { PlacementHistory } from "@/components/employees/PlacementHistory";
import { ActivityLoggerWidget } from "@/components/employees/ActivityLoggerWidget";
import { ActivityFeed } from "@/components/employees/ActivityFeed";
import { TrainingRecordsPanel } from "@/components/employees/TrainingRecordsPanel";
import { OnboardingChecklist } from "@/components/employees/OnboardingChecklist";
import { EarningsTab } from "@/components/employees/EarningsTab";
import { RecruiterKPIDashboard } from "@/components/employees/RecruiterKPIDashboard";
import { BenchmarkComparison } from "@/components/employees/BenchmarkComparison";
import { HistoricalTrendsChart } from "@/components/employees/HistoricalTrendsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, LayoutDashboard, Wallet, BarChart3, Activity, GraduationCap, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function MyPerformance() {
  const { t } = useTranslation('analytics');
  const { user } = useAuth();
  const { data, isLoading, refetch } = useMyPerformanceData();
  useAdminRealtime();
  const [kpiDays, setKpiDays] = useState(30);

  const hasEmployeeProfile = !!data?.employeeProfile;
  const hasAnyData = data && (data.totalRevenue > 0 || data.candidatesAdded > 0 || data.xp > 0);

  return (
    <RoleGate allowedRoles={['admin', 'strategist', 'partner', 'user']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('myPerformance.text2')}</h1>
            <p className="text-muted-foreground">{t('myPerformance.desc')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('myPerformance.refresh', 'Refresh')}
          </Button>
        </div>

        {!isLoading && !hasEmployeeProfile && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('myPerformance.noProfileAlert', "Your employee profile hasn't been set up yet. Some features like commission tracking and targets require admin setup. Your pipeline and activity stats are still available below.")}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        )}

        {!isLoading && !hasAnyData && (
          <Card className="py-16">
            <CardContent className="text-center space-y-3">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">{t('myPerformance.noDataTitle', 'No performance data yet')}</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {t('myPerformance.noDataDesc', 'Start sourcing candidates and making placements to see your performance stats, pipeline value, and earnings here.')}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && data && hasAnyData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview" className="gap-2"><LayoutDashboard className="h-4 w-4" />{t('myPerformance.tabs.overview', 'Overview')}</TabsTrigger>
                <TabsTrigger value="pipeline" className="gap-2"><Wallet className="h-4 w-4" />{t('myPerformance.tabs.pipeline', 'Pipeline & Earnings')}</TabsTrigger>
                <TabsTrigger value="kpis" className="gap-2"><BarChart3 className="h-4 w-4" />{t('myPerformance.tabs.kpis', 'KPIs')}</TabsTrigger>
                <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" />{t('myPerformance.tabs.activity', 'Activity')}</TabsTrigger>
                <TabsTrigger value="development" className="gap-2"><GraduationCap className="h-4 w-4" />{t('myPerformance.tabs.development', 'Development')}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <MyPerformanceOverview data={data} />
                <div className="grid gap-6 lg:grid-cols-2">
                  {hasEmployeeProfile ? (
                    <TargetsProgressCard targets={data.currentTarget ? [data.currentTarget] : []} isLoading={false} />
                  ) : (
                    user?.id && <BenchmarkComparison userId={user.id} />
                  )}
                  {user?.id && <HistoricalTrendsChart userId={user.id} months={6} />}
                </div>
                {hasEmployeeProfile && (
                  <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />{t('myPerformance.timeProductivity', 'Time & Productivity')}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground">{t('myPerformance.text3')}</p><p className="text-2xl font-bold">{data.hoursThisMonth}h</p></div>
                        <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground">{t('myPerformance.text4')}</p><p className="text-2xl font-bold">€{data.hoursThisMonth > 0 && data.commissionEarned > 0 ? Math.round(data.commissionEarned / data.hoursThisMonth) : 0}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="pipeline" className="space-y-6">
                <EarningsTab />
                {hasEmployeeProfile && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <CommissionsTracker commissions={data.commissions} isLoading={false} />
                    <PlacementHistory placements={data.commissions} isLoading={false} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="kpis" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('myPerformance.kpiHeading', 'Key Performance Indicators')}</h3>
                  <Select value={String(kpiDays)} onValueChange={v => setKpiDays(Number(v))}>
                    <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">{t('myPerformance.last7days', 'Last 7 days')}</SelectItem>
                      <SelectItem value="30">{t('myPerformance.last30days', 'Last 30 days')}</SelectItem>
                      <SelectItem value="60">{t('myPerformance.last60days', 'Last 60 days')}</SelectItem>
                      <SelectItem value="90">{t('myPerformance.last90days', 'Last 90 days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {user?.id && <RecruiterKPIDashboard userId={user.id} days={kpiDays} />}
                {user?.id && <BenchmarkComparison userId={user.id} />}
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <ActivityLoggerWidget />
                  <ActivityFeed userId={data.employeeProfile?.user_id || user?.id || ''} />
                </div>
              </TabsContent>

              <TabsContent value="development" className="space-y-6">
                <TrainingRecordsPanel />
                <OnboardingChecklist />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </RoleGate>
  );
}
