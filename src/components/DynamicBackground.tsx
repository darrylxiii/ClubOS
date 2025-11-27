import { useEffect, useRef, useState } from 'react';
import { useMotion } from '@/contexts/MotionContext';
import { useAppearance } from '@/contexts/AppearanceContext';

export const DynamicBackground = () => {
  const { motionEnabled } = useMotion();
  const { settings } = useAppearance();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (videoRef.current && settings.backgroundType === 'video' && !hasError) {
      if (motionEnabled) {
        videoRef.current.play().catch(() => {
          console.log('[DynamicBackground] Video playback failed');
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [motionEnabled, hasError, settings.backgroundType]);

  // Apply blur intensity as CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--blur-intensity',
      `${settings.blurIntensity}px`
    );
  }, [settings.blurIntensity]);

  const renderBackground = () => {
    if (!settings.backgroundEnabled) {
      // Default video background
      return (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setHasError(true)}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src="/videos/surreal-background.mp4" type="video/mp4" />
        </video>
      );
    }

    if (settings.backgroundType === 'video') {
      return (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setHasError(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: (100 - settings.overlayOpacity) / 100 }}
        >
          <source src={settings.backgroundValue || '/videos/surreal-background.mp4'} type="video/mp4" />
        </video>
      );
    }

    if (settings.backgroundType === 'preset' || settings.backgroundType === 'custom' || settings.backgroundType === 'ai_generated') {
      return (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${settings.backgroundValue})`,
            opacity: (100 - settings.overlayOpacity) / 100,
          }}
        />
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {renderBackground()}
      
      {/* Blur layer */}
      {settings.blurEnabled && (
        <div 
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${settings.blurIntensity}px)`,
            WebkitBackdropFilter: `blur(${settings.blurIntensity}px)`,
          }}
        />
      )}
      
      {/* Overlay layer */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          backgroundColor: settings.overlayColor,
          opacity: settings.overlayOpacity / 100,
        }}
      />
    </div>
  );
};
