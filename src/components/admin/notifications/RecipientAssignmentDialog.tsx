import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shield, 
  Users, 
  User, 
  Trash2,
  Plus 
} from "lucide-react";
import { NotificationTypeWithAssignments } from "@/hooks/useNotificationTypes";
import { 
  useNotificationAssignments, 
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  NotificationAssignment,
} from "@/hooks/useNotificationAssignments";
import { UserAssignmentDialog } from "./UserAssignmentDialog";

const ROLES = ['admin', 'strategist', 'partner', 'user'] as const;

interface RecipientAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationType: NotificationTypeWithAssignments;
}

export function RecipientAssignmentDialog({
  open,
  onOpenChange,
  notificationType,
}: RecipientAssignmentDialogProps) {
  const { data: assignments, isLoading } = useNotificationAssignments(notificationType.id);
  const createMutation = useCreateAssignment();
  const updateMutation = useUpdateAssignment();
  const deleteMutation = useDeleteAssignment();
  const [showUserDialog, setShowUserDialog] = useState(false);

  const roleAssignments = assignments?.filter(a => a.assignment_type === 'role') || [];
  const userAssignments = assignments?.filter(a => a.assignment_type === 'user') || [];
  const hasAllAssignment = assignments?.some(a => a.assignment_type === 'all' && a.is_enabled);

  const getRoleAssignment = (role: string) => 
    roleAssignments.find(a => a.role === role);

  const handleRoleToggle = async (role: string, enabled: boolean) => {
    const existing = getRoleAssignment(role);
    
    if (existing) {
      await updateMutation.mutateAsync({
        id: existing.id,
        updates: { is_enabled: enabled },
      });
    } else if (enabled) {
      await createMutation.mutateAsync({
        notification_type_id: notificationType.id,
        assignment_type: 'role',
        role,
        user_id: null,
        is_enabled: true,
        channel: 'email',
      });
    }
  };

  const handleDeleteUserAssignment = async (assignment: NotificationAssignment) => {
    await deleteMutation.mutateAsync(assignment);
  };

  const handleToggleAllUsers = async (enabled: boolean) => {
    const existing = assignments?.find(a => a.assignment_type === 'all');
    
    if (existing) {
      await updateMutation.mutateAsync({
        id: existing.id,
        updates: { is_enabled: enabled },
      });
    } else if (enabled) {
      await createMutation.mutateAsync({
        notification_type_id: notificationType.id,
        assignment_type: 'all',
        role: null,
        user_id: null,
        is_enabled: true,
        channel: 'email',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Recipients: {notificationType.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="roles" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roles">By Role</TabsTrigger>
            <TabsTrigger value="users">Individual Users</TabsTrigger>
            <TabsTrigger value="all">All Users</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Assign this notification to all users with a specific role.
            </p>
            
            <div className="space-y-2">
              {ROLES.map((role) => {
                const assignment = getRoleAssignment(role);
                const isEnabled = assignment?.is_enabled ?? false;
                
                return (
                  <Card key={role} variant="static">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{role}</p>
                          <p className="text-xs text-muted-foreground">
                            All users with {role} role
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleRoleToggle(role, checked)}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Assign to specific individual users.
              </p>
              <Button 
                size="sm" 
                onClick={() => setShowUserDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : userAssignments.length === 0 ? (
              <Card variant="static">
                <CardContent className="p-8 text-center">
                  <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No individual users assigned yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {userAssignments.map((assignment) => (
                  <Card key={assignment.id} variant="static">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            User ID: {assignment.user_id?.slice(0, 8)}...
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant={assignment.is_enabled ? "default" : "secondary"}>
                              {assignment.is_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <Badge variant="outline">{assignment.channel}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={assignment.is_enabled}
                          onCheckedChange={(checked) => 
                            updateMutation.mutate({
                              id: assignment.id,
                              updates: { is_enabled: checked },
                            })
                          }
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteUserAssignment(assignment)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Send this notification to all registered users by default.
            </p>
            
            <Card variant="static">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">All Users</p>
                    <p className="text-xs text-muted-foreground">
                      Send to everyone regardless of role
                    </p>
                  </div>
                </div>
                <Switch
                  checked={hasAllAssignment}
                  onCheckedChange={handleToggleAllUsers}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </CardContent>
            </Card>

            {hasAllAssignment && (
              <p className="text-xs text-amber-500">
                ⚠️ This will send notifications to all users. Role-based and individual assignments will be ignored.
              </p>
            )}
          </TabsContent>
        </Tabs>

        {showUserDialog && (
          <UserAssignmentDialog
            open={true}
            onOpenChange={() => setShowUserDialog(false)}
            notificationTypeId={notificationType.id}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
