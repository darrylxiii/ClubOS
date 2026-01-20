import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { migrateToast as toast } from "@/lib/notify";
import { Award, Plus, Trash2, Edit, Users, Loader2, BarChart3, TrendingUp } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

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
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // New state for advanced criteria
  const [interactionType, setInteractionType] = useState("posts_created");
  const [criteriaAmount, setCriteriaAmount] = useState(10);
  const [isTimeBound, setIsTimeBound] = useState(false);
  const [timeBoundDays, setTimeBoundDays] = useState(30);
  
  

  const iconOptions = ["Award", "Trophy", "Star", "Medal", "Crown", "Target", "Zap", "Heart", "Sparkles", "Rocket"];
  
  const interactionTypes = [
    { value: "posts_created", label: "Posts Created" },
    { value: "comments_made", label: "Comments Made" },
    { value: "likes_given", label: "Likes Given" },
    { value: "shares_made", label: "Shares Made" },
    { value: "profile_views", label: "Profile Views" },
    { value: "connections_made", label: "Connections Made" },
  ];

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
      // Build criteria object
      const criteria: any = {
        type: interactionType,
        target: criteriaAmount
      };
      
      if (isTimeBound) {
        criteria.timebound = true;
        criteria.days = timeBoundDays;
      }

      if (editingAchievement) {
        const { error } = await supabase
          .from("company_achievements")
          .update({
            ...formData,
            criteria
          })
          .eq("id", editingAchievement.id);

        if (error) throw error;
        toast({ title: "Achievement updated successfully" });
      } else {
        const { error } = await supabase
          .from("company_achievements")
          .insert({
            company_id: companyId,
            ...formData,
            achievement_type: 'custom',
            criteria
          });

        if (error) throw error;
        toast({ title: "Achievement created successfully" });
      }

      setDialogOpen(false);
      setEditingAchievement(null);
      setFormData({ name: "", description: "", icon: "Award" });
      setInteractionType("posts_created");
      setCriteriaAmount(10);
      setIsTimeBound(false);
      setTimeBoundDays(30);
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
    <div className="space-y-8">
      {/* Custom Achievements - Prominent Block */}
      <Card className="border-2 border-primary/30 shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl font-black uppercase tracking-tight mb-2">
                Custom Achievements
              </CardTitle>
              <CardDescription className="text-base">
                Create up to 3 custom achievements with specific criteria ({customAchievements.length}/3 used)
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/60 border">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Analytics</span>
                <Switch checked={showAnalytics} onCheckedChange={setShowAnalytics} />
              </div>
              <Button 
                size="lg"
                onClick={() => {
                  setEditingAchievement(null);
                  setFormData({ name: "", description: "", icon: "Award" });
                  setInteractionType("posts_created");
                  setCriteriaAmount(10);
                  setIsTimeBound(false);
                  setTimeBoundDays(30);
                  setDialogOpen(true);
                }}
                disabled={customAchievements.length >= 3}
                className="shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Achievement
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8">
          {/* Stats Bar */}
          {showAnalytics && (
            <div className="grid grid-cols-4 gap-4 mb-8 p-6 rounded-xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20">
              <div className="text-center">
                <div className="text-3xl font-black text-primary mb-1">{customAchievements.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Created</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-primary mb-1">
                  {customAchievements.reduce((sum, a) => sum + (a.earner_count || 0), 0)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Awarded</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-primary mb-1">
                  {customAchievements.filter(a => a.is_active).length}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Active</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  <span className="text-3xl font-black text-green-500">
                    {customAchievements.length > 0 
                      ? Math.round((customAchievements.reduce((sum, a) => sum + (a.earner_count || 0), 0) / customAchievements.length) * 100) / 100
                      : 0}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg per Achievement</div>
              </div>
            </div>
          )}

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingAchievement ? "Edit Achievement" : "Create Custom Achievement"}
            </DialogTitle>
            <DialogDescription>
              Define criteria and rewards for exceptional team contributions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Basic Information</h3>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Achievement Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Content Champion, Team Player"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this achievement represents and how to earn it"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
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
            </div>

            {/* Criteria Setup */}
            <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Unlock Criteria</h3>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="interaction">Interaction Type *</Label>
                  <Select
                    value={interactionType}
                    onValueChange={setInteractionType}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {interactionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="amount">Required Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    value={criteriaAmount}
                    onChange={(e) => setCriteriaAmount(parseInt(e.target.value) || 0)}
                    placeholder="e.g., 50"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div>
                    <Label htmlFor="timebound" className="cursor-pointer">Time-Bound Challenge</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Require completion within a specific timeframe
                    </p>
                  </div>
                  <Switch
                    id="timebound"
                    checked={isTimeBound}
                    onCheckedChange={setIsTimeBound}
                  />
                </div>
                
                {isTimeBound && (
                  <div>
                    <Label htmlFor="days">Days to Complete *</Label>
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      value={timeBoundDays}
                      onChange={(e) => setTimeBoundDays(parseInt(e.target.value) || 30)}
                      placeholder="e.g., 30"
                    />
                  </div>
                )}
              </div>
              
              {/* Criteria Summary */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm font-medium text-primary">
                  <strong>Unlock Condition:</strong> Complete{" "}
                  <span className="font-bold">{criteriaAmount}</span>{" "}
                  {interactionTypes.find(t => t.value === interactionType)?.label.toLowerCase()}
                  {isTimeBound && (
                    <span> within <span className="font-bold">{timeBoundDays}</span> days</span>
                  )}
                  {!isTimeBound && <span> (lifetime)</span>}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || !formData.description || criteriaAmount <= 0}
              className="min-w-[120px]"
            >
              {editingAchievement ? "Update Achievement" : "Create Achievement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          {/* Custom Achievements Grid */}
          {customAchievements.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {customAchievements.map((achievement) => {
                const IconComponent = getIconComponent(achievement.icon);
                return (
                  <Card key={achievement.id} className="relative overflow-hidden group hover:shadow-xl transition-all border-primary/20">
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                          <IconComponent className="h-8 w-8 text-primary" />
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
                    setInteractionType("posts_created");
                    setCriteriaAmount(10);
                    setIsTimeBound(false);
                    setTimeBoundDays(30);
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
        </CardContent>
      </Card>

      {/* Platform Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Achievements</CardTitle>
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
                          <IconComponent className="h-6 w-6 text-secondary-foreground" />
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
  );
};
