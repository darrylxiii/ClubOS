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


            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="pipeline">Deal Pipeline</TabsTrigger>
              <TabsTrigger value="revenue-ladder">Revenue Ladder</TabsTrigger>
              <TabsTrigger value="fees">Company Fees</TabsTrigger>
              <TabsTrigger value="revenue-shares">Revenue Shares</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
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
              <TabsContent value="moneybird"><MoneybirdSettings /></TabsContent>
              <TabsContent value="pipeline-settings"><DealPipelineSettings /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
