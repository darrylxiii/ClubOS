import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/lib/notify";
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
import { SectionLoader } from "@/components/ui/unified-loader";

interface Module {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  display_order: number;
  video_url?: string;
  image_url?: string;
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
  display_order: number | null;
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
  const [videoWatchedPercentage, setVideoWatchedPercentage] = useState(0);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [lastSavedPosition, setLastSavedPosition] = useState(0);

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
          .select('progress_percentage, video_watched_percentage, video_last_position_seconds')
          .eq('module_id', moduleData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (progressData) {
          setProgress(progressData.progress_percentage ?? 0);
          setVideoWatchedPercentage(progressData.video_watched_percentage || 0);
          setLastSavedPosition(progressData.video_last_position_seconds || 0);
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

  const saveVideoProgress = async (currentTime: number, duration: number, watchTime: number) => {
    if (!module || !user) return;

    const watchedPercentage = Math.round((currentTime / duration) * 100);
    const isCompleted = watchedPercentage >= 90; // Consider 90% as completed

    try {
      await supabase
        .from('learner_progress')
        .upsert({
          user_id: user.id,
          module_id: module.id,
          video_watched_percentage: watchedPercentage,
          video_last_position_seconds: Math.floor(currentTime),
          video_watch_time_seconds: Math.floor(watchTime),
          video_completed_at: isCompleted ? new Date().toISOString() : null,
        });

      setVideoWatchedPercentage(watchedPercentage);
    } catch (error: any) {
      console.error('Error saving video progress:', error);
    }
  };

  useEffect(() => {
    if (!videoRef || !user || !module) return;

    const watchStartTime = Date.now();
    let totalWatchTime = 0;
    let lastUpdateTime = 0;

    const handleTimeUpdate = () => {
      const currentTime = videoRef.currentTime;
      const duration = videoRef.duration;

      if (duration && !isNaN(duration)) {
        const now = Date.now();
        const timeSinceLastUpdate = (now - lastUpdateTime) / 1000;

        // Track watch time (only when actually playing)
        if (!videoRef.paused) {
          totalWatchTime += timeSinceLastUpdate;
        }

        lastUpdateTime = now;

        // Save progress every 5 seconds
        if (Math.abs(currentTime - lastSavedPosition) >= 5) {
          saveVideoProgress(currentTime, duration, totalWatchTime);
          setLastSavedPosition(currentTime);
        }
      }
    };

    const handleEnded = () => {
      const duration = videoRef.duration;
      if (duration) {
        saveVideoProgress(duration, duration, totalWatchTime);
        // Auto-mark as complete when video ends
        if (progress < 100) {
          markComplete();
        }
      }
    };

    const handleLoadedMetadata = () => {
      // Restore last position if exists
      if (lastSavedPosition > 0 && videoRef.duration) {
        videoRef.currentTime = lastSavedPosition;
      }
      lastUpdateTime = Date.now();
    };

    videoRef.addEventListener('timeupdate', handleTimeUpdate);
    videoRef.addEventListener('ended', handleEnded);
    videoRef.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      videoRef.removeEventListener('timeupdate', handleTimeUpdate);
      videoRef.removeEventListener('ended', handleEnded);
      videoRef.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef, user, module, lastSavedPosition]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <SectionLoader />
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

          {/* Module Image (if no video) */}
          {!module.video_url && module.image_url && (
            <Card className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={module.image_url}
                  alt={module.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>
          )}

          {/* Video Player */}
          {module.video_url && (
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {module.video_url.includes('youtube.com') || module.video_url.includes('youtu.be') ? (
                  <iframe
                    src={module.video_url}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title={module.title}
                  />
                ) : (
                  <video
                    ref={setVideoRef}
                    src={module.video_url}
                    controls
                    className="w-full h-full"
                    poster={module.image_url}
                  />
                )}
              </div>
            </Card>
          )}

          {/* No media placeholder */}
          {!module.video_url && !module.image_url && (
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <div className="text-center p-12">
                  <PlayCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Media content coming soon</p>
                </div>
              </div>
            </Card>
          )}

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

                {module?.video_url && !module.video_url.includes('youtube.com') && !module.video_url.includes('youtu.be') && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Video Watched</span>
                      <span className="font-semibold">{videoWatchedPercentage}%</span>
                    </div>
                    <Progress value={videoWatchedPercentage} className="h-1 mt-2" />
                  </div>
                )}

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
