import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyDomainsManager } from "@/components/interactions/CompanyDomainsManager";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function CompanyDomainsSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      if (!id) throw new Error("No company identifier provided");
      
      // Try to find by UUID first
      const { data: companyById, error: idError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (companyById) return companyById;

      // If not found by UUID, try by slug
      const { data: companyBySlug, error: slugError } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", id)
        .maybeSingle();

      if (companyBySlug) return companyBySlug;

      // If still not found, try by name (case-insensitive)
      const { data: companyByName, error: nameError } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", id)
        .maybeSingle();

      if (companyByName) return companyByName;

      throw new Error("Company not found");
    },
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company not specified</h2>
          <Button onClick={() => navigate("/companies")}>
            Go to Companies
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Loading company...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company not found</h2>
          <Button onClick={() => navigate("/companies")}>
            Go to Companies
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Domain Settings</h1>
          {company && (
            <p className="text-muted-foreground mt-2">
              Configure tracked email domains for {company.name}
            </p>
          )}
        </div>

        <CompanyDomainsManager companyId={company.id} />
      </div>
    </div>
  );
}
