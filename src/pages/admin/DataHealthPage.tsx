import { AppLayout } from "@/components/AppLayout";
import { DataHealthDashboard } from "@/components/admin/DataHealthDashboard";

export default function DataHealthPage() {
  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <DataHealthDashboard />
      </div>
    </AppLayout>
  );
}
