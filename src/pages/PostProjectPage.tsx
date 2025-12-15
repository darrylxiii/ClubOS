import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { PostProjectWizard } from "@/components/projects/client/PostProjectWizard";

export default function PostProjectPage() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'partner', 'strategist']}>
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <PostProjectWizard />
        </div>
      </RoleGate>
    </AppLayout>
  );
}