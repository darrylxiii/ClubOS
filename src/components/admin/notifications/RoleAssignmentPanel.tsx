import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Shield, 
  Users, 
  Briefcase, 
  User,
  Save,
  Check
} from "lucide-react";
import { useNotificationTypesWithAssignments } from "@/hooks/useNotificationTypes";
import { 
  useAssignmentsByRole, 
  useBulkAssignRole 
} from "@/hooks/useNotificationAssignments";
import { Skeleton } from "@/components/ui/skeleton";

const ROLES = [
  { key: 'admin', label: 'Administrators', icon: Shield, description: 'Full system access' },
  { key: 'strategist', label: 'Strategists', icon: Users, description: 'Talent management team' },
  { key: 'partner', label: 'Partners', icon: Briefcase, description: 'Client partners' },
  { key: 'user', label: 'Users', icon: User, description: 'Standard candidates' },
] as const;

export function RoleAssignmentPanel() {
  const { data: types, isLoading: typesLoading } = useNotificationTypesWithAssignments();
  const { data: assignmentsByRole, isLoading: assignmentsLoading } = useAssignmentsByRole();
  const bulkAssignMutation = useBulkAssignRole();
  
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string[]>>({});

  const isLoading = typesLoading || assignmentsLoading;

  const getRoleNotifications = (role: string) => {
    if (pendingChanges[role]) {
      return pendingChanges[role];
    }
    return (assignmentsByRole?.[role] || []).map(a => a.notification_type_id);
  };

  const handleToggleNotification = (role: string, typeId: string) => {
    const current = getRoleNotifications(role);
    const newList = current.includes(typeId)
      ? current.filter(id => id !== typeId)
      : [...current, typeId];
    
    setPendingChanges(prev => ({
      ...prev,
      [role]: newList,
    }));
  };

  const handleSaveRole = async (role: string) => {
    const typeIds = pendingChanges[role];
    if (!typeIds) return;

    await bulkAssignMutation.mutateAsync({
      role,
      notificationTypeIds: typeIds,
    });

    setPendingChanges(prev => {
      const { [role]: _, ...rest } = prev;
      return rest;
    });
  };

  const hasChanges = (role: string) => !!pendingChanges[role];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure which notifications each role receives by default. 
        Individual user assignments can override these settings.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {ROLES.map((role) => {
          const RoleIcon = role.icon;
          const roleNotifications = getRoleNotifications(role.key);
          const hasUnsavedChanges = hasChanges(role.key);

          return (
            <Card 
              key={role.key} 
              variant={selectedRole === role.key ? "elevated" : "static"}
              className={selectedRole === role.key ? "ring-2 ring-primary" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <RoleIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{role.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {roleNotifications.length} / {types?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                  {types?.filter(t => t.is_active).map((type) => {
                    const isChecked = roleNotifications.includes(type.id);
                    
                    return (
                      <label 
                        key={type.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleNotification(role.key, type.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{type.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {type.category}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

              {hasUnsavedChanges && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-warning">Unsaved changes</p>
                    <Button 
                      size="sm" 
                      onClick={() => handleSaveRole(role.key)}
                      disabled={bulkAssignMutation.isPending}
                      className="gap-2"
                    >
                      {bulkAssignMutation.isPending ? (
                        <Save className="h-3 w-3 animate-pulse" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
