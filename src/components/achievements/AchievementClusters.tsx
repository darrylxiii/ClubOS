import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeCard } from "./BadgeCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Sparkles, 
  Zap, 
  Users, 
  Brain, 
  Crown, 
  Calendar, 
  Rocket 
} from "lucide-react";

interface ClusterProps {
  searchQuery: string;
  selectedCategory: string | null;
  selectedRarity: string | null;
}

interface Achievement {
  id: string;
  achievement_id: string;
  name: string;
  description: string;
  icon_emoji: string;
  rarity: string;
  category: string;
  unlocked_at: string | null;
  animation_effect: string;
  points: number;
  is_unlocked: boolean;
  progress?: any;
}

const categories = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "influence", label: "Influence", icon: Zap },
  { value: "innovation", label: "Innovation", icon: Rocket },
  { value: "social", label: "Social", icon: Users },
  { value: "learning", label: "Learning", icon: Brain },
  { value: "prestige", label: "Prestige", icon: Crown },
  { value: "event", label: "Event", icon: Calendar },
  { value: "pioneer", label: "Pioneer", icon: Sparkles },
];

export const AchievementClusters = ({
  searchQuery,
  selectedCategory,
  selectedRarity,
}: ClusterProps) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    try {
      const { data: allAchievements } = await supabase
        .from("quantum_achievements")
        .select("*")
        .eq("is_active", true)
        .eq("is_secret", false); // Don't show secret achievements here

      const { data: userAchievements } = await supabase
        .from("user_quantum_achievements")
        .select("*")
        .eq("user_id", user?.id);

      // Fetch progress for locked achievements
      const { data: progressData } = await supabase
        .from("achievement_progress")
        .select("*")
        .eq("user_id", user?.id);

      const unlockedMap = new Map(
        userAchievements?.map((ua) => [ua.achievement_id, ua]) || []
      );

      const progressMap = new Map(
        progressData?.map((p) => [p.achievement_id, p]) || []
      );

      const formatted: Achievement[] =
        allAchievements?.map((achievement) => {
          const userAch = unlockedMap.get(achievement.id);
          const progress = progressMap.get(achievement.id);
          return {
            id: userAch?.id || achievement.id,
            achievement_id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon_emoji: achievement.icon_emoji,
            rarity: achievement.rarity,
            category: achievement.category,
            unlocked_at: userAch?.unlocked_at || null,
            animation_effect: achievement.animation_effect,
            points: achievement.points,
            is_unlocked: !!userAch,
            progress: progress,
          };
        }) || [];

      setAchievements(formatted);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAchievements = (achievements: Achievement[]) => {
    return achievements.filter((achievement) => {
      const matchesSearch = searchQuery
        ? achievement.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          achievement.description.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchesCategory = selectedCategory
        ? achievement.category === selectedCategory
        : true;

      const matchesRarity = selectedRarity
        ? achievement.rarity === selectedRarity
        : true;

      return matchesSearch && matchesCategory && matchesRarity;
    });
  };

  const earned = filterAchievements(achievements.filter((a) => a.is_unlocked));
  const locked = filterAchievements(achievements.filter((a) => !a.is_unlocked));

  const renderCluster = (title: string, achievements: Achievement[], type: "earned" | "locked") => (
    <Card className="glass p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">{title}</h3>
        <Badge variant="outline">{achievements.length}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {achievements.map((achievement) => (
          <BadgeCard key={achievement.id} achievement={achievement} />
        ))}
        {achievements.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No achievements found
          </p>
        )}
      </div>
    </Card>
  );

  return (
    <Tabs defaultValue="earned" className="w-full">
      <TabsList className="glass mb-6">
        <TabsTrigger value="earned" className="gap-2">
          <Crown className="h-4 w-4" />
          Earned ({earned.length})
        </TabsTrigger>
        <TabsTrigger value="locked" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Locked ({locked.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="earned" className="space-y-6">
        {renderCluster("Earned Achievements", earned, "earned")}
      </TabsContent>

      <TabsContent value="locked" className="space-y-6">
        {renderCluster("Locked Achievements", locked, "locked")}
      </TabsContent>
    </Tabs>
  );
};
