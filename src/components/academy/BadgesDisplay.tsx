import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Award, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BadgeData {
  id: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  points: number;
  earned?: {
    earned_at: string;
  };
}

export function BadgesDisplay() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeData[]>([]);

  useEffect(() => {
    if (user) fetchBadges();
  }, [user]);

  const fetchBadges = async () => {
    if (!user) return;

    try {
      // Get all badges
      const { data: allBadges, error: badgesError } = await supabase
        .from('learning_badges')
        .select('*')
        .order('points', { ascending: false });

      if (badgesError) throw badgesError;

      // Get user's earned badges
      const { data: userBadges, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', user.id);

      if (userBadgesError) throw userBadgesError;

      // Merge data
      const badgesWithStatus = (allBadges || []).map(badge => {
        const earned = userBadges?.find(ub => ub.badge_id === badge.id);
        return {
          ...badge,
          earned: earned ? { earned_at: earned.earned_at } : undefined,
        };
      });

      setBadges(badgesWithStatus);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  return (
    <Card className="squircle p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Award className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Your Badges</h3>
          <p className="text-sm text-muted-foreground">
            {badges.filter(b => b.earned).length} of {badges.length} unlocked
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {badges.map((badge) => (
          <Card
            key={badge.id}
            className={`squircle p-4 text-center ${
              badge.earned ? 'hover-lift' : 'opacity-50'
            }`}
          >
            <div
              className={`inline-flex p-3 squircle-sm mb-2 ${
                badge.earned
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {badge.earned ? (
                <Award className="h-6 w-6" />
              ) : (
                <Lock className="h-6 w-6" />
              )}
            </div>
            <h4 className="font-semibold text-sm mb-1">{badge.badge_name}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {badge.badge_description}
            </p>
            {badge.earned ? (
              <Badge variant="outline" className="squircle-sm text-xs">
                {formatDistanceToNow(new Date(badge.earned.earned_at), {
                  addSuffix: true,
                })}
              </Badge>
            ) : (
              <Badge variant="outline" className="squircle-sm text-xs">
                {badge.points} pts
              </Badge>
            )}
          </Card>
        ))}
      </div>
    </Card>
  );
}
