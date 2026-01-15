import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProjectContract } from "@/types/projects";
import { format } from "date-fns";

interface ContractCardProps {
  contract: ProjectContract;
  view: 'freelancer' | 'client';
}

export function ContractCard({ contract, view }: ContractCardProps) {
  const navigate = useNavigate();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending_signature': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'paused': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      case 'disputed': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Calculate progress (mock for now - would come from milestones)
  const progress = 65;

  return (
    <Card 
      className="p-6 hover:shadow-lg transition-all cursor-pointer border border-border/50"
      onClick={() => navigate(`/contracts/${contract.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground text-lg">
              {contract.project_id}
            </h3>
            <Badge className={`${getStatusColor(contract.contract_status)} border`}>
              {getStatusLabel(contract.contract_status)}
            </Badge>
          </div>
          
          {view === 'freelancer' && contract.company_id && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Client Company</span>
            </div>
          )}
          
          {view === 'client' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Freelancer: {contract.freelancer_id}</span>
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">
            €{contract.total_budget?.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {contract.contract_type}
          </div>
        </div>
      </div>

      {contract.contract_status === 'active' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Start</div>
            <div className="text-sm font-medium text-foreground">
              {contract.start_date ? format(new Date(contract.start_date), 'MMM d') : 'TBD'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Due</div>
            <div className="text-sm font-medium text-foreground">
              {contract.end_date ? format(new Date(contract.end_date), 'MMM d') : 'TBD'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {contract.escrow_status === 'funded' ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-xs text-muted-foreground">Escrow</div>
                <div className="text-sm font-medium text-green-600">Secured</div>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-xs text-muted-foreground">Escrow</div>
                <div className="text-sm font-medium text-yellow-600">Pending</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
        {contract.contract_status === 'pending_signature' ? (
          <Button 
            size="sm" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/contracts/${contract.id}/sign`);
            }}
          >
            Sign Contract
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/contracts/${contract.id}`);
            }}
          >
            View Details
          </Button>
        )}
      </div>
    </Card>
  );
}
