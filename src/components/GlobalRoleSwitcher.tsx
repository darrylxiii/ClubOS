import { Shield, User, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import { UserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const roleConfig: Record<string, { icon: any; label: string; color: string }> = {
  admin: { icon: Shield, label: 'Admin', color: 'bg-red-500' },
  strategist: { icon: Users, label: 'Strategist', color: 'bg-muted' },
  partner: { icon: Building2, label: 'Partner', color: 'bg-muted' },
  user: { icon: User, label: 'Candidate', color: 'bg-green-500' },
  company_admin: { icon: Building2, label: 'Company Admin', color: 'bg-muted' },
  recruiter: { icon: Users, label: 'Recruiter', color: 'bg-muted' }
};

export const GlobalRoleSwitcher = () => {
  const { currentRole, availableRoles, switchRole, loading } = useRole();

  // Don't show if user only has one role
  if (loading || availableRoles.length <= 1) {
    return null;
  }

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === currentRole) return;
    
    try {
      await switchRole(newRole);
      const config = currentRole ? roleConfig[currentRole] : null;
      toast.success(`Switched to ${config?.label || newRole} view`, {
        description: "Your dashboard will update instantly"
      });
    } catch (error: any) {
      console.error('[GlobalRoleSwitcher] Role switch error:', error);
      toast.error("Failed to switch roles", {
        description: error?.message || "Please try again or refresh the page"
      });
    }
  };

  const safeRole = currentRole || 'user';
  const CurrentIcon = roleConfig[safeRole]?.icon || User;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label={`Current role: ${roleConfig[safeRole]?.label || 'Role'}. Click to switch roles.`}>
          <CurrentIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{roleConfig[safeRole]?.label || 'Role'}</span>
          <Badge variant="secondary" className="hidden md:inline-flex">
            {availableRoles.length} roles
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map((role) => {
          const config = role ? (roleConfig[role] || { icon: User, label: role, color: 'bg-muted' }) : { icon: User, label: 'User', color: 'bg-muted' };
          const Icon = config.icon;
          const isActive = role === currentRole;
          
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={isActive ? "bg-muted" : ""}
            >
              <div className="flex items-center gap-2 w-full">
                <div className={`w-2 h-2 rounded-full ${config.color}`} />
                <Icon className="w-4 h-4" />
                <span className="flex-1">{config.label}</span>
                {isActive && <Badge variant="default" className="text-xs">Active</Badge>}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};