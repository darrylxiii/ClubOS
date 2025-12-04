import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, X, UserPlus, Users, Shield, Building2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface StealthViewer {
  id: string;
  user_id: string;
  granted_by: string;
  granted_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  granter?: {
    full_name: string;
  };
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role?: string;
  company_name?: string;
}

interface StealthViewerSelectorProps {
  jobId?: string;
  companyId: string;
  selectedUserIds: string[];
  onSelectedUsersChange: (userIds: string[]) => void;
  existingViewers?: StealthViewer[];
  disabled?: boolean;
}

export function StealthViewerSelector({
  jobId,
  companyId,
  selectedUserIds,
  onSelectedUsersChange,
  existingViewers = [],
  disabled = false,
}: StealthViewerSelectorProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users with their roles and company info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          company_id,
          companies:company_id (name)
        `)
        .not('id', 'is', null);

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to users
      const roleMap = new Map<string, string>();
      rolesData?.forEach((r) => {
        // Prioritize admin > strategist > partner > candidate
        const currentRole = roleMap.get(r.user_id);
        const priority: Record<string, number> = { admin: 4, strategist: 3, partner: 2, candidate: 1 };
        if (!currentRole || (priority[r.role] || 0) > (priority[currentRole] || 0)) {
          roleMap.set(r.user_id, r.role);
        }
      });

      const mappedUsers: UserOption[] = (profilesData || []).map((p) => ({
        id: p.id,
        full_name: p.full_name || 'Unknown User',
        email: p.email || '',
        avatar_url: p.avatar_url || undefined,
        role: roleMap.get(p.id) || 'user',
        company_name: (p.companies as any)?.name || undefined,
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group users by category
  const groupedUsers = useMemo(() => {
    const filtered = users.filter((u) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.company_name?.toLowerCase().includes(query)
      );
    });

    // Separate by company and role
    const companyUsers = filtered.filter(
      (u) => u.company_name && users.find((cu) => cu.id === u.id)
    );
    const adminsAndStrategists = filtered.filter(
      (u) => u.role === 'admin' || u.role === 'strategist'
    );
    const otherUsers = filtered.filter(
      (u) => !adminsAndStrategists.includes(u) && !companyUsers.includes(u)
    );

    return {
      companyUsers: companyUsers.filter((u) => u.id !== user?.id),
      adminsAndStrategists: adminsAndStrategists.filter((u) => u.id !== user?.id),
      otherUsers: otherUsers.filter((u) => u.id !== user?.id),
    };
  }, [users, searchQuery, user?.id]);

  const toggleUser = (userId: string) => {
    if (disabled) return;
    
    if (selectedUserIds.includes(userId)) {
      onSelectedUsersChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectedUsersChange([...selectedUserIds, userId]);
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'strategist':
        return 'default';
      case 'partner':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const UserItem = ({ u, isSelected }: { u: UserOption; isSelected: boolean }) => (
    <button
      type="button"
      onClick={() => toggleUser(u.id)}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
        isSelected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted/50 border border-transparent",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={u.avatar_url} />
        <AvatarFallback className="text-xs">{getInitials(u.full_name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{u.full_name}</span>
          {u.role && (
            <Badge variant={getRoleBadgeVariant(u.role)} className="text-[10px] px-1.5 py-0">
              {u.role}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
      </div>
      {isSelected && (
        <div className="flex-shrink-0">
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs">✓</span>
          </div>
        </div>
      )}
    </button>
  );

  const UserGroup = ({
    title,
    icon: Icon,
    users: groupUsers,
  }: {
    title: string;
    icon: any;
    users: UserOption[];
  }) => {
    if (groupUsers.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <Badge variant="outline" className="text-xs">
            {groupUsers.length}
          </Badge>
        </div>
        <div className="space-y-1">
          {groupUsers.map((u) => (
            <UserItem key={u.id} u={u} isSelected={selectedUserIds.includes(u.id)} />
          ))}
        </div>
      </div>
    );
  };

  // Show existing viewers with who granted them
  const ExistingViewersList = () => {
    if (existingViewers.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Current Viewers</span>
          <Badge variant="secondary" className="text-xs">
            {existingViewers.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {existingViewers.map((viewer) => (
            <div
              key={viewer.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={viewer.user?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(viewer.user?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{viewer.user?.full_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Added {format(new Date(viewer.granted_at), 'MMM d, yyyy')} by{' '}
                      {viewer.granter?.full_name || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleUser(viewer.user_id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Separator />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Grant Access To
        </Label>
        {selectedUserIds.length > 0 && (
          <Badge variant="secondary">
            {selectedUserIds.length} selected
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={disabled}
        />
      </div>

      <ScrollArea className="h-[300px] rounded-lg border p-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <ExistingViewersList />

            <UserGroup
              title="Team Members"
              icon={Building2}
              users={groupedUsers.companyUsers}
            />

            <UserGroup
              title="Admins & Strategists"
              icon={Shield}
              users={groupedUsers.adminsAndStrategists}
            />

            <UserGroup
              title="Other Users"
              icon={Users}
              users={groupedUsers.otherUsers}
            />

            {groupedUsers.companyUsers.length === 0 &&
              groupedUsers.adminsAndStrategists.length === 0 &&
              groupedUsers.otherUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No users found</p>
                  {searchQuery && (
                    <p className="text-xs">Try a different search term</p>
                  )}
                </div>
              )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
