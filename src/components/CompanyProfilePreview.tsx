import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Users, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CompanyProfilePreviewProps {
  companyId: string;
}

interface CompanyData {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  tagline: string | null;
  industry: string | null;
  headquarters_location: string | null;
  company_size: string | null;
  membership_tier: string | null;
}

export function CompanyProfilePreview({ companyId }: CompanyProfilePreviewProps) {
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const { data } = await supabase
          .from("companies")
          .select("id, name, slug, logo_url, tagline, industry, headquarters_location, company_size, membership_tier")
          .eq("id", companyId)
          .eq("is_active", true)
          .single();

        setCompany(data);
      } catch (error) {
        console.error("Error loading company preview:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, [companyId]);

  const handleViewCompany = () => {
    if (company?.slug) {
      navigate(`/companies/${company.slug}`);
    } else {
      console.error('Company slug is missing:', company);
      toast.error('Unable to navigate to company page');
    }
  };

  if (loading) {
    return (
      <Card className="w-80 glass backdrop-blur-xl border-accent/30 shadow-glass-xl">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  if (!company) return null;

  return (
    <Card className="w-80 glass backdrop-blur-xl border-accent/30 shadow-glass-xl animate-scale-in">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="w-16 h-16 border-2 border-accent ring-4 ring-accent/20">
            <AvatarImage
              src={company.logo_url || undefined}
              className="object-contain w-full h-full"
            />
            <AvatarFallback className="text-lg font-black bg-gradient-accent text-white">
              {company.name?.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-lg truncate">{company.name}</h3>
              {company.membership_tier === 'premium' && (
                <Badge className="bg-accent text-accent-foreground flex-shrink-0">
                  Premium
                </Badge>
              )}
            </div>
            {company.tagline && (
              <p className="text-sm text-muted-foreground truncate">
                {company.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {company.industry && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{company.industry}</span>
            </div>
          )}
          {company.headquarters_location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{company.headquarters_location}</span>
            </div>
          )}
          {company.company_size && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{company.company_size}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2">
          <Button
            onClick={handleViewCompany}
            variant="default"
            size="sm"
            className="w-full gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Company Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
