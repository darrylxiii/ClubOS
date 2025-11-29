import { useEffect, useRef } from 'react';

interface RemoteAudioPlayerProps {
  userId: string;
  stream: MediaStream;
  volume?: number;
}

export function RemoteAudioPlayer({ userId, stream, volume = 1 }: RemoteAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(err => {
        console.error('Error playing remote audio:', err);
      });
    }
  }, [stream, volume]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
      data-user-id={userId}
    />
  );
}
