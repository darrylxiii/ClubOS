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

  const { data: company } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (!id) {
    return <div>Company ID not found</div>;
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

        <CompanyDomainsManager companyId={id} />
      </div>
    </div>
  );
}
