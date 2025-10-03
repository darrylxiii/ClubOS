import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface VideoEditorProps {
  file: File;
  open: boolean;
  onClose: () => void;
  onSave: (editedFile: File) => void;
}

export function VideoEditor({ file, open, onClose, onSave }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !open) return;

    const video = videoRef.current;
    const url = URL.createObjectURL(file);
    video.src = url;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      URL.revokeObjectURL(url);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [file, open]);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    // For now, just pass the original file
    // In a full implementation, you would process the video with trimming, etc.
    onSave(file);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full max-h-[400px]"
              onEnded={() => setIsPlaying(false)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <div className="flex-1 space-y-1">
                <Slider
                  value={[currentTime]}
                  onValueChange={handleSeek}
                  min={0}
                  max={duration || 100}
                  step={0.1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>

              <div className="w-24">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Use Video
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}