import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  ChevronRight,
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  display_order: number;
  video_url?: string;
  is_published: boolean;
  course_id: string;
  course: {
    id: string;
    title: string;
    slug: string;
  };
}

interface CourseModule {
  id: string;
  title: string;
  slug: string;
  display_order: number;
}

export default function ModuleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [module, setModule] = useState<Module | null>(null);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  useEffect(() => {
    fetchModule();
  }, [slug]);

  const fetchModule = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select(`
          *,
          course:courses(id, title, slug)
        `)
        .eq('slug', slug)
        .single();

      if (moduleError) throw moduleError;
      setModule(moduleData as Module);

      // Fetch all modules in this course
      if (moduleData.course) {
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id, title, slug, display_order')
          .eq('course_id', moduleData.course.id)
          .order('display_order');

        if (modulesData) {
          setCourseModules(modulesData);
          const index = modulesData.findIndex(m => m.slug === slug);
          setCurrentModuleIndex(index);
        }
      }

      // Fetch learner progress if user is logged in
      if (user && moduleData.id) {
        const { data: progressData } = await supabase
          .from('learner_progress')
          .select('progress_percentage')
          .eq('module_id', moduleData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (progressData) {
          setProgress(progressData.progress_percentage);
        }
      }
    } catch (error: any) {
      console.error('Error fetching module:', error);
      toast({
        title: "Error loading module",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async () => {
    if (!module || !user) return;

    try {
      const { error } = await supabase
        .from('learner_progress')
        .upsert({
          user_id: user.id,
          module_id: module.id,
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      setProgress(100);
      toast({
        title: "Module completed!",
        description: "Great job!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const goToNextModule = () => {
    if (currentModuleIndex < courseModules.length - 1) {
      const nextModule = courseModules[currentModuleIndex + 1];
      navigate(`/academy/modules/${nextModule.slug}`);
    }
  };

  const goToPreviousModule = () => {
    if (currentModuleIndex > 0) {
      const prevModule = courseModules[currentModuleIndex - 1];
      navigate(`/academy/modules/${prevModule.slug}`);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!module) {
    return (
      <AppLayout>
        <div className="container max-w-6xl mx-auto p-6 text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Module not found</h2>
          <Link to="/academy">
            <Button>Back to Academy</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const hasNextModule = currentModuleIndex < courseModules.length - 1;
  const hasPreviousModule = currentModuleIndex > 0;

  return (
    <AppLayout>
      <div className="container max-w-5xl mx-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/academy" className="hover:text-foreground">
            <BookOpen className="h-4 w-4 inline mr-1" />
            Academy
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            to={`/courses/${module.course.slug}`}
            className="hover:text-foreground"
          >
            {module.course.title}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{module.title}</span>
        </div>

        <div className="space-y-6">
          {/* Module Header */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{module.title}</h1>
            <p className="text-muted-foreground">{module.description}</p>
          </div>

          {/* Video Player */}
          <Card className="overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center">
              {module.video_url ? (
                <video 
                  src={module.video_url} 
                  controls 
                  className="w-full h-full"
                />
              ) : (
                <div className="text-center p-12">
                  <PlayCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Video content coming soon</p>
                </div>
              )}
            </div>
          </Card>

          {/* Content Area */}
          <Card className="p-8">
            <div className="prose prose-sm max-w-none">
              <h2 className="text-xl font-bold mb-4">Module Content</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {module.description}
              </p>
              
              {/* Placeholder for content blocks */}
              <div className="space-y-4 text-muted-foreground">
                <p>Module content will appear here. This can include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Text lessons and explanations</li>
                  <li>Code examples and exercises</li>
                  <li>Interactive quizzes</li>
                  <li>Downloadable resources</li>
                  <li>Expert notes and tips</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Progress and Navigation */}
          {user && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Your Progress</h3>
                  <span className="text-sm font-semibold">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={goToPreviousModule}
                    disabled={!hasPreviousModule}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  
                  <Button 
                    onClick={markComplete} 
                    disabled={progress === 100}
                    variant={progress === 100 ? "outline" : "default"}
                  >
                    {progress === 100 ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Completed
                      </>
                    ) : (
                      "Complete & Continue"
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={goToNextModule}
                    disabled={!hasNextModule}
                    className="flex-1"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Back to Course */}
          <div className="flex justify-center pt-6">
            <Link to={`/courses/${module.course.slug}`}>
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Course Overview
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
