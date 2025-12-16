import { RoleGate } from "@/components/RoleGate";
import { AdminRevenueShareManager } from "@/components/admin/AdminRevenueShareManager";
import { AppLayout } from "@/components/AppLayout";

export default function RevenueSharesPage() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <h1 className="text-3xl font-bold mb-6">Revenue Shares</h1>
          <AdminRevenueShareManager />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
