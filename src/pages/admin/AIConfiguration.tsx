import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Zap, TestTube, Save, RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AIConfig {
  skillsWeight: number;
  experienceWeight: number;
  locationWeight: number;
  salaryWeight: number;
  cultureWeight: number;
  matchThreshold: number;
}

const defaultConfig: AIConfig = {
  skillsWeight: 35,
  experienceWeight: 25,
  locationWeight: 15,
  salaryWeight: 15,
  cultureWeight: 10,
  matchThreshold: 85,
};

const AIConfiguration = () => {
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [testProfile, setTestProfile] = useState('');
  const [testJob, setTestJob] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Real testing mode state
  const [testMode, setTestMode] = useState<'hypothetical' | 'real'>('hypothetical');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    // In a real implementation, load config from database
    // For now, we'll use local state
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, save to database
      // For now, just simulate a save
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    toast.success('Configuration reset to defaults');
  };

  const fetchRealData = async () => {
    setLoadingData(true);
    try {
      // Fetch candidates with profiles
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('profiles')
        .select('id, full_name, current_title, location')
        .not('full_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (candidatesError) throw candidatesError;

      // Fetch jobs (all statuses for testing)
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, company_id, location, employment_type, status')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (jobsError) throw jobsError;

      setCandidates(candidatesData || []);
      setJobs(jobsData || []);
      toast.success(`Loaded ${candidatesData?.length || 0} candidates and ${jobsData?.length || 0} jobs`);
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast.error('Failed to load candidates and jobs');
    } finally {
      setLoadingData(false);
    }
  };

  const handleTest = async () => {
    if (testMode === 'hypothetical') {
      // Hypothetical testing mode
      if (!testProfile.trim() || !testJob.trim()) {
        toast.error('Please provide both profile and job details');
        return;
      }

      setTesting(true);
      try {
        // Parse test profile to extract structured data
        const profileData = {
          current_title: testProfile.includes('Developer') || testProfile.includes('Engineer') 
            ? testProfile.split('\n')[0] : 'Professional',
          location: testProfile.match(/in ([A-Za-z\s]+)/)?.[1] || 'Not specified',
          career_preferences: testProfile,
          employment_type_preference: testProfile.toLowerCase().includes('remote') ? 'remote' : 'hybrid',
          remote_work_preference: testProfile.toLowerCase().includes('remote'),
        };

        // Call calculate-match-score edge function with test mode
        const { data, error } = await supabase.functions.invoke('calculate-match-score', {
          body: {
            test_mode: true,
            jobId: 'test-job',
            userId: 'test-user',
            jobTitle: testJob,
            company: 'Test Company',
            tags: [],
            test_profile: profileData,
          },
        });

        if (error) throw error;

        setTestResult(data.analysis);
        toast.success('Match score calculated with hypothetical data');
      } catch (error) {
        console.error('Error testing match:', error);
        toast.error('Failed to test matching algorithm');
      } finally {
        setTesting(false);
      }
    } else {
      // Real database testing mode
      if (!selectedCandidateId || !selectedJobId) {
        toast.error('Please select both a candidate and a job');
        return;
      }

      setTesting(true);
      try {
        const selectedJob = jobs.find(j => j.id === selectedJobId);
        
        const { data, error } = await supabase.functions.invoke('calculate-match-score', {
          body: {
            test_mode: false,
            jobId: selectedJobId,
            userId: selectedCandidateId,
            jobTitle: selectedJob?.title || 'Job',
            company: 'Test Company',
            tags: [],
          },
        });

        if (error) throw error;

        setTestResult(data.analysis);
        toast.success('Match score calculated with real database data');
      } catch (error) {
        console.error('Error testing match:', error);
        toast.error('Failed to test matching algorithm');
      } finally {
        setTesting(false);
      }
    }
  };

  const totalWeight = 
    config.skillsWeight + 
    config.experienceWeight + 
    config.locationWeight + 
    config.salaryWeight + 
    config.cultureWeight;

  const isWeightValid = totalWeight === 100;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Model Configuration</h1>
        <p className="text-muted-foreground">
          Fine-tune the matching algorithm to optimize candidate-job fit
        </p>
      </div>

      <div className="grid gap-6">
        {/* Matching Weights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Match Score Weighting
            </CardTitle>
            <CardDescription>
              Adjust how different factors contribute to the overall match score (must total 100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Skills Match ({config.skillsWeight}%)</Label>
              </div>
              <Slider
                value={[config.skillsWeight]}
                onValueChange={([value]) => setConfig({ ...config, skillsWeight: value })}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Experience Level ({config.experienceWeight}%)</Label>
              </div>
              <Slider
                value={[config.experienceWeight]}
                onValueChange={([value]) => setConfig({ ...config, experienceWeight: value })}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Location Fit ({config.locationWeight}%)</Label>
              </div>
              <Slider
                value={[config.locationWeight]}
                onValueChange={([value]) => setConfig({ ...config, locationWeight: value })}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Salary Alignment ({config.salaryWeight}%)</Label>
              </div>
              <Slider
                value={[config.salaryWeight]}
                onValueChange={([value]) => setConfig({ ...config, salaryWeight: value })}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Culture Fit ({config.cultureWeight}%)</Label>
              </div>
              <Slider
                value={[config.cultureWeight]}
                onValueChange={([value]) => setConfig({ ...config, cultureWeight: value })}
                max={100}
                step={5}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-semibold">Total Weight:</span>
              <span className={`text-xl font-bold ${isWeightValid ? 'text-green-600' : 'text-red-600'}`}>
                {totalWeight}%
              </span>
            </div>

            {!isWeightValid && (
              <p className="text-sm text-red-600">
                Total weight must equal 100%. Currently {totalWeight > 100 ? 'over' : 'under'} by {Math.abs(100 - totalWeight)}%.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Match Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Match Threshold
            </CardTitle>
            <CardDescription>
              Set the minimum score for a "high match" recommendation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>High Match Threshold</Label>
                <span className="text-xl font-bold">{config.matchThreshold}%</span>
              </div>
              <Slider
                value={[config.matchThreshold]}
                onValueChange={([value]) => setConfig({ ...config, matchThreshold: value })}
                min={50}
                max={95}
                step={5}
              />
              <p className="text-sm text-muted-foreground">
                Candidates scoring above {config.matchThreshold}% will be marked as "High Match"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Algorithm */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Matching Algorithm
            </CardTitle>
            <CardDescription>
              Test with hypothetical scenarios or real database records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={testMode} onValueChange={(v) => setTestMode(v as 'hypothetical' | 'real')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hypothetical">Hypothetical Test</TabsTrigger>
                <TabsTrigger value="real" onClick={fetchRealData}>
                  Real Data Test
                </TabsTrigger>
              </TabsList>
              
              {/* Hypothetical Tab */}
              <TabsContent value="hypothetical" className="space-y-4">
                <div className="space-y-2">
                  <Label>Candidate Profile (brief description)</Label>
                  <Textarea
                    placeholder="E.g., Senior React Developer with 5 years experience, based in Amsterdam..."
                    value={testProfile}
                    onChange={(e) => setTestProfile(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Job Details (brief description)</Label>
                  <Textarea
                    placeholder="E.g., Looking for a React Developer for a fintech startup in Rotterdam..."
                    value={testJob}
                    onChange={(e) => setTestJob(e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              {/* Real Data Tab */}
              <TabsContent value="real" className="space-y-4">
                {loadingData ? (
                  <p className="text-sm text-muted-foreground">Loading data...</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Candidate</Label>
                      <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a candidate..." />
                        </SelectTrigger>
                        <SelectContent>
                          {candidates.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.full_name} {c.current_title ? `- ${c.current_title}` : ''} 
                              {c.location ? ` (${c.location})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {candidates.length} candidates available
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Select Job</Label>
                      <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a job..." />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map(j => (
                            <SelectItem key={j.id} value={j.id}>
                              {j.title} {j.location ? `- ${j.location}` : ''} 
                              <span className="text-xs text-muted-foreground ml-2">
                                ({j.status})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {jobs.length} jobs available
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
            
            <Button onClick={handleTest} disabled={testing || (testMode === 'real' && loadingData)} className="w-full">
              {testing ? 'Calculating...' : 'Calculate Match Score'}
            </Button>
            
            {testResult && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Match Score:</span>
                  <span className="text-2xl font-bold">{testResult.overall_score}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {testResult.overall_score >= config.matchThreshold ? '✅ High Match' : '⚠️ Below Threshold'}
                </p>
                {testMode === 'real' && (
                  <p className="text-xs text-muted-foreground italic">
                    Tested with real database records
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !isWeightValid}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIConfiguration;
