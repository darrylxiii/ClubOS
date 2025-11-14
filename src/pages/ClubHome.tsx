import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { CandidateHome } from "@/components/clubhome/CandidateHome";
import { PartnerHome } from "@/components/clubhome/PartnerHome";
import { AdminHome } from "@/components/clubhome/AdminHome";
import { ClubHomeHeader } from "@/components/clubhome/ClubHomeHeader";
import { BackgroundVideo } from "@/components/BackgroundVideo";

const ClubHome = () => {
  const { currentRole: role, loading: roleLoading } = useRole();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Combined loading state - only check loading states, not role value
  const isReady = !roleLoading && !authLoading;

  console.log('🏠 [ClubHome] State:', {
    roleLoading,
    authLoading,
    isReady,
    role,
    user: !!user
  });

  // Show simple loading state
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const effectiveRole = role || 'user';

  const renderRoleView = () => {
    switch (effectiveRole) {
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
      <BackgroundVideo />

      <div className="relative z-10 container mx-auto py-8 space-y-8 animate-fade-in">
        <ClubHomeHeader role={effectiveRole} />
        <div className="glass-card">
          {renderRoleView()}
        </div>
      </div>
    </AppLayout>
  );
};

export default ClubHome;
