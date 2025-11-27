import { PartnerAnalytics } from "@/components/partner/PartnerAnalytics";
import { EnhancedAnalytics } from "@/components/partner/EnhancedAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function PartnerAnalyticsDashboard() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompany() {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      setCompanyId(profile?.company_id || null);
      setLoading(false);
    }
    
    fetchCompany();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!companyId) {
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
      <PartnerAnalytics companyId={companyId} />
    </div>
  );
}
