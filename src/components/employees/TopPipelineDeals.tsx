import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase } from 'lucide-react';
import { formatCurrency, type PipelineDeal } from '@/hooks/useEmployeePipelineValue';

interface TopPipelineDealsProps {
  deals: PipelineDeal[];
  isLoading?: boolean;
}

const stageBadgeVariants: Record<string, string> = {
  Applied: 'bg-muted text-muted-foreground',
  Screening: 'bg-blue-500/10 text-blue-500',
  Interview: 'bg-amber-500/10 text-amber-500',
  Offer: 'bg-purple-500/10 text-purple-500',
  Hired: 'bg-green-500/10 text-green-500',
};

export function TopPipelineDeals({ deals, isLoading }: TopPipelineDealsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Briefcase className="h-4 w-4" />
          Top Pipeline Deals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No deals in pipeline yet. Start sourcing!
          </p>
        ) : (
          deals.map((deal, idx) => (
            <div
              key={deal.application_id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg font-bold text-muted-foreground w-6">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{deal.candidate_full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {deal.job_title} @ {deal.company_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge className={stageBadgeVariants[deal.stage_name] || 'bg-muted'}>
                  {deal.stage_name}
                </Badge>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(deal.weighted_value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(deal.probability * 100)}% prob
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
