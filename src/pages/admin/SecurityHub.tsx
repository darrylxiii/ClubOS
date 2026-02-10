import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

const AntiHacking = lazy(() => import('@/pages/admin/AntiHacking'));
const SecurityEventDashboard = lazy(() => import('@/pages/admin/SecurityEventDashboard'));
const AdminAuditLog = lazy(() => import('@/pages/admin/AdminAuditLog'));
const ErrorLogs = lazy(() => import('@/pages/admin/ErrorLogs'));
const GodMode = lazy(() => import('@/pages/admin/GodMode'));
const DisasterRecoveryPage = lazy(() => import('@/pages/admin/DisasterRecoveryPage'));

const TAB_MAP: Record<string, string> = {
  'anti-hacking': 'anti-hacking',
  events: 'events',
  'audit-log': 'audit-log',
  'error-logs': 'error-logs',
  'god-mode': 'god-mode',
  'disaster-recovery': 'disaster-recovery',
};

export default function SecurityHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'anti-hacking';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'anti-hacking' ? {} : { tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'company_admin']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">SECURITY HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Threat monitoring, audit trails, and incident response
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="anti-hacking">Anti-Hacking</TabsTrigger>
              <TabsTrigger value="events">Security Events</TabsTrigger>
              <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
              <TabsTrigger value="error-logs">Error Logs</TabsTrigger>
              <TabsTrigger value="god-mode">God Mode</TabsTrigger>
              <TabsTrigger value="disaster-recovery">Disaster Recovery</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="anti-hacking"><AntiHacking /></TabsContent>
              <TabsContent value="events"><SecurityEventDashboard /></TabsContent>
              <TabsContent value="audit-log"><AdminAuditLog /></TabsContent>
              <TabsContent value="error-logs"><ErrorLogs /></TabsContent>
              <TabsContent value="god-mode"><GodMode /></TabsContent>
              <TabsContent value="disaster-recovery"><DisasterRecoveryPage /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
