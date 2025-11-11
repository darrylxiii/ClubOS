import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Shield
} from "lucide-react";
import { ProjectContract, ProjectMilestone } from "@/types/projects";
import { format } from "date-fns";

interface PaymentScheduleProps {
  contract: ProjectContract;
  milestones: ProjectMilestone[];
  view: 'freelancer' | 'client';
}

export function PaymentSchedule({ contract, milestones, view }: PaymentScheduleProps) {
  const totalEarned = milestones
    .filter(m => m.status === 'paid')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const totalBudget = Number(contract.total_budget || 0);
  const progress = totalBudget > 0 ? (totalEarned / totalBudget) * 100 : 0;

  const platformFee = totalBudget * (Number(contract.platform_fee_percentage || 12) / 100);
  const netAmount = totalBudget - platformFee;

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'approved':
      case 'submitted':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="p-6 border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment Schedule
        </h3>
        
        {contract.escrow_status === 'funded' && (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 border">
            <Shield className="h-3 w-3 mr-1" />
            Escrow Secured
          </Badge>
        )}
      </div>

      {/* Total earnings progress */}
      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {view === 'freelancer' ? 'Total Earned' : 'Total Paid'}
          </span>
          <span className="text-2xl font-bold text-foreground">
            €{totalEarned.toLocaleString()}
          </span>
        </div>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.toFixed(0)}% complete</span>
          <span>of €{totalBudget.toLocaleString()}</span>
        </div>
      </div>

      {/* Milestone payments */}
      <div className="space-y-3 mb-6">
        {milestones.map((milestone) => (
          <div 
            key={milestone.id}
            className="flex items-center justify-between p-3 bg-muted/20 rounded-md"
          >
            <div className="flex items-center gap-3">
              {getMilestoneIcon(milestone.status)}
              <div>
                <div className="text-sm font-medium text-foreground">
                  Milestone {milestone.milestone_number}
                </div>
                <div className="text-xs text-muted-foreground">
                  {milestone.status === 'paid' && milestone.paid_at ? (
                    `Paid ${format(new Date(milestone.paid_at), 'MMM d, yyyy')}`
                  ) : milestone.status === 'submitted' ? (
                    'In review'
                  ) : milestone.status === 'approved' ? (
                    'Processing payment'
                  ) : milestone.due_date ? (
                    `Due ${format(new Date(milestone.due_date), 'MMM d')}`
                  ) : (
                    'Pending'
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">
                €{Number(milestone.amount).toLocaleString()}
              </div>
              {milestone.status === 'paid' && (
                <div className="text-xs text-green-600">Received</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fee breakdown */}
      <div className="pt-4 border-t border-border/50 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Contract Value</span>
          <span className="font-medium text-foreground">
            €{totalBudget.toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Platform Fee ({contract.platform_fee_percentage}%)
          </span>
          <span className="font-medium text-muted-foreground">
            -€{platformFee.toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-base font-semibold pt-2 border-t border-border/30">
          <span className="text-foreground">
            {view === 'freelancer' ? 'Your Net Earnings' : 'Total Cost'}
          </span>
          <span className="text-foreground flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-green-500" />
            €{view === 'freelancer' ? netAmount.toLocaleString() : totalBudget.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Payment info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
        <div className="text-xs text-blue-700 dark:text-blue-400">
          {view === 'freelancer' ? (
            <>
              💰 Payments are released within 1 hour of milestone approval. 
              {contract.escrow_status === 'funded' && ' Escrow protects your earnings.'}
            </>
          ) : (
            <>
              🔒 Funds are held in secure escrow until you approve each milestone. 
              Auto-approval occurs after 7 days of inactivity.
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
