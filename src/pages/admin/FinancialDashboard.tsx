import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGate } from "@/components/RoleGate";
import { Loader2, DollarSign, FileText, Clock, TrendingUp } from "lucide-react";
import { useFinancialStats, usePlacementFees, usePartnerInvoices, useReferralPayouts } from "@/hooks/useFinancialData";
import { PlacementFeesTable } from "@/components/financial/PlacementFeesTable";
import { InvoicesTable } from "@/components/financial/InvoicesTable";
import { PayoutApprovalQueue } from "@/components/financial/PayoutApprovalQueue";
import { FinancialOverviewChart } from "@/components/financial/FinancialOverviewChart";
import { PartnerFeeConfig } from "@/components/financial/PartnerFeeConfig";
import { ReferrerSplitsManager } from "@/components/financial/ReferrerSplitsManager";
import { ProjectedEarnings } from "@/components/financial/ProjectedEarnings";

export default function FinancialDashboard() {
  const { data: stats, isLoading: statsLoading } = useFinancialStats();
  const { data: fees, isLoading: feesLoading } = usePlacementFees();
  const { data: invoices, isLoading: invoicesLoading } = usePartnerInvoices();
  const { data: payouts, isLoading: payoutsLoading } = useReferralPayouts();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']} showLoading>
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Financial Dashboard</h1>
            <p className="text-muted-foreground">
              Manage placement fees, invoices, payments, and referral payouts
            </p>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Placement Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(stats?.totalPlacementRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(stats?.paidPlacementRevenue || 0)} collected
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(stats?.outstandingInvoices || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.overdueInvoices || 0} overdue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.pendingFees || 0}</div>
                    <p className="text-xs text-muted-foreground">Not yet invoiced</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(stats?.pendingPayouts || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.pendingPayoutCount || 0} awaiting approval
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Overview Chart */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                  <CardDescription>Monthly placement revenue and payment trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <FinancialOverviewChart />
                </CardContent>
              </Card>

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
            </>
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
}
