import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineLoader } from "@/components/ui/unified-loader";
import { SectionLoader } from "@/components/ui/unified-loader";
import { usePlacementFees, usePartnerInvoices, useReferralPayouts } from "@/hooks/useFinancialData";
import { PlacementFeesTable } from "@/components/financial/PlacementFeesTable";
import { InvoicesTable } from "@/components/financial/InvoicesTable";
import { PayoutApprovalQueue } from "@/components/financial/PayoutApprovalQueue";
import { FinancialOverviewChart } from "@/components/financial/FinancialOverviewChart";
import { RevenueSummaryCards } from "@/components/financial/RevenueSummaryCards";
import { TopClientsTable } from "@/components/financial/TopClientsTable";
import { PaymentAgingChart } from "@/components/financial/PaymentAgingChart";
import { YearSelector } from "@/components/financial/YearSelector";
import { InvoiceStatusSummary } from "@/components/financial/InvoiceStatusSummary";
import { MoneybirdInvoicesTable } from "@/components/financial/MoneybirdInvoicesTable";
import { ReconciliationAlert } from "@/components/financial/ReconciliationAlert";
import { CashFlowProjection } from "@/components/financial/CashFlowProjection";
import { ProfitLossCard } from "@/components/financial/ProfitLossCard";
import { FinancialEventsTimeline } from "@/components/financial/FinancialEventsTimeline";
import { MissingFeesAlert } from "@/components/financial/MissingFeesAlert";
import { useMoneybirdFinancials } from "@/hooks/useMoneybirdFinancials";
import { useFinancialYearSelector } from "@/hooks/useFinancialYearSelector";
import { useAutoSyncFinancials } from "@/hooks/useAutoSyncFinancials";
import { CashFlowPipeline } from "@/components/admin/revenue/CashFlowPipeline";
import { PlacementFeeHealth } from "@/components/admin/revenue/PlacementFeeHealth";
import { usePlacementFeesWithContext } from "@/hooks/usePlacementFeesWithContext";
import { VATLiabilityCard } from "@/components/financial/VATLiabilityCard";
import { VATRegisterTable } from "@/components/financial/VATRegisterTable";
import { EmployeeCommissionsTable } from "@/components/financial/EmployeeCommissionsTable";
import { FinancialExportMenu } from "@/components/financial/FinancialExportMenu";
import { CurrencySelector } from "@/components/financial/CurrencySelector";
import { useRole } from "@/contexts/RoleContext";
import { useState } from "react";
import { Currency, convertCurrency } from "@/lib/currencyConversion";
import { supabase } from "@/integrations/supabase/client";

