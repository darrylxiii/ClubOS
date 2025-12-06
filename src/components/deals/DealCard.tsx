import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DealHealthBadge } from "./DealHealthBadge";
import { Building2, Calendar, Users, TrendingUp, AlertCircle, Rocket, CheckCircle, Percent, DollarSign, Calculator } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Deal } from "@/hooks/useDealPipeline";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DealCardProps {
  deal: Deal;
  onDragStart?: (deal: Deal) => void;
  onClick?: (deal: Deal) => void;
  onPublish?: (dealId: string) => void;
}

type FeeType = 'percentage' | 'fixed' | 'hybrid';

const FEE_TYPE_CONFIG: Record<FeeType, { icon: typeof Percent; label: string; className: string }> = {
  percentage: { icon: Percent, label: '%', className: 'bg-primary/10 text-primary border-primary/20' },
  fixed: { icon: DollarSign, label: 'Fixed', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  hybrid: { icon: Calculator, label: 'Hybrid', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
};

export function DealCard({ deal, onDragStart, onClick, onPublish }: DealCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const companies = deal.companies as any;
  const feeType = (companies?.fee_type || 'percentage') as FeeType;
  const feePercentage = companies?.placement_fee_percentage;
  const feeFixed = companies?.placement_fee_fixed;
  const hasFeeConfigured = (feePercentage !== null && feePercentage !== undefined && feePercentage > 0) 
    || (feeFixed !== null && feeFixed !== undefined && feeFixed > 0);
  
  // Calculate weighted value based on fee type
  let feeAmount = 0;
  const baseSalary = deal.estimated_value || 0;
  if (feeType === 'fixed' && feeFixed) {
    feeAmount = feeFixed;
  } else if (feePercentage) {
    feeAmount = baseSalary * (feePercentage / 100);
  }
  const weightedValue = feeAmount * (deal.deal_probability / 100);
  
  const feeConfig = FEE_TYPE_CONFIG[feeType];
  const FeeIcon = feeConfig.icon;

  return (
    <Card
      className="p-4 cursor-move hover:shadow-lg transition-all border-border/50 bg-card/50 backdrop-blur-sm"
      draggable
      onDragStart={() => onDragStart?.(deal)}
      onClick={() => onClick?.(deal)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm leading-tight text-foreground">
            {deal.title}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <DealHealthBadge score={deal.deal_health_score} showLabel={false} size="sm" />
          {deal.status === 'draft' && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              DRAFT
            </Badge>
          )}
          {deal.status === 'published' && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Published
            </Badge>
          )}
        </div>
      </div>

      {/* Company */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Building2 className="h-3.5 w-3.5" />
        <span>{deal.company_name}</span>
        {!hasFeeConfigured && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Missing fee percentage configuration</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Value */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {feeType === 'fixed' 
                ? `Fixed Fee: €${feeFixed?.toLocaleString() || 'N/A'}` 
                : hasFeeConfigured 
                  ? `${feePercentage}% of salary` 
                  : 'Fee not set'}
            </span>
            <Badge variant="outline" className={`text-[10px] px-1 py-0 ${feeConfig.className}`}>
              <FeeIcon className="h-2.5 w-2.5 mr-0.5" />
              {feeConfig.label}
            </Badge>
          </div>
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

      {/* Activate Button for Draft Jobs */}
      {deal.status === 'draft' && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onPublish?.(deal.id);
            }}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Activate Job
          </Button>
        </div>
      )}
    </Card>
  );
}
