import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Achievement {
  id: string;
  name: string;
  icon_emoji: string;
  rarity: string;
  points: number;
  is_unlocked: boolean;
  prerequisites: string[];
}

interface AchievementNode {
  achievement: Achievement;
  children: AchievementNode[];
  level: number;
}

export const AchievementTree = () => {
  const { user } = useAuth();
  const [tree, setTree] = useState<AchievementNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchAchievementTree();
    }
  }, [user?.id]);

  const fetchAchievementTree = async () => {
    if (!user?.id) return;

    try {
      // Fetch all achievements
      const { data: achievements } = await supabase
        .from('quantum_achievements')
        .select('*')
        .eq('is_active', true)
        .eq('is_deprecated', false);

      // Fetch prerequisites
      const { data: prerequisites } = await supabase
        .from('achievement_prerequisites')
        .select('*');

      // Fetch user's unlocked achievements
      const { data: unlocked } = await supabase
        .from('user_quantum_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      const unlockedIds = new Set(unlocked?.map((u) => u.achievement_id) || []);

      // Build prerequisite map
      const prereqMap = new Map<string, string[]>();
      prerequisites?.forEach((p: any) => {
        if (!p.achievement_id) return;
        const existing = prereqMap.get(p.achievement_id) || [];
        const requiredId = p.required_achievement_id;
        prereqMap.set(
          p.achievement_id,
          requiredId ? [...existing, requiredId] : existing,
        );
      });

      // Build achievement objects
      const achievementObjs: Achievement[] =
        achievements?.map((a) => ({
          id: a.id,
          name: a.name,
          icon_emoji: a.icon_emoji,
          rarity: a.rarity,
          points: a.points,
          is_unlocked: unlockedIds.has(a.id),
          prerequisites: prereqMap.get(a.id) || [],
        })) || [];

      // Build tree structure
      const achievementMap = new Map(achievementObjs.map((a) => [a.id, a]));
      const rootNodes: AchievementNode[] = [];

      const buildNode = (achievement: Achievement, level: number): AchievementNode => {
        const children: AchievementNode[] = [];

        // Find achievements that require this one
        achievementObjs.forEach((a) => {
          if (a.prerequisites.includes(achievement.id)) {
            children.push(buildNode(a, level + 1));
          }
        });

        return { achievement, children, level };
      };

      // Build tree from root achievements (no prerequisites)
      achievementObjs.forEach((a) => {
        if (a.prerequisites.length === 0) {
          rootNodes.push(buildNode(a, 0));
        }
      });

      setTree(rootNodes);
    } catch (error) {
      console.error('Error fetching achievement tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderNode = (node: AchievementNode, isLast: boolean = false) => {
    const { achievement } = node;
    const allPrereqsUnlocked = achievement.prerequisites.every((prereqId) => {
      const prereq = achievement.prerequisites.find((p) => p === prereqId);
      return prereq;
    });

    const canUnlock = allPrereqsUnlocked || achievement.prerequisites.length === 0;

    return (
      <div key={achievement.id} className="relative">
        <div className={`flex items-center gap-4 ${node.level > 0 ? 'ml-12' : ''}`}>
          {/* Connector line */}
          {node.level > 0 && (
            <div className="absolute left-0 top-8 w-12 h-px bg-border" />
          )}

          {/* Achievement Card */}
          <Card
            className={`
              p-4 flex-1 transition-all duration-300
              ${achievement.is_unlocked
                ? 'border-primary/30 bg-primary/5'
                : canUnlock
                ? 'border-border hover:border-primary/30'
                : 'opacity-50 border-dashed'
              }
            `}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {achievement.is_unlocked ? (
                  achievement.icon_emoji
                ) : canUnlock ? (
                  <div className="grayscale">{achievement.icon_emoji}</div>
                ) : (
                  <Lock className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">{achievement.name}</h4>
                  {achievement.is_unlocked && (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {achievement.rarity}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3" />
                    {achievement.points} XP
                  </Badge>
                </div>
              </div>

              {node.children.length > 0 && (
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </Card>
        </div>

        {/* Render children */}
        {node.children.length > 0 && (
          <div className="mt-4 space-y-4 relative">
            {/* Vertical connector */}
            {node.children.length > 1 && (
              <div
                className="absolute left-6 top-0 bottom-0 w-px bg-border"
                style={{ height: `${(node.children.length - 1) * 100}px` }}
              />
            )}
            {node.children.map((child, idx) =>
              renderNode(child, idx === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading achievement paths...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Achievement Paths</h3>
        <p className="text-sm text-muted-foreground">
          Unlock achievements in sequence to progress through skill trees
        </p>
      </div>

      <ScrollArea className="h-[800px]">
        <div className="space-y-8">
          {tree.map((node, idx) => renderNode(node, idx === tree.length - 1))}

          {tree.length === 0 && (
            <Card className="p-12 text-center">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No achievement paths configured yet
              </p>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
