import { useState, useEffect } from "react";
import { ListSkeleton } from "@/components/LoadingSkeletons";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/notify";
import { Award, Plus, Trash2, Edit, UserPlus, Building2, Search, Filter, Eye, EyeOff, Users, Activity, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as LucideIcons from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompanyAchievement {
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
  criteria?: any;
}

interface QuantumAchievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  category: string;
  rarity: string;
  points: number;
  is_active: boolean;
  is_deprecated: boolean;
  unlock_criteria: any;
  unlock_count?: number;
  created_at?: string;
}

interface Earner {
  id: string;
  user_id?: string;
  earned_company_id?: string;
  earned_at?: string;
  unlocked_at?: string;
  user_name?: string;
  company_name?: string;
  granted_by?: string;
}

export const AdminAchievementsManager = () => {
  const [companyAchievements, setCompanyAchievements] = useState<CompanyAchievement[]>([]);
  const [quantumAchievements, setQuantumAchievements] = useState<QuantumAchievement[]>([]);
  const [earners, setEarners] = useState<Earner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'platform'>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [selectedCompanyAchievement, setSelectedCompanyAchievement] = useState<CompanyAchievement | null>(null);
  const [selectedQuantumAchievement, setSelectedQuantumAchievement] = useState<QuantumAchievement | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    totalCompanyAchievements: 0, 
    totalQuantumAchievements: 0,
    totalCompanyEarners: 0,
    totalQuantumEarners: 0,
    activeCompanyAchievements: 0,
    activeQuantumAchievements: 0,
    companiesWithAchievements: 0 
  });
  
  // Dialog states
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [editQuantumDialogOpen, setEditQuantumDialogOpen] = useState(false);
  const [earnersDialogOpen, setEarnersDialogOpen] = useState(false);
  const [grantQuantumDialogOpen, setGrantQuantumDialogOpen] = useState(false);
  
  // Create dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'user' | 'company'>('user');
  const [interactionType, setInteractionType] = useState('posts');
  const [criteriaAmount, setCriteriaAmount] = useState(1);
  const [isTimeBound, setIsTimeBound] = useState(false);
  const [timeBoundDays, setTimeBoundDays] = useState(30);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  
  const [grantForm, setGrantForm] = useState({ achievementId: "", userId: "", companyId: "" });
  const [grantQuantumForm, setGrantQuantumForm] = useState({ achievementId: "", userId: "" });
  const [editCompanyForm, setEditCompanyForm] = useState({ name: "", description: "", icon: "Award" });
  const [editQuantumForm, setEditQuantumForm] = useState({
    name: "",
    description: "",
    icon_emoji: "🏆",
    points: 10
  });
  
  const { toast } = useToast();

  const iconOptions = ["Award", "Trophy", "Star", "Medal", "Crown", "Target", "Zap", "Heart", "Shield", "Gem", "Rocket", "Flame", "Sparkles"];
  const categoryOptions = ["engagement", "milestone", "special", "social", "career"];
  const rarityOptions = ["common", "uncommon", "rare", "epic", "legendary"];
  const interactionTypes = [
    { value: 'posts', label: 'Posts' },
    { value: 'comments', label: 'Comments' },
    { value: 'likes', label: 'Likes' },
    { value: 'shares', label: 'Shares' },
    { value: 'profile_views', label: 'Profile Views' },
    { value: 'connections', label: 'Connections' },
    { value: 'applications', label: 'Applications' },
    { value: 'jobs_posted', label: 'Jobs Posted' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadCompanyAchievements(), 
      loadQuantumAchievements(),
      loadCompanies(), 
      loadUsers(), 
      loadStats()
    ]);
  };

  const loadCompanyAchievements = async () => {
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

      setCompanyAchievements(achievementsWithData);
    } catch (error) {
      console.error("Error loading company achievements:", error);
      toast({ title: "Error loading company achievements", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadQuantumAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("quantum_achievements")
        .select(`
          *,
          unlock_count:user_quantum_achievements(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const achievementsWithData = data.map(a => ({
        ...a,
        unlock_count: a.unlock_count?.[0]?.count || 0
      }));

      setQuantumAchievements(achievementsWithData);
    } catch (error) {
      console.error("Error loading quantum achievements:", error);
      toast({ title: "Error loading platform achievements", variant: "destructive" });
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
    const { data: companyAchievementsData } = await supabase.from("company_achievements").select("id, is_active, company_id");
    const { data: quantumAchievementsData } = await supabase.from("quantum_achievements").select("id, is_active");
    const { data: companyEarnersData } = await supabase.from("company_achievement_earners").select("id");
    const { data: quantumEarnersData } = await supabase.from("user_quantum_achievements").select("id");
    
    if (companyAchievementsData && quantumAchievementsData) {
      const uniqueCompanies = new Set(companyAchievementsData.map(a => a.company_id)).size;
      setStats({
        totalCompanyAchievements: companyAchievementsData.length,
        totalQuantumAchievements: quantumAchievementsData.length,
        totalCompanyEarners: companyEarnersData?.length || 0,
        totalQuantumEarners: quantumEarnersData?.length || 0,
        activeCompanyAchievements: companyAchievementsData.filter(a => a.is_active).length,
        activeQuantumAchievements: quantumAchievementsData.filter(a => a.is_active).length,
        companiesWithAchievements: uniqueCompanies
      });
    }
  };

  const loadCompanyEarners = async (achievementId: string) => {
    try {
      const { data, error } = await supabase
        .from("company_achievement_earners")
        .select("*")
        .eq("achievement_id", achievementId)
        .order("earned_at", { ascending: false });

      if (error) throw error;

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

  const loadQuantumEarners = async (achievementId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_quantum_achievements")
        .select("*")
        .eq("achievement_id", achievementId)
        .order("unlocked_at", { ascending: false });

      if (error) throw error;

      const earnersData = await Promise.all(data.map(async (e) => {
        const { data: userData } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", e.user_id)
          .single();

        return {
          id: e.id,
          user_id: e.user_id,
          unlocked_at: e.unlocked_at,
          user_name: userData?.full_name || userData?.email
        };
      }));

      setEarners(earnersData);
    } catch (error) {
      toast({ title: "Error loading earners", variant: "destructive" });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = {
        name: (e.target as any).name.value,
        description: (e.target as any).description.value,
        icon: (e.target as any).icon?.value || 'Award',
      };

      const criteria = {
        interaction_type: interactionType,
        amount: criteriaAmount,
        time_bound: isTimeBound,
        ...(isTimeBound && { days: timeBoundDays })
      };

      if (createType === 'user') {
        const { error } = await supabase
          .from('quantum_achievements')
          .insert([{ 
            ...formData,
            icon_emoji: formData.icon,
            category: (e.target as any).category.value as any,
            rarity: (e.target as any).rarity.value as any,
            points: parseInt((e.target as any).xp_reward.value),
            unlock_criteria: criteria
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_achievements')
          .insert([{
            ...formData,
            company_id: selectedCompanyId,
            achievement_type: 'platform_generated',
            criteria
          }]);
        if (error) throw error;
      }

      toast({ title: 'Achievement created successfully' });
      setShowCreateDialog(false);
      resetCreateForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating achievement:', error);
      toast({ title: "Error creating achievement", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateType('user');
    setInteractionType('posts');
    setCriteriaAmount(1);
    setIsTimeBound(false);
    setTimeBoundDays(30);
    setSelectedCompanyId('');
  };

  const handleEditCompanyAchievement = async () => {
    if (!selectedCompanyAchievement) return;
    
    try {
      const { error } = await supabase
        .from("company_achievements")
        .update(editCompanyForm)
        .eq("id", selectedCompanyAchievement.id);

      if (error) throw error;

      toast({ title: "Achievement updated successfully" });
      setEditCompanyDialogOpen(false);
      setSelectedCompanyAchievement(null);
      loadCompanyAchievements();
    } catch (error: any) {
      toast({ title: "Error updating achievement", description: error.message, variant: "destructive" });
    }
  };

  const handleEditQuantumAchievement = async () => {
    if (!selectedQuantumAchievement) return;
    
    try {
      const { error } = await supabase
        .from("quantum_achievements")
        .update({
          name: editQuantumForm.name,
          description: editQuantumForm.description,
          icon_emoji: editQuantumForm.icon_emoji,
          points: editQuantumForm.points
        })
        .eq("id", selectedQuantumAchievement.id);

      if (error) throw error;

      toast({ title: "Achievement updated successfully" });
      setEditQuantumDialogOpen(false);
      setSelectedQuantumAchievement(null);
      loadQuantumAchievements();
    } catch (error: any) {
      toast({ title: "Error updating achievement", description: error.message, variant: "destructive" });
    }
  };

  const handleGrantCompanyAchievement = async () => {
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

  const handleGrantQuantumAchievement = async () => {
    try {
      const { error } = await supabase
        .from("user_quantum_achievements")
        .insert({
          achievement_id: grantQuantumForm.achievementId,
          user_id: grantQuantumForm.userId
        });

      if (error) throw error;

      toast({ title: "Achievement granted successfully" });
      setGrantQuantumDialogOpen(false);
      setGrantQuantumForm({ achievementId: "", userId: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error granting achievement", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleCompanyActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("company_achievements")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      toast({ title: `Achievement ${!currentState ? 'activated' : 'deactivated'}` });
      loadCompanyAchievements();
    } catch (error) {
      toast({ title: "Error updating achievement", variant: "destructive" });
    }
  };

  const handleToggleQuantumActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("quantum_achievements")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      toast({ title: `Achievement ${!currentState ? 'activated' : 'deactivated'}` });
      loadQuantumAchievements();
    } catch (error) {
      toast({ title: "Error updating achievement", variant: "destructive" });
    }
  };

  const handleDeleteCompanyAchievement = async (id: string) => {
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

  const handleDeleteQuantumAchievement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this achievement? This will remove all earned instances.")) return;

    try {
      const { error } = await supabase
        .from("quantum_achievements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Achievement deleted successfully" });
      loadData();
    } catch (error) {
      toast({ title: "Error deleting achievement", variant: "destructive" });
    }
  };

  const handleRevokeEarner = async (earnerId: string, isQuantum: boolean) => {
    if (!confirm("Revoke this achievement from the user?")) return;

    try {
      const table = isQuantum ? "user_quantum_achievements" : "company_achievement_earners";
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", earnerId);

      if (error) throw error;

      toast({ title: "Achievement revoked successfully" });
      if (isQuantum && selectedQuantumAchievement) {
        loadQuantumEarners(selectedQuantumAchievement.id);
      } else if (selectedCompanyAchievement) {
        loadCompanyEarners(selectedCompanyAchievement.id);
      }
      loadData();
    } catch (error) {
      toast({ title: "Error revoking achievement", variant: "destructive" });
    }
  };

  const openEditCompanyDialog = (achievement: CompanyAchievement) => {
    setSelectedCompanyAchievement(achievement);
    setEditCompanyForm({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon
    });
    setEditCompanyDialogOpen(true);
  };

  const openEditQuantumDialog = (achievement: QuantumAchievement) => {
    setSelectedQuantumAchievement(achievement);
    setEditQuantumForm({
      name: achievement.name,
      description: achievement.description,
      icon_emoji: achievement.icon_emoji,
      points: achievement.points
    });
    setEditQuantumDialogOpen(true);
  };

  const openCompanyEarnersDialog = (achievement: CompanyAchievement) => {
    setSelectedCompanyAchievement(achievement);
    loadCompanyEarners(achievement.id);
    setEarnersDialogOpen(true);
  };

  const openQuantumEarnersDialog = (achievement: QuantumAchievement) => {
    setSelectedQuantumAchievement(achievement);
    loadQuantumEarners(achievement.id);
    setEarnersDialogOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Award;
    return Icon;
  };

  const filteredCompanyAchievements = companyAchievements.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || a.achievement_type === filterType;
    const matchesCompany = filterCompany === 'all' || a.company_id === filterCompany;
    
    return matchesSearch && matchesFilter && matchesCompany;
  });

  const filteredQuantumAchievements = quantumAchievements.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesRarity = filterRarity === 'all' || a.rarity === filterRarity;
    
    return matchesSearch && matchesCategory && matchesRarity;
  });

  if (loading) {
    return <ListSkeleton count={5} />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Achievements Management</h2>
          <p className="text-muted-foreground">Manage platform and company achievements</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Achievement
        </Button>
      </div>

      {/* Header with Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company Achievements</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanyAchievements}</div>
            <p className="text-xs text-muted-foreground">{stats.totalCompanyEarners} earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Achievements</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuantumAchievements}</div>
            <p className="text-xs text-muted-foreground">{stats.totalQuantumEarners} unlocked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCompanyAchievements + stats.activeQuantumAchievements}</div>
            <p className="text-xs text-muted-foreground">Across all types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.companiesWithAchievements}</div>
            <p className="text-xs text-muted-foreground">With achievements</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Admin Achievements Manager
          </CardTitle>
          <CardDescription>
            Comprehensive management of all platform and company achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="company">Company Achievements</TabsTrigger>
              <TabsTrigger value="platform">Platform Achievements</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Company Achievements Tab */}
            <TabsContent value="company" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Grant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Grant Company Achievement</DialogTitle>
                        <DialogDescription>
                          Manually grant a company achievement to a user or company
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
                              {companyAchievements.map((a) => (
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
                        <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={handleGrantCompanyAchievement}
                          disabled={!grantForm.achievementId || (!grantForm.userId && !grantForm.companyId)}
                        >
                          Grant
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search company achievements..."
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
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company Achievements List */}
              <div className="space-y-3">
                {filteredCompanyAchievements.map((achievement) => {
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
                              <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">{achievement.company_name}</p>
                              {achievement.criteria && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {achievement.criteria.amount} {achievement.criteria.interaction_type}
                                  {achievement.criteria.time_bound && ` in ${achievement.criteria.days} days`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openCompanyEarnersDialog(achievement)}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              {achievement.earner_count}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditCompanyDialog(achievement)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleCompanyActive(achievement.id, achievement.is_active)}
                            >
                              {achievement.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCompanyAchievement(achievement.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredCompanyAchievements.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No company achievements found
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Platform Achievements Tab */}
            <TabsContent value="platform" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Dialog open={grantQuantumDialogOpen} onOpenChange={setGrantQuantumDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Grant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Grant Platform Achievement</DialogTitle>
                        <DialogDescription>
                          Manually grant a platform achievement to a user
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Achievement</Label>
                          <Select
                            value={grantQuantumForm.achievementId}
                            onValueChange={(value) => setGrantQuantumForm({ ...grantQuantumForm, achievementId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select achievement" />
                            </SelectTrigger>
                            <SelectContent>
                              {quantumAchievements.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.icon_emoji} {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>User</Label>
                          <Select
                            value={grantQuantumForm.userId}
                            onValueChange={(value) => setGrantQuantumForm({ ...grantQuantumForm, userId: value })}
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
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setGrantQuantumDialogOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={handleGrantQuantumAchievement}
                          disabled={!grantQuantumForm.achievementId || !grantQuantumForm.userId}
                        >
                          Grant
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search platform achievements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterRarity} onValueChange={setFilterRarity}>
                  <SelectTrigger className="w-48">
                    <Sparkles className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rarities</SelectItem>
                    {rarityOptions.map((rarity) => (
                      <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Platform Achievements List */}
              <div className="space-y-3">
                {filteredQuantumAchievements.map((achievement) => (
                  <Card key={achievement.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl">
                            {achievement.icon_emoji}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{achievement.name}</h4>
                              <Badge variant="outline">{achievement.category}</Badge>
                              <Badge variant="secondary">{achievement.rarity}</Badge>
                              {!achievement.is_active && <Badge variant="outline">Inactive</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">{achievement.points} XP</p>
                            {achievement.unlock_criteria && achievement.unlock_criteria.interaction_type && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {achievement.unlock_criteria.amount} {achievement.unlock_criteria.interaction_type}
                                {achievement.unlock_criteria.time_bound && ` in ${achievement.unlock_criteria.days} days`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openQuantumEarnersDialog(achievement)}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            {achievement.unlock_count}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditQuantumDialog(achievement)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleQuantumActive(achievement.id, achievement.is_active)}
                          >
                            {achievement.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteQuantumAchievement(achievement.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredQuantumAchievements.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No platform achievements found
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Achievement Analytics</CardTitle>
                  <CardDescription>Overview of achievement distribution and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Top Company Achievements</h4>
                        <div className="space-y-2">
                          {companyAchievements
                            .sort((a, b) => (b.earner_count || 0) - (a.earner_count || 0))
                            .slice(0, 5)
                            .map((a) => (
                              <div key={a.id} className="flex justify-between text-sm">
                                <span>{a.name}</span>
                                <span className="text-muted-foreground">{a.earner_count} earners</span>
                              </div>
                            ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Top Platform Achievements</h4>
                        <div className="space-y-2">
                          {quantumAchievements
                            .sort((a, b) => (b.unlock_count || 0) - (a.unlock_count || 0))
                            .slice(0, 5)
                            .map((a) => (
                              <div key={a.id} className="flex justify-between text-sm">
                                <span>{a.icon_emoji} {a.name}</span>
                                <span className="text-muted-foreground">{a.unlock_count} unlocks</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Achievement Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Achievement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <Label htmlFor="create-type">Achievement Type</Label>
              <div className="flex items-center gap-2">
                <span className={createType === 'user' ? 'font-semibold' : 'text-muted-foreground'}>User</span>
                <Switch
                  id="create-type"
                  checked={createType === 'company'}
                  onCheckedChange={(checked) => setCreateType(checked ? 'company' : 'user')}
                />
                <span className={createType === 'company' ? 'font-semibold' : 'text-muted-foreground'}>Company</span>
              </div>
            </div>

            {createType === 'company' && (
              <div>
                <Label htmlFor="company">Company</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId} required>
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" required />
            </div>

            <div>
              <Label htmlFor="icon">Icon {createType === 'user' ? '(emoji or Lucide icon name)' : '(Lucide icon name)'}</Label>
              <Input id="icon" name="icon" defaultValue={createType === 'user' ? '🏆' : 'Award'} required />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-4">Unlock Criteria</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interaction-type">Interaction Type</Label>
                  <Select value={interactionType} onValueChange={setInteractionType}>
                    <SelectTrigger id="interaction-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {interactionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">Amount Required</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    min="1"
                    value={criteriaAmount}
                    onChange={(e) => setCriteriaAmount(parseInt(e.target.value))}
                    required 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg mt-4">
                <div>
                  <Label htmlFor="time-bound">Time Bound</Label>
                  <p className="text-sm text-muted-foreground">Require completion within a specific timeframe</p>
                </div>
                <Switch
                  id="time-bound"
                  checked={isTimeBound}
                  onCheckedChange={setIsTimeBound}
                />
              </div>

              {isTimeBound && (
                <div className="mt-4">
                  <Label htmlFor="days">Duration (days)</Label>
                  <Input 
                    id="days" 
                    type="number" 
                    min="1"
                    value={timeBoundDays}
                    onChange={(e) => setTimeBoundDays(parseInt(e.target.value))}
                    required 
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete {criteriaAmount} {interactionType} within {timeBoundDays} days
                  </p>
                </div>
              )}

              {!isTimeBound && (
                <p className="text-sm text-muted-foreground mt-4">
                  Lifetime requirement: {criteriaAmount} {interactionType} total
                </p>
              )}
            </div>

            {createType === 'user' && (
              <>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue="engagement">
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rarity">Rarity</Label>
                  <Select name="rarity" defaultValue="common">
                    <SelectTrigger id="rarity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rarityOptions.map((rarity) => (
                        <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="xp_reward">XP Reward</Label>
                  <Input id="xp_reward" name="xp_reward" type="number" defaultValue="100" required />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || (createType === 'company' && !selectedCompanyId)}>
                {loading ? 'Creating...' : 'Create Achievement'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Company Achievement Dialog */}
      <Dialog open={editCompanyDialogOpen} onOpenChange={setEditCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company Achievement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editCompanyForm.name}
                onChange={(e) => setEditCompanyForm({ ...editCompanyForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editCompanyForm.description}
                onChange={(e) => setEditCompanyForm({ ...editCompanyForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Icon</Label>
              <Select
                value={editCompanyForm.icon}
                onValueChange={(value) => setEditCompanyForm({ ...editCompanyForm, icon: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setEditCompanyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCompanyAchievement}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quantum Achievement Dialog */}
      <Dialog open={editQuantumDialogOpen} onOpenChange={setEditQuantumDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Platform Achievement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editQuantumForm.name}
                onChange={(e) => setEditQuantumForm({ ...editQuantumForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editQuantumForm.description}
                onChange={(e) => setEditQuantumForm({ ...editQuantumForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Icon Emoji</Label>
              <Input
                value={editQuantumForm.icon_emoji}
                onChange={(e) => setEditQuantumForm({ ...editQuantumForm, icon_emoji: e.target.value })}
              />
            </div>
            <div>
              <Label>XP Points</Label>
              <Input
                type="number"
                value={editQuantumForm.points}
                onChange={(e) => setEditQuantumForm({ ...editQuantumForm, points: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditQuantumDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditQuantumAchievement}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Earners Dialog */}
      <Dialog open={earnersDialogOpen} onOpenChange={setEarnersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Achievement Earners</DialogTitle>
            <DialogDescription>
              {selectedCompanyAchievement?.name || selectedQuantumAchievement?.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User/Company</TableHead>
                  <TableHead>Date Earned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earners.map((earner) => (
                  <TableRow key={earner.id}>
                    <TableCell>
                      {earner.user_name || earner.company_name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {new Date(earner.earned_at || earner.unlocked_at || "").toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeEarner(earner.id, !!selectedQuantumAchievement)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {earners.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No one has earned this achievement yet
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