export default function FinancialDashboard() {
  const { selectedYear, setSelectedYear, yearOptions, availableYears } = useFinancialYearSelector();
  const { data: metrics, isLoading: metricsLoading } = useMoneybirdFinancials(selectedYear);
  const { isSyncing } = useAutoSyncFinancials(selectedYear);
  const { data: fees, isLoading: feesLoading } = usePlacementFeesWithContext(selectedYear);
  const { data: invoices, isLoading: invoicesLoading } = usePartnerInvoices();
  const { data: payouts, isLoading: payoutsLoading } = useReferralPayouts();
  const { currentRole } = useRole();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('EUR');

  const isFinanceOrAdmin = currentRole === 'admin';
  const isStrategist = currentRole === 'strategist';

  // Export datasets
  const exportDatasets = [
    {
      label: 'Placement Fees',
      filename: 'placement-fees',
      getData: async () => {
        const { data } = await supabase
          .from('placement_fees')
          .select('*')
          .gte('created_at', `${selectedYear}-01-01`);
        return (data || []) as Record<string, unknown>[];
      },
    },
    {
      label: 'Invoices',
      filename: 'moneybird-invoices',
      getData: async () => {
        const { data } = await supabase
          .from('moneybird_sales_invoices')
          .select('*')
          .gte('invoice_date', `${selectedYear}-01-01`);
        return (data || []) as Record<string, unknown>[];
      },
    },
    {
      label: 'Operating Expenses',
      filename: 'operating-expenses',
      getData: async () => {
        const { data } = await supabase
          .from('operating_expenses')
          .select('*')
          .gte('expense_date', `${selectedYear}-01-01`);
        return (data || []) as Record<string, unknown>[];
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-muted-foreground flex items-center gap-2">
          Real-time revenue tracking powered by Moneybird
          {isSyncing && (
            <InlineLoader text="Syncing..." className="text-primary" />
          )}
        </p>
        <div className="flex items-center gap-2">
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
          {isFinanceOrAdmin && (
            <FinancialExportMenu datasets={exportDatasets} year={selectedYear} />
          )}
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            yearOptions={yearOptions}
            availableYears={availableYears}
          />
        </div>
      </div>

      <ReconciliationAlert year={selectedYear} />
      <MissingFeesAlert />

      <InvoiceStatusSummary year={selectedYear} />

      <RevenueSummaryCards metrics={metrics} isLoading={metricsLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Monthly invoiced vs collected revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialOverviewChart year={selectedYear} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Clients</CardTitle>
            <CardDescription>Highest revenue partners this year</CardDescription>
          </CardHeader>
          <CardContent>
            <TopClientsTable year={selectedYear} limit={5} />
          </CardContent>
        </Card>
        <PaymentAgingChart year={selectedYear} />
      </div>

      {/* Full P&L and cash flow -- admin only */}
      {isFinanceOrAdmin && (
        <>
          <CashFlowProjection year={selectedYear} />

          <div className="grid gap-6 md:grid-cols-2">
            <ProfitLossCard year={selectedYear} />
            <FinancialEventsTimeline />
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Moneybird Invoices</CardTitle>
          <CardDescription>Individual invoice records synced from Moneybird</CardDescription>
        </CardHeader>
        <CardContent>
          <MoneybirdInvoicesTable year={selectedYear} limit={20} />
        </CardContent>
      </Card>

      {isFinanceOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Pipeline</CardTitle>
            <CardDescription>Visual pipeline of expected revenue by collection status</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowPipeline year={selectedYear} />
          </CardContent>
        </Card>
      )}

      <PlacementFeeHealth />

      <Tabs defaultValue={isStrategist ? 'commissions' : 'fees'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="fees">Placement Fees</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          {isFinanceOrAdmin && (
            <>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payouts">Referral Payouts</TabsTrigger>
              <TabsTrigger value="vat">VAT & Tax</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Placement Fees</CardTitle>
              <CardDescription>Track and manage placement fees generated from hires</CardDescription>
            </CardHeader>
            <CardContent>
              {feesLoading ? (
                <SectionLoader text="Loading Fees..." className="min-h-[200px]" />
              ) : (
                <PlacementFeesTable fees={fees || []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <EmployeeCommissionsTable year={selectedYear} />
        </TabsContent>

        {isFinanceOrAdmin && (
          <>
            <TabsContent value="invoices" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Partner Invoices</CardTitle>
                  <CardDescription>Generate and manage invoices for partner companies</CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <SectionLoader text="Loading Invoices..." className="min-h-[200px]" />
                  ) : (
                    <InvoicesTable invoices={invoices || []} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payouts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Referral Payouts</CardTitle>
                  <CardDescription>Review and approve referral reward payouts</CardDescription>
                </CardHeader>
                <CardContent>
                  {payoutsLoading ? (
                    <SectionLoader text="Loading Payouts..." className="min-h-[200px]" />
                  ) : (
                    <PayoutApprovalQueue payouts={payouts || []} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vat" className="space-y-6">
              <VATLiabilityCard year={selectedYear} />
              <Card>
                <CardHeader>
                  <CardTitle>VAT Register</CardTitle>
                  <CardDescription>Quarterly VAT breakdown for BTW-aangifte filing</CardDescription>
                </CardHeader>
                <CardContent>
                  <VATRegisterTable year={selectedYear} />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
