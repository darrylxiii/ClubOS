import { AppLayout } from "@/components/AppLayout";
import { DataHealthDashboard } from "@/components/admin/DataHealthDashboard";

export default function DataHealthPage() {
  return (
    <AppLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <DataHealthDashboard />
      </div>
    </AppLayout>
  );
}
