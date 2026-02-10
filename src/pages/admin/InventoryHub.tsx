import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

const InventoryDashboard = lazy(() => import('@/pages/admin/inventory/InventoryDashboard'));
const AssetRegister = lazy(() => import('@/pages/admin/inventory/AssetRegister'));
const DepreciationSchedule = lazy(() => import('@/pages/admin/inventory/DepreciationSchedule'));
const IntangibleAssets = lazy(() => import('@/pages/admin/inventory/IntangibleAssets'));
const KIAOptimization = lazy(() => import('@/pages/admin/inventory/KIAOptimization'));

const TAB_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  assets: 'assets',
  depreciation: 'depreciation',
  intangible: 'intangible',
  kia: 'kia',
};

export default function InventoryHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'dashboard';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'dashboard' ? {} : { tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">INVENTORY HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Asset register, depreciation schedules, intangible assets, and KIA optimization
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
              <TabsTrigger value="intangible">Intangible</TabsTrigger>
              <TabsTrigger value="kia">KIA</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="dashboard"><InventoryDashboard /></TabsContent>
              <TabsContent value="assets"><AssetRegister /></TabsContent>
              <TabsContent value="depreciation"><DepreciationSchedule /></TabsContent>
              <TabsContent value="intangible"><IntangibleAssets /></TabsContent>
              <TabsContent value="kia"><KIAOptimization /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
