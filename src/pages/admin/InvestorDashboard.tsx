import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * Investor Dashboard - redirects to Due Diligence Center
 * The SaaS-focused metrics (MRR, subscriptions, cohorts) have been deprecated
 * in favor of the Moneybird-integrated Due Diligence Center which shows
 * actual placement revenue data with investor-grade analytics.
 */
export default function InvestorDashboard() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/due-diligence", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
