import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { AntiHackingDashboard } from '@/components/admin/security/AntiHackingDashboard';

export default function AntiHacking() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'company_admin']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <AntiHackingDashboard />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
