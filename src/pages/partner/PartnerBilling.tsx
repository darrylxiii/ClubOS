import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGate } from "@/components/RoleGate";
import { useRole } from "@/contexts/RoleContext";
import { Loader2 } from "lucide-react";
import { usePartnerInvoices } from "@/hooks/useFinancialData";
import { BillingDetailsForm } from "@/components/financial/BillingDetailsForm";
import { PartnerInvoicesView } from "@/components/financial/PartnerInvoicesView";

export default function PartnerBilling() {
  const { companyId } = useRole();
  const { data: invoices, isLoading } = usePartnerInvoices(companyId || undefined);
  const [activeTab, setActiveTab] = useState("billing-details");

  return (
    <AppLayout>
      <RoleGate allowedRoles={['partner', 'company_admin']} showLoading>
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Billing & Invoices</h1>
            <p className="text-muted-foreground">
              Manage your billing details and view invoices
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="billing-details">Billing Details</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="billing-details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                  <CardDescription>
                    Update your company billing details for invoicing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BillingDetailsForm companyId={companyId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Your Invoices</CardTitle>
                  <CardDescription>
                    View and download your placement fee invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <PartnerInvoicesView invoices={invoices || []} />
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
