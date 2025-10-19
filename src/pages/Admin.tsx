import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import { CompanyManagement } from "@/components/admin/CompanyManagement";
import { UnifiedUserManagement } from "@/components/admin/UnifiedUserManagement";
import { AdminRoleSwitcher } from "@/components/admin/AdminRoleSwitcher";
import { RoleAssignmentFix } from "@/components/admin/RoleAssignmentFix";
import { AdminAchievementsManager } from "@/components/admin/AdminAchievementsManager";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";

const Admin = () => {
  const { currentRole, loading } = useRole();

  // Wait for role to be loaded before making any decisions
  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Redirect non-admins
  if (currentRole !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return (
    <AppLayout>
      <div className="relative">
        <OceanBackgroundVideo />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-8 lg:py-12">
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

        {/* Role Switcher */}
        <div className="mb-8">
          <AdminRoleSwitcher />
        </div>

        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <CompanyManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UnifiedUserManagement />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <AdminAchievementsManager />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <RoleAssignmentFix />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default Admin;
