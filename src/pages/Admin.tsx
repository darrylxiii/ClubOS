import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import { CompanyManagement } from "@/components/admin/CompanyManagement";
import { UserCompanyAssignment } from "@/components/admin/UserCompanyAssignment";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigate } from "react-router-dom";

const Admin = () => {
  const { role, loading } = useUserRole();

  console.log('[Admin] Current role:', role, 'loading:', loading);

  // Wait for role to be loaded before making any decisions
  if (loading || role === null) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (role !== 'admin') {
    console.log('[Admin] Redirecting - role is not admin:', role);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="space-y-4 mb-12">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8" />
            <h1 className="text-4xl font-black uppercase tracking-tight">
              Admin Control Panel
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Manage companies, users, and system configuration
          </p>
        </div>

        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="users">User Assignment</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <CompanyManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserCompanyAssignment />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
