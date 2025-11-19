import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, User, Sparkles } from "lucide-react";
import { UserRole } from "@/hooks/useUserRole";
import { NotificationBell } from "@/components/NotificationBell";
import { useProfile } from "@/hooks/useProfile";
import { TypewriterGreeting } from "./TypewriterGreeting";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { T } from "@/components/T";

interface ClubHomeHeaderProps {
  role: UserRole;
}

export const ClubHomeHeader = ({ role }: ClubHomeHeaderProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { profile, loading: profileLoading } = useProfile({ 
    userId: user?.id, 
    autoLoad: true 
  });

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
        return t('common:roles.admin');
      case 'partner':
        return t('common:roles.partner');
      case 'strategist':
        return t('common:roles.strategist');
      default:
        return t('common:roles.candidate');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('common:home.greeting.morning');
    if (hour < 18) return t('common:home.greeting.afternoon');
    return t('common:home.greeting.evening');
  };

  const getFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'there';
  };

  // PHASE 3: Wait for user to be available before rendering
  if (!user) {
    console.log('[ClubHomeHeader] ⏸️ Waiting for user to load');
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </div>
    );
  }

  console.log('[ClubHomeHeader] ✅ Rendering with user:', user.email, 'Profile:', profile?.full_name);

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
            {profileLoading ? (
              <Skeleton className="h-8 w-48 mb-2" />
            ) : (
              <TypewriterGreeting 
                greeting={getGreeting()} 
                firstName={getFirstName()} 
              />
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="gap-1">
                {getRoleIcon()}
                {getRoleLabel()}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                <T k="common:home.clubMember" fallback="Club Member" />
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
