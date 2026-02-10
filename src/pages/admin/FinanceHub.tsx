import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

const FinancialDashboard = lazy(() => import('@/pages/admin/FinancialDashboard'));
const DealsPipeline = lazy(() => import('@/pages/admin/DealsPipeline'));
const RevenueLadderPage = lazy(() => import('@/pages/admin/RevenueLadderPage'));
const CompanyFeeConfiguration = lazy(() => import('@/pages/admin/CompanyFeeConfiguration'));
const RevenueSharesPage = lazy(() => import('@/pages/admin/RevenueShares'));
const ExpenseTrackingPage = lazy(() => import('@/pages/admin/ExpenseTracking'));
const InvoiceReconciliationPage = lazy(() => import('@/pages/admin/InvoiceReconciliation'));
const MoneybirdSettings = lazy(() => import('@/pages/admin/MoneybirdSettings'));
const DealPipelineSettings = lazy(() => import('@/pages/admin/DealPipelineSettings'));

const TAB_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  pipeline: 'pipeline',
  'revenue-ladder': 'revenue-ladder',
  fees: 'fees',
  'revenue-shares': 'revenue-shares',
  expenses: 'expenses',
  reconciliation: 'reconciliation',
  moneybird: 'moneybird',
  'pipeline-settings': 'pipeline-settings',
};

export default function FinanceHub() {
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
              <DollarSign className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">FINANCE HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Revenue, fees, expenses, invoicing, inventory, and pipeline management
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="pipeline">Deal Pipeline</TabsTrigger>
              <TabsTrigger value="revenue-ladder">Revenue Ladder</TabsTrigger>
              <TabsTrigger value="fees">Company Fees</TabsTrigger>
              <TabsTrigger value="revenue-shares">Revenue Shares</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
              <TabsTrigger value="intangible">Intangible</TabsTrigger>
              <TabsTrigger value="kia">KIA</TabsTrigger>
              <TabsTrigger value="moneybird">Moneybird</TabsTrigger>
              <TabsTrigger value="pipeline-settings">Pipeline Settings</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="dashboard"><FinancialDashboard /></TabsContent>
              <TabsContent value="pipeline"><DealsPipeline /></TabsContent>
              <TabsContent value="revenue-ladder"><RevenueLadderPage /></TabsContent>
              <TabsContent value="fees"><CompanyFeeConfiguration /></TabsContent>
              <TabsContent value="revenue-shares"><RevenueSharesPage /></TabsContent>
              <TabsContent value="expenses"><ExpenseTrackingPage /></TabsContent>
              <TabsContent value="reconciliation"><InvoiceReconciliationPage /></TabsContent>
              <TabsContent value="inventory"><InventoryDashboard /></TabsContent>
              <TabsContent value="assets"><AssetRegister /></TabsContent>
              <TabsContent value="depreciation"><DepreciationSchedule /></TabsContent>
              <TabsContent value="intangible"><IntangibleAssets /></TabsContent>
              <TabsContent value="kia"><KIAOptimization /></TabsContent>
              <TabsContent value="moneybird"><MoneybirdSettings /></TabsContent>
              <TabsContent value="pipeline-settings"><DealPipelineSettings /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
