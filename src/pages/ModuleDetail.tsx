import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AIModuleAssistant } from "@/components/academy/AIModuleAssistant";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  FileText,
  MessageSquare,
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  display_order: number;
  course: {
    title: string;
    slug: string;
  };
  module_content: Array<{
    content_type: string;
    content_body: any;
    display_order: number;
  }>;
}

export default function ModuleDetail() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchModule();
  }, [moduleId]);

  const fetchModule = async () => {
    if (!moduleId) return;

    try {
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          course:courses(title, slug)
        `)
        .eq('id', moduleId)
        .single();

      if (error) throw error;
      // Add empty module_content array until migration is run
      setModule({ ...data, module_content: [] } as any);

      // Fetch progress
      const { data: progressData } = await supabase
        .from('learner_progress')
        .select('progress_percentage')
        .eq('module_id', moduleId)
        .maybeSingle();

      if (progressData) {
        setProgress(progressData.progress_percentage);
      }
    } catch (error) {
      console.error('Error fetching module:', error);
      toast({
        title: "Error",
        description: "Failed to load module",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async () => {
    if (!moduleId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('learner_progress')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          progress_percentage: 100,
          completed: true,
          last_accessed_at: new Date().toISOString(),
        });

      if (error) throw error;

      setProgress(100);
      toast({
        title: "Module completed!",
        description: "Great work! You've completed this module.",
      });
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark module as complete",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Module not found</p>
        <Button onClick={() => navigate('/academy')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Academy
        </Button>
      </div>
    );
  }

  const moduleContext = {
    title: module.title,
    description: module.description || undefined,
    content: module.module_content
      .map((c) => JSON.stringify(c.content_body))
      .join('\n'),
    courseTitle: module.course.title,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/academy`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Academy
        </Button>

        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              {module.course.title}
            </div>
            <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
            <p className="text-muted-foreground">{module.description}</p>
          </div>

            <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{Math.round(module.estimated_minutes / 60)}h estimated</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{module.module_content.length} materials</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex-1">
                <BookOpen className="h-4 w-4 mr-2" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="qa" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Q&A
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-6">
              {module.module_content
                .sort((a, b) => a.display_order - b.display_order)
                .map((content, idx) => (
                  <Card key={idx} className="squircle p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        {content.content_type === 'video' && (
                          <PlayCircle className="h-5 w-5 text-primary" />
                        )}
                        {content.content_type === 'text' && (
                          <FileText className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">
                          {content.content_body?.title || `Content ${idx + 1}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {content.content_body?.description || 'No description available'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}

              <div className="flex justify-between items-center pt-4">
                <Button variant="outline">Previous</Button>
                <Button onClick={markComplete} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Complete
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="mt-6">
              <Card className="squircle p-6">
                <p className="text-muted-foreground text-center py-8">
                  No additional resources yet
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="qa" className="mt-6">
              <Card className="squircle p-6">
                <p className="text-muted-foreground text-center py-8">
                  Q&A feature coming soon
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <AIModuleAssistant moduleContext={moduleContext} />
        </div>
      </div>
    </div>
  );
}
