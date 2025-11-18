import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDealPipeline } from "@/hooks/useDealPipeline";

export function MissingFeeWarning() {
  const navigate = useNavigate();
  const { data: deals } = useDealPipeline();

  // Find unique companies with missing fee percentage
  const companiesWithoutFee = deals?.reduce((acc, deal) => {
    const companies = deal.companies as any;
    if (!companies?.placement_fee_percentage && !acc.some(c => c.id === deal.company_id)) {
      acc.push({
        id: deal.company_id,
        name: deal.company_name,
      });
    }
    return acc;
  }, [] as Array<{ id: string; name: string }>);

  if (!companiesWithoutFee || companiesWithoutFee.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Missing Fee Configuration</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-2">
        <p>
          {companiesWithoutFee.length} {companiesWithoutFee.length === 1 ? 'company has' : 'companies have'} no placement fee percentage configured. 
          Revenue calculations will be inaccurate for these deals.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {companiesWithoutFee.slice(0, 5).map((company) => (
            <Button
              key={company.id}
              variant="outline"
              size="sm"
              onClick={() => navigate(`/company/${company.id}/settings`)}
              className="bg-background"
            >
              Configure {company.name}
            </Button>
          ))}
          {companiesWithoutFee.length > 5 && (
            <span className="text-xs text-muted-foreground self-center">
              +{companiesWithoutFee.length - 5} more
            </span>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
