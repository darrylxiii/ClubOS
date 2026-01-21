import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ProjectContract, ProjectMilestone } from "@/types/projects";
import { ContractInvoice } from "@/hooks/usePartnerContracts";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  PieChart
} from "lucide-react";

interface ContractBudgetDashboardProps {
  contracts: (ProjectContract & { project_milestones?: ProjectMilestone[] })[];
  invoices: ContractInvoice[];
}

export function ContractBudgetDashboard({ contracts, invoices }: ContractBudgetDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Calculate aggregate stats
  const stats = contracts.reduce((acc, contract) => {
    const milestones = contract.project_milestones || [];
    const totalBudget = contract.total_budget || 0;
    const paidAmount = milestones
      .filter(m => m.status === 'paid')
      .reduce((sum, m) => sum + m.amount, 0);
    const pendingAmount = milestones
      .filter(m => m.status === 'approved')
      .reduce((sum, m) => sum + m.amount, 0);
    const inProgressAmount = milestones
      .filter(m => m.status === 'in_progress' || m.status === 'submitted')
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      totalBudget: acc.totalBudget + totalBudget,
      paidAmount: acc.paidAmount + paidAmount,
      pendingAmount: acc.pendingAmount + pendingAmount,
      inProgressAmount: acc.inProgressAmount + inProgressAmount,
    };
  }, { totalBudget: 0, paidAmount: 0, pendingAmount: 0, inProgressAmount: 0 });

  const spendProgress = stats.totalBudget > 0 
    ? (stats.paidAmount / stats.totalBudget) * 100 
    : 0;

  // Group contracts by status
  const contractsByStatus = {
    active: contracts.filter(c => c.contract_status === 'active'),
    completed: contracts.filter(c => c.contract_status === 'completed'),
    pending: contracts.filter(c => c.contract_status === 'pending_signature'),
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total Budget</span>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(stats.totalBudget)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Across {contracts.length} contracts
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Paid Out</span>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(stats.paidAmount)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {spendProgress.toFixed(1)}% of total budget
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Pending Release</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600">
              {formatCurrency(stats.pendingAmount)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Awaiting your approval
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">In Progress</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(stats.inProgressAmount)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Active milestone work
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spend Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Budget Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Spend</span>
                <span className="text-sm font-medium">{spendProgress.toFixed(1)}%</span>
              </div>
              <Progress value={spendProgress} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.paidAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Paid</div>
              </div>
              <div className="text-center p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(stats.pendingAmount + stats.inProgressAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Committed</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="text-2xl font-bold text-muted-foreground">
                  {formatCurrency(stats.totalBudget - stats.paidAmount - stats.pendingAmount - stats.inProgressAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contracts.map((contract) => {
              const milestones = contract.project_milestones || [];
              const totalBudget = contract.total_budget || 0;
              const paidAmount = milestones
                .filter(m => m.status === 'paid')
                .reduce((sum, m) => sum + m.amount, 0);
              const progress = totalBudget > 0 ? (paidAmount / totalBudget) * 100 : 0;

              return (
                <div 
                  key={contract.id}
                  className="p-4 border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-foreground">
                        {contract.project_id}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {milestones.length} milestones
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-foreground">
                        {formatCurrency(totalBudget)}
                      </div>
                      <Badge variant={
                        contract.contract_status === 'active' ? 'default' :
                        contract.contract_status === 'completed' ? 'secondary' :
                        'outline'
                      }>
                        {contract.contract_status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-green-600">
                      {formatCurrency(paidAmount)} paid
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(totalBudget - paidAmount)} remaining
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
