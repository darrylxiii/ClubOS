import { ArchivedCandidatesView } from "@/components/admin/ArchivedCandidatesView";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";

export default function ArchivedCandidates() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist', 'partner']}>
        <div className="container mx-auto py-6">
          <ArchivedCandidatesView />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
