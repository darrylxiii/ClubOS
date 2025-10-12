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
import { Award, Plus, Trash2, Edit, UserPlus, Building2, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as LucideIcons from "lucide-react";

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
}

interface GrantAchievementForm {
  achievementId: string;
  userId?: string;
  companyId?: string;
}

export const AdminAchievementsManager = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'platform'>('all');
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [grantForm, setGrantForm] = useState<GrantAchievementForm>({
    achievementId: "",
    userId: "",
    companyId: ""
  });
  const [newAchievement, setNewAchievement] = useState({
    name: "",
    description: "",
    icon: "Award",
    companyId: ""
  });
  const { toast } = useToast();

  const iconOptions = ["Award", "Trophy", "Star", "Medal", "Crown", "Target", "Zap", "Heart", "Shield", "Gem"];

  useEffect(() => {
    loadAchievements();
    loadCompanies();
    loadUsers();
  }, []);

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
      loadAchievements();
    } catch (error: any) {
      toast({ 
        title: "Error creating achievement",
        description: error.message,
        variant: "destructive" 
      });
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
      loadAchievements();
    } catch (error: any) {
      toast({ 
        title: "Error granting achievement",
        description: error.message,
        variant: "destructive" 
      });
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
      loadAchievements();
    } catch (error) {
      toast({ title: "Error deleting achievement", variant: "destructive" });
    }
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
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Admin Achievements Manager
              </CardTitle>
              <CardDescription>
                Manage all platform and company achievements, grant achievements to users and companies
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
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
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
          <div className="space-y-4">
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
                  <SelectItem value="platform">Platform Generated</SelectItem>
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
                              {!achievement.is_active && (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{achievement.description}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {achievement.company_name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                {achievement.earner_count} earned
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(achievement.id, achievement.is_active)}
                          >
                            {achievement.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(achievement.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredAchievements.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No achievements found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
