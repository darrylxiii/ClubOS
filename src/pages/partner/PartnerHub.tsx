import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const PartnerAnalyticsDashboard = lazy(() => import('@/pages/PartnerAnalyticsDashboard'));
const BillingDashboard = lazy(() => import('@/pages/partner/BillingDashboard'));
const SLADashboard = lazy(() => import('@/pages/partner/SLADashboard'));
const IntegrationsManagement = lazy(() => import('@/pages/partner/IntegrationsManagement'));
const AuditLog = lazy(() => import('@/pages/partner/AuditLog'));
const PartnerRejections = lazy(() => import('@/pages/PartnerRejections'));
const PartnerTargetCompanies = lazy(() => import('@/pages/PartnerTargetCompanies'));
const SocialManagement = lazy(() => import('@/pages/SocialManagement'));

const TAB_MAP: Record<string, string> = {
  analytics: 'analytics',
  billing: 'billing',
  sla: 'sla',
  integrations: 'integrations',
  'audit-log': 'audit-log',
  rejections: 'rejections',
  'target-companies': 'target-companies',
  social: 'social',
};

export default function PartnerHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'analytics';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'analytics' ? {} : { tab: value }, { replace: true });
  };

  return (
    <RoleGate allowedRoles={['partner', 'admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">PARTNER HUB</h1>
          </div>
          <p className="text-muted-foreground">
            Analytics, billing, SLA, integrations and partner operations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="h-auto inline-flex bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="sla">SLA</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
              <TabsTrigger value="rejections">Rejections</TabsTrigger>
              <TabsTrigger value="target-companies">Target Companies</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <Suspense fallback={<PageLoader />}>
            <TabsContent value="analytics">
              <PartnerAnalyticsDashboard />
            </TabsContent>
            <TabsContent value="billing">
              <BillingDashboard />
            </TabsContent>
            <TabsContent value="sla">
              <SLADashboard />
            </TabsContent>
            <TabsContent value="integrations">
              <IntegrationsManagement />
            </TabsContent>
            <TabsContent value="audit-log">
              <AuditLog />
            </TabsContent>
            <TabsContent value="rejections">
              <PartnerRejections />
            </TabsContent>
            <TabsContent value="target-companies">
              <PartnerTargetCompanies />
            </TabsContent>
            <TabsContent value="social">
              <SocialManagement />
            </TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </RoleGate>
  );
}
