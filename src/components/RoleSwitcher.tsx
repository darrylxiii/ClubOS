import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, User, Building2, Users } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { UserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface UserRoleOption {
  value: UserRole;
  label: string;
  icon: any;
  description: string;
}

export function RoleSwitcher() {
  const { currentRole, availableRoles, switchRole, loading } = useRole();

  const roleOptions: Record<UserRole, UserRoleOption> = {
    admin: {
      value: 'admin',
      label: 'Admin',
      icon: Shield,
      description: 'Full system access, manage companies and users'
    },
    strategist: {
      value: 'strategist',
      label: 'Talent Strategist',
      icon: Users,
      description: 'Manage candidates and job placements'
    },
    partner: {
      value: 'partner',
      label: 'Partner',
      icon: Building2,
      description: 'Company partner access'
    },
    user: {
      value: 'user',
      label: 'Candidate',
      icon: User,
      description: 'Standard candidate dashboard'
    },
    company_admin: {
      value: 'company_admin',
      label: 'Company Admin',
      icon: Building2,
      description: 'Company administration access'
    },
    recruiter: {
      value: 'recruiter',
      label: 'Recruiter',
      icon: Users,
      description: 'Recruitment management access'
    }
  };

  const handleRoleChange = async (newRole: string) => {
    try {
      await switchRole(newRole as UserRole);
      toast.success(`Switched to ${roleOptions[newRole as UserRole]?.label || newRole} view`, {
        description: "Your dashboard has been updated"
      });
    } catch (error) {
      toast.error("Failed to switch roles", {
        description: "Please try again"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Switcher</CardTitle>
          <CardDescription>Loading your roles...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (availableRoles.length <= 1) {
    return null; // Don't show if user only has one role
  }

  const roleOptionsList = availableRoles.map(role => ({
    ...roleOptions[role],
    value: role
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Role</CardTitle>
        <CardDescription>
          You have multiple roles. Select which role you want to use.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={currentRole || 'user'} onValueChange={handleRoleChange}>
          <div className="space-y-3">
            {roleOptionsList.map((role) => {
              const Icon = role.icon;
              return (
                <div key={role.value} className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value={role.value} id={role.value} />
                  <Label
                    htmlFor={role.value}
                    className="font-normal cursor-pointer flex-1"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{role.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}