import { PartnerAnalytics } from "@/components/partner/PartnerAnalytics";
import { useAuth } from "@/hooks/useAuth";

export default function PartnerAnalyticsDashboard() {
  const { profile } = useAuth();

  if (!profile?.company_id) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">No company associated with your account</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Hiring Analytics</h1>
        <p className="text-muted-foreground">Comprehensive insights into your hiring performance</p>
      </div>
      <PartnerAnalytics companyId={profile.company_id} />
    </div>
  );
}
