import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Check, 
  X, 
  MessageSquare,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CandidateOffer } from '@/hooks/useCandidateOffers';

interface OfferCardProps {
  offer: CandidateOffer;
  onAccept?: () => void;
  onDecline?: () => void;
  onNegotiate?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
  sent: { label: 'Pending Review', color: 'bg-amber-500/10 text-amber-500', icon: <Clock className="h-3 w-3" /> },
  viewed: { label: 'Under Review', color: 'bg-blue-500/10 text-blue-500', icon: <Clock className="h-3 w-3" /> },
  accepted: { label: 'Accepted', color: 'bg-green-500/10 text-green-500', icon: <Check className="h-3 w-3" /> },
  declined: { label: 'Declined', color: 'bg-red-500/10 text-red-500', icon: <X className="h-3 w-3" /> },
  negotiating: { label: 'Negotiating', color: 'bg-purple-500/10 text-purple-500', icon: <MessageSquare className="h-3 w-3" /> },
  expired: { label: 'Expired', color: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
};

export function OfferCard({ 
  offer, 
  onAccept, 
  onDecline, 
  onNegotiate,
  onViewDetails,
  compact = false 
}: OfferCardProps) {
  const status = statusConfig[offer.status || 'draft'];
  const company = offer.job?.companies;
  const job = offer.job;

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isActionable = ['sent', 'viewed', 'negotiating'].includes(offer.status || '');
  const expiresIn = offer.expires_at 
    ? formatDistanceToNow(new Date(offer.expires_at), { addSuffix: true })
    : null;

  if (compact) {
    return (
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onViewDetails}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {company?.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{job?.title || 'Position'}</p>
                <p className="text-sm text-muted-foreground truncate">{company?.name || 'Company'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(offer.total_compensation)}</p>
                <Badge className={cn("text-xs", status.color)}>
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{job?.title || 'Position'}</CardTitle>
              <p className="text-sm text-muted-foreground">{company?.name || 'Company'}</p>
              {job?.location && (
                <p className="text-xs text-muted-foreground">{job.location}</p>
              )}
            </div>
          </div>
          <Badge className={cn("text-xs shrink-0", status.color)}>
            {status.icon}
            <span className="ml-1">{status.label}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Compensation breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Base Salary</p>
            <p className="font-semibold">{formatCurrency(offer.base_salary)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Bonus</p>
            <p className="font-semibold">{offer.bonus_percentage ? `${offer.bonus_percentage}%` : '—'}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Equity</p>
            <p className="font-semibold">{offer.equity_percentage ? `${offer.equity_percentage}%` : '—'}</p>
          </div>
        </div>

        {/* Total compensation highlight */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="font-medium">Total Compensation</span>
          </div>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(offer.total_compensation)}
          </span>
        </div>

        {/* Market comparison */}
        {offer.market_competitiveness_score && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              {offer.salary_percentile ? `${offer.salary_percentile}th percentile` : ''} 
              {offer.market_competitiveness_score > 80 && ' • Competitive offer'}
            </span>
          </div>
        )}

        {/* AI recommendation snippet */}
        {offer.ai_recommendation?.summary && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">QUIN Analysis</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {offer.ai_recommendation.summary}
            </p>
          </div>
        )}

        {/* Expiry warning */}
        {expiresIn && isActionable && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Calendar className="h-4 w-4" />
            <span>Expires {expiresIn}</span>
          </div>
        )}

        {/* Actions */}
        {isActionable && (
          <div className="flex gap-2 pt-2">
            {offer.status !== 'negotiating' && (
              <>
                <Button 
                  onClick={onAccept} 
                  className="flex-1"
                  variant="default"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button 
                  onClick={onDecline} 
                  variant="outline"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </>
            )}
            <Button 
              onClick={onNegotiate} 
              variant="secondary"
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {offer.status === 'negotiating' ? 'Continue' : 'Negotiate'}
            </Button>
          </div>
        )}

        {onViewDetails && (
          <Button 
            onClick={onViewDetails} 
            variant="ghost" 
            className="w-full"
          >
            View Full Details
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
