import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { assignRole, removeRole, getUserRole, type UserRole } from '@/lib/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Shield, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface AdminRoleManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserWithRole {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole | null;
}

export function AdminRoleManager({ open, onOpenChange }: AdminRoleManagerProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');

      if (error) throw error;

      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const role = await getUserRole(profile.id);
          return { ...profile, role };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole | 'none') => {
    if (!user) return;

    setUpdating(userId);
    try {
      const currentUser = users.find((u) => u.id === userId);
      
      // Remove current role if exists
      if (currentUser?.role) {
        await removeRole(userId, currentUser.role);
      }

      // Assign new role if not 'none'
      if (newRole !== 'none') {
        await assignRole(userId, newRole, user.id);
      }

      toast.success('Role updated successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const getRoleIcon = (role: UserRole | null) => {
    if (role === 'admin') return <Crown className="h-4 w-4 text-yellow-500" />;
    if (role === 'moderator') return <Shield className="h-4 w-4 text-blue-500" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  const getRoleBadge = (role: UserRole | null) => {
    if (!role) return null;
    
    const colors = {
      admin: 'bg-yellow-500/10 text-yellow-500',
      moderator: 'bg-blue-500/10 text-blue-500',
      user: 'bg-muted text-muted-foreground'
    };

    return (
      <Badge variant="secondary" className={colors[role]}>
        {role}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage User Roles</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span className="font-medium truncate">
                        {user.full_name || 'Unknown User'}
                      </span>
                    </div>
                    {getRoleBadge(user.role)}
                  </div>

                  <Select
                    value={user.role || 'none'}
                    onValueChange={(value) => handleRoleChange(user.id, value as UserRole | 'none')}
                    disabled={updating === user.id}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Role</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
