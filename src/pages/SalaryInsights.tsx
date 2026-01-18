import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Download, MapPin, Briefcase, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface SalaryBenchmark {
  role_title: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  sample_size: number | null;
}

export default function SalaryInsights() {
  const [role, setRole] = useState("Software Engineer");
  const [location, setLocation] = useState("Amsterdam");
  const [experience, setExperience] = useState([3]);
  const [benchmarks, setBenchmarks] = useState<SalaryBenchmark[]>([]);
  const [loading, setLoading] = useState(true);

  const roles = [
    "Software Engineer",
    "Senior Software Engineer",
    "Engineering Manager",
    "Product Manager",
    "Designer",
    "Data Scientist"
  ];

  const locations = [
    "Amsterdam",
    "Rotterdam",
    "Utrecht",
    "Remote (Netherlands)",
    "Berlin",
    "London"
  ];

  useEffect(() => {
    fetchSalaryData();
  }, [role, location, experience]);

  const fetchSalaryData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salary_benchmarks')
        .select('*')
        .eq('role_title', role)
        .eq('location', location);

      if (error) throw error;
      setBenchmarks(data || []);
    } catch (error) {
      console.error('Error fetching salary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentile = (salary: number, min: number, max: number) => {
    return Math.round(((salary - min) / (max - min)) * 100);
  };

  const exportReport = () => {
    const report = {
      role,
      location,
      experience: experience[0],
      benchmarks,
      generated_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-insights-${role.toLowerCase().replace(/\s/g, '-')}.json`;
    a.click();
    
    toast.success("Report exported successfully");
  };

  const avgBenchmark = benchmarks.length > 0
    ? {
        min: Math.round(benchmarks.reduce((sum, b) => sum + (b.salary_min ?? 0), 0) / benchmarks.length),
        max: Math.round(benchmarks.reduce((sum, b) => sum + (b.salary_max ?? 0), 0) / benchmarks.length)
      }
    : { min: 45000, max: 75000 };

  const midpoint = Math.round((avgBenchmark.min + avgBenchmark.max) / 2);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase mb-2">Salary Intelligence</h1>
          <p className="text-muted-foreground">
            Market insights to help you negotiate better
          </p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            Configure Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold">
              Years of Experience: {experience[0]}
            </label>
            <Slider
              value={experience}
              onValueChange={setExperience}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Salary Visualization */}
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            <DollarSign className="w-5 h-5" />
            Market Position
          </CardTitle>
          <CardDescription>
            {benchmarks.length > 0 
              ? `Based on ${benchmarks.reduce((sum, b) => sum + (b.sample_size ?? 0), 0)} data points`
              : "Sample data shown"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Salary Range Bar */}
          <div className="space-y-4">
            <div className="relative h-32 bg-background/30 rounded-lg border border-border/30 overflow-hidden">
              {/* Gradient bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-destructive/20 via-primary/20 to-success/20" />
              
              {/* Markers */}
              <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-between px-4 pb-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">25th</div>
                  <Badge variant="outline" className="bg-background/80">
                    €{Math.round(avgBenchmark.min * 0.9).toLocaleString()}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Median</div>
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    €{midpoint.toLocaleString()}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">75th</div>
                  <Badge variant="outline" className="bg-background/80">
                    €{Math.round(avgBenchmark.max * 1.1).toLocaleString()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Percentile Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Entry Range</p>
                    <p className="text-2xl font-bold">
                      €{avgBenchmark.min.toLocaleString()}
                    </p>
                    <Badge variant="outline">25th Percentile</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Market Average</p>
                    <p className="text-2xl font-bold">
                      €{midpoint.toLocaleString()}
                    </p>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      50th Percentile
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Competitive</p>
                    <p className="text-2xl font-bold">
                      €{avgBenchmark.max.toLocaleString()}
                    </p>
                    <Badge variant="outline">75th Percentile</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Negotiation Tips */}
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            <TrendingUp className="w-5 h-5" />
            Negotiation Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
            <h4 className="font-bold mb-2">Your Market Position</h4>
            <p className="text-sm text-muted-foreground">
              For a {role} in {location} with {experience[0]} years of experience, 
              the market range is €{avgBenchmark.min.toLocaleString()} - €{avgBenchmark.max.toLocaleString()}.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                1
              </div>
              <div>
                <h5 className="font-bold mb-1">Know Your Value</h5>
                <p className="text-sm text-muted-foreground">
                  Aim for the 50th-75th percentile based on your skills and experience.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                2
              </div>
              <div>
                <h5 className="font-bold mb-1">Consider Total Compensation</h5>
                <p className="text-sm text-muted-foreground">
                  Include equity, bonuses, and benefits when evaluating offers.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                3
              </div>
              <div>
                <h5 className="font-bold mb-1">Timing Matters</h5>
                <p className="text-sm text-muted-foreground">
                  Negotiate after receiving an offer, not during initial interviews.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
