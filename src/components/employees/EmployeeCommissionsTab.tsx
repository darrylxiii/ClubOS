import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import { useEmployeeCommissions, useEmployeeMetrics } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";

interface EmployeeCommissionsTabProps {
  employeeId: string;
}

export function EmployeeCommissionsTab({ employeeId }: EmployeeCommissionsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: commissions, isLoading } = useEmployeeCommissions(
    employeeId, 
    statusFilter === "all" ? undefined : statusFilter
  );
  const { data: metrics } = useEmployeeMetrics(employeeId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-500">Pending</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500/10 text-blue-500">Paid</Badge>;
      case 'disputed':
        return <Badge className="bg-red-500/10 text-red-500">Disputed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold">{formatCurrency(metrics?.total_commissions || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{formatCurrency(metrics?.pending_commissions || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Out</p>
                <p className="text-xl font-bold">{formatCurrency(metrics?.paid_commissions || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Placements</p>
                <p className="text-xl font-bold">{metrics?.placement_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commissions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>All commissions earned from placements</CardDescription>
            </div>
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {!commissions || commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No commissions found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ''}.
            </p>
          ) : (
            <div className="space-y-3">
              {commissions.map(commission => (
                <div 
                  key={commission.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {commission.candidate_name || 'Unknown Candidate'}
                      </p>
                      {getStatusBadge(commission.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {commission.job_title} at {commission.company_name || 'Unknown Company'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(commission.period_date).toLocaleDateString()}
                      {commission.commission_rate && ` • ${commission.commission_rate}% rate`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-500">
                      {formatCurrency(commission.gross_amount)}
                    </p>
                    {commission.net_amount && commission.net_amount !== commission.gross_amount && (
                      <p className="text-xs text-muted-foreground">
                        Net: {formatCurrency(commission.net_amount)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
