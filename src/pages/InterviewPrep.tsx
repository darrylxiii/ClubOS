import { useState, useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  MessageSquare, 
  Star,
  CheckCircle2,
  Sparkles,
  Calendar,
  Loader2,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { SelfBookingWidget } from "@/components/interview";

interface Application {
  id: string;
  job: {
    title: string;
    company: {
      id: string;
      name: string;
    };
  };
}

interface TailoredQuestion {
  category: string;
  question: string;
  why: string;
  tip: string;
}

interface SmartQuestion {
  question: string;
  insight: string;
}

interface PrepData {
  tailoredQuestions: TailoredQuestion[];
  smartQuestionsToAsk: SmartQuestion[];
  companyInsights: string;
  keyThemesToEmphasize: string[];
}

export default function InterviewPrep() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [starAnswers, setStarAnswers] = useState({
    situation: "",
    task: "",
    action: "",
    result: ""
  });
  const [loading, setLoading] = useState(true);
  const [aiPrep, setAiPrep] = useState<PrepData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  // Load saved STAR answers when selected application changes
  useEffect(() => {
    if (!user || !selectedApp) return;
    (async () => {
      const { data } = await supabase
        .from('interview_prep_answers')
        .select('situation, task, action, result')
        .eq('user_id', user.id)
        .eq('application_id', selectedApp.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setStarAnswers({
          situation: (data[0] as any).situation || '',
          task: (data[0] as any).task || '',
          action: (data[0] as any).action || '',
          result: (data[0] as any).result || '',
        });
      } else {
        setStarAnswers({ situation: '', task: '', action: '', result: '' });
      }
    })();
  }, [user, selectedApp?.id]);

  // Load AI prep when application is selected
  useEffect(() => {
    if (!selectedApp) return;
    generateAiPrep();
  }, [selectedApp?.id]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          jobs:job_id (
            title,
            companies:company_id (
              id,
              name
            )
          )
        `)
        .or(`user_id.eq.${user.id},candidate_id.eq.${user.id}`)
        .in('status', ['active', 'interview']);

      if (error) throw error;

      const formatted = data?.map(app => ({
        id: app.id,
        job: {
          title: (app.jobs as Record<string, any> | null)?.title || 'Unknown Position',
          company: {
            id: (app.jobs as Record<string, any> | null)?.companies?.id || '',
            name: (app.jobs as Record<string, any> | null)?.companies?.name || 'Unknown Company'
          }
        }
      })) || [];

      setApplications(formatted);
      if (formatted.length > 0) {
        setSelectedApp(formatted[0]);
      }
    } catch (error) {
      logger.error('Error fetching applications:', { error });
      setFetchError("Failed to load your applications");
      toast.error("Failed to load interview prep data");
    } finally {
      setLoading(false);
    }
  };

  const generateAiPrep = async () => {
    if (!selectedApp) return;
    setAiLoading(true);
    setAiPrep(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-candidate-interview-prep', {
        body: { applicationId: selectedApp.id }
      });

      if (error) throw error;
      if (data?.prep) {
        setAiPrep(data.prep);
      }
    } catch (err) {
      logger.error('Error generating AI prep:', { error: err });
      toast.error("Could not generate AI prep. Using default questions.");
    } finally {
      setAiLoading(false);
    }
  };

  const saveStarAnswer = async () => {
    if (!user || !selectedApp) return;
    const hasContent = starAnswers.situation || starAnswers.task || starAnswers.action || starAnswers.result;
    if (!hasContent) {
      toast.error("Please fill in at least one STAR field");
      return;
    }
    try {
      const { error } = await supabase
        .from('interview_prep_answers')
        .insert({
          user_id: user.id,
          application_id: selectedApp.id,
          situation: starAnswers.situation || null,
          task: starAnswers.task || null,
          action: starAnswers.action || null,
          result: starAnswers.result || null,
        } as any);
      if (error) throw error;
      toast.success("STAR answer saved to your preparation notes");
    } catch (err) {
      console.error('Error saving STAR answer:', err);
      toast.error("Failed to save answer");
    }
  };

  const categoryColors: Record<string, string> = {
    'Behavioral': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Technical': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Culture Fit': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Role-Specific': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  if (fetchError) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 p-6">
        <ErrorState variant="page" title="Interview Prep Unavailable" message={fetchError} onRetry={fetchApplications} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 p-6">
        <Card className="border border-border/50">
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold">No Active Interviews</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start applying to roles to access company-specific interview preparation
              </p>
              <Button onClick={() => window.location.href = '/jobs'}>
                Browse Roles
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Interview Preparation</h1>
        <p className="text-sm text-muted-foreground">
          Powered by QUIN — tailored to each role and company
        </p>
      </div>

      {/* Application Selector */}
      <div className="flex flex-wrap gap-2">
        {applications.map(app => (
          <Button
            key={app.id}
            variant={selectedApp?.id === app.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedApp(app)}
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            {app.job.company.name} — {app.job.title}
          </Button>
        ))}
      </div>

      {selectedApp && (
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="questions">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Questions
            </TabsTrigger>
            <TabsTrigger value="ask">
              <HelpCircle className="h-4 w-4 mr-2" />
              Questions to Ask
            </TabsTrigger>
            <TabsTrigger value="star">
              <Star className="h-4 w-4 mr-2" />
              STAR Method
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
          </TabsList>

          {/* AI-Generated Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            {aiLoading ? (
              <Card className="border border-border/50">
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">QUIN is analyzing the job description...</p>
                </CardContent>
              </Card>
            ) : aiPrep ? (
              <>
                {/* Key Themes */}
                {aiPrep.keyThemesToEmphasize?.length > 0 && (
                  <div className="glass-subtle rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Key themes to emphasize</h3>
                    <div className="flex flex-wrap gap-2">
                      {aiPrep.keyThemesToEmphasize.map((theme, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{theme}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Company Insights */}
                {aiPrep.companyInsights && (
                  <div className="glass-subtle rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Company insights</h3>
                    <p className="text-sm">{aiPrep.companyInsights}</p>
                  </div>
                )}

                {/* Tailored Questions by Category */}
                {Object.entries(
                  (aiPrep.tailoredQuestions || []).reduce((acc: Record<string, TailoredQuestion[]>, q) => {
                    (acc[q.category] = acc[q.category] || []).push(q);
                    return acc;
                  }, {})
                ).map(([category, questions]) => (
                  <Card key={category} className="border border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant="outline" className={categoryColors[category] || ''}>
                          {category}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {questions.map((q, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/20 space-y-2">
                          <p className="text-sm font-medium">{q.question}</p>
                          <p className="text-xs text-muted-foreground"><span className="font-medium">Why they ask:</span> {q.why}</p>
                          <p className="text-xs text-primary/80"><span className="font-medium">Tip:</span> {q.tip}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" size="sm" onClick={generateAiPrep} className="w-full">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Regenerate Questions
                </Button>
              </>
            ) : (
              <Card className="border border-border/50">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Could not load AI questions</p>
                  <Button variant="outline" size="sm" onClick={generateAiPrep}>Try Again</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Smart Questions to Ask Tab */}
          <TabsContent value="ask" className="space-y-4">
            {aiLoading ? (
              <Card className="border border-border/50">
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Generating smart questions...</p>
                </CardContent>
              </Card>
            ) : aiPrep?.smartQuestionsToAsk ? (
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    7 Smart Questions to Ask
                  </CardTitle>
                  <CardDescription>
                    Impress your interviewer with thoughtful, role-specific questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiPrep.smartQuestionsToAsk.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/20">
                      <p className="text-sm font-medium mb-1">{q.question}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">What it reveals:</span> {q.insight}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border/50">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Select an application to generate questions</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* STAR Method Tab */}
          <TabsContent value="star" className="space-y-4">
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  STAR Method Builder
                </CardTitle>
                <CardDescription>
                  Structure your behavioral interview answers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['situation', 'task', 'action', 'result'] as const).map((field) => (
                  <div key={field}>
                    <label className="text-sm font-medium mb-1.5 block capitalize">
                      {field}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">
                        {field === 'situation' && '— Set the context'}
                        {field === 'task' && '— What needed to be done?'}
                        {field === 'action' && '— What did you do?'}
                        {field === 'result' && '— What was the outcome?'}
                      </span>
                    </label>
                    <Textarea
                      value={starAnswers[field]}
                      onChange={(e) => setStarAnswers({ ...starAnswers, [field]: e.target.value })}
                      placeholder={`Describe the ${field}...`}
                      rows={3}
                    />
                  </div>
                ))}

                <Button onClick={saveStarAnswer} className="w-full">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Answer
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <SelfBookingWidget
              applicationId={selectedApp.id}
              companyId={selectedApp.job.company.id}
              jobTitle={selectedApp.job.title}
              companyName={selectedApp.job.company.name}
              onBookingComplete={() => {
                toast.success("Interview scheduled");
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
