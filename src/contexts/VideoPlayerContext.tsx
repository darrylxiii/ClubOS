import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VideoPlayerState {
  isPlaying: boolean;
  videoId: string | null;
  title?: string;
}

interface VideoPlayerContextType {
  videoState: VideoPlayerState;
  openFloatingPlayer: (videoId: string, title?: string) => void;
  closeFloatingPlayer: () => void;
  isFloatingPlayerOpen: boolean;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const [videoState, setVideoState] = useState<VideoPlayerState>({
    isPlaying: false,
    videoId: null,
  });

  const openFloatingPlayer = (videoId: string, title?: string) => {
    setVideoState({
      isPlaying: true,
      videoId,
      title,
    });
  };

  const closeFloatingPlayer = () => {
    setVideoState({
      isPlaying: false,
      videoId: null,
    });
  };

  const isFloatingPlayerOpen = videoState.isPlaying && videoState.videoId !== null;

  return (
    <VideoPlayerContext.Provider
      value={{
        videoState,
        openFloatingPlayer,
        closeFloatingPlayer,
        isFloatingPlayerOpen,
      }}
    >
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within VideoPlayerProvider');
  }
  return context;
}
