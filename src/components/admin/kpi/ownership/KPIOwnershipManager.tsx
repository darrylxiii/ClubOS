import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, UserCheck, AlertTriangle, CheckCircle2, Clock, User } from 'lucide-react';
import { useKPIOwnership, KPIOwnership } from '@/hooks/useKPIOwnership';
import { useUnifiedKPIs, UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role?: string;
}

export function KPIOwnershipManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<UnifiedKPI | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [reviewFrequency, setReviewFrequency] = useState<string>('weekly');

  const { allKPIs: kpis } = useUnifiedKPIs();
  const { ownerships, assignOwner, isAssigning, loadingOwnerships } = useKPIOwnership();

  // Fetch team members for assignment
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-for-kpi'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name', { ascending: true });
      
      if (error) throw error;

      // Get roles for each profile
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const membersWithRoles = profiles.map(p => ({
        ...p,
        role: roles?.find(r => r.user_id === p.id)?.role || 'user',
      }));

      return membersWithRoles as TeamMember[];
    },
  });

  // Build ownership map for quick lookup
  const ownershipMap = useMemo(() => {
    const map: Record<string, KPIOwnership> = {};
    ownerships?.forEach(o => {
      map[o.kpi_name] = o;
    });
    return map;
  }, [ownerships]);

  // Get unique domains
  const domains = useMemo(() => {
    const domainSet = new Set<string>();
    kpis?.forEach(kpi => domainSet.add(kpi.domain));
    return Array.from(domainSet).sort();
  }, [kpis]);

  // Filter KPIs
  const filteredKPIs = useMemo(() => {
    if (!kpis) return [];
    return kpis.filter(kpi => {
      const matchesSearch = !searchQuery || 
        kpi.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kpi.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = selectedDomain === 'all' || kpi.domain === selectedDomain;
      return matchesSearch && matchesDomain;
    });
  }, [kpis, searchQuery, selectedDomain]);

  // Stats
  const stats = useMemo(() => {
    const total = kpis?.length || 0;
    const assigned = ownerships?.filter(o => o.owner_user_id || o.owner_role).length || 0;
    const overdueReviews = ownerships?.filter(o => 
      o.next_review_at && new Date(o.next_review_at) < new Date()
    ).length || 0;
    return { total, assigned, unassigned: total - assigned, overdueReviews };
  }, [kpis, ownerships]);

  const handleAssign = () => {
    if (!selectedKPI) return;
    
    assignOwner({
      kpiName: selectedKPI.name,
      domain: selectedKPI.domain,
      category: selectedKPI.category,
      ownerUserId: selectedOwner || undefined,
      backupOwnerId: selectedBackup || undefined,
      reviewFrequency,
    });
    
    setAssignDialogOpen(false);
    setSelectedKPI(null);
    setSelectedOwner('');
    setSelectedBackup('');
  };

  const openAssignDialog = (kpi: UnifiedKPI) => {
    setSelectedKPI(kpi);
    const existing = ownershipMap[kpi.name];
    if (existing) {
      setSelectedOwner(existing.owner_user_id || '');
      setSelectedBackup(existing.backup_owner_id || '');
      setReviewFrequency(existing.review_frequency);
    } else {
      setSelectedOwner('');
      setSelectedBackup('');
      setReviewFrequency('weekly');
    }
    setAssignDialogOpen(true);
  };

  const getStatusBadge = (kpi: UnifiedKPI) => {
    const ownership = ownershipMap[kpi.name];
    
    if (!ownership?.owner_user_id && !ownership?.owner_role) {
      return (
        <Badge variant="outline" className="gap-1 border-dashed text-muted-foreground">
          <User className="h-3 w-3" />
          Unassigned
        </Badge>
      );
    }

    const isOverdue = ownership.next_review_at && new Date(ownership.next_review_at) < new Date();
    
    if (isOverdue) {
      return (
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600/30 bg-amber-500/10">
          <AlertTriangle className="h-3 w-3" />
          Review Overdue
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/30 bg-emerald-500/10">
        <CheckCircle2 className="h-3 w-3" />
        Assigned
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total KPIs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.assigned}</p>
              </div>
              <UserCheck className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unassigned</p>
                <p className="text-2xl font-bold text-amber-600">{stats.unassigned}</p>
              </div>
              <User className="h-8 w-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Reviews</p>
                <p className="text-2xl font-bold text-rose-600">{stats.overdueReviews}</p>
              </div>
              <Clock className="h-8 w-8 text-rose-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">KPI Ownership Assignment</CardTitle>
          <CardDescription>Assign owners to KPIs for accountability and review tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search KPIs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map(domain => (
                  <SelectItem key={domain} value={domain}>
                    {domain.charAt(0).toUpperCase() + domain.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* KPI List */}
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {filteredKPIs.map(kpi => {
                const ownership = ownershipMap[kpi.name];
                const ownerName = ownership?.owner_profile?.full_name || ownership?.owner_role;
                
                return (
                  <div
                    key={kpi.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{kpi.displayName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {kpi.domain}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {kpi.category} • Current: {typeof kpi.value === 'number' ? kpi.value.toFixed(1) : kpi.value}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {ownership?.owner_user_id && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={ownership.owner_profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {ownerName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            {ownerName}
                          </span>
                        </div>
                      )}
                      {getStatusBadge(kpi)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssignDialog(kpi)}
                      >
                        {ownership?.owner_user_id ? 'Edit' : 'Assign'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign KPI Owner</DialogTitle>
            <DialogDescription>
              {selectedKPI?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Primary Owner</Label>
              <Select value={selectedOwner || "__none__"} onValueChange={(v) => setSelectedOwner(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No owner</SelectItem>
                  {teamMembers?.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.full_name || member.email}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {member.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Backup Owner (Optional)</Label>
              <Select value={selectedBackup || "__none__"} onValueChange={(v) => setSelectedBackup(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select backup..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No backup</SelectItem>
                  {teamMembers?.filter(m => m.id !== selectedOwner).map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.full_name || member.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Review Frequency</Label>
              <Select value={reviewFrequency} onValueChange={setReviewFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isAssigning}>
              {isAssigning ? 'Saving...' : 'Save Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
