// Phase 1: Role-Aware Analytics Dashboard
import { useTranslation } from 'react-i18next';
import { useRole } from "@/contexts/RoleContext";
import CandidateAnalyticsHub from "./CandidateAnalyticsHub";
import PartnerAnalyticsDashboard from "./PartnerAnalyticsDashboard";
import GlobalAnalytics from "./admin/GlobalAnalytics";

const Analytics = () => {
  const { t } = useTranslation('common');
  const { currentRole } = useRole();

  // Route to role-specific analytics dashboard
  if (currentRole === 'admin') {
    return <GlobalAnalytics />;
  }

  if (currentRole === 'partner') {
    return <PartnerAnalyticsDashboard />;
  }

  // Default: Candidate analytics hub (Performance + Salary + Career + Career Path)
  return <CandidateAnalyticsHub />;
};

export default Analytics;
