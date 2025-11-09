import { useEffect, useRef, useState } from 'react';
import { useMotion } from '@/contexts/MotionContext';

export const BackgroundVideo = () => {
  const { motionEnabled } = useMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (videoRef.current && !hasError) {
      if (motionEnabled) {
        videoRef.current.play().catch(() => {
          console.log('[BackgroundVideo] Video playback failed - continuing without video');
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [motionEnabled, hasError]);

  // If video fails to load or has error, render only the background overlay
  if (hasError) {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        onError={() => {
          console.log('[BackgroundVideo] Video failed to load - continuing without video');
          setHasError(true);
        }}
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      >
        <source src="/videos/surreal-background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
    </div>
  );
};
