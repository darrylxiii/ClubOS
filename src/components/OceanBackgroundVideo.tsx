import { useEffect, useRef } from 'react';
import { useMotion } from '@/contexts/MotionContext';

export const OceanBackgroundVideo = () => {
  const { motionEnabled } = useMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (motionEnabled) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [motionEnabled]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      >
        <source src="/videos/ocean-background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
    </div>
  );
};
