// Phase 1: Role-Aware Analytics Dashboard
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import CandidateAnalytics from "./CandidateAnalytics";
import PartnerAnalyticsDashboard from "./PartnerAnalyticsDashboard";
import GlobalAnalytics from "./admin/GlobalAnalytics";

const Analytics = () => {
  const { user } = useAuth();
  const { currentRole } = useRole();

  // Route to role-specific analytics dashboard
  if (currentRole === 'admin') {
    return <GlobalAnalytics />;
  }

  if (currentRole === 'partner') {
    return <PartnerAnalyticsDashboard />;
  }

  // Default: Candidate analytics
  return <CandidateAnalytics />;
};

export default Analytics;
