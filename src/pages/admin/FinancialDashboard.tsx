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
import { SubscriptionsTab } from "@/components/financial/SubscriptionsTab";

export default function FinancialDashboard() {
  const { selectedYear, setSelectedYear, yearOptions, availableYears } = useFinancialYearSelector();
  const { data: metrics, isLoading: metricsLoading } = useMoneybirdFinancials(selectedYear);
  const { isSyncing } = useAutoSyncFinancials(selectedYear);
  const { data: fees, isLoading: feesLoading } = usePlacementFeesWithContext(selectedYear);
  const { data: invoices, isLoading: invoicesLoading } = usePartnerInvoices();
  const { data: payouts, isLoading: payoutsLoading } = useReferralPayouts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-muted-foreground flex items-center gap-2">
          Real-time revenue tracking powered by Moneybird
          {isSyncing && (
            <InlineLoader text="Syncing..." className="text-primary" />
          )}
        </p>
        <YearSelector
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          yearOptions={yearOptions}
          availableYears={availableYears}
        />
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

      <CashFlowProjection year={selectedYear} />

      <div className="grid gap-6 md:grid-cols-2">
        <ProfitLossCard year={selectedYear} />
        <FinancialEventsTimeline />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moneybird Invoices</CardTitle>
          <CardDescription>Individual invoice records synced from Moneybird</CardDescription>
        </CardHeader>
        <CardContent>
          <MoneybirdInvoicesTable year={selectedYear} limit={20} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Pipeline</CardTitle>
          <CardDescription>Visual pipeline of expected revenue by collection status</CardDescription>
        </CardHeader>
        <CardContent>
          <CashFlowPipeline year={selectedYear} />
        </CardContent>
      </Card>

      <PlacementFeeHealth />

      <Tabs defaultValue="fees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fees">Placement Fees</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payouts">Referral Payouts</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="vat">VAT & Tax</TabsTrigger>
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

        <TabsContent value="subscriptions" className="space-y-4">
          <SubscriptionsTab />
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
      </Tabs>
    </div>
  );
}
