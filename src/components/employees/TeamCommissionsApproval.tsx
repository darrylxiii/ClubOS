import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ClipboardCheck, 
  Check, 
  X, 
  AlertCircle,
  User,
  Building2,
  Briefcase
} from "lucide-react";
import { motion } from "framer-motion";
import { EmployeeCommission, useApproveCommission } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";
import { format } from "date-fns";
import { toast } from "sonner";

interface TeamCommissionsApprovalProps {
  pendingCommissions: (EmployeeCommission & { 
    employeeName?: string;
    employeeAvatar?: string;
  })[];
  isLoading?: boolean;
}

export function TeamCommissionsApproval({ 
  pendingCommissions,
  isLoading 
}: TeamCommissionsApprovalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const approveCommission = useApproveCommission();

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === pendingCommissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingCommissions.map(c => c.id)));
    }
  };

  const handleApprove = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => 
        approveCommission.mutateAsync({ commissionId: id, approved: true })
      ));
      toast.success(`${ids.length} commission${ids.length > 1 ? 's' : ''} approved`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Failed to approve commissions");
    }
  };

  const handleReject = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => 
        approveCommission.mutateAsync({ commissionId: id, approved: false })
      ));
      toast.success(`${ids.length} commission${ids.length > 1 ? 's' : ''} marked as disputed`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Failed to reject commissions");
    }
  };

  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.gross_amount, 0);
  const selectedTotal = pendingCommissions
    .filter(c => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.gross_amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commission Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/50 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Commission Approvals
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCommissions.length} pending • {formatCurrency(totalPending)} total
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedIds.size} selected • {formatCurrency(selectedTotal)}
            </Badge>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1 text-green-500 hover:bg-green-500/10"
              onClick={() => handleApprove(Array.from(selectedIds))}
              disabled={approveCommission.isPending}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1 text-red-500 hover:bg-red-500/10"
              onClick={() => handleReject(Array.from(selectedIds))}
              disabled={approveCommission.isPending}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingCommissions.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <Checkbox
              checked={selectedIds.size === pendingCommissions.length}
              onCheckedChange={selectAll}
            />
            <span className="text-sm text-muted-foreground">Select all</span>
          </div>
        )}

        {pendingCommissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <ClipboardCheck className="h-8 w-8 mb-2 opacity-50" />
            <p>No pending approvals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingCommissions.map((commission, index) => (
              <CommissionApprovalItem
                key={commission.id}
                commission={commission}
                isSelected={selectedIds.has(commission.id)}
                onToggle={() => toggleSelection(commission.id)}
                onApprove={() => handleApprove([commission.id])}
                onReject={() => handleReject([commission.id])}
                isProcessing={approveCommission.isPending}
                index={index}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommissionApprovalItem({ 
  commission, 
  isSelected,
  onToggle,
  onApprove,
  onReject,
  isProcessing,
  index
}: { 
  commission: EmployeeCommission & { 
    employeeName?: string;
    employeeAvatar?: string;
  };
  isSelected: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 rounded-lg border transition-colors ${
        isSelected 
          ? 'bg-primary/5 border-primary/30' 
          : 'bg-muted/30 border-border/50 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={commission.employeeAvatar} />
              <AvatarFallback>
                {commission.employeeName?.charAt(0) || 'E'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{commission.employeeName || 'Employee'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(commission.period_date), 'MMM d, yyyy')}
              </p>
            </div>
            <Badge variant="outline" className="capitalize ml-auto">
              {commission.source_type}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {commission.candidate_name && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{commission.candidate_name}</span>
              </div>
            )}
            {commission.company_name && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{commission.company_name}</span>
              </div>
            )}
            {commission.job_title && (
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{commission.job_title}</span>
              </div>
            )}
          </div>

          {commission.placement_fee_base && commission.commission_rate && (
            <p className="text-xs text-muted-foreground mt-2">
              {commission.commission_rate}% of {formatCurrency(commission.placement_fee_base)} placement fee
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-green-500">
            {formatCurrency(commission.gross_amount)}
          </p>
          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-green-500 hover:bg-green-500/10"
              onClick={onApprove}
              disabled={isProcessing}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10"
              onClick={onReject}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
