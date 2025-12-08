import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { EmployeeDetailView } from "@/components/employees/EmployeeDetailView";
import { useParams, useNavigate } from "react-router-dom";

export default function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <EmployeeDetailView 
            employeeId={employeeId} 
            onBack={() => navigate('/admin/employees')}
          />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
