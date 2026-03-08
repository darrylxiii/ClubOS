import { useState, useCallback } from 'react';
import { meetingLogger as log } from '@/lib/meetingLogger';
import type { SignalPayload } from './useSignalingChannel';

interface UseMeetingScreenShareOptions {
  peerConnections: React.MutableRefObject<Map<string, RTCPeerConnection>>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  sendSignal: (signal: SignalPayload) => Promise<void>;
  configureVideoSender: (pc: RTCPeerConnection, isScreenShare: boolean) => Promise<void>;
  setScreenShareContentHint: (track: MediaStreamTrack, hint: string) => void;
}

/**
 * Manages screen sharing lifecycle: start, stop, track replacement,
 * content hints, and restoring camera when sharing ends.
 */
export function useMeetingScreenShare({
  peerConnections,
  localStreamRef,
  sendSignal,
  configureVideoSender,
  setScreenShareContentHint,
}: UseMeetingScreenShareOptions) {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const toggleScreenShare = useCallback(async (): Promise<boolean> => {
    if (screenStream) {
      // Stop
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      await sendSignal({ type: 'screen-share-stop', data: {} });
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' } as any,
        audio: true,
      });

      setScreenStream(stream);
      const screenTrack = stream.getVideoTracks()[0];
      setScreenShareContentHint(screenTrack, 'detail');

      // Replace video track in all peers
      peerConnections.current.forEach(async (pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
          await configureVideoSender(pc, true);
        }
      });

      await sendSignal({ type: 'screen-share-start', data: {} });

      // Restore camera when user stops via browser UI
      screenTrack.onended = async () => {
        setScreenStream(null);
        const camTrack = localStreamRef.current?.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && camTrack) sender.replaceTrack(camTrack);
        });
        await sendSignal({ type: 'screen-share-stop', data: {} });
      };

      return true;
    } catch (error) {
      log.error('[ScreenShare] Failed to start:', error);
      return false;
    }
  }, [screenStream, peerConnections, localStreamRef, sendSignal, configureVideoSender, setScreenShareContentHint]);

  return { screenStream, setScreenStream, toggleScreenShare };
}
