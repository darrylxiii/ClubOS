import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { PostProjectWizard } from "@/components/projects/client/PostProjectWizard";

export default function PostProjectPage() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'partner', 'strategist']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
          <PostProjectWizard />
        </div>
      </RoleGate>
    </AppLayout>
  );
}