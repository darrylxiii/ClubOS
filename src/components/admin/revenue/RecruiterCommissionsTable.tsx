import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";

export function RecruiterCommissionsTable() {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['recruiter-commissions-ytd'],
    queryFn: async () => {
      // Fetch commissions
      const { data: commissionsData, error } = await supabase
        .from('employee_commissions')
        .select('*')
        .gte('created_at', startOfYear)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get employee IDs and fetch their profiles
      const employeeIds = [...new Set(commissionsData?.map(c => c.employee_id) || [])];
      
      if (employeeIds.length === 0) return [];
      
      const { data: employeeProfiles } = await supabase
        .from('employee_profiles')
        .select('id, user_id')
        .in('id', employeeIds);
      
      const userIds = employeeProfiles?.map(e => e.user_id).filter(Boolean) || [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      // Create lookup maps
      const employeeMap = new Map(employeeProfiles?.map(e => [e.id, e]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return commissionsData?.map(comm => ({
        ...comm,
        employee_profile: employeeMap.get(comm.employee_id),
        user_profile: employeeMap.get(comm.employee_id) 
          ? profileMap.get(employeeMap.get(comm.employee_id)!.user_id)
          : null,
      })) || [];
    },
  });

  // Group by employee
  const commissionsByEmployee = commissions?.reduce((acc, comm) => {
    const employeeId = comm.employee_id;
    if (!acc[employeeId]) {
      acc[employeeId] = {
        userProfile: comm.user_profile ?? null,
        commissions: [],
        totalEarned: 0,
        totalPaid: 0,
        totalPending: 0,
      };
    }
    acc[employeeId].commissions.push(comm);
    acc[employeeId].totalEarned += Number(comm.gross_amount) || 0;
    if (comm.status === 'paid') {
      acc[employeeId].totalPaid += Number(comm.gross_amount) || 0;
    } else {
      acc[employeeId].totalPending += Number(comm.gross_amount) || 0;
    }
    return acc;
  }, {} as Record<string, {
    userProfile: { full_name: string | null; email: string | null } | null;
    commissions: typeof commissions;
    totalEarned: number;
    totalPaid: number;
    totalPending: number;
  }>);

  const employeeList = Object.values(commissionsByEmployee || {});
  const totalCommissions = employeeList.reduce((sum, e) => sum + e.totalEarned, 0);
  const totalPaid = employeeList.reduce((sum, e) => sum + e.totalPaid, 0);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Recruiter Commissions
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
          <Briefcase className="h-5 w-5 text-primary" />
          Recruiter Commissions ({currentYear})
        </CardTitle>
        <CardDescription>
          Commission earnings from placements for internal recruiters
        </CardDescription>
      </CardHeader>
      <CardContent>
        {employeeList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No commission records for this year
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recruiter</TableHead>
                  <TableHead className="text-center">Placements</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeList.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {item.userProfile?.full_name || 'Unknown Recruiter'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.userProfile?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.commissions?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalEarned)}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(item.totalPaid)}
                    </TableCell>
                    <TableCell className="text-right text-warning">
                      {formatCurrency(item.totalPending)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Recruiter Commissions
              </span>
              <div className="flex gap-6 text-sm">
                <span>
                  YTD: <strong>{formatCurrency(totalCommissions)}</strong>
                </span>
                <span className="text-success">
                  Paid: <strong>{formatCurrency(totalPaid)}</strong>
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
