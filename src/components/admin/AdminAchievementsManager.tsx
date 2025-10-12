import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Award, Plus, Trash2, Edit, UserPlus, Building2, Search, Filter, Eye, EyeOff, Users, TrendingUp, Calendar, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as LucideIcons from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  achievement_type: 'custom' | 'platform_generated';
  company_id?: string;
  company_name?: string;
  is_active: boolean;
  earner_count?: number;
  created_at?: string;
}

interface Earner {
  id: string;
  user_id?: string;
  earned_company_id?: string;
  earned_at: string;
  user_name?: string;
  company_name?: string;
  granted_by?: string;
}

export const AdminAchievementsManager = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earners, setEarners] = useState<Earner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'platform'>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAchievements: 0, totalEarners: 0, activeAchievements: 0, companiesWithAchievements: 0 });
  
  // Dialog states
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [earnersDialogOpen, setEarnersDialogOpen] = useState(false);
  
  const [grantForm, setGrantForm] = useState({ achievementId: "", userId: "", companyId: "" });
  const [newAchievement, setNewAchievement] = useState({ name: "", description: "", icon: "Award", companyId: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "", icon: "Award" });
  
  const { toast } = useToast();

  const iconOptions = ["Award", "Trophy", "Star", "Medal", "Crown", "Target", "Zap", "Heart", "Shield", "Gem", "Rocket", "Flame", "Sparkles"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadAchievements(), loadCompanies(), loadUsers(), loadStats()]);
  };

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("company_achievements")
        .select(`
          *,
          company:companies(name),
          earner_count:company_achievement_earners(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const achievementsWithData = data.map(a => ({
        ...a,
        company_name: a.company?.name,
        earner_count: a.earner_count?.[0]?.count || 0
      }));

      setAchievements(achievementsWithData);
    } catch (error) {
      console.error("Error loading achievements:", error);
      toast({ title: "Error loading achievements", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (data) setCompanies(data);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");
    if (data) setUsers(data);
  };

  const loadStats = async () => {
    const { data: achievementsData } = await supabase.from("company_achievements").select("id, is_active, company_id");
    const { data: earnersData } = await supabase.from("company_achievement_earners").select("id");
    
    if (achievementsData && earnersData) {
      const uniqueCompanies = new Set(achievementsData.map(a => a.company_id)).size;
      setStats({
        totalAchievements: achievementsData.length,
        totalEarners: earnersData.length,
        activeAchievements: achievementsData.filter(a => a.is_active).length,
        companiesWithAchievements: uniqueCompanies
      });
    }
  };

  const loadEarners = async (achievementId: string) => {
    try {
      const { data, error } = await supabase
        .from("company_achievement_earners")
        .select("*")
        .eq("achievement_id", achievementId)
        .order("earned_at", { ascending: false });

      if (error) throw error;

      // Fetch user and company data separately
      const earnersData = await Promise.all(data.map(async (e) => {
        let user_name = null;
        let company_name = null;

        if (e.user_id) {
          const { data: userData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", e.user_id)
            .single();
          user_name = userData?.full_name || userData?.email;
        }

        if (e.earned_company_id) {
          const { data: companyData } = await supabase
            .from("companies")
            .select("name")
            .eq("id", e.earned_company_id)
            .single();
          company_name = companyData?.name;
        }

        return {
          ...e,
          user_name,
          company_name
        };
      }));

      setEarners(earnersData);
    } catch (error) {
      toast({ title: "Error loading earners", variant: "destructive" });
    }
  };

  const handleCreatePlatformAchievement = async () => {
    try {
      const { error } = await supabase
        .from("company_achievements")
        .insert({
          company_id: newAchievement.companyId,
          name: newAchievement.name,
          description: newAchievement.description,
          icon: newAchievement.icon,
          achievement_type: 'platform_generated'
        });

      if (error) throw error;

      toast({ title: "Platform achievement created successfully" });
      setCreateDialogOpen(false);
      setNewAchievement({ name: "", description: "", icon: "Award", companyId: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error creating achievement", description: error.message, variant: "destructive" });
    }
  };

  const handleEditAchievement = async () => {
    if (!selectedAchievement) return;
    
    try {
      const { error } = await supabase
        .from("company_achievements")
        .update(editForm)
        .eq("id", selectedAchievement.id);

      if (error) throw error;

      toast({ title: "Achievement updated successfully" });
      setEditDialogOpen(false);
      setSelectedAchievement(null);
      loadAchievements();
    } catch (error: any) {
      toast({ title: "Error updating achievement", description: error.message, variant: "destructive" });
    }
  };

  const handleGrantAchievement = async () => {
    try {
      const { error } = await supabase
        .from("company_achievement_earners")
        .insert({
          achievement_id: grantForm.achievementId,
          user_id: grantForm.userId || null,
          earned_company_id: grantForm.companyId || null,
          granted_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({ title: "Achievement granted successfully" });
      setGrantDialogOpen(false);
      setGrantForm({ achievementId: "", userId: "", companyId: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error granting achievement", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("company_achievements")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      toast({ title: `Achievement ${!currentState ? 'activated' : 'deactivated'}` });
      loadAchievements();
    } catch (error) {
      toast({ title: "Error updating achievement", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this achievement? This will remove all earned instances.")) return;

    try {
      const { error } = await supabase
        .from("company_achievements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Achievement deleted successfully" });
      loadData();
    } catch (error) {
      toast({ title: "Error deleting achievement", variant: "destructive" });
    }
  };

  const handleRevokeEarner = async (earnerId: string) => {
    if (!confirm("Revoke this achievement from the user/company?")) return;

    try {
      const { error } = await supabase
        .from("company_achievement_earners")
        .delete()
        .eq("id", earnerId);

      if (error) throw error;

      toast({ title: "Achievement revoked successfully" });
      if (selectedAchievement) {
        loadEarners(selectedAchievement.id);
      }
      loadData();
    } catch (error) {
      toast({ title: "Error revoking achievement", variant: "destructive" });
    }
  };

  const openEditDialog = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setEditForm({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon
    });
    setEditDialogOpen(true);
  };

  const openEarnersDialog = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    loadEarners(achievement.id);
    setEarnersDialogOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Award;
    return Icon;
  };

  const filteredAchievements = achievements.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || a.achievement_type === filterType;
    const matchesCompany = filterCompany === 'all' || a.company_id === filterCompany;
    
    return matchesSearch && matchesFilter && matchesCompany;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Achievements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAchievements}</div>
            <p className="text-xs text-muted-foreground">{stats.activeAchievements} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEarners}</div>
            <p className="text-xs text-muted-foreground">Across all achievements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.companiesWithAchievements}</div>
            <p className="text-xs text-muted-foreground">With achievements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Achievement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAchievements > 0 ? Math.round(stats.totalEarners / stats.totalAchievements) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Earners per achievement</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Admin Achievements Manager
              </CardTitle>
              <CardDescription>
                Comprehensive achievement management, analytics, and granting system
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Grant Achievement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Grant Achievement</DialogTitle>
                    <DialogDescription>
                      Manually grant an achievement to a user or company
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Achievement</Label>
                      <Select
                        value={grantForm.achievementId}
                        onValueChange={(value) => setGrantForm({ ...grantForm, achievementId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select achievement" />
                        </SelectTrigger>
                        <SelectContent>
                          {achievements.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.company_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>User (Optional)</Label>
                      <Select
                        value={grantForm.userId}
                        onValueChange={(value) => setGrantForm({ ...grantForm, userId: value, companyId: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-48">
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Company (Optional)</Label>
                      <Select
                        value={grantForm.companyId}
                        onValueChange={(value) => setGrantForm({ ...grantForm, companyId: value, userId: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleGrantAchievement}
                      disabled={!grantForm.achievementId || (!grantForm.userId && !grantForm.companyId)}
                    >
                      Grant
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Platform Achievement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Platform Achievement</DialogTitle>
                    <DialogDescription>
                      Create a new platform-generated achievement for a company
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Company</Label>
                      <Select
                        value={newAchievement.companyId}
                        onValueChange={(value) => setNewAchievement({ ...newAchievement, companyId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newAchievement.name}
                        onChange={(e) => setNewAchievement({ ...newAchievement, name: e.target.value })}
                        placeholder="Achievement name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newAchievement.description}
                        onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                        placeholder="Achievement description"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={newAchievement.icon}
                        onValueChange={(value) => setNewAchievement({ ...newAchievement, icon: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((icon) => {
                            const IconComponent = getIconComponent(icon);
                            return (
                              <SelectItem key={icon} value={icon}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="w-4 h-4" />
                                  {icon}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreatePlatformAchievement}
                      disabled={!newAchievement.name || !newAchievement.description || !newAchievement.companyId}
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Achievements</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search achievements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="platform_generated">Platform Generated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-48">
                    <Building2 className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Achievements List */}
              <div className="space-y-3">
                {filteredAchievements.map((achievement) => {
                  const IconComponent = getIconComponent(achievement.icon);
                  return (
                    <Card key={achievement.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              achievement.achievement_type === 'platform_generated'
                                ? 'bg-gradient-to-br from-primary to-purple-500'
                                : 'bg-primary/10'
                            }`}>
                              <IconComponent className={`w-6 h-6 ${
                                achievement.achievement_type === 'platform_generated' ? 'text-white' : 'text-primary'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{achievement.name}</h4>
                                <Badge variant={achievement.achievement_type === 'platform_generated' ? 'default' : 'secondary'}>
                                  {achievement.achievement_type === 'platform_generated' ? 'Platform' : 'Custom'}
                                </Badge>
                                {!achievement.is_active && <Badge variant="outline">Inactive</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {achievement.company_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {achievement.earner_count} earned
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {achievement.created_at ? new Date(achievement.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEarnersDialog(achievement)}
                              title="View earners"
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(achievement)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleToggleActive(achievement.id, achievement.is_active)}
                              title={achievement.is_active ? "Deactivate" : "Activate"}
                            >
                              {achievement.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(achievement.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredAchievements.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No achievements found matching your filters.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Achievement Analytics</CardTitle>
                  <CardDescription>Detailed breakdown and insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Top Achievements by Earners</h3>
                      <div className="space-y-2">
                        {achievements
                          .sort((a, b) => (b.earner_count || 0) - (a.earner_count || 0))
                          .slice(0, 5)
                          .map((a) => {
                            const IconComponent = getIconComponent(a.icon);
                            return (
                              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <IconComponent className="w-5 h-5 text-primary" />
                                  <div>
                                    <div className="font-medium">{a.name}</div>
                                    <div className="text-xs text-muted-foreground">{a.company_name}</div>
                                  </div>
                                </div>
                                <Badge>{a.earner_count} earned</Badge>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-3">By Type</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Custom Achievements</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {achievements.filter(a => a.achievement_type === 'custom').length}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Platform Generated</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {achievements.filter(a => a.achievement_type === 'platform_generated').length}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Achievement Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Achievement</DialogTitle>
            <DialogDescription>
              Update achievement details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Achievement name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Achievement description"
                rows={3}
              />
            </div>
            <div>
              <Label>Icon</Label>
              <Select
                value={editForm.icon}
                onValueChange={(value) => setEditForm({ ...editForm, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => {
                    const IconComponent = getIconComponent(icon);
                    return (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          {icon}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAchievement} disabled={!editForm.name || !editForm.description}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Earners Dialog */}
      <Dialog open={earnersDialogOpen} onOpenChange={setEarnersDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Achievement Earners</DialogTitle>
            <DialogDescription>
              {selectedAchievement?.name} - {earners.length} total earners
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Earned Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earners.map((earner) => (
                  <TableRow key={earner.id}>
                    <TableCell>
                      {earner.user_name || earner.company_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={earner.user_id ? 'default' : 'secondary'}>
                        {earner.user_id ? 'User' : 'Company'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(earner.earned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeEarner(earner.id)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {earners.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No one has earned this achievement yet.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};