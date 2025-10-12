import { AppLayout } from "@/components/AppLayout";
import { AdminAchievementsManager } from "@/components/admin/AdminAchievementsManager";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AdminAchievementsPage = () => {
  const { currentRole, loading } = useRole();

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (currentRole !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <AdminAchievementsManager />
      </div>
    </AppLayout>
  );
};

export default AdminAchievementsPage;
