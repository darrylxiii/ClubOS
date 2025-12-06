import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { CompanyFeeManagement } from "@/components/financial/CompanyFeeManagement";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Building2 } from "lucide-react";

export default function CompanyFeeConfiguration() {
  return (
    <RoleGate allowedRoles={["admin", "strategist"]} showLoading>
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/deals">Deal Pipeline</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Company Fees</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Company Fee Configuration</h1>
              <p className="text-muted-foreground mt-1">
                Manage placement fee percentages for accurate revenue calculations
              </p>
            </div>
          </div>

          {/* Main Content */}
          <CompanyFeeManagement />
        </div>
      </AppLayout>
    </RoleGate>
  );
}
