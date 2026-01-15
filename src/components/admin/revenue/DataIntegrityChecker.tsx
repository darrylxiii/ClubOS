import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Wrench,
  FileX,
  Link2Off,
  Database
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface IntegrityIssue {
  issue_type: string;
  record_id: string;
  description: string;
  detected_at: string | null;
}

export function DataIntegrityChecker() {
  const queryClient = useQueryClient();
  const [isFixing, setIsFixing] = useState(false);

  const { data: issues, isLoading, refetch } = useQuery({
    queryKey: ['data-integrity-issues'],
    queryFn: async () => {
      // Check for hired applications without placement fees
      const { data: hiredWithoutFees, error: err1 } = await supabase
        .from('applications')
        .select('id, candidate_full_name, updated_at')
        .eq('status', 'hired')
        .is('candidate_id', null);
      
      // Get all hired application IDs
      const { data: hiredApps } = await supabase
        .from('applications')
        .select('id')
        .eq('status', 'hired');
      
      const hiredIds = hiredApps?.map(a => a.id) || [];
      
      // Get placement fees with application IDs
      const { data: fees } = await supabase
        .from('placement_fees')
        .select('application_id');
      
      const feeAppIds = new Set(fees?.map(f => f.application_id).filter(Boolean));
      
      // Find hired apps without fees
      const { data: appsWithoutFees } = await supabase
        .from('applications')
        .select('id, candidate_full_name, updated_at')
        .eq('status', 'hired')
        .not('id', 'in', `(${Array.from(feeAppIds).join(',') || 'null'})`);

      // Check for placement fees without commissions
      const { data: allFees } = await supabase
        .from('placement_fees')
        .select('id, fee_amount, created_at')
        .not('status', 'in', '("cancelled","pending")');
      
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('placement_fee_id');
      
      const commissionFeeIds = new Set(commissions?.map(c => c.placement_fee_id).filter(Boolean));
      
      const feesWithoutCommissions = allFees?.filter(f => !commissionFeeIds.has(f.id)) || [];

      // Check for orphaned commissions
      const { data: allCommissions } = await supabase
        .from('employee_commissions')
        .select('id, placement_fee_id, gross_amount, created_at')
        .not('placement_fee_id', 'is', null);
      
      const feeIds = new Set(allFees?.map(f => f.id) || []);
      const orphanedCommissions = allCommissions?.filter(c => c.placement_fee_id && !feeIds.has(c.placement_fee_id)) || [];

      const issues: IntegrityIssue[] = [
        ...(appsWithoutFees?.map(a => ({
          issue_type: 'hired_without_fee',
          record_id: a.id,
          description: a.candidate_full_name || 'Unknown candidate',
          detected_at: a.updated_at,
        })) || []),
        ...(feesWithoutCommissions?.map(f => ({
          issue_type: 'fee_without_commission',
          record_id: f.id,
          description: `Fee: €${f.fee_amount}`,
          detected_at: f.created_at,
        })) || []),
        ...(orphanedCommissions?.map(c => ({
          issue_type: 'orphaned_commission',
          record_id: c.id,
          description: `Commission: €${c.gross_amount}`,
          detected_at: c.created_at,
        })) || []),
      ];

      return issues;
    },
  });

  const fixMutation = useMutation({
    mutationFn: async (issueType: string) => {
      if (issueType === 'hired_without_fee') {
        // Trigger backfill for placement fees
        const { error } = await supabase.functions.invoke('backfill-placement-fees', {
          body: { dryRun: false },
        });
        if (error) throw error;
      } else if (issueType === 'fee_without_commission') {
        // Trigger commission calculation
        const { error } = await supabase.functions.invoke('calculate-recruiter-commissions', {
          body: { recalculateAll: true },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Fix applied successfully');
      queryClient.invalidateQueries({ queryKey: ['data-integrity-issues'] });
    },
    onError: (error) => {
      toast.error('Failed to apply fix: ' + (error as Error).message);
    },
  });

  const handleFixAll = async () => {
    setIsFixing(true);
    try {
      // Run backfill for placement fees first
      await supabase.functions.invoke('backfill-placement-fees', {
        body: { dryRun: false },
      });
      
      // Then calculate commissions
      await supabase.functions.invoke('calculate-recruiter-commissions', {
        body: { recalculateAll: true },
      });
      
      toast.success('All fixes applied successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to apply fixes: ' + (error as Error).message);
    } finally {
      setIsFixing(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'hired_without_fee':
        return <FileX className="h-4 w-4 text-destructive" />;
      case 'fee_without_commission':
        return <Link2Off className="h-4 w-4 text-yellow-500" />;
      case 'orphaned_commission':
        return <Database className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getIssueLabel = (type: string) => {
    switch (type) {
      case 'hired_without_fee':
        return 'Missing Placement Fee';
      case 'fee_without_commission':
        return 'Missing Commission';
      case 'orphaned_commission':
        return 'Orphaned Commission';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const issuesByType = issues?.reduce((acc, issue) => {
    acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const hasIssues = (issues?.length || 0) > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Integrity Checker
            </CardTitle>
            <CardDescription>
              Identify and resolve data consistency issues across financial tables
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan
            </Button>
            {hasIssues && (
              <Button 
                size="sm" 
                onClick={handleFixAll}
                disabled={isFixing}
              >
                <Wrench className="h-4 w-4 mr-2" />
                {isFixing ? 'Fixing...' : 'Fix All'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasIssues ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold">All Clear!</h3>
            <p className="text-sm text-muted-foreground">
              No data integrity issues detected. Your financial data is consistent.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4 flex-wrap">
              {Object.entries(issuesByType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-sm py-1 px-3">
                  {getIssueIcon(type)}
                  <span className="ml-2">{getIssueLabel(type)}: {count}</span>
                </Badge>
              ))}
            </div>

            {/* Issues Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Type</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues?.slice(0, 20).map((issue, idx) => (
                  <TableRow key={`${issue.issue_type}-${issue.record_id}-${idx}`}>
                    <TableCell>{getIssueIcon(issue.issue_type)}</TableCell>
                    <TableCell className="font-medium">{getIssueLabel(issue.issue_type)}</TableCell>
                    <TableCell className="text-muted-foreground">{issue.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(issue.detected_at ?? new Date()).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => fixMutation.mutate(issue.issue_type)}
                        disabled={fixMutation.isPending}
                      >
                        <Wrench className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {(issues?.length || 0) > 20 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing 20 of {issues?.length} issues
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
