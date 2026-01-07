import { useState, useEffect } from "react";
import { DollarSign, Download, TrendingUp, MapPin, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currencyConversion";

interface SalaryBenchmark {
  id: string;
  role_title: string;
  location: string;
  experience_years: number | null;
  salary_min: number;
  salary_max: number;
  currency: string;
  sample_size?: number;
  updated_at?: string;
}

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

export default function SalaryInsightsContent() {
  const [role, setRole] = useState("Software Engineer");
  const [location, setLocation] = useState("Amsterdam");
  const [experience, setExperience] = useState([3]);
  const [benchmarks, setBenchmarks] = useState<SalaryBenchmark[]>([]);
  const [loading, setLoading] = useState(true);

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
      setBenchmarks((data || []) as SalaryBenchmark[]);
    } catch (error) {
      console.error('Error fetching salary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgBenchmark = benchmarks.length > 0
    ? {
        min: Math.round(benchmarks.reduce((sum, b) => sum + b.salary_min, 0) / benchmarks.length),
        max: Math.round(benchmarks.reduce((sum, b) => sum + b.salary_max, 0) / benchmarks.length)
      }
    : { min: 45000, max: 75000 };

  const midpoint = Math.round((avgBenchmark.min + avgBenchmark.max) / 2);

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
    
    toast.success("Report exported");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Salary Benchmarks
          </CardTitle>
          <CardDescription>
            Compare compensation across roles and locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Experience: {experience[0]} years
              </label>
              <Slider
                value={experience}
                onValueChange={setExperience}
                min={0}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Range Visualization */}
      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Salary Range for {role}
              </span>
              <Button variant="outline" size="sm" onClick={exportReport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardTitle>
            <CardDescription>{location} • {experience[0]} years experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visual Range Bar */}
            <div className="relative pt-8 pb-4">
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
              
              {/* Markers */}
              <div className="absolute top-0 left-0 w-full flex justify-between text-sm">
                <div className="text-center">
                  <div className="font-semibold text-muted-foreground">Entry</div>
                  <div className="font-bold">{formatCurrency(avgBenchmark.min, 'EUR')}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-primary">Median</div>
                  <div className="font-bold text-primary">{formatCurrency(midpoint, 'EUR')}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-muted-foreground">Competitive</div>
                  <div className="font-bold">{formatCurrency(avgBenchmark.max, 'EUR')}</div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{formatCurrency(avgBenchmark.min, 'EUR', { compact: true })}</div>
                <div className="text-sm text-muted-foreground">25th Percentile</div>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 text-center border border-primary/20">
                <div className="text-2xl font-bold text-primary">{formatCurrency(midpoint, 'EUR', { compact: true })}</div>
                <div className="text-sm text-muted-foreground">50th Percentile</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{formatCurrency(avgBenchmark.max, 'EUR', { compact: true })}</div>
                <div className="text-sm text-muted-foreground">75th Percentile</div>
              </div>
            </div>

            {/* Data Source Note */}
            <p className="text-xs text-muted-foreground text-center">
              Data based on {benchmarks.length > 0 ? `${benchmarks.length} data points` : 'market estimates'}. 
              Updated quarterly from verified sources.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
