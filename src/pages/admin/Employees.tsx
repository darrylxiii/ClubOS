import AppLayout from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { EmployeeProfileManager } from "@/components/employees/EmployeeProfileManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Settings, 
  Target,
  DollarSign
} from "lucide-react";
import { useAllEmployees } from "@/hooks/useEmployeeProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/revenueCalculations";

export default function AdminEmployees() {
  const { data: employees } = useAllEmployees();

  const { data: stats } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount, status')
        .in('status', ['pending', 'approved', 'paid']);

      const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.gross_amount, 0) || 0;
      const approved = commissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.gross_amount, 0) || 0;
      const paid = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.gross_amount, 0) || 0;

      return { pending, approved, paid, total: pending + approved + paid };
    },
  });

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Employee Management</h1>
            <p className="text-muted-foreground">
              Manage employee profiles, commissions, and targets
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{employees?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(stats?.pending || 0)}</p>
                    <p className="text-sm text-muted-foreground">Pending Commissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(stats?.approved || 0)}</p>
                    <p className="text-sm text-muted-foreground">Approved (Unpaid)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(stats?.paid || 0)}</p>
                    <p className="text-sm text-muted-foreground">Paid YTD</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="employees" className="space-y-6">
            <TabsList>
              <TabsTrigger value="employees" className="gap-2">
                <Users className="h-4 w-4" />
                Employee Profiles
              </TabsTrigger>
              <TabsTrigger value="targets" className="gap-2">
                <Target className="h-4 w-4" />
                Targets
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Commission Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              <EmployeeProfileManager />
            </TabsContent>

            <TabsContent value="targets">
              <Card>
                <CardHeader>
                  <CardTitle>Target Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Configure quarterly and annual targets for employees here.
                  </p>
                  {/* Target management component would go here */}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Commission Structure Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium mb-2">Default Commission Rate</h4>
                      <p className="text-2xl font-bold">5%</p>
                      <p className="text-sm text-muted-foreground">Applied to new employees</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium mb-2">Commission Structures</h4>
                      <div className="space-y-1">
                        <Badge variant="outline">Percentage</Badge>
                        <Badge variant="outline">Tiered</Badge>
                        <Badge variant="outline">Hybrid</Badge>
                        <Badge variant="outline">Fixed</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
