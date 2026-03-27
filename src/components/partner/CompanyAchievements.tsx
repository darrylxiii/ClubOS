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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('partner');
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
    { value: "posts_created", label: t('partner.companyachievements.postsCreated', 'Posts Created') },
    { value: "comments_made", label: t('partner.companyachievements.commentsMade', 'Comments Made') },
    { value: "likes_given", label: t('partner.companyachievements.likesGiven', 'Likes Given') },
    { value: "shares_made", label: t('partner.companyachievements.sharesMade', 'Shares Made') },
    { value: "profile_views", label: t('partner.companyachievements.profileViews', 'Profile Views') },
    { value: "connections_made", label: t('partner.companyachievements.connectionsMade', 'Connections Made') },
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
      toast({ title: t('partner.companyachievements.errorLoadingAchievements', 'Error loading achievements'), variant: "destructive" });
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
        toast({ title: t('partner.companyachievements.achievementUpdatedSuccessfully', 'Achievement updated successfully') });
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
        toast({ title: t('partner.companyachievements.achievementCreatedSuccessfully', 'Achievement created successfully') });
      }

      setDialogOpen(false);
      setEditingAchievement(null);
      setFormData({ name: "", description: "", icon: "Award" });
      setInteractionType("posts_created");
      setCriteriaAmount(10);
      setIsTimeBound(false);
      setTimeBoundDays(30);
      loadAchievements();
    } catch (error: unknown) {
      toast({ 
        title: t('partner.companyachievements.errorSavingAchievement', 'Error saving achievement'), 
        description: error instanceof Error ? error.message : t('partner.companyachievements.anUnexpectedErrorOccurred', 'An unexpected error occurred'),
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
      toast({ title: t('partner.companyachievements.achievementDeletedSuccessfully', 'Achievement deleted successfully') });
      loadAchievements();
    } catch (error) {
      toast({ title: t('partner.companyachievements.errorDeletingAchievement', 'Error deleting achievement'), variant: "destructive" });
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
              <CardTitle className="text-3xl font-black uppercase tracking-tight mb-2">{t('companyAchievements.title')}</CardTitle>
              <CardDescription className="text-base">
                Create up to 3 custom achievements with specific criteria ({customAchievements.length}/3 used)
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/60 border">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('companyAchievements.analytics')}</span>
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
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('companyAchievements.created')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-primary mb-1">
                  {customAchievements.reduce((sum, a) => sum + (a.earner_count || 0), 0)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('companyAchievements.totalAwarded')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-primary mb-1">
                  {customAchievements.filter(a => a.is_active).length}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('companyAchievements.active')}</div>
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
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('companyAchievements.avgPerAchievement')}</div>
              </div>
            </div>
          )}

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingAchievement ? t('partner.companyachievements.editAchievement', 'Edit Achievement') : t('partner.companyachievements.createCustomAchievement', 'Create Custom Achievement')}
            </DialogTitle>
            <DialogDescription>{t('companyAchievements.dialogDescription')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t('companyAchievements.basicInformation')}</h3>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">{t('companyAchievements.label.achievementName')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Content Champion, Team Player"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">{t('companyAchievements.label.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('companyAchievements.placeholder.describeWhatThisAchievementRepresentsAnd')}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="icon">{t('companyAchievements.label.icon')}</Label>
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
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t('companyAchievements.unlockCriteria')}</h3>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="interaction">{t('companyAchievements.label.interactionType')}</Label>
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
                  <Label htmlFor="amount">{t('companyAchievements.label.requiredAmount')}</Label>
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
                    <Label htmlFor="timebound" className="cursor-pointer">{t('companyAchievements.label.timeboundChallenge')}</Label>
                    <p className="text-xs text-muted-foreground mt-1">{t('companyAchievements.requireCompletionWithinASpecificTimefram')}</p>
                  </div>
                  <Switch
                    id="timebound"
                    checked={isTimeBound}
                    onCheckedChange={setIsTimeBound}
                  />
                </div>
                
                {isTimeBound && (
                  <div>
                    <Label htmlFor="days">{t('companyAchievements.label.daysToComplete')}</Label>
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
                  <strong>{t('partner.companyachievements.unlockCondition', 'Unlock Condition:')}</strong> Complete{" "}
                  <span className="font-bold">{criteriaAmount}</span>{" "}
                  {interactionTypes.find(t => t.value === interactionType)?.label.toLowerCase()}
                  {isTimeBound && (
                    <span> within <span className="font-bold">{timeBoundDays}</span> days</span>
                  )}
                  {!isTimeBound && <span>(lifetime)</span>}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || !formData.description || criteriaAmount <= 0}
              className="min-w-[120px]"
            >
              {editingAchievement ? t('partner.companyachievements.updateAchievement', 'Update Achievement') : t('partner.companyachievements.createAchievement', 'Create Achievement')}
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
                                <AlertDialogTitle>{t('partner.companyachievements.deleteAchievement', 'Delete Achievement')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('partner.companyachievements.areYouSureYouWantTo', 'Are you sure you want to delete this achievement? This action cannot be undone.')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(achievement.id)}>
                                  {t('common:delete')}
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
                          {achievement.is_active ? t('partner.companyachievements.active', 'Active') : t('partner.companyachievements.inactive', 'Inactive')}
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
                <h4 className="text-lg font-semibold mb-2">{t('companyAchievements.noCustomAchievementsYet')}</h4>
                <p className="text-muted-foreground mb-6 max-w-sm">{t('companyAchievements.createYourFirstCustomAchievementToRecogn')}</p>
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
          <CardTitle>{t('companyAchievements.title')}</CardTitle>
          <CardDescription>{t('companyAchievements.description')}</CardDescription>
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
              <p>{t('companyAchievements.noPlatformAchievementsEarnedByTeamMember')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
