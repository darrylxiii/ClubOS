import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  X, 
  Minus,
  Star,
  Crown,
  Building2,
  TrendingUp,
  DollarSign,
  Calendar,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CandidateOffer } from '@/hooks/useCandidateOffers';

interface OfferComparisonTableProps {
  offers: CandidateOffer[];
  onSelectOffer?: (offerId: string) => void;
  highlightBest?: boolean;
}

interface ComparisonRow {
  label: string;
  key: string;
  type: 'currency' | 'percentage' | 'text' | 'boolean' | 'score';
  icon?: React.ReactNode;
}

const comparisonRows: ComparisonRow[] = [
  { label: 'Base Salary', key: 'base_salary', type: 'currency', icon: <DollarSign className="h-4 w-4" /> },
  { label: 'Bonus', key: 'bonus_percentage', type: 'percentage', icon: <Star className="h-4 w-4" /> },
  { label: 'Equity', key: 'equity_percentage', type: 'percentage', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Total Compensation', key: 'total_compensation', type: 'currency', icon: <Crown className="h-4 w-4" /> },
  { label: 'Market Percentile', key: 'salary_percentile', type: 'score', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Competitiveness', key: 'market_competitiveness_score', type: 'score', icon: <Star className="h-4 w-4" /> },
];

export function OfferComparisonTable({ 
  offers, 
  onSelectOffer,
  highlightBest = true 
}: OfferComparisonTableProps) {
  const formatValue = (value: any, type: ComparisonRow['type']): string => {
    if (value === null || value === undefined) return '—';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('nl-NL', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value}%`;
      case 'score':
        return `${Math.round(value)}`;
      case 'boolean':
        return value ? '✓' : '✗';
      default:
        return String(value);
    }
  };

  // Find best value for each metric
  const getBestValue = (key: string): number | null => {
    const values = offers.map(o => (o as any)[key]).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return null;
    return Math.max(...values);
  };

  const isBestValue = (offer: CandidateOffer, key: string): boolean => {
    if (!highlightBest) return false;
    const best = getBestValue(key);
    return best !== null && (offer as any)[key] === best;
  };

  // Calculate overall best offer
  const getBestOffer = (): string | null => {
    if (offers.length === 0) return null;
    
    // Simple scoring: highest total_compensation wins
    let bestId = offers[0].id;
    let bestComp = offers[0].total_compensation || 0;
    
    for (const offer of offers) {
      if ((offer.total_compensation || 0) > bestComp) {
        bestComp = offer.total_compensation || 0;
        bestId = offer.id;
      }
    }
    
    return bestId;
  };

  const bestOfferId = getBestOffer();

  if (offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No offers to compare</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left font-medium text-muted-foreground bg-muted/50 sticky left-0">
                Metric
              </th>
              {offers.map((offer) => (
                <th 
                  key={offer.id} 
                  className={cn(
                    "p-4 text-center min-w-[180px] relative",
                    bestOfferId === offer.id && highlightBest && "bg-primary/5"
                  )}
                >
                  {bestOfferId === offer.id && highlightBest && (
                    <Badge className="absolute -top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary">
                      <Crown className="h-3 w-3 mr-1" />
                      Best
                    </Badge>
                  )}
                  <div className="flex flex-col items-center gap-2 pt-2">
                    {offer.job?.companies?.logo_url ? (
                      <img 
                        src={offer.job.companies.logo_url} 
                        alt={offer.job.companies.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{offer.job?.title || 'Position'}</p>
                      <p className="text-xs text-muted-foreground">
                        {offer.job?.companies?.name || 'Company'}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Location row */}
            <tr className="border-b">
              <td className="p-4 bg-muted/50 sticky left-0">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Location</span>
                </div>
              </td>
              {offers.map((offer) => (
                <td 
                  key={offer.id} 
                  className={cn(
                    "p-4 text-center",
                    bestOfferId === offer.id && highlightBest && "bg-primary/5"
                  )}
                >
                  <span className="text-sm">
                    {offer.job?.location || '—'}
                  </span>
                </td>
              ))}
            </tr>

            {/* Comparison metrics */}
            {comparisonRows.map((row) => (
              <tr key={row.key} className="border-b">
                <td className="p-4 bg-muted/50 sticky left-0">
                  <div className="flex items-center gap-2">
                    {row.icon && <span className="text-muted-foreground">{row.icon}</span>}
                    <span className="font-medium">{row.label}</span>
                  </div>
                </td>
                {offers.map((offer) => {
                  const value = (offer as any)[row.key];
                  const isBest = isBestValue(offer, row.key);
                  
                  return (
                    <td 
                      key={offer.id} 
                      className={cn(
                        "p-4 text-center",
                        bestOfferId === offer.id && highlightBest && "bg-primary/5",
                        isBest && "font-semibold text-green-600"
                      )}
                    >
                      <span className="text-sm">
                        {formatValue(value, row.type)}
                        {isBest && row.key === 'total_compensation' && (
                          <Crown className="h-4 w-4 inline ml-1 text-amber-500" />
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Status row */}
            <tr className="border-b">
              <td className="p-4 bg-muted/50 sticky left-0">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Status</span>
                </div>
              </td>
              {offers.map((offer) => (
                <td 
                  key={offer.id} 
                  className={cn(
                    "p-4 text-center",
                    bestOfferId === offer.id && highlightBest && "bg-primary/5"
                  )}
                >
                  <Badge variant="outline" className="capitalize">
                    {offer.status || 'draft'}
                  </Badge>
                </td>
              ))}
            </tr>

            {/* Actions row */}
            {onSelectOffer && (
              <tr>
                <td className="p-4 bg-muted/50 sticky left-0">
                  <span className="font-medium">Action</span>
                </td>
                {offers.map((offer) => (
                  <td 
                    key={offer.id} 
                    className={cn(
                      "p-4 text-center",
                      bestOfferId === offer.id && highlightBest && "bg-primary/5"
                    )}
                  >
                    <Button 
                      size="sm"
                      variant={bestOfferId === offer.id ? "default" : "outline"}
                      onClick={() => onSelectOffer(offer.id)}
                    >
                      View Details
                    </Button>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
