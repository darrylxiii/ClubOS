import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  BarChart3, 
  Target, 
  Clock, 
  DollarSign,
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Wallet,
  LogIn,
  Timer,
} from "lucide-react";
import { RecruiterKPIDashboard } from "./RecruiterKPIDashboard";
import { EmployeeTargetsTab } from "./EmployeeTargetsTab";
import { EmployeeTimeTab } from "./EmployeeTimeTab";
import { EmployeeCommissionsTab } from "./EmployeeCommissionsTab";
import { EmployeeEarningsTab } from "./EmployeeEarningsTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useStrategistWorkload } from "@/hooks/useStrategistWorkload";
import { BenchmarkComparison } from "./BenchmarkComparison";
import { HistoricalTrendsChart } from "./HistoricalTrendsChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmployeeDetailViewProps {
  employeeId?: string;
  employee?: any;
  onBack?: () => void;
  onClose?: () => void;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const EmployeeDetailView = ({ employeeId, employee: passedEmployee, onBack, onClose }: EmployeeDetailViewProps) => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState("overview");
  const [kpiDays, setKpiDays] = useState(30);

  const { data: fetchedEmployee, isLoading } = useQuery({
    queryKey: ['employee-detail', employeeId],
    queryFn: async () => {
      const { data: emp, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('id', employeeId!)
        .single();
      
      if (error) throw error;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, phone')
        .eq('id', emp.user_id)
        .single();
      
      return { ...emp, profile };
    },
    enabled: !!employeeId && !passedEmployee,
  });

  const employee = passedEmployee || fetchedEmployee;
  const userId = employee?.user_id;

  // Fetch activity stats for overview
  const { data: activityStats } = useQuery({
    queryKey: ['employee-activity-stats', userId],
    queryFn: async () => {
      const [activityRes, meetingsRes] = await Promise.all([
        supabase.from('user_activity_tracking').select('session_count, total_session_duration_minutes, last_login_at').eq('user_id', userId!).maybeSingle(),
        supabase.from('meeting_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId!),
      ]);
      return {
        sessionCount: activityRes.data?.session_count || 0,
        totalMinutes: activityRes.data?.total_session_duration_minutes || 0,
        lastLogin: activityRes.data?.last_login_at || null,
        meetingsAttended: meetingsRes.count || 0,
      };
    },
    enabled: !!userId,
  });

  const { data: workloads } = useStrategistWorkload();
  const memberStats = workloads?.find(w => w.id === employee?.user_id);

  if ((isLoading && !passedEmployee) || !employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const profile = employee.profile || employee.profiles;
  const handleBack = onBack || onClose;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {handleBack && (
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label={t('actions.goBack')}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        
        <div className="flex items-start gap-4 flex-1">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-lg">
              {profile?.full_name?.charAt(0) || 'E'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile?.full_name || t('employees.employee')}</h1>
            <p className="text-muted-foreground">{employee.job_title}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {profile?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
              )}
              {profile?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {profile.phone}
                </div>
              )}
              {employee.department && (
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {employee.department}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active ? t('employees.active') : t('employees.inactive')}
            </Badge>
            <Badge variant="outline">{employee.employment_type}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('employees.overview')}
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('employees.kpis')}
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t('employees.targets')}
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('employees.time')}
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('employees.commissions')}
          </TabsTrigger>
          <TabsTrigger value="earnings" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t('employees.earnings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('employees.employmentDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('employees.jobTitle')}</span>
                  <span className="font-medium">{employee.job_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('employees.department')}</span>
                  <span className="font-medium">{employee.department || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('employees.employmentType')}</span>
                  <span className="font-medium">{employee.employment_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('employees.startDate')}</span>
                  <span className="font-medium">
                    {employee.start_date ? new Date(employee.start_date).toLocaleDateString() : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('employees.compensation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('employees.baseSalary')}</span>
                  <span className="font-medium">
                    €{employee.base_salary?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('employees.commissionRate')}</span>
                  <span className="font-medium">
                    {employee.commission_percentage ? `${employee.commission_percentage}%` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('employees.commissionStructure')}</span>
                  <span className="font-medium">{employee.commission_structure || '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            {memberStats && (
              <Card className="md:col-span-2 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
                <CardHeader><CardTitle className="text-base">{t('employees.performanceSummary', 'Performance Summary')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{memberStats.performanceScore}</p>
                      <p className="text-[10px] text-muted-foreground">Score /100</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">#{memberStats.rank}</p>
                      <p className="text-[10px] text-muted-foreground">Team Rank</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{memberStats.placements}</p>
                      <p className="text-[10px] text-muted-foreground">Placements</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">${memberStats.revenue >= 1000 ? `${(memberStats.revenue / 1000).toFixed(0)}k` : memberStats.revenue}</p>
                      <p className="text-[10px] text-muted-foreground">Revenue</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{memberStats.pipelineActions}</p>
                      <p className="text-[10px] text-muted-foreground">Actions (7d)</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{memberStats.candidatesSourced}</p>
                      <p className="text-[10px] text-muted-foreground">Sourced</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Stats */}
            {activityStats && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>{t('employees.activityOverview')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <LogIn className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t('employees.totalLogins')}</div>
                        <div className="text-lg font-bold">{activityStats.sessionCount}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Timer className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t('employees.timeOnline')}</div>
                        <div className="text-lg font-bold">{formatDuration(activityStats.totalMinutes)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t('employees.lastLogin')}</div>
                        <div className="text-sm font-medium">
                          {activityStats.lastLogin
                            ? formatDistanceToNow(new Date(activityStats.lastLogin), { addSuffix: true })
                            : t('employees.never', 'Never')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t('employees.meetings')}</div>
                        <div className="text-lg font-bold">{activityStats.meetingsAttended}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          {employee?.user_id && (
            <div className="grid gap-6 lg:grid-cols-2 mt-6">
              <BenchmarkComparison userId={employee.user_id} />
              <HistoricalTrendsChart userId={employee.user_id} months={6} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="kpis" className="mt-6">
          <div className="flex justify-end mb-4">
            <Select value={String(kpiDays)} onValueChange={(v) => setKpiDays(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('employees.selectPeriod', 'Select period')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RecruiterKPIDashboard userId={employee.user_id} days={kpiDays} />
        </TabsContent>

        <TabsContent value="targets" className="mt-6">
          <EmployeeTargetsTab employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          <EmployeeTimeTab userId={employee.user_id} />
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <EmployeeCommissionsTab employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="earnings" className="mt-6">
          <EmployeeEarningsTab employeeId={employee.id} userId={employee.user_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
