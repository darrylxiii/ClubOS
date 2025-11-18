import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DealHealthBadge } from "./DealHealthBadge";
import { Building2, Calendar, Users, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Deal } from "@/hooks/useDealPipeline";

interface DealCardProps {
  deal: Deal;
  onDragStart?: (deal: Deal) => void;
  onClick?: (deal: Deal) => void;
}

export function DealCard({ deal, onDragStart, onClick }: DealCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const weightedValue = (deal.estimated_value || 0) * (deal.deal_probability / 100);

  return (
    <Card
      className="p-4 cursor-move hover:shadow-lg transition-all border-border/50 bg-card/50 backdrop-blur-sm"
      draggable
      onDragStart={() => onDragStart?.(deal)}
      onClick={() => onClick?.(deal)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-semibold text-sm leading-tight text-foreground">
          {deal.title}
        </h4>
        <DealHealthBadge score={deal.deal_health_score} showLabel={false} size="sm" />
      </div>

      {/* Company */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Building2 className="h-3.5 w-3.5" />
        <span>{deal.company_name}</span>
      </div>

      {/* Value */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Weighted Value</div>
          <div className="font-semibold text-foreground">
            {formatCurrency(weightedValue)}
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {deal.deal_probability}%
        </Badge>
      </div>

      {/* Metrics */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{deal.active_candidates || 0}</span>
        </div>
        
        {deal.expected_close_date && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(deal.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(deal.last_activity_date), { addSuffix: true })}</span>
        </div>
      </div>
    </Card>
  );
}
