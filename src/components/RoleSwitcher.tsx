import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, User, Building2, Users, Sparkles } from "lucide-react";
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
    } catch (error: unknown) {
      console.error('[RoleSwitcher] Role switch error:', error);
      toast.error("Failed to switch roles", {
        description: error instanceof Error ? error.message : "Please try again or contact support if the issue persists"
      });
    }
  };

  if (loading) {
    return (
      <Card className="glass-card border-white/10 shadow-glass-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Active Role
          </CardTitle>
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
    <Card className="glass-card border-white/10 shadow-glass-lg hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Active Role
        </CardTitle>
        <CardDescription className="text-foreground/70">
          You have multiple roles. Select which role you want to use.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={currentRole || 'user'} onValueChange={handleRoleChange}>
          <div className="space-y-2">
            {roleOptionsList.map((role) => {
              const Icon = role.icon;
              const isActive = currentRole === role.value;
              return (
                <div 
                  key={role.value} 
                  className={`
                    flex items-start space-x-3 space-y-0 p-4 rounded-2xl
                    transition-all duration-300 cursor-pointer
                    ${isActive 
                      ? 'glass-strong border border-primary/30 shadow-glass-md shadow-primary/10' 
                      : 'glass-subtle border border-white/5 hover:border-white/20 hover:shadow-glass-sm'
                    }
                  `}
                  onClick={() => handleRoleChange(role.value)}
                >
                  <RadioGroupItem value={role.value} id={role.value} className="mt-1" />
                  <Label
                    htmlFor={role.value}
                    className="font-normal cursor-pointer flex-1"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`
                        p-1.5 rounded-lg transition-colors duration-300
                        ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/5 text-foreground/70'}
                      `}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`font-semibold transition-colors duration-300 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                        {role.label}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/60 ml-8">
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