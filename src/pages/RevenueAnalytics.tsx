import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * Revenue Analytics page - redirects to Financial Dashboard
 * The SaaS-focused metrics (MRR, ARR, subscriptions) have been deprecated
 * in favor of the Moneybird-integrated Financial Dashboard which shows
 * actual placement revenue data.
 */
export default function RevenueAnalytics() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/financial", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
