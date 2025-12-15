import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { DisputeCenter } from "@/components/projects/disputes/DisputeCenter";

export default function ProjectDisputesPage() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto py-8 px-4">
          <DisputeCenter />
        </div>
      </RoleGate>
    </AppLayout>
  );
}