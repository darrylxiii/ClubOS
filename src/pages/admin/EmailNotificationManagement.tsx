import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/admin/shared/DashboardHeader";
import { NotificationStatsCards } from "@/components/admin/notifications/NotificationStatsCards";
import { NotificationTypesList } from "@/components/admin/notifications/NotificationTypesList";
import { RoleAssignmentPanel } from "@/components/admin/notifications/RoleAssignmentPanel";
import { NotificationAuditLog } from "@/components/admin/notifications/NotificationAuditLog";
import { Mail, Users, Clock } from "lucide-react";

export default function EmailNotificationManagement() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <DashboardHeader
        title="Email Notification Management"
        description="Configure who receives which email notifications across the platform"
      />

      <NotificationStatsCards />

      <Tabs defaultValue="types" className="space-y-6">
        <TabsList>
          <TabsTrigger value="types" className="gap-2">
            <Mail className="h-4 w-4" />
            Notification Types
          </TabsTrigger>
          <TabsTrigger value="recipients" className="gap-2">
            <Users className="h-4 w-4" />
            Recipients
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Clock className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types">
          <NotificationTypesList />
        </TabsContent>

        <TabsContent value="recipients">
          <RoleAssignmentPanel />
        </TabsContent>

        <TabsContent value="audit">
          <NotificationAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
