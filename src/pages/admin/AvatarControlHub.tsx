import { useState } from 'react';
import { DashboardHeader } from '@/components/admin/shared/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Radio, Shield, Clock, Users, RefreshCw, Loader2, Briefcase, AlertTriangle, Edit3, BarChart3 } from 'lucide-react';
import { useAvatarAccounts } from '@/hooks/useAvatarAccounts';
import { useAvatarSessions } from '@/hooks/useAvatarSessions';
import { useJobInsights } from '@/hooks/useSessionJobs';
import { AvatarAccountGrid } from '@/components/avatar-control/AvatarAccountGrid';
import { StartSessionModal } from '@/components/avatar-control/StartSessionModal';
import { AvatarAccountForm } from '@/components/avatar-control/AvatarAccountForm';
import { AvatarSessionTimeline } from '@/components/avatar-control/AvatarSessionTimeline';
import { ActiveSessionBanner } from '@/components/avatar-control/ActiveSessionBanner';
import { TimeCorrectionDialog } from '@/components/avatar-control/TimeCorrectionDialog';
import type { AvatarAccount } from '@/hooks/useAvatarAccounts';

export default function AvatarControlHub() {
  const { data: accounts = [], isLoading, refetch, bulkSync } = useAvatarAccounts();
  const { activeSessions, data: allSessions = [] } = useAvatarSessions();
  const { data: jobInsights = [] } = useJobInsights();
  const [selectedAccount, setSelectedAccount] = useState<AvatarAccount | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [timelineAccountId, setTimelineAccountId] = useState<string | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<{
    sessionJobId: string;
    sessionId: string;
    originalMinutes: number;
    jobTitle: string;
  } | null>(null);

  const atRiskCount = accounts.filter(a => a.risk_level !== 'low').length;
  const syncableAccounts = accounts.filter(a => a.linkedin_url);

  const handleStartSession = (account: AvatarAccount) => {
    setSelectedAccount(account);
    setSessionModalOpen(true);
  };

  const handleBulkSync = () => {
    if (syncableAccounts.length === 0) return;
    bulkSync.mutate(syncableAccounts.map(a => ({ id: a.id, linkedin_url: a.linkedin_url! })));
  };

  const getSessionDuration = (session: any) => {
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    return Math.round((end.getTime() - new Date(session.started_at).getTime()) / 60000);
  };

  const getAnomalyBadge = (session: any) => {
    const flags = session.anomaly_flags ?? [];
    if (flags.includes('possibly_abandoned')) {
      return <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px]">Possibly left running</Badge>;
    }
    if (flags.includes('suspiciously_short')) {
      return <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px]">Very short</Badge>;
    }
    // Also flag dynamically for active sessions
    if (session.status === 'completed') {
      const duration = getSessionDuration(session);
      const expected = Math.round(
        (new Date(session.expected_end_at).getTime() - new Date(session.started_at).getTime()) / 60000
      );
      if (duration > expected * 2) {
        return <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px]">Over 2x expected</Badge>;
      }
      if (duration < 5) {
        return <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px]">{'< 5 min'}</Badge>;
      }
    }
    return null;
  };

  return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <ActiveSessionBanner />

        <DashboardHeader
          title="Account Traffic Control"
          description="Manage LinkedIn avatar sessions. Prevent double logins and monitor account usage."
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
          actions={
            <div className="flex items-center gap-2">
              {syncableAccounts.length > 0 && (
                <Button variant="outline" onClick={handleBulkSync} disabled={bulkSync.isPending}>
                  {bulkSync.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync All ({syncableAccounts.length})
                </Button>
              )}
              <Button onClick={() => setAddAccountOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{accounts.length}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total Accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-400" />
                <span className="text-2xl font-bold">{activeSessions.length}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active Sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span className="text-2xl font-bold">
                  {accounts.filter(a => a.status === 'available').length - activeSessions.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="text-2xl font-bold">{atRiskCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">At Risk</p>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="history">Session History</TabsTrigger>
            <TabsTrigger value="job-insights">
              <BarChart3 className="h-3.5 w-3.5 mr-1" />
              Job Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-4">
            <AvatarAccountGrid
              accounts={accounts}
              activeSessions={activeSessions}
              onStartSession={handleStartSession}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {accounts.length > 0 ? (
                  <div className="space-y-1">
                    {(allSessions ?? []).slice(0, 50).map((session: any) => {
                      const accountLabel = session.linkedin_avatar_accounts?.label ?? 'Unknown';
                      const userName = session.profiles?.full_name ?? 'Unknown';
                      const jobTitle = session.jobs?.title ?? '—';
                      const duration = getSessionDuration(session);
                      const anomaly = getAnomalyBadge(session);
                      // Get the primary session_job for correction
                      const sessionJobRows = session.linkedin_avatar_session_jobs ?? [];
                      const primarySessionJob = sessionJobRows.find((sj: any) => sj.is_primary) ?? sessionJobRows[0];

                      return (
                        <div key={session.id} className="flex items-center gap-3 text-xs py-2 border-b border-border/50">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${
                            session.status === 'active' ? 'bg-red-500 animate-pulse' :
                            session.status === 'completed' ? 'bg-emerald-500' :
                            'bg-amber-500'
                          }`} />
                          <span className="font-medium w-28 truncate">{accountLabel}</span>
                          <span className="text-muted-foreground w-24 truncate">{userName}</span>
                          <span className="text-muted-foreground w-36 truncate flex items-center gap-1">
                            <Briefcase className="h-3 w-3 shrink-0" />
                            {jobTitle}
                          </span>
                          <span className="text-muted-foreground w-16">{duration} min</span>
                          {anomaly}
                          <span className="text-muted-foreground truncate">{session.purpose}</span>
                          <span className="text-muted-foreground ml-auto shrink-0">
                            {new Date(session.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
                            {new Date(session.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {session.status === 'completed' && primarySessionJob && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => setCorrectionTarget({
                                sessionJobId: primarySessionJob.id,
                                sessionId: session.id,
                                originalMinutes: primarySessionJob.minutes_logged ?? duration,
                                jobTitle: primarySessionJob.jobs?.title ?? jobTitle,
                              })}
                              title="Correct time"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No sessions yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="job-insights" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Job Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobInsights.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2 border-b border-border">
                      <span className="w-48">Job</span>
                      <span className="w-24">Company</span>
                      <span className="w-20 text-right">Sessions</span>
                      <span className="w-20 text-right">Total Time</span>
                      <span className="w-20 text-right">Avg / Session</span>
                      <span className="w-20 text-right">Accounts</span>
                      <span className="w-28">Last Activity</span>
                    </div>
                    {jobInsights.map(insight => (
                      <div key={insight.job_id} className="flex items-center gap-3 text-xs py-2.5 border-b border-border/50">
                        <span className="w-48 font-medium truncate">{insight.job_title}</span>
                        <span className="w-24 text-muted-foreground truncate">{insight.company_name ?? '—'}</span>
                        <span className="w-20 text-right">{insight.total_sessions}</span>
                        <span className="w-20 text-right font-medium">
                          {insight.total_minutes >= 60
                            ? `${Math.floor(insight.total_minutes / 60)}h ${insight.total_minutes % 60}m`
                            : `${insight.total_minutes}m`}
                        </span>
                        <span className="w-20 text-right text-muted-foreground">{insight.avg_session_minutes}m</span>
                        <span className="w-20 text-right">{insight.unique_accounts}</span>
                        <span className="w-28 text-muted-foreground">
                          {insight.last_activity
                            ? new Date(insight.last_activity).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No job data yet. Start a session linked to a job to see insights.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <StartSessionModal
          account={selectedAccount}
          open={sessionModalOpen}
          onOpenChange={setSessionModalOpen}
        />
        <AvatarAccountForm open={addAccountOpen} onOpenChange={setAddAccountOpen} />

        {correctionTarget && (
          <TimeCorrectionDialog
            open={!!correctionTarget}
            onOpenChange={(open) => { if (!open) setCorrectionTarget(null); }}
            sessionJobId={correctionTarget.sessionJobId}
            sessionId={correctionTarget.sessionId}
            originalMinutes={correctionTarget.originalMinutes}
            jobTitle={correctionTarget.jobTitle}
          />
        )}
      </div>
  );
}
