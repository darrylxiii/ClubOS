import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Users, Building2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AdminRoleSwitcher = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<string>('admin');

  useEffect(() => {
    fetchUserRoles();
    fetchUserPreferences();
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    setRoles(data?.map(r => r.role) || []);
  };

  const fetchUserPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('preferred_role_view')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.preferred_role_view) {
      setCurrentView(data.preferred_role_view);
    }
  };

  const handleSwitchView = async (role: string) => {
    if (!user) return;

    // Save to database instead of localStorage (secure, server-side)
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferred_role_view: role,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving preference:', error);
      toast.error("Failed to save view preference");
      return;
    }

    setCurrentView(role);
    toast.success(`Switched to ${role} view`);

    // Navigate to appropriate dashboard
    switch (role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'partner':
        navigate('/partner-dashboard');
        break;
      case 'strategist':
        navigate('/dashboard');
        break;
      case 'user':
        navigate('/dashboard');
        break;
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return { icon: Shield, label: 'Admin', description: 'Full system access', color: 'default' as const };
      case 'partner':
        return { icon: Building2, label: 'Partner', description: 'Company hiring pipeline', color: 'secondary' as const };
      case 'strategist':
        return { icon: Users, label: 'Strategist', description: 'Talent management', color: 'secondary' as const };
      case 'user':
        return { icon: User, label: 'Candidate', description: 'Job applications', color: 'outline' as const };
      default:
        return { icon: User, label: role, description: '', color: 'outline' as const };
    }
  };

  if (roles.length <= 1) return null;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg font-black uppercase">Role Switcher</CardTitle>
        <CardDescription>
          Switch between different role views based on your permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const info = getRoleInfo(role);
            const Icon = info.icon;
            const isActive = currentView === role;

            return (
              <Button
                key={role}
                variant={isActive ? "default" : "outline"}
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => handleSwitchView(role)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="w-5 h-5" />
                  <span className="font-bold text-lg">{info.label}</span>
                  {isActive && <Badge className="ml-auto">Active</Badge>}
                </div>
                <p className="text-xs text-left opacity-80">{info.description}</p>
              </Button>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Current view: <strong>{getRoleInfo(currentView).label}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};