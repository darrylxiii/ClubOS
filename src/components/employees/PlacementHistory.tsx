import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Award, 
  Building2, 
  User, 
  Briefcase,
  Calendar,
  ExternalLink,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { EmployeeCommission } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PlacementHistoryProps {
  placements: EmployeeCommission[];
  isLoading?: boolean;
}

export function PlacementHistory({ placements, isLoading }: PlacementHistoryProps) {
  const navigate = useNavigate();

  const placementCommissions = placements.filter(c => c.source_type === 'placement');
  const totalRevenue = placementCommissions.reduce((sum, c) => sum + c.gross_amount, 0);
  const avgPlacementValue = placementCommissions.length > 0
    ? totalRevenue / placementCommissions.length
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Placement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/50 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Placement History
          </CardTitle>
          <Badge variant="secondary">
            {placementCommissions.length} placements
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="text-lg font-semibold text-green-500">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Avg per Placement</p>
            <p className="text-lg font-semibold">
              {formatCurrency(avgPlacementValue)}
            </p>
          </div>
        </div>

        {/* Placements Timeline */}
        <ScrollArea className="h-[400px] pr-4">
          {placementCommissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Award className="h-8 w-8 mb-2 opacity-50" />
              <p>No placements yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {placementCommissions.map((placement, index) => (
                  <PlacementItem 
                    key={placement.id} 
                    placement={placement} 
                    index={index}
                    onViewDetails={() => {
                      if (placement.source_id) {
                        navigate(`/applications/${placement.source_id}`);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PlacementItem({ 
  placement, 
  index,
  onViewDetails 
}: { 
  placement: EmployeeCommission; 
  index: number;
  onViewDetails: () => void;
}) {
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-blue-500',
    paid: 'bg-green-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative pl-10"
    >
      {/* Timeline dot */}
      <div className={`absolute left-2.5 w-3 h-3 rounded-full ${statusColors[placement.status] || 'bg-muted'}`} />

      <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(new Date(placement.period_date), 'MMM d, yyyy')}
              </span>
              <Badge variant="outline" className="capitalize text-xs">
                {placement.status}
              </Badge>
            </div>

            {placement.candidate_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium">{placement.candidate_name}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
              {placement.company_name && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {placement.company_name}
                </div>
              )}
              {placement.job_title && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  {placement.job_title}
                </div>
              )}
            </div>

            {placement.placement_fee_base && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {placement.commission_rate}% of {formatCurrency(placement.placement_fee_base)} fee
                </span>
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-lg font-semibold text-green-500">
              {formatCurrency(placement.gross_amount)}
            </p>
            {placement.source_id && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-1 h-7 text-xs gap-1"
                onClick={onViewDetails}
              >
                View <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
