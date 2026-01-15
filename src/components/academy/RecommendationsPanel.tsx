import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Recommendation {
  id: string;
  recommended_type: string;
  recommended_id: string;
  recommendation_score: number | null;
  recommendation_reason: string | null;
  content?: {
    title: string;
    description?: string;
    difficulty?: string;
  } | null;
}

export function RecommendationsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (user) fetchRecommendations();
  }, [user]);

  const fetchRecommendations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('content_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('viewed', false)
        .order('recommendation_score', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Fetch details for each recommendation
      const withDetails = await Promise.all(
        (data || []).map(async (rec) => {
          let content: { title: string; description?: string; difficulty?: string } | null = null;
          if (rec.recommended_type === 'course') {
            const { data: course } = await supabase
              .from('courses')
              .select('title, description, difficulty_level')
              .eq('id', rec.recommended_id)
              .single();
            if (course) {
              content = { title: course.title, description: course.description ?? undefined, difficulty: course.difficulty_level ?? undefined };
            }
          } else if (rec.recommended_type === 'learning_path') {
            const { data: path } = await supabase
              .from('learning_paths')
              .select('name, description')
              .eq('id', rec.recommended_id)
              .single();
            if (path) {
              content = { title: path.name, description: path.description ?? undefined };
            }
          }
          return {
            id: rec.id,
            recommended_type: rec.recommended_type,
            recommended_id: rec.recommended_id,
            recommendation_score: rec.recommendation_score,
            recommendation_reason: rec.recommendation_reason,
            content 
          } as Recommendation;
        })
      );

      setRecommendations(withDetails.filter(r => r.content !== null));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const markAsViewed = async (recommendationId: string) => {
    await supabase
      .from('content_recommendations')
      .update({ viewed: true })
      .eq('id', recommendationId);
  };

  if (recommendations.length === 0) return null;

  return (
    <Card className="squircle p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Recommended for You</h3>
          <p className="text-sm text-muted-foreground">
            Based on your learning journey
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="squircle p-4 hover-lift">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm line-clamp-1">
                  {rec.content?.title}
                </h4>
                {rec.content?.difficulty && (
                  <Badge variant="outline" className="squircle-sm text-xs">
                    {rec.content.difficulty}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {rec.recommendation_reason}
              </p>

              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 mt-2"
                onClick={() => {
                  markAsViewed(rec.id);
                  navigate('/academy');
                }}
              >
                Explore
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}
