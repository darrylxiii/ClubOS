import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGate } from "@/components/RoleGate";
import { Loader2 } from "lucide-react";
import { useFinancialStats, usePlacementFees, usePartnerInvoices, useReferralPayouts } from "@/hooks/useFinancialData";
import { PlacementFeesTable } from "@/components/financial/PlacementFeesTable";
import { InvoicesTable } from "@/components/financial/InvoicesTable";
import { PayoutApprovalQueue } from "@/components/financial/PayoutApprovalQueue";
import { FinancialOverviewChart } from "@/components/financial/FinancialOverviewChart";
import { RevenueSummaryCards } from "@/components/financial/RevenueSummaryCards";
import { TopClientsTable } from "@/components/financial/TopClientsTable";
import { PaymentAgingChart } from "@/components/financial/PaymentAgingChart";
import { YearSelector } from "@/components/financial/YearSelector";
import { useMoneybirdFinancials } from "@/hooks/useMoneybirdFinancials";
import { useFinancialYearSelector } from "@/hooks/useFinancialYearSelector";

export default function FinancialDashboard() {
  const { selectedYear, setSelectedYear, yearOptions, availableYears } = useFinancialYearSelector();
  const { data: metrics, isLoading: metricsLoading } = useMoneybirdFinancials(selectedYear);
  const { data: fees, isLoading: feesLoading } = usePlacementFees();
  const { data: invoices, isLoading: invoicesLoading } = usePartnerInvoices();
  const { data: payouts, isLoading: payoutsLoading } = useReferralPayouts();

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']} showLoading>
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Financial Dashboard</h1>
              <p className="text-muted-foreground">
                Real-time revenue tracking powered by Moneybird
              </p>
            </div>
            <YearSelector
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              yearOptions={yearOptions}
              availableYears={availableYears}
            />
          </div>

          {/* Revenue Summary Cards */}
          <div className="mb-8">
            <RevenueSummaryCards metrics={metrics} isLoading={metricsLoading} />
          </div>

          {/* Financial Overview Chart */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Monthly invoiced vs collected revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialOverviewChart year={selectedYear} />
            </CardContent>
          </Card>

          {/* Top Clients and Payment Aging */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
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

          {/* Detailed Tables */}
          <Tabs defaultValue="fees" className="space-y-4">
            <TabsList>
              <TabsTrigger value="fees">Placement Fees</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payouts">Referral Payouts</TabsTrigger>
            </TabsList>

            <TabsContent value="fees" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Placement Fees</CardTitle>
                  <CardDescription>
                    Track and manage placement fees generated from hires
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feesLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <PlacementFeesTable fees={fees || []} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Partner Invoices</CardTitle>
                  <CardDescription>
                    Generate and manage invoices for partner companies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
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
                  <CardDescription>
                    Review and approve referral reward payouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payoutsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <PayoutApprovalQueue payouts={payouts || []} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}