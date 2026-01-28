import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Briefcase, MessageSquare, Crown } from 'lucide-react';
import { useCoverLetterGenerator, CoverLetterTone } from '@/hooks/useCoverLetterGenerator';
import { CoverLetterPreview } from './CoverLetterPreview';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedLoader } from '@/components/ui/unified-loader';

interface Job {
  id: string;
  title: string;
  companies: { name: string } | null;
}

interface CoverLetterBuilderProps {
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  onComplete?: () => void;
}

export function CoverLetterBuilder({
  jobId: initialJobId,
  jobTitle: initialJobTitle,
  companyName: initialCompanyName,
  onComplete,
}: CoverLetterBuilderProps) {
  const { user } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || '');
  const [selectedTone, setSelectedTone] = useState<CoverLetterTone>('professional');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [content, setContent] = useState('');
  const [jobTitle, setJobTitle] = useState(initialJobTitle || '');
  const [companyName, setCompanyName] = useState(initialCompanyName || '');

  const {
    generateCoverLetter,
    saveCoverLetter,
    copyToClipboard,
    isGenerating,
    isSaving,
  } = useCoverLetterGenerator();

  // Fetch available jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!user) return;
      setLoadingJobs(true);
      try {
        // First try to get jobs from applications
        const { data: applications } = await supabase
          .from('applications')
          .select('job_id, position, company_name')
          .eq('user_id', user.id)
          .limit(20);

        // Also get saved jobs
        const { data: savedJobs } = await supabase
          .from('saved_jobs')
          .select('job_id, jobs(id, title, companies(name))')
          .eq('user_id', user.id)
          .limit(20);

        // Get recent jobs user might be interested in
        const { data: recentJobs } = await supabase
          .from('jobs')
          .select('id, title, companies(name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10);

        const jobMap = new Map<string, Job>();

        // Add from applications (fake job entries)
        applications?.forEach(app => {
          if (app.job_id) {
            jobMap.set(app.job_id, {
              id: app.job_id,
              title: app.position || 'Unknown Position',
              companies: { name: app.company_name || 'Unknown Company' },
            });
          }
        });

        // Add from saved jobs
        savedJobs?.forEach(sj => {
          const job = sj.jobs as any;
          if (job?.id) {
            jobMap.set(job.id, {
              id: job.id,
              title: job.title,
              companies: job.companies,
            });
          }
        });

        // Add from recent jobs
        recentJobs?.forEach(job => {
          if (!jobMap.has(job.id)) {
            jobMap.set(job.id, {
              id: job.id,
              title: job.title,
              companies: job.companies as { name: string } | null,
            });
          }
        });

        setJobs(Array.from(jobMap.values()));
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setLoadingJobs(false);
      }
    };

    if (!initialJobId) {
      fetchJobs();
    }
  }, [user, initialJobId]);

  const handleGenerate = async () => {
    if (!selectedJobId) return;

    const result = await generateCoverLetter(selectedJobId, selectedTone);
    if (result) {
      setContent(result.coverLetter);
      setJobTitle(result.jobTitle);
      setCompanyName(result.companyName);
    }
  };

  const handleSave = async () => {
    if (!content || !selectedJobId) return;
    
    const success = await saveCoverLetter(
      content,
      selectedJobId,
      jobTitle,
      companyName,
      selectedTone
    );
    
    if (success && onComplete) {
      onComplete();
    }
  };

  const handleCopy = () => {
    copyToClipboard(content);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const toneOptions = [
    {
      value: 'professional' as const,
      label: 'Professional',
      description: 'Formal business tone, suitable for corporate roles',
      icon: Briefcase,
    },
    {
      value: 'conversational' as const,
      label: 'Conversational',
      description: 'Friendly and approachable, good for startups',
      icon: MessageSquare,
    },
    {
      value: 'executive' as const,
      label: 'Executive',
      description: 'Concise, results-focused, for senior positions',
      icon: Crown,
    },
  ];

  if (content) {
    return (
      <CoverLetterPreview
        content={content}
        jobTitle={jobTitle}
        companyName={companyName}
        tone={selectedTone}
        onContentChange={setContent}
        onRegenerate={handleRegenerate}
        onSave={handleSave}
        onCopy={handleCopy}
        isRegenerating={isGenerating}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Job */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Select a Job</CardTitle>
          <CardDescription>
            Choose a job to tailor your cover letter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialJobId ? (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium">{initialJobTitle}</p>
              <p className="text-sm text-muted-foreground">{initialCompanyName}</p>
            </div>
          ) : loadingJobs ? (
            <UnifiedLoader variant="inline" size="sm" />
          ) : (
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} at {job.companies?.name || 'Company'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Choose Tone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 2: Choose Tone</CardTitle>
          <CardDescription>
            Select the writing style that best fits the role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedTone}
            onValueChange={(value) => setSelectedTone(value as CoverLetterTone)}
            className="space-y-3"
          >
            {toneOptions.map(option => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTone === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTone(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={!selectedJobId || isGenerating}
      >
        {isGenerating ? (
          <>
            <UnifiedLoader variant="inline" size="sm" className="mr-2" />
            Generating with QUIN...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Cover Letter with QUIN
          </>
        )}
      </Button>
    </div>
  );
}
