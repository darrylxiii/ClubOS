import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/revenueCalculations";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle, Target } from "lucide-react";
import { useState } from "react";
import { useRevenueForecasting } from "@/hooks/useRevenueForecasting";

interface CashFlowProjectionProps {
  year?: number;
}

export function CashFlowProjection({ year }: CashFlowProjectionProps) {
  const [includePipeline, setIncludePipeline] = useState(true);
  const currentYear = year || new Date().getFullYear();

  const {
    periods,
    totalOutstanding,
    totalOutstandingVAT,
    avgDSO,
    unpaidCount,
    pendingCommissions,
    pendingPayouts,
    pipelineTotal,
    pipelineDealsCount,
    isLoading,
  } = useRevenueForecasting(currentYear, includePipeline);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cash Flow Projection
            </CardTitle>
            <CardDescription>
              30/60/90 day forecast based on outstanding invoices{includePipeline ? " and pipeline" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="include-pipeline"
              checked={includePipeline}
              onCheckedChange={setIncludePipeline}
            />
            <Label htmlFor="include-pipeline" className="text-sm text-muted-foreground">
              Include Pipeline
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Outstanding AR (Net)
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalOutstanding)}</p>
            <p className="text-xs text-muted-foreground">{unpaidCount} invoices</p>
          </div>
          <div className="bg-warning/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              VAT Reserve
            </div>
            <p className="text-xl font-bold text-warning">{formatCurrency(totalOutstandingVAT)}</p>
            <p className="text-xs text-muted-foreground">Owed to Belastingdienst</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Avg DSO
            </div>
            <p className="text-xl font-bold">{avgDSO} days</p>
            <p className="text-xs text-muted-foreground">Days to collect</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              Pending Commissions
            </div>
            <p className="text-xl font-bold">{formatCurrency(pendingCommissions)}</p>
            <p className="text-xs text-muted-foreground">To be paid</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              Pending Payouts
            </div>
            <p className="text-xl font-bold">{formatCurrency(pendingPayouts)}</p>
            <p className="text-xs text-muted-foreground">Referral rewards</p>
          </div>
          {includePipeline && (
            <div className="bg-primary/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                Pipeline (weighted)
              </div>
              <p className="text-xl font-bold">{formatCurrency(pipelineTotal)}</p>
              <p className="text-xs text-muted-foreground">{pipelineDealsCount} active deals</p>
            </div>
          )}
        </div>

        {/* 30/60/90 Day Projections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {periods.map((period) => (
            <div
              key={period.label}
              className="border rounded-lg p-4 space-y-3"
            >
              <h4 className="font-semibold text-center">{period.label}</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Invoice Collections</span>
                  <span className="font-medium text-success">
                    +{formatCurrency(period.expectedCollections)}
                  </span>
                </div>
                {includePipeline && period.pipelineRevenue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pipeline Revenue</span>
                    <span className="font-medium text-primary">
                      +{formatCurrency(period.pipelineRevenue)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expected Payouts</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(period.expectedPayouts)}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Net Cash Flow</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      period.netCashFlow >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {period.netCashFlow >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatCurrency(period.netCashFlow)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
