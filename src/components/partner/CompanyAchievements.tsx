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
import { Award, Plus, Trash2, Edit, Users } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Custom Achievements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Achievements</CardTitle>
              <CardDescription>
                Create up to 3 custom achievements that members and partners can earn (
                {customAchievements.length}/3 used)
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  disabled={customAchievements.length >= 3}
                  onClick={() => {
                    setEditingAchievement(null);
                    setFormData({ name: "", description: "", icon: "Award" });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Achievement
                </Button>
              </DialogTrigger>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              return (
                <Card key={achievement.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{achievement.name}</h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {achievement.earner_count} earned
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(achievement)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(achievement.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {customAchievements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No custom achievements yet. Create your first one!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Generated Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Earned Achievements</CardTitle>
          <CardDescription>
            Platform-generated achievements based on your company's activity and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {platformAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              return (
                <Card key={achievement.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{achievement.name}</h4>
                          <Badge variant="secondary">Platform</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Users className="w-3 h-3" />
                          {achievement.earner_count} earned
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {platformAchievements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No platform achievements earned yet. Keep building your presence!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
