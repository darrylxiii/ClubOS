import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Briefcase, Calendar, DollarSign, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { InvoiceForReconciliation, PlacementFeeForReconciliation } from "./types";
import { cn } from "@/lib/utils";

interface PlacementLinkStepProps {
  invoice: InvoiceForReconciliation;
  placementFees: PlacementFeeForReconciliation[];
  selectedPlacement: PlacementFeeForReconciliation | null;
  onSelect: (placement: PlacementFeeForReconciliation | null) => void;
  isLoading: boolean;
}

export function PlacementLinkStep({ 
  invoice, 
  placementFees, 
  selectedPlacement, 
  onSelect,
  isLoading 
}: PlacementLinkStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getVarianceStatus = (feeAmount: number) => {
    const variance = Math.abs(invoice.total_amount - feeAmount);
    const variancePercent = (variance / invoice.total_amount) * 100;
    
    if (variancePercent < 1) return { status: 'exact', color: 'text-green-600', label: 'Exact match' };
    if (variancePercent < 5) return { status: 'close', color: 'text-amber-600', label: 'Close match' };
    return { status: 'variance', color: 'text-red-600', label: 'Variance detected' };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invoice amount reference */}
      <Card className="bg-muted/50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Invoice amount:</span>
            <span className="font-bold text-lg">{formatCurrency(invoice.total_amount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Option to skip placement linking */}
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:bg-accent/50",
          selectedPlacement === null && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={() => onSelect(null)}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <XCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Not a placement fee</p>
              <p className="text-sm text-muted-foreground">
                This invoice is for retainer, consulting, or other services
              </p>
            </div>
            {selectedPlacement === null && (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Placement fees list */}
      {placementFees.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No unlinked placement fees found for this company</p>
            <p className="text-sm mt-1">
              You can still reconcile this invoice without linking to a placement
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Available Placements</p>
            <Badge variant="outline">{placementFees.length} unlinked</Badge>
          </div>

          <ScrollArea className="h-[280px] border rounded-lg">
            <div className="p-2 space-y-2">
              {placementFees.map((fee) => {
                const variance = getVarianceStatus(fee.fee_amount);
                const varianceAmount = invoice.total_amount - fee.fee_amount;
                
                return (
                  <Card
                    key={fee.id}
                    className={cn(
                      "cursor-pointer transition-all hover:bg-accent/50",
                      selectedPlacement?.id === fee.id && "ring-2 ring-primary bg-primary/5"
                    )}
                    onClick={() => onSelect(fee)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{fee.candidate_name}</span>
                            {selectedPlacement?.id === fee.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {fee.job_title}
                            </span>
                            {fee.hired_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(fee.hired_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>

                          {fee.base_salary && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Base salary: {formatCurrency(fee.base_salary)} 
                              {fee.fee_percentage && ` @ ${fee.fee_percentage}%`}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="font-bold">{formatCurrency(fee.fee_amount)}</span>
                          </div>
                          
                          <div className={cn("flex items-center gap-1 mt-1 text-xs", variance.color)}>
                            {variance.status === 'exact' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <span>{variance.label}</span>
                          </div>

                          {variance.status !== 'exact' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {varianceAmount > 0 ? '+' : ''}{formatCurrency(varianceAmount)} diff
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Selected placement summary */}
      {selectedPlacement && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Linked Placement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedPlacement.candidate_name}</p>
                <p className="text-sm text-muted-foreground">{selectedPlacement.job_title}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(selectedPlacement.fee_amount)}</p>
                {Math.abs(invoice.total_amount - selectedPlacement.fee_amount) > 0.01 && (
                  <p className="text-xs text-amber-600">
                    Variance: {formatCurrency(invoice.total_amount - selectedPlacement.fee_amount)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
