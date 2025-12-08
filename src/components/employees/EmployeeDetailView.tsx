import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  BarChart3, 
  Target, 
  Clock, 
  DollarSign,
  ArrowLeft,
  Mail,
  Phone,
  Building
} from "lucide-react";
import { RecruiterKPIDashboard } from "./RecruiterKPIDashboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeDetailViewProps {
  employeeId?: string;
  employee?: any; // When passed directly
  onBack?: () => void;
  onClose?: () => void;
}

export const EmployeeDetailView = ({ employeeId, employee: passedEmployee, onBack, onClose }: EmployeeDetailViewProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: fetchedEmployee, isLoading } = useQuery({
    queryKey: ['employee-detail', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url,
            phone
          )
        `)
        .eq('id', employeeId!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && !passedEmployee,
  });

  const employee = passedEmployee || fetchedEmployee;

  if ((isLoading && !passedEmployee) || !employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const profile = employee.profile || employee.profiles;
  const handleBack = onBack || onClose;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {handleBack && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <div className="flex items-start gap-4 flex-1">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-lg">
              {profile?.full_name?.charAt(0) || 'E'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile?.full_name || 'Employee'}</h1>
            <p className="text-muted-foreground">{employee.job_title}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {profile?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
              )}
              {profile?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {profile.phone}
                </div>
              )}
              {employee.department && (
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {employee.department}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">{employee.employment_type}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            KPIs
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Targets
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job Title</span>
                  <span className="font-medium">{employee.job_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{employee.department || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employment Type</span>
                  <span className="font-medium">{employee.employment_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium">
                    {employee.start_date ? new Date(employee.start_date).toLocaleDateString() : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compensation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span className="font-medium">
                    €{employee.base_salary?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission Rate</span>
                  <span className="font-medium">
                    {employee.commission_percentage ? `${employee.commission_percentage}%` : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission Structure</span>
                  <span className="font-medium">{employee.commission_structure || '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kpis" className="mt-6">
          <RecruiterKPIDashboard userId={employee.user_id} days={30} />
        </TabsContent>

        <TabsContent value="targets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Targets & Goals</CardTitle>
              <CardDescription>Performance targets and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Target tracking coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Tracking</CardTitle>
              <CardDescription>View time entries and work hours</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Time tracking data will be displayed here when integrated with the time tracking system.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Commissions</CardTitle>
              <CardDescription>Commission earnings and history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Commission tracking coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
