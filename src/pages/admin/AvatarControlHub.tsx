import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DashboardHeader } from '@/components/admin/shared/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Radio, Shield, Clock, Users } from 'lucide-react';
import { useAvatarAccounts } from '@/hooks/useAvatarAccounts';
import { useAvatarSessions } from '@/hooks/useAvatarSessions';
import { AvatarAccountGrid } from '@/components/avatar-control/AvatarAccountGrid';
import { StartSessionModal } from '@/components/avatar-control/StartSessionModal';
import { AvatarAccountForm } from '@/components/avatar-control/AvatarAccountForm';
import { AvatarSessionTimeline } from '@/components/avatar-control/AvatarSessionTimeline';
import { ActiveSessionBanner } from '@/components/avatar-control/ActiveSessionBanner';
import type { AvatarAccount } from '@/hooks/useAvatarAccounts';

export default function AvatarControlHub() {
  const { data: accounts = [], isLoading, refetch } = useAvatarAccounts();
  const { activeSessions, data: allSessions = [] } = useAvatarSessions();
  const [selectedAccount, setSelectedAccount] = useState<AvatarAccount | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [timelineAccountId, setTimelineAccountId] = useState<string | null>(null);

  const atRiskCount = accounts.filter(a => a.risk_level !== 'low').length;

  const handleStartSession = (account: AvatarAccount) => {
    setSelectedAccount(account);
    setSessionModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <ActiveSessionBanner />

        <DashboardHeader
          title="Account Traffic Control"
          description="Manage LinkedIn avatar sessions. Prevent double logins and monitor account usage."
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
          actions={
            <Button onClick={() => setAddAccountOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
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
                  <div className="space-y-4">
                    {/* Show combined timeline from all accounts */}
                    <div className="space-y-1">
                      {(allSessions ?? []).slice(0, 30).map((session: any) => {
                        const accountLabel = session.linkedin_avatar_accounts?.label ?? 'Unknown';
                        const userName = session.profiles?.full_name ?? 'Unknown';
                        return (
                          <div key={session.id} className="flex items-center gap-3 text-xs py-2 border-b border-border/50">
                            <div className={`h-2 w-2 rounded-full shrink-0 ${
                              session.status === 'active' ? 'bg-red-500 animate-pulse' :
                              session.status === 'completed' ? 'bg-emerald-500' :
                              'bg-amber-500'
                            }`} />
                            <span className="font-medium w-32 truncate">{accountLabel}</span>
                            <span className="text-muted-foreground w-28 truncate">{userName}</span>
                            <span className="text-muted-foreground">{session.purpose}</span>
                            <span className="text-muted-foreground ml-auto shrink-0">
                              {new Date(session.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
                              {new Date(session.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No sessions yet.</p>
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
      </div>
    </AppLayout>
  );
}
