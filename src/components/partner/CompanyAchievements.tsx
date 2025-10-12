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
import { Award, Plus, Trash2, Edit, Users, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface CompanyAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  achievement_type: 'custom' | 'platform_generated';
  is_active: boolean;
  earner_count?: number;
}

interface CompanyAchievementsProps {
  companyId: string;
}

export const CompanyAchievements = ({ companyId }: CompanyAchievementsProps) => {
  const [achievements, setAchievements] = useState<CompanyAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<CompanyAchievement | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", icon: "Award" });
  const { toast } = useToast();

  const iconOptions = ["Award", "Trophy", "Star", "Medal", "Crown", "Target", "Zap", "Heart"];

  useEffect(() => {
    loadAchievements();
  }, [companyId]);

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("company_achievements")
        .select(`
          *,
          earner_count:company_achievement_earners(count)
        `)
        .eq("company_id", companyId)
        .order("display_order");

      if (error) throw error;

      const achievementsWithCount = data.map(a => ({
        ...a,
        earner_count: a.earner_count?.[0]?.count || 0
      }));

      setAchievements(achievementsWithCount);
    } catch (error) {
      console.error("Error loading achievements:", error);
      toast({ title: "Error loading achievements", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingAchievement) {
        const { error } = await supabase
          .from("company_achievements")
          .update(formData)
          .eq("id", editingAchievement.id);

        if (error) throw error;
        toast({ title: "Achievement updated successfully" });
      } else {
        const { error } = await supabase
          .from("company_achievements")
          .insert({
            company_id: companyId,
            ...formData,
            achievement_type: 'custom'
          });

        if (error) throw error;
        toast({ title: "Achievement created successfully" });
      }

      setDialogOpen(false);
      setEditingAchievement(null);
      setFormData({ name: "", description: "", icon: "Award" });
      loadAchievements();
    } catch (error: any) {
      toast({ 
        title: "Error saving achievement", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this achievement?")) return;

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

  const openEditDialog = (achievement: CompanyAchievement) => {
    setEditingAchievement(achievement);
    setFormData({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon
    });
    setDialogOpen(true);
  };

  const customAchievements = achievements.filter(a => a.achievement_type === 'custom');
  const platformAchievements = achievements.filter(a => a.achievement_type === 'platform_generated');

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Award;
    return Icon;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header Section with Stats */}
      <div className="glass p-8 rounded-2xl border border-primary/20">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Custom Company Achievements
            </h2>
            <p className="text-muted-foreground text-lg">
              Create and award unique badges to recognize exceptional contributions
            </p>
          </div>
          <Button 
            size="lg"
            onClick={() => {
              setEditingAchievement(null);
              setFormData({ name: "", description: "", icon: "Award" });
              setDialogOpen(true);
            }}
            disabled={customAchievements.length >= 3}
            className="shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Achievement
          </Button>
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-primary">{customAchievements.length}/3</div>
            <div className="text-sm text-muted-foreground">Custom Created</div>
          </div>
          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-primary">
              {customAchievements.reduce((sum, a) => sum + (a.earner_count || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Awards</div>
          </div>
          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-primary">
              {customAchievements.filter(a => a.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
        </div>
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingAchievement ? "Edit Achievement" : "Create Achievement"}
                  </DialogTitle>
                  <DialogDescription>
                    Create a custom achievement for your company
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Achievement name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What does this achievement represent?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <Select
                      value={formData.icon}
                      onValueChange={(value) => setFormData({ ...formData, icon: value })}
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
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!formData.name || !formData.description}>
                    {editingAchievement ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

      {/* Custom Achievements Grid */}
      <div>
        <h3 className="text-xl font-semibold mb-6">Your Custom Achievements</h3>
        {customAchievements.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {customAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              return (
                <Card key={achievement.id} className="relative overflow-hidden group hover:shadow-xl transition-all border-primary/20">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                        {IconComponent && <IconComponent className="h-8 w-8 text-primary" />}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(achievement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Achievement</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this achievement? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(achievement.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <h3 className="font-bold text-xl mb-3">{achievement.name}</h3>
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{achievement.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {achievement.earner_count || 0} earned
                        </span>
                      </div>
                      <Badge variant={achievement.is_active ? "default" : "secondary"} className="text-xs">
                        {achievement.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-primary/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Award className="h-12 w-12 text-primary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">No custom achievements yet</h4>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Create your first custom achievement to recognize and reward exceptional contributions from your team.
              </p>
              <Button 
                onClick={() => {
                  setEditingAchievement(null);
                  setFormData({ name: "", description: "", icon: "Award" });
                  setDialogOpen(true);
                }} 
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Achievement
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Platform Achievements Section */}
      <div>
        <h3 className="text-xl font-semibold mb-6">Platform Achievements</h3>
        <Card className="border-primary/10">
          <CardHeader>
            <CardDescription>
              Standard achievements earned by your team members across the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {platformAchievements.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {platformAchievements.map((achievement) => {
                  const IconComponent = getIconComponent(achievement.icon);
                  return (
                    <Card key={achievement.id} className="border-border/50 hover:border-primary/30 transition-all">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center gap-4">
                          <div className="p-3 rounded-lg bg-secondary/30">
                            {IconComponent && <IconComponent className="h-6 w-6 text-secondary-foreground" />}
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1 text-sm">{achievement.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{achievement.description}</p>
                            <Badge variant="outline" className="text-xs">
                              {achievement.earner_count || 0} earned
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No platform achievements earned by team members yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
