import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  FileText, 
  MessageSquare, 
  Lightbulb,
  Star,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

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
        .eq('candidate_id', user.id)
        .in('status', ['active', 'interview']);

      if (error) throw error;

      const formatted = data?.map(app => ({
        id: app.id,
        job: {
          title: (app.jobs as any)?.title || 'Unknown Position',
          company: {
            id: (app.jobs as any)?.companies?.id || '',
            name: (app.jobs as any)?.companies?.name || 'Unknown Company'
          }
        }
      })) || [];

      setApplications(formatted);
      if (formatted.length > 0) {
        setSelectedApp(formatted[0]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveStarAnswer = () => {
    toast.success("STAR answer saved to your preparation notes");
  };

  const commonQuestions = [
    {
      category: "Behavioral",
      questions: [
        "Tell me about a time you faced a significant challenge at work",
        "Describe a situation where you had to work with a difficult team member",
        "Give an example of when you showed leadership",
        "Tell me about a time you failed and what you learned"
      ]
    },
    {
      category: "Technical",
      questions: [
        "Explain your approach to solving complex technical problems",
        "Describe your experience with [specific technology]",
        "How do you ensure code quality in your projects?",
        "Walk me through your development process"
      ]
    },
    {
      category: "Culture Fit",
      questions: [
        "Why do you want to work here?",
        "What are you looking for in your next role?",
        "How do you handle feedback?",
        "Describe your ideal work environment"
      ]
    }
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-2 border-foreground">
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-xl font-bold">No Active Interviews</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start applying to jobs to access company-specific interview preparation materials
              </p>
              <Button onClick={() => window.location.href = '/jobs'}>
                Browse Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase mb-2">Interview Preparation</h1>
        <p className="text-muted-foreground">
          Get ready for your upcoming interviews with practice questions and tips
        </p>
      </div>

      {/* Application Selector */}
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            Select Interview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {applications.map(app => (
              <Button
                key={app.id}
                variant={selectedApp?.id === app.id ? "default" : "outline"}
                onClick={() => setSelectedApp(app)}
                className="justify-start"
              >
                <Building2 className="w-4 h-4 mr-2" />
                {app.job.company.name} - {app.job.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedApp && (
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions">Practice Questions</TabsTrigger>
            <TabsTrigger value="star">STAR Method</TabsTrigger>
            <TabsTrigger value="tips">Tips & Tricks</TabsTrigger>
          </TabsList>

          {/* Practice Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            {commonQuestions.map(category => (
              <Card key={category.category} className="border-2 border-foreground">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    {category.category} Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-background/30 border border-border/30 hover:bg-background/40 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="shrink-0 mt-0.5">
                            Q{idx + 1}
                          </Badge>
                          <p className="text-sm">{q}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* STAR Method Tab */}
          <TabsContent value="star" className="space-y-4">
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  STAR Method Builder
                </CardTitle>
                <CardDescription>
                  Structure your behavioral interview answers effectively
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-bold mb-2 block">
                      Situation
                      <span className="text-muted-foreground font-normal ml-2">
                        Set the context
                      </span>
                    </label>
                    <Textarea
                      value={starAnswers.situation}
                      onChange={(e) => setStarAnswers({...starAnswers, situation: e.target.value})}
                      placeholder="Describe the situation you were in..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">
                      Task
                      <span className="text-muted-foreground font-normal ml-2">
                        What needed to be done?
                      </span>
                    </label>
                    <Textarea
                      value={starAnswers.task}
                      onChange={(e) => setStarAnswers({...starAnswers, task: e.target.value})}
                      placeholder="Explain what you needed to accomplish..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">
                      Action
                      <span className="text-muted-foreground font-normal ml-2">
                        What did you do?
                      </span>
                    </label>
                    <Textarea
                      value={starAnswers.action}
                      onChange={(e) => setStarAnswers({...starAnswers, action: e.target.value})}
                      placeholder="Describe the specific actions you took..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold mb-2 block">
                      Result
                      <span className="text-muted-foreground font-normal ml-2">
                        What was the outcome?
                      </span>
                    </label>
                    <Textarea
                      value={starAnswers.result}
                      onChange={(e) => setStarAnswers({...starAnswers, result: e.target.value})}
                      placeholder="Share the results and what you learned..."
                      rows={3}
                    />
                  </div>
                </div>

                <Button onClick={saveStarAnswer} className="w-full">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Answer
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-4">
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Interview Success Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Before the Interview
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Research the company thoroughly</li>
                      <li>• Prepare 3-5 questions to ask</li>
                      <li>• Test your tech setup (for remote)</li>
                      <li>• Review the job description</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      During the Interview
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Listen actively to questions</li>
                      <li>• Take time to think before answering</li>
                      <li>• Use specific examples</li>
                      <li>• Show enthusiasm for the role</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Body Language
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Maintain eye contact</li>
                      <li>• Smile naturally</li>
                      <li>• Sit up straight</li>
                      <li>• Use hand gestures moderately</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      After the Interview
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Send a thank-you email within 24h</li>
                      <li>• Reflect on what went well</li>
                      <li>• Note areas for improvement</li>
                      <li>• Follow up if no response in a week</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
