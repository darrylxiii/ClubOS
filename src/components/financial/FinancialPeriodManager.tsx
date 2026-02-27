import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Unlock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FinancialPeriod {
  id: string;
  year: number;
  quarter: number;
  status: string;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  open: { label: 'Open', variant: 'outline', icon: <Unlock className="h-3 w-3" /> },
  closed: { label: 'Closed', variant: 'secondary', icon: <Lock className="h-3 w-3" /> },
  locked: { label: 'Locked', variant: 'destructive', icon: <ShieldCheck className="h-3 w-3" /> },
};

export function FinancialPeriodManager({ year }: { year: number }) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{ periodId: string; newStatus: string; label: string } | null>(null);

  const { data: periods, isLoading } = useQuery({
    queryKey: ['financial-periods', year],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('financial_periods')
        .select('*')
        .eq('year', year)
        .order('quarter');
      if (error) throw error;
      return data as FinancialPeriod[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'closed' || status === 'locked') {
        updates.closed_at = new Date().toISOString();
      } else {
        updates.closed_at = null;
        updates.closed_by = null;
      }
      const { error } = await (supabase as any)
        .from('financial_periods')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-periods', year] });
      toast.success('Period status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAction = (periodId: string, newStatus: string) => {
    const label = newStatus === 'open' ? 'reopen' : newStatus;
    setConfirmAction({ periodId, newStatus, label });
  };

  const confirmUpdate = () => {
    if (!confirmAction) return;
    updateStatus.mutate({ id: confirmAction.periodId, status: confirmAction.newStatus });
    setConfirmAction(null);
  };

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-[120px]" /></CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Period Close Management — {year}
          </CardTitle>
          <CardDescription>
            Close or lock quarters to prevent modifications to historical financial data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(periods || []).map((p) => {
              const config = STATUS_CONFIG[p.status] || STATUS_CONFIG.open;
              return (
                <div
                  key={p.id}
                  className={cn(
                    'rounded-lg border p-4 space-y-3',
                    p.status === 'locked' && 'border-destructive/30 bg-destructive/5',
                    p.status === 'closed' && 'border-muted-foreground/30 bg-muted/30',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Q{p.quarter}</span>
                    <Badge variant={config.variant} className="gap-1">
                      {config.icon}
                      {config.label}
                    </Badge>
                  </div>

                  {p.closed_at && (
                    <p className="text-xs text-muted-foreground">
                      Closed {new Date(p.closed_at).toLocaleDateString('en-GB')}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {p.status === 'open' && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleAction(p.id, 'closed')}>
                        <Lock className="h-3 w-3 mr-1" /> Close
                      </Button>
                    )}
                    {p.status === 'closed' && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleAction(p.id, 'open')}>
                          <Unlock className="h-3 w-3 mr-1" /> Reopen
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => handleAction(p.id, 'locked')}>
                          <ShieldCheck className="h-3 w-3 mr-1" /> Lock
                        </Button>
                      </>
                    )}
                    {p.status === 'locked' && (
                      <p className="text-xs text-muted-foreground italic">Permanently locked — contact engineering to unlock.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirm Period {confirmAction?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.newStatus === 'locked'
                ? 'Locking a period is permanent. No financial data within this quarter can be modified afterwards. This cannot be undone from the UI.'
                : confirmAction?.newStatus === 'closed'
                  ? 'Closing this period will prevent new expenses from being added to this quarter. You can reopen it later if needed.'
                  : 'Reopening this period will allow modifications to financial data within this quarter.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdate} className={confirmAction?.newStatus === 'locked' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              {confirmAction?.label === 'reopen' ? 'Reopen' : `${confirmAction?.label} Period`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
