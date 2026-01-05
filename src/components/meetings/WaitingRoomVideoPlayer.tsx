import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Volume2, VolumeX, SkipForward, CheckCircle } from "lucide-react";

interface VideoContent {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  thumbnailUrl?: string;
  videoUrl?: string;
  type: "culture" | "role" | "tips" | "company";
}

interface WaitingRoomVideoPlayerProps {
  videos: VideoContent[];
  onVideoComplete?: (videoId: string) => void;
  autoPlay?: boolean;
}

export function WaitingRoomVideoPlayer({ 
  videos, 
  onVideoComplete, 
  autoPlay = true 
}: WaitingRoomVideoPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    if (isPlaying && currentVideo) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (100 / currentVideo.duration);
          if (next >= 100) {
            handleVideoComplete();
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentIndex]);

  const handleVideoComplete = () => {
    if (currentVideo) {
      setCompletedVideos((prev) => new Set([...prev, currentVideo.id]));
      onVideoComplete?.(currentVideo.id);
    }
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      setIsPlaying(false);
    }
  };

  const skipToNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTypeLabel = (type: VideoContent["type"]) => {
    const labels = {
      culture: "Company Culture",
      role: "About the Role",
      tips: "Interview Tips",
      company: "About Us",
    };
    return labels[type];
  };

  if (videos.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {/* Placeholder for actual video - in production would use video element */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <div className="text-center text-white/80 p-6">
            <h3 className="text-xl font-semibold mb-2">{currentVideo?.title}</h3>
            <p className="text-sm opacity-75">{currentVideo?.description}</p>
          </div>
        </div>

        {/* Video controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <Progress value={progress} className="h-1 mb-3" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <span className="text-xs text-white/70">
                {formatTime(Math.floor((progress / 100) * (currentVideo?.duration || 0)))} / {formatTime(currentVideo?.duration || 0)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70">
                {currentIndex + 1} of {videos.length}
              </span>
              {currentIndex < videos.length - 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={skipToNext}
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {videos.map((video, idx) => (
            <button
              key={video.id}
              onClick={() => {
                setCurrentIndex(idx);
                setProgress(0);
              }}
              className={`flex-shrink-0 p-2 rounded-lg border text-left transition-colors ${
                idx === currentIndex
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                {completedVideos.has(video.id) && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <div>
                  <p className="text-sm font-medium line-clamp-1">{video.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTypeLabel(video.type)} • {formatTime(video.duration)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
