import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Shield, User, Building2, Users } from "lucide-react";

interface UserRoleOption {
  value: string;
  label: string;
  icon: any;
  description: string;
}

export function RoleSwitcher() {
  const { user } = useAuth();
  const [availableRoles, setAvailableRoles] = useState<UserRoleOption[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);

  const roleOptions: Record<string, UserRoleOption> = {
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
    }
  };

  useEffect(() => {
    fetchAvailableRoles();
  }, [user]);

  const fetchAvailableRoles = async () => {
    if (!user) return;

    try {
      // Get all roles from database
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      // Get currently selected role from localStorage
      const savedRole = localStorage.getItem('selected_role');
      
      const roles: UserRoleOption[] = [];
      
      if (rolesData && rolesData.length > 0) {
        rolesData.forEach(r => {
          if (roleOptions[r.role]) {
            roles.push(roleOptions[r.role]);
          }
        });
      }

      // Always include user role as fallback
      if (!roles.find(r => r.value === 'user')) {
        roles.push(roleOptions.user);
      }

      setAvailableRoles(roles);
      
      // Set current role
      if (savedRole && roles.find(r => r.value === savedRole)) {
        setCurrentRole(savedRole);
      } else if (rolesData && rolesData.length > 0) {
        // Default to admin if available
        const hasAdmin = rolesData.find(r => r.role === 'admin');
        setCurrentRole(hasAdmin ? 'admin' : rolesData[0].role);
      } else {
        setCurrentRole('user');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: string) => {
    setCurrentRole(newRole);
    localStorage.setItem('selected_role', newRole);
    toast.success(`Switched to ${roleOptions[newRole]?.label || newRole} role`, {
      description: "Refresh the page to see changes"
    });
    
    // Reload page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Role</CardTitle>
        <CardDescription>
          You have multiple roles. Select which role you want to use.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={currentRole} onValueChange={handleRoleChange}>
          <div className="space-y-3">
            {availableRoles.map((role) => {
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
