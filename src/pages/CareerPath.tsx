import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  ArrowRight, 
  Clock, 
  DollarSign,
  CheckCircle2,
  Target
} from "lucide-react";

interface CareerPath {
  id: string;
  from_role: string;
  to_role: string;
  avg_years: number | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  required_skills: string[] | null;
}

export default function CareerPath() {
  const [currentRole, setCurrentRole] = useState("Software Engineer");
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<CareerPath | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCareerPaths();
  }, [currentRole]);

  const fetchCareerPaths = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('career_paths')
        .select('*')
        .eq('from_role', currentRole)
        .order('avg_years', { ascending: true });

      if (error) throw error;
      setCareerPaths(data || []);
    } catch (error) {
      console.error('Error fetching career paths:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sample data for demonstration
  const samplePaths: CareerPath[] = [
    {
      id: '1',
      from_role: 'Software Engineer',
      to_role: 'Senior Software Engineer',
      avg_years: 3,
      salary_range_min: 65000,
      salary_range_max: 95000,
      required_skills: ['System Design', 'Mentoring', 'Technical Leadership', 'Code Reviews']
    },
    {
      id: '2',
      from_role: 'Software Engineer',
      to_role: 'Engineering Manager',
      avg_years: 5,
      salary_range_min: 80000,
      salary_range_max: 120000,
      required_skills: ['People Management', 'Project Planning', 'Communication', 'Hiring']
    },
    {
      id: '3',
      from_role: 'Software Engineer',
      to_role: 'Technical Architect',
      avg_years: 6,
      salary_range_min: 90000,
      salary_range_max: 130000,
      required_skills: ['Architecture Design', 'Scalability', 'Cloud Infrastructure', 'Security']
    },
    {
      id: '4',
      from_role: 'Software Engineer',
      to_role: 'Product Manager',
      avg_years: 4,
      salary_range_min: 75000,
      salary_range_max: 110000,
      required_skills: ['Product Strategy', 'User Research', 'Stakeholder Management', 'Roadmapping']
    }
  ];

  const displayPaths = careerPaths.length > 0 ? careerPaths : samplePaths;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase mb-2">Career Progression</h1>
        <p className="text-muted-foreground">
          Explore potential career paths and what it takes to get there
        </p>
      </div>

      {/* Current Role Input */}
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            Your Current Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              placeholder="Enter your current role"
              className="flex-1"
            />
            <Button onClick={fetchCareerPaths}>
              <Target className="w-4 h-4 mr-2" />
              Explore Paths
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Career Paths Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayPaths.map((path) => (
          <Card
            key={path.id}
            className={`border-2 cursor-pointer transition-all hover:shadow-lg ${
              selectedPath?.id === path.id 
                ? 'border-primary shadow-lg' 
                : 'border-foreground'
            }`}
            onClick={() => setSelectedPath(path)}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {path.avg_years ?? 0} years
                </Badge>
                <Badge variant="outline">
                  €{Math.round(((path.salary_range_min ?? 0) + (path.salary_range_max ?? 0)) / 2 / 1000)}K avg
                </Badge>
              </div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{path.from_role}</span>
                <ArrowRight className="w-4 h-4 text-primary" />
                <span className="text-base">{path.to_role}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timeline */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Typical transition time: {path.avg_years} years</span>
              </div>

              {/* Salary Range */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>
                  €{path.salary_range_min.toLocaleString()} - €{path.salary_range_max.toLocaleString()}
                </span>
              </div>

              {/* Required Skills */}
              <div>
                <p className="text-sm font-bold mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {path.required_skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed View */}
      {selectedPath && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <div className="w-1 h-6 bg-foreground"></div>
              <TrendingUp className="w-5 h-5" />
              Path to {selectedPath.to_role}
            </CardTitle>
            <CardDescription>
              Here's what you need to focus on to make this transition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timeline Visualization */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border/30" />
              
              <div className="space-y-6 relative">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-success/20 text-success border-2 border-success/30 flex items-center justify-center shrink-0 relative z-10">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="font-bold mb-1">Year 0-1: Foundation</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Master core skills and build a strong technical foundation
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPath.required_skills.slice(0, 2).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border-2 border-primary/30 flex items-center justify-center shrink-0 relative z-10">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="font-bold mb-1">Year 1-{Math.ceil(selectedPath.avg_years / 2)}: Growth</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Take on more complex projects and develop leadership skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPath.required_skills.slice(2).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted/20 border-2 border-border/30 flex items-center justify-center shrink-0 relative z-10">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="font-bold mb-1">Year {Math.ceil(selectedPath.avg_years / 2)}-{selectedPath.avg_years}: Transition</h4>
                    <p className="text-sm text-muted-foreground">
                      Demonstrate consistent performance and readiness for the next level
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Items */}
            <div className="p-4 rounded-lg bg-success/10 border border-success/30">
              <h4 className="font-bold mb-3">Next Steps</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" />
                  <span>Identify skill gaps and create a learning plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" />
                  <span>Find a mentor who has made this transition</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" />
                  <span>Take on stretch projects that align with the target role</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" />
                  <span>Build visibility with decision-makers in your organization</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
