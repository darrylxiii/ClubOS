import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, BookOpen } from 'lucide-react';

/**
 * Spaced repetition review nudge.
 * Shows modules the learner completed 1, 3, 7, 14, or 30 days ago
 * that are due for review based on the forgetting curve.
 */
export const ReviewNudge = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: reviewModules } = useQuery({
    queryKey: ['review-nudge', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Find modules completed at review intervals (1, 3, 7, 14, 30 days ago)
      const intervals = [1, 3, 7, 14, 30];
      const now = new Date();

      const { data } = await supabase
        .from('learner_progress')
        .select(`
          module_id,
          completed_at,
          progress_percentage,
          modules(id, title, slug, course_id, courses(title, slug))
        `)
        .eq('user_id', user.id)
        .gte('progress_percentage', 100)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (!data) return [];

      // Filter to modules that match review intervals
      return data.filter(p => {
        if (!p.completed_at) return false;
        const completedDate = new Date(p.completed_at);
        const daysSince = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
        return intervals.some(interval => daysSince >= interval && daysSince < interval + 2);
      }).slice(0, 3);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  if (!reviewModules || reviewModules.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Time to Review</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Reviewing strengthens your memory. These modules are due:
      </p>
      <div className="space-y-2">
        {reviewModules.map((item: any) => {
          const mod = item.modules as any;
          if (!mod) return null;
          return (
            <button
              key={item.module_id}
              className="w-full flex items-center gap-3 p-2 rounded-lg text-sm hover:bg-muted/50 transition-colors text-left"
              onClick={() => navigate(`/modules/${mod.slug || mod.id}`)}
            >
              <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{mod.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(mod.courses as any)?.title}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0">
                Review
              </Button>
            </button>
          );
        })}
      </div>
    </Card>
  );
});

ReviewNudge.displayName = 'ReviewNudge';
