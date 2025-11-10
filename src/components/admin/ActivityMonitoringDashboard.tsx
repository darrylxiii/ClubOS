import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Activity, Users, TrendingUp, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserActivity {
  user_id: string;
  last_activity_at: string;
  activity_level: 'highly_active' | 'active' | 'moderate' | 'low' | 'inactive';
  online_status: 'online' | 'away' | 'busy' | 'offline';
  total_actions: number;
  activity_score: number;
  last_action_type: string | null;
  // Joined data
  email: string;
  full_name: string | null;
  roles: string[];
  company_id: string | null;
  company_name: string | null;
  user_type: 'internal' | 'external';
}

interface ActivityStats {
  total_users: number;
  online_users: number;
  active_today: number;
  inactive_users: number;
}

// User type classification based on roles
const INTERNAL_ROLES = ['admin', 'strategist', 'recruiter'];
const EXTERNAL_ROLES = ['user', 'partner', 'company_admin'];

// System actions that should be hidden from users
const SYSTEM_ACTIONS = ['heartbeat', 'page_focus', 'page_view'];

// User-friendly action labels
const ACTION_LABELS: Record<string, string> = {
  profile_update: 'Updated profile',
  message_sent: 'Sent message',
  document_upload: 'Uploaded document',
  interview_scheduled: 'Scheduled interview',
  candidate_viewed: 'Viewed candidate',
  application_submitted: 'Submitted application',
  pipeline_updated: 'Updated pipeline',
};

