import { useState, useEffect } from "react";
import { ArrowRight, TrendingUp, Clock, DollarSign, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currencyConversion";

interface CareerPath {
  id: string;
  from_role: string;
  to_role: string;
  avg_years: number;
  salary_range_min: number;
  salary_range_max: number;
  required_skills: string[];
}

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

const roles = [
  "Software Engineer",
  "Senior Software Engineer",
  "Engineering Manager",
  "Product Manager",
  "Designer",
  "Data Scientist"
];

export default function CareerPathContent() {
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
      setCareerPaths(data?.length ? data : samplePaths.filter(p => p.from_role === currentRole));
    } catch (error) {
      console.error('Error fetching career paths:', error);
      setCareerPaths(samplePaths.filter(p => p.from_role === currentRole));
    } finally {
      setLoading(false);
    }
  };

  const displayPaths = careerPaths.length > 0 ? careerPaths : samplePaths.filter(p => p.from_role === currentRole);

  return (
    <div className="space-y-6">
      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Current Role
          </CardTitle>
          <CardDescription>
            Select your current role to explore potential career paths
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={currentRole} onValueChange={setCurrentRole}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Career Paths Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        ) : (
          displayPaths.map((path) => (
            <Card 
              key={path.id} 
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                selectedPath?.id === path.id ? 'border-primary ring-1 ring-primary' : ''
              }`}
              onClick={() => setSelectedPath(path)}
            >
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{path.from_role}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-semibold text-foreground">{path.to_role}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>~{path.avg_years} years</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatCurrency(path.salary_range_min, 'EUR', { compact: true })} - {formatCurrency(path.salary_range_max, 'EUR', { compact: true })}
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {path.required_skills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Selected Path Detail */}
      {selectedPath && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Path to {selectedPath.to_role}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The typical transition from {selectedPath.from_role} to {selectedPath.to_role} takes 
              approximately {selectedPath.avg_years} years. Focus on developing these key skills:
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedPath.required_skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
            <Button className="mt-4">
              View Learning Resources
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
