import { AppLayout } from "@/components/AppLayout";
import { CompanyAchievements } from "@/components/partner/CompanyAchievements";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const CompanyAchievementsPage = () => {
  const { currentRole, companyId, loading } = useRole();

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (currentRole !== 'partner' || !companyId) {
    return <Navigate to="/home" replace />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
            Company Achievements
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage and showcase your company's achievements
          </p>
        </div>
        <CompanyAchievements companyId={companyId} />
      </div>
    </AppLayout>
  );
};

export default CompanyAchievementsPage;
