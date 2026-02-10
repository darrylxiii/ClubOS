import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

const MemberRequestsPage = lazy(() => import('@/pages/admin/MemberRequestsPage'));
const MergeDashboard = lazy(() => import('@/pages/admin/MergeDashboard'));
const ArchivedCandidates = lazy(() => import('@/pages/ArchivedCandidates'));
const ClubSyncRequestsPage = lazy(() => import('@/pages/admin/ClubSyncRequestsPage'));
const AdminRejections = lazy(() => import('@/pages/AdminRejections'));
const EmailTemplateManager = lazy(() => import('@/pages/admin/EmailTemplateManager'));

const TAB_MAP: Record<string, string> = {
  requests: 'requests',
  merge: 'merge',
  archived: 'archived',
  sync: 'sync',
  rejections: 'rejections',
  emails: 'emails',
};

export default function TalentHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'requests';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'requests' ? {} : { tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">TALENT HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Member requests, profile merges, rejections, and email templates
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 h-auto">
                <TabsTrigger value="requests">Requests</TabsTrigger>
                <TabsTrigger value="merge">Merge</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
                <TabsTrigger value="sync">Club Sync</TabsTrigger>
                <TabsTrigger value="rejections">Rejections</TabsTrigger>
                <TabsTrigger value="emails">Email Templates</TabsTrigger>
              </TabsList>
            </div>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="requests"><MemberRequestsPage /></TabsContent>
              <TabsContent value="merge"><MergeDashboard /></TabsContent>
              <TabsContent value="archived"><ArchivedCandidates /></TabsContent>
              <TabsContent value="sync"><ClubSyncRequestsPage /></TabsContent>
              <TabsContent value="rejections"><AdminRejections /></TabsContent>
              <TabsContent value="emails"><EmailTemplateManager /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
