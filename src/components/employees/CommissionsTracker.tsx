import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Building2,
  User,
  Briefcase
} from "lucide-react";
import { motion } from "framer-motion";
import { EmployeeCommission } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";
import { format } from "date-fns";

interface CommissionsTrackerProps {
  commissions: EmployeeCommission[];
  isLoading?: boolean;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  pending: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  approved: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: CheckCircle2 },
  paid: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: DollarSign },
  disputed: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertCircle },
};

export function CommissionsTracker({ commissions, isLoading }: CommissionsTrackerProps) {
  const [activeTab, setActiveTab] = useState("all");

  const filteredCommissions = activeTab === "all" 
    ? commissions 
    : commissions.filter(c => c.status === activeTab);

  const totals = {
    all: commissions.reduce((sum, c) => sum + c.gross_amount, 0),
    pending: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.gross_amount, 0),
    approved: commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.gross_amount, 0),
    paid: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.gross_amount, 0),
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Type', 'Candidate', 'Company', 'Job', 'Amount', 'Status'],
      ...commissions.map(c => [
        format(new Date(c.period_date), 'yyyy-MM-dd'),
        c.source_type,
        c.candidate_name || '',
        c.company_name || '',
        c.job_title || '',
        c.gross_amount.toString(),
        c.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Commissions Tracker
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1">
                {formatCurrency(totals.all)}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              <Badge variant="secondary" className="ml-1 bg-amber-500/10 text-amber-500">
                {formatCurrency(totals.pending)}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              Approved
              <Badge variant="secondary" className="ml-1 bg-blue-500/10 text-blue-500">
                {formatCurrency(totals.approved)}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-2">
              Paid
              <Badge variant="secondary" className="ml-1 bg-green-500/10 text-green-500">
                {formatCurrency(totals.paid)}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {filteredCommissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mb-2 opacity-50" />
                  <p>No commissions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCommissions.map((commission, index) => (
                    <CommissionItem 
                      key={commission.id} 
                      commission={commission} 
                      index={index}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CommissionItem({ commission, index }: { commission: EmployeeCommission; index: number }) {
  const config = statusConfig[commission.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="capitalize">
              {commission.source_type}
            </Badge>
            <Badge variant="outline" className={config.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {commission.status}
            </Badge>
          </div>
          
          <div className="space-y-1 mt-2">
            {commission.candidate_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{commission.candidate_name}</span>
              </div>
            )}
            {commission.company_name && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{commission.company_name}</span>
              </div>
            )}
            {commission.job_title && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{commission.job_title}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {format(new Date(commission.period_date), 'MMM d, yyyy')}
            {commission.commission_rate && (
              <span> • {commission.commission_rate}% of {formatCurrency(commission.placement_fee_base || 0)}</span>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-green-500">
            {formatCurrency(commission.gross_amount)}
          </p>
          {commission.net_amount && commission.net_amount !== commission.gross_amount && (
            <p className="text-xs text-muted-foreground">
              Net: {formatCurrency(commission.net_amount)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
