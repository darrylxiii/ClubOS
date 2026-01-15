import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useAllEmployees } from "@/hooks/useEmployeeProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/revenueCalculations";
import { 
  Users, 
  Trophy, 
  Target, 
  Layers, 
  CreditCard,
  ClipboardCheck,
  GraduationCap,
  ClipboardList,
  DollarSign
} from "lucide-react";

// Components
import { EmployeeProfileManager } from "@/components/employees/EmployeeProfileManager";
import { TargetManagementPanel } from "@/components/employees/TargetManagementPanel";
import { TeamLeaderboard } from "@/components/employees/TeamLeaderboard";
import { CommissionTierBuilder } from "@/components/employees/CommissionTierBuilder";
import { PayoutScheduler } from "@/components/employees/PayoutScheduler";
import { PerformanceReviewPanel } from "@/components/employees/PerformanceReviewPanel";
import { TrainingRecordsPanel } from "@/components/employees/TrainingRecordsPanel";
import { OnboardingChecklist } from "@/components/employees/OnboardingChecklist";

export default function EmployeeManagement() {
  const { data: employees } = useAllEmployees();

  const { data: stats } = useQuery({
    queryKey: ['employee-management-stats'],
    queryFn: async () => {
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount, status')
        .in('status', ['pending', 'approved', 'paid']);

      const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.gross_amount, 0) || 0;
      const approved = commissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.gross_amount, 0) || 0;
      const paid = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.gross_amount, 0) || 0;

      const { count: pendingReviews } = await supabase
        .from('performance_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return { 
        pending, 
        approved, 
        paid, 
        total: pending + approved + paid,
        pendingReviews: pendingReviews || 0
      };
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
              Comprehensive HR, performance, and commission management
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{employees?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Employees</p>
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
                    <p className="text-sm text-muted-foreground">Pending</p>
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
                    <p className="text-sm text-muted-foreground">Approved</p>
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.pendingReviews || 0}</p>
                    <p className="text-sm text-muted-foreground">Pending Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="leaderboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="leaderboard" className="gap-1.5 text-xs">
                <Trophy className="h-4 w-4" />
                <span className="hidden md:inline">Leaderboard</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className="gap-1.5 text-xs">
                <Users className="h-4 w-4" />
                <span className="hidden md:inline">Profiles</span>
              </TabsTrigger>
              <TabsTrigger value="targets" className="gap-1.5 text-xs">
                <Target className="h-4 w-4" />
                <span className="hidden md:inline">Targets</span>
              </TabsTrigger>
              <TabsTrigger value="commissions" className="gap-1.5 text-xs">
                <Layers className="h-4 w-4" />
                <span className="hidden md:inline">Commissions</span>
              </TabsTrigger>
              <TabsTrigger value="payouts" className="gap-1.5 text-xs">
                <CreditCard className="h-4 w-4" />
                <span className="hidden md:inline">Payouts</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 text-xs">
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden md:inline">Reviews</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="gap-1.5 text-xs">
                <GraduationCap className="h-4 w-4" />
                <span className="hidden md:inline">Training</span>
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="gap-1.5 text-xs">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden md:inline">Onboarding</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard">
              <TeamLeaderboard />
            </TabsContent>

            <TabsContent value="employees">
              <EmployeeProfileManager />
            </TabsContent>

            <TabsContent value="targets">
              <TargetManagementPanel />
            </TabsContent>

            <TabsContent value="commissions">
              <CommissionTierBuilder />
            </TabsContent>

            <TabsContent value="payouts">
              <PayoutScheduler />
            </TabsContent>

            <TabsContent value="reviews">
              <PerformanceReviewPanel />
            </TabsContent>

            <TabsContent value="training">
              <TrainingRecordsPanel />
            </TabsContent>

            <TabsContent value="onboarding">
              <OnboardingChecklist />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