// Format time in a concise, user-friendly way
const formatTimeAgo = (date: string): string => {
  const now = Date.now();
  const activityTime = new Date(date).getTime();
  const diffMs = now - activityTime;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

// Calculate session duration for online users
const getSessionDuration = (lastActivity: string): string | null => {
  const now = Date.now();
  const activityTime = new Date(lastActivity).getTime();
  const diffMinutes = Math.floor((now - activityTime) / (1000 * 60));
  
  if (diffMinutes < 2) {
    // User is online, estimate session duration (this is approximate)
    return 'active now';
  }
  return null;
};

// Format activity level label
const formatActivityLevel = (level: string): string => {
  return level.replace('_', ' ');
};

export function ActivityMonitoringDashboard() {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    total_users: 0,
    online_users: 0,
    active_today: 0,
    inactive_users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activityLevelFilter, setActivityLevelFilter] = useState<string>("all");
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('activity-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_activity_tracking',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, activityLevelFilter, onlineStatusFilter, userTypeFilter, companyFilter]);

  // Calculate online status dynamically
  const calculateStatus = (lastActivity: string | null): 'online' | 'away' | 'offline' => {
    if (!lastActivity) return 'offline';
    
    const lastActivityTime = new Date(lastActivity).getTime();
    const now = Date.now();
    const minutesAgo = (now - lastActivityTime) / (1000 * 60);
    
    if (minutesAgo < 2) return 'online';
    if (minutesAgo < 30) return 'away';
    return 'offline';
  };

  const fetchData = async () => {
    try {
      // Fetch activity tracking data
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity_tracking')
        .select('*')
        .order('last_activity_at', { ascending: false });

      if (activityError) throw activityError;

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, company_id');

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Combine data
      const combinedData: UserActivity[] = (activityData || []).map((activity) => {
        const profile = profiles?.find(p => p.id === activity.user_id);
        const userRoles = roles?.filter(r => r.user_id === activity.user_id).map(r => r.role) || [];
        const company = companiesData?.find(c => c.id === profile?.company_id);
        
        // Determine user type
        const hasInternalRole = userRoles.some(role => INTERNAL_ROLES.includes(role));
        const user_type = hasInternalRole ? 'internal' : 'external';

        return {
          user_id: activity.user_id,
          last_activity_at: activity.last_activity_at,
          activity_level: activity.activity_level as any,
          online_status: calculateStatus(activity.last_activity_at),
          total_actions: activity.total_actions || 0,
          activity_score: activity.activity_score || 0,
          last_action_type: activity.last_action_type,
          email: profile?.email || 'Unknown',
          full_name: profile?.full_name || null,
          roles: userRoles,
          company_id: profile?.company_id || null,
          company_name: company?.name || null,
          user_type,
        };
      });

      setUsers(combinedData);

      // Calculate stats
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      setStats({
        total_users: combinedData.length,
        online_users: combinedData.filter(u => u.online_status === 'online').length,
        active_today: combinedData.filter(u => new Date(u.last_activity_at) > oneDayAgo).length,
        inactive_users: combinedData.filter(u => u.activity_level === 'inactive').length,
      });

    } catch (error) {
      console.error('Error fetching activity data:', error);
      toast.error("Failed to load activity data");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.roles.includes(roleFilter));
    }

    // Activity level filter
    if (activityLevelFilter !== "all") {
      filtered = filtered.filter(user => user.activity_level === activityLevelFilter);
    }

    // Online status filter
    if (onlineStatusFilter !== "all") {
      filtered = filtered.filter(user => user.online_status === onlineStatusFilter);
    }

    // User type filter
    if (userTypeFilter !== "all") {
      filtered = filtered.filter(user => user.user_type === userTypeFilter);
    }

    // Company filter
    if (companyFilter !== "all") {
      filtered = filtered.filter(user => user.company_id === companyFilter);
    }

    setFilteredUsers(filtered);
  };

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'highly_active':
        return 'bg-emerald-500 text-white';
      case 'active':
        return 'bg-green-500 text-white';
      case 'moderate':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-orange-500 text-white';
      case 'inactive':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getOnlineStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getUserTypeColor = (type: string) => {
    return type === 'internal' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white';
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading activity data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.total_users}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <p className="text-2xl font-bold">{stats.online_users}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              <p className="text-2xl font-bold">{stats.active_today}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <p className="text-2xl font-bold">{stats.inactive_users}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Activity Monitoring</CardTitle>
              <CardDescription>Real-time activity tracking for all platform users</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Basic Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>

            <Select value={onlineStatusFilter} onValueChange={setOnlineStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Online Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="away">Away</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Role</label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="strategist">Strategist</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="user">Candidate</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Activity Level</label>
                  <Select value={activityLevelFilter} onValueChange={setActivityLevelFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="highly_active">Highly Active</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Company</label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>

          {/* Activity Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity Level</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          getOnlineStatusColor(user.online_status),
                          user.online_status === 'online' && "animate-pulse"
                        )} />
                        <div>
                          <div className="font-medium">{user.full_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.online_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(getActivityLevelColor(user.activity_level), "whitespace-nowrap")}>
                        {formatActivityLevel(user.activity_level)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getUserTypeColor(user.user_type)} variant="outline">
                        {user.user_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.company_name || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-sm cursor-help">
                              {formatTimeAgo(user.last_activity_at)}
                              {user.online_status === 'online' && (
                                <div className="text-xs text-green-500 font-medium">
                                  {getSessionDuration(user.last_activity_at)}
                                </div>
                              )}
                              {user.last_action_type && !SYSTEM_ACTIONS.includes(user.last_action_type) && (
                                <div className="text-xs text-muted-foreground">
                                  {ACTION_LABELS[user.last_action_type] || user.last_action_type}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-medium">Last Activity Details</p>
                              <p className="text-xs">Time: {new Date(user.last_activity_at).toLocaleString()}</p>
                              {user.last_action_type && !SYSTEM_ACTIONS.includes(user.last_action_type) && (
                                <p className="text-xs">Action: {ACTION_LABELS[user.last_action_type] || user.last_action_type}</p>
                              )}
                              <p className="text-xs">Total Actions: {user.total_actions}</p>
                              <p className="text-xs">Activity Score: {user.activity_score.toFixed(2)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {user.total_actions} actions
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
