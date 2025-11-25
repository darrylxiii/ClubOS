import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Award, CheckCircle, Download, TrendingUp } from 'lucide-react';

interface Skill {
  id: string;
  skill_name: string;
  proficiency_level: string;
  source_type: string;
  verified: boolean;
  verified_at: string;
}

export default function MySkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('candidate_skills')
      .select('*')
      .eq('candidate_id', user.id)
      .order('verified', { ascending: false });

    if (data) setSkills(data as unknown as Skill[]);
    setLoading(false);
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.proficiency_level || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const proficiencyColors = {
    beginner: 'from-blue-500 to-blue-600',
    intermediate: 'from-amber-500 to-amber-600',
    advanced: 'from-purple-500 to-purple-600',
  };

  const proficiencyProgress = {
    beginner: 33,
    intermediate: 66,
    advanced: 100,
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Skills</h1>
          <p className="text-muted-foreground mt-2">
            Track your verified skills from completed courses
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export as PDF
        </Button>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedSkills).map(([level, skillsList]) => (
          <Card key={level} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                proficiencyColors[level as keyof typeof proficiencyColors] || 'from-gray-500 to-gray-600'
              } flex items-center justify-center`}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold capitalize">{level} Skills</h3>
                <p className="text-sm text-muted-foreground">
                  {skillsList.length} {skillsList.length === 1 ? 'skill' : 'skills'}
                </p>
              </div>
              <Progress 
                value={proficiencyProgress[level as keyof typeof proficiencyProgress] || 0} 
                className="w-32"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {skillsList.map((skill) => (
                <div
                  key={skill.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm">{skill.skill_name}</span>
                    {skill.verified && (
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {skill.source_type}
                    </Badge>
                    {skill.verified && (
                      <Award className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {skills.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Award className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Skills Yet</h3>
          <p className="text-muted-foreground mb-4">
            Complete courses to earn verified skills
          </p>
          <Button>Browse Courses</Button>
        </Card>
      )}
    </div>
  );
}
