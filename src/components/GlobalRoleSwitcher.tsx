import { Shield, User, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
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
import { useTranslation } from 'react-i18next';

const roleConfig: Record<string, { icon: any; label: string; color: string }> = {
  admin: { icon: Shield, label: 'Admin', color: 'bg-red-500' },
  strategist: { icon: Users, label: 'Strategist', color: 'bg-muted' },
  partner: { icon: Building2, label: 'Partner', color: 'bg-muted' },
  user: { icon: User, label: 'Candidate', color: 'bg-green-500' },
  company_admin: { icon: Building2, label: 'Company Admin', color: 'bg-muted' },
  recruiter: { icon: Users, label: 'Recruiter', color: 'bg-muted' }
};

export const GlobalRoleSwitcher = () => {
  const { t } = useTranslation('common');
  const { currentRole, availableRoles, switchRole, loading } = useRole();

  // Don't show if user only has one role
  if (loading || availableRoles.length <= 1) {
    return null;
  }

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === currentRole) return;
    
    try {
      await switchRole(newRole);
      toast.success(`Switched to ${roleConfig[newRole || '']?.label || 'Role'} view`, {
        description: "Your dashboard will update instantly"
      });
    } catch (error: unknown) {
      console.error('[GlobalRoleSwitcher] Role switch error:', error);
      toast.error("Failed to switch roles", {
        description: error instanceof Error ? error.message : "Please try again or refresh the page"
      });
    }
  };

  const safeRole = currentRole || '';
  const CurrentIcon = roleConfig[safeRole]?.icon || User;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 rounded-full h-9 px-3 hover:bg-white/10 dark:hover:bg-white/5 transition-all outline-none" aria-label={`Current role: ${roleConfig[safeRole]?.label || 'Role'}. Click to switch roles.`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={safeRole}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center gap-2 pointer-events-none"
            >
              <CurrentIcon className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline font-medium">{roleConfig[safeRole]?.label || 'Role'}</span>
            </motion.div>
          </AnimatePresence>
          <span className="hidden md:inline-flex text-[10px] font-semibold tracking-wider uppercase text-muted-foreground bg-foreground/5 px-1.5 py-0.5 rounded-full ml-1">
            {availableRoles.length} roles
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('common:switchRole', 'Switch Role')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map((role) => {
          const safeIterRole = role || '';
          const Icon = roleConfig[safeIterRole]?.icon || User;
          const isActive = role === currentRole;
          
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={isActive ? "bg-muted" : ""}
            >
              <div className="flex items-center gap-2 w-full">
                <div className={`w-2 h-2 rounded-full ${roleConfig[safeIterRole]?.color || 'bg-muted'}`} />
                <Icon className="w-4 h-4" />
                <span className="flex-1">{roleConfig[safeIterRole]?.label || role}</span>
                {isActive && <Badge variant="default" className="text-xs">Active</Badge>}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};