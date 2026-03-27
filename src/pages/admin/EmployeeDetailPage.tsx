import { useTranslation } from 'react-i18next';
import { RoleGate } from "@/components/RoleGate";
import { EmployeeDetailView } from "@/components/employees/EmployeeDetailView";
import { useParams, useNavigate } from "react-router-dom";

export default function EmployeeDetailPage() {
  const { t } = useTranslation('admin');
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <EmployeeDetailView 
          employeeId={employeeId} 
          onBack={() => navigate('/admin/employees')}
        />
      </div>
    </RoleGate>
  );
}
