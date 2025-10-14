import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from "lucide-react";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface VideoPlayerWithTranscriptProps {
  videoUrl: string;
  transcript: TranscriptSegment[];
  title: string;
}

export function VideoPlayerWithTranscript({
  videoUrl,
  transcript,
  title,
}: VideoPlayerWithTranscriptProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      // Find active segment
      const segmentIndex = transcript.findIndex(
        (seg) => time >= seg.start && time <= seg.end
      );
      setActiveSegmentIndex(segmentIndex);

      // Find active word within segment
      if (segmentIndex !== -1 && transcript[segmentIndex].words) {
        const wordIndex = transcript[segmentIndex].words!.findIndex(
          (word) => time >= word.start && time <= word.end
        );
        setActiveWordIndex(wordIndex);
      } else {
        setActiveWordIndex(null);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [transcript]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Video Player */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="squircle overflow-hidden">
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full"
              src={videoUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Custom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                  />

                  <span className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="squircle p-4">
          <h3 className="font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Interactive video lesson with synchronized transcript
          </p>
        </Card>
      </div>

      {/* Transcript Panel */}
      <div className="lg:col-span-1">
        <Card className="squircle p-4 h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Interactive Transcript</h3>
            <Badge variant="outline" className="squircle-sm">
              AI Powered
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {transcript.map((segment, segmentIdx) => (
                <div
                  key={segmentIdx}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    activeSegmentIndex === segmentIdx
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => seekTo(segment.start)}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {formatTime(segment.start)}
                  </div>
                  <div className="text-sm leading-relaxed">
                    {segment.words ? (
                      segment.words.map((word, wordIdx) => (
                        <span
                          key={wordIdx}
                          className={`transition-all ${
                            activeSegmentIndex === segmentIdx &&
                            activeWordIndex === wordIdx
                              ? "bg-primary text-primary-foreground px-1 rounded"
                              : ""
                          }`}
                        >
                          {word.word}{" "}
                        </span>
                      ))
                    ) : (
                      <span
                        className={
                          activeSegmentIndex === segmentIdx
                            ? "font-medium"
                            : ""
                        }
                      >
                        {segment.text}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
