import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, User, Sparkles } from "lucide-react";
import { UserRole } from "@/hooks/useUserRole";
import { NotificationBell } from "@/components/NotificationBell";
import { RoleSwitcher } from "@/components/RoleSwitcher";

interface ClubHomeHeaderProps {
  role: UserRole;
}

export const ClubHomeHeader = ({ role }: ClubHomeHeaderProps) => {
  const { user } = useAuth();

  const getRoleIcon = () => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'partner':
        return <Users className="h-4 w-4" />;
      case 'strategist':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'partner':
        return 'Partner';
      case 'strategist':
        return 'Talent Strategist';
      default:
        return 'Candidate';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="bg-card rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              {getGreeting()}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="gap-1">
                {getRoleIcon()}
                {getRoleLabel()}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Club Member
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="outline" size="sm">
            Get Help
          </Button>
        </div>
      </div>

      {/* Role switcher if user has multiple roles */}
      <RoleSwitcher />
    </div>
  );
};
