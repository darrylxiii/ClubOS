import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface SkillTrend {
  skill: string;
  demandLevel: 'hot' | 'growing' | 'stable' | 'declining';
  matchesYou: boolean;
  jobCount: number;
  changePercent: number;
}

export function SkillDemandWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSkillDemand();
    }
  }, [user]);

  const fetchSkillDemand = async () => {
    if (!user) return;

    try {
      // Get user's skills from profile skills array
      const { data: profile } = await supabase
        .from('profiles')
        .select('skills')
        .eq('id', user.id)
        .single();

      const userSkillNames = new Set(
        ((profile?.skills as string[] | null) || []).map(s => s.toLowerCase())
      );

      // Get top skills from active jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('requirements')
        .eq('status', 'active')
        .limit(100);

      // Count skill occurrences
      const skillCounts: Record<string, number> = {};
      
      jobs?.forEach(job => {
        const requirements = job.requirements as string[] | null;
        requirements?.forEach(req => {
          const skill = req.toLowerCase().trim();
          if (skill.length > 2) {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          }
        });
      });

      // Sort by count and take top skills
      const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([skill, count]) => {
          const demandLevel: SkillTrend['demandLevel'] = 
            count > 20 ? 'hot' :
            count > 10 ? 'growing' :
            count > 5 ? 'stable' : 'declining';

          return {
            skill: skill.charAt(0).toUpperCase() + skill.slice(1),
            demandLevel,
            matchesYou: userSkillNames.has(skill),
            jobCount: count,
            changePercent: Math.round((count / 100) * 30) + 5 // Mock growth %
          };
        });

      setSkills(topSkills);
    } catch (error) {
      console.error('Error fetching skill demand:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDemandBadge = (level: SkillTrend['demandLevel']) => {
    switch (level) {
      case 'hot':
        return (
          <Badge className="gap-1 bg-destructive/10 text-destructive border-destructive/30 text-xs">
            <Zap className="w-3 h-3" />
            Hot
          </Badge>
        );
      case 'growing':
        return (
          <Badge className="gap-1 bg-success/10 text-success border-success/30 text-xs">
            <TrendingUp className="w-3 h-3" />
            Growing
          </Badge>
        );
      case 'stable':
        return (
          <Badge variant="outline" className="text-xs">
            Stable
          </Badge>
        );
      case 'declining':
        return (
          <Badge className="gap-1 bg-muted text-muted-foreground text-xs">
            <TrendingDown className="w-3 h-3" />
            Declining
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-6 bg-muted rounded w-full"></div>
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
          <div className="w-1 h-6 bg-foreground"></div>
          <Zap className="w-5 h-5" />
          In-Demand Skills
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        {skills.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No skill data available yet
            </p>
          </div>
        ) : (
          <>
            {skills.slice(0, 3).map((skill, index) => (
              <motion.div
                key={skill.skill}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                  skill.matchesYou 
                    ? 'bg-primary/5 border border-primary/20' 
                    : 'bg-background/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{skill.skill}</span>
                  {skill.matchesYou && (
                    <Badge variant="outline" className="text-xs shrink-0 bg-primary/10 text-primary border-primary/30">
                      You have this
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getDemandBadge(skill.demandLevel)}
                </div>
              </motion.div>
            ))}

            {/* Summary */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Based on {skills.reduce((sum, s) => sum + s.jobCount, 0)}+ active job postings
              </p>
            </div>

            {/* CTA */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-primary hover:text-primary"
              onClick={() => navigate('/skills')}
            >
              <span>See All Skill Trends</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
