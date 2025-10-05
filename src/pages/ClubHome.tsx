import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import { CandidateHome } from "@/components/clubhome/CandidateHome";
import { PartnerHome } from "@/components/clubhome/PartnerHome";
import { AdminHome } from "@/components/clubhome/AdminHome";
import { ClubHomeHeader } from "@/components/clubhome/ClubHomeHeader";

const ClubHome = () => {
  const { role, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to auth if no role after loading
    if (!loading && !role) {
      navigate("/auth");
    }
  }, [loading, role, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const renderRoleView = () => {
    switch (role) {
      case 'admin':
        return <AdminHome />;
      case 'partner':
        return <PartnerHome />;
      case 'strategist':
        return <CandidateHome />; // Strategists see candidate view by default
      case 'user':
      default:
        return <CandidateHome />;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <ClubHomeHeader role={role} />
        {renderRoleView()}
      </div>
    </AppLayout>
  );
};

export default ClubHome;
