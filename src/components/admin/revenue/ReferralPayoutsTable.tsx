import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  processing: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  paid: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function ReferralPayoutsTable() {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['referral-payouts-ytd'],
    queryFn: async () => {
      // Fetch payouts
      const { data: payoutsData, error } = await supabase
        .from('referral_payouts')
        .select('*')
        .gte('created_at', startOfYear)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get referrer user IDs and fetch profiles
      const referrerIds = [...new Set(payoutsData?.map(p => p.referrer_user_id).filter((id): id is string => id !== null) || [])];
      
      let profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      
      if (referrerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', referrerIds);
        
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }
      
      // Get application IDs to fetch candidate/company info
      const applicationIds = [...new Set(payoutsData?.map(p => p.application_id).filter((id): id is string => id !== null) || [])];
      
      let applicationMap = new Map<string, { candidate_full_name: string | null; company_name: string | null }>();
      
      if (applicationIds.length > 0) {
        const { data: applications } = await supabase
          .from('applications')
          .select('id, candidate_full_name, company_name')
          .in('id', applicationIds);
        
        applicationMap = new Map(applications?.map(a => [a.id, a]) || []);
      }
      
      return payoutsData?.map(payout => ({
        ...payout,
        profile: payout.referrer_user_id ? profileMap.get(payout.referrer_user_id) || null : null,
        application: payout.application_id ? applicationMap.get(payout.application_id) || null : null,
      })) || [];
    },
  });

  // Calculate totals
  const totals = payouts?.reduce((acc, p) => {
    const amount = Number(p.payout_amount) || 0;
    acc.total += amount;
    if (p.status === 'paid') acc.paid += amount;
    else if (p.status === 'pending') acc.pending += amount;
    else if (['approved', 'processing'].includes(p.status ?? '')) acc.approved += amount;
    
    return acc;
  }, { 
    total: 0, paid: 0, pending: 0, approved: 0
  }) || { 
    total: 0, paid: 0, pending: 0, approved: 0
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Referral Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Referral Payouts ({currentYear})
        </CardTitle>
        <CardDescription>
          External referrer earnings for candidate and company referrals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!payouts?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No referral payouts for this year
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.slice(0, 10).map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {payout.profile?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payout.profile?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {payout.application?.candidate_full_name && (
                          <p>Candidate: {payout.application.candidate_full_name}</p>
                        )}
                        {payout.application?.company_name && (
                          <p className="text-muted-foreground">@ {payout.application.company_name}</p>
                        )}
                        {!payout.application?.candidate_full_name && !payout.application?.company_name && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(payout.payout_amount) || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[payout.status ?? 'pending'] || ''}>
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                    {payout.paid_at 
                        ? format(new Date(payout.paid_at), 'MMM d')
                        : format(new Date(payout.created_at ?? new Date()), 'MMM d')
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {payouts.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Showing 10 of {payouts.length} payouts
              </p>
            )}

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Referral Payouts
              </span>
              <div className="flex gap-6 text-sm">
                <span>
                  YTD: <strong>{formatCurrency(totals.total)}</strong>
                </span>
                <span className="text-success">
                  Paid: <strong>{formatCurrency(totals.paid)}</strong>
                </span>
                <span className="text-warning">
                  Pending: <strong>{formatCurrency(totals.pending + totals.approved)}</strong>
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
