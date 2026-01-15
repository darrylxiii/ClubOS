/**
 * Automatic Camera/Microphone Fallback
 * Detects when primary device fails mid-call and auto-switches to next available
 * Remembers user's device preferences for future calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface DevicePreference {
  audioInputId: string | null;
  audioOutputId: string | null;
  videoInputId: string | null;
  lastUpdated: number;
}

interface UseDeviceFallbackProps {
  localStream: MediaStream | null;
  onDeviceChange?: (deviceInfo: { type: 'audio' | 'video'; deviceId: string; label: string }) => void;
  enabled?: boolean;
}

const STORAGE_KEY = 'tqc-device-preferences';

export function useDeviceFallback({
  localStream,
  onDeviceChange,
  enabled = true
}: UseDeviceFallbackProps) {
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentAudioDevice, setCurrentAudioDevice] = useState<string | null>(null);
  const [currentVideoDevice, setCurrentVideoDevice] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [failedDevices, setFailedDevices] = useState<Set<string>>(new Set());
  
  const streamRef = useRef<MediaStream | null>(null);
  const lastHealthCheckRef = useRef<number>(Date.now());

  // Load saved preferences
  const loadPreferences = useCallback((): DevicePreference | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  // Save preferences
  const savePreferences = useCallback((audioId: string | null, videoId: string | null, audioOutputId?: string | null) => {
    try {
      const prefs: DevicePreference = {
        audioInputId: audioId,
        audioOutputId: audioOutputId || null,
        videoInputId: videoId,
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (_e) {
      console.warn('[DeviceFallback] Failed to save preferences:', e);
    }
  }, []);

  // Enumerate available devices
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices);
      return devices;
    } catch (_e) {
      console.error('[DeviceFallback] Failed to enumerate devices:', e);
      return [];
    }
  }, []);

  // Get next available device of type
  const getNextAvailableDevice = useCallback((
    type: 'audioinput' | 'videoinput',
    excludeIds: Set<string>
  ): MediaDeviceInfo | null => {
    const devices = availableDevices.filter(
      d => d.kind === type && d.deviceId && !excludeIds.has(d.deviceId)
    );
    return devices[0] || null;
  }, [availableDevices]);

  // Switch to a new device
  const switchToDevice = useCallback(async (
    type: 'audio' | 'video',
    deviceId: string
  ): Promise<MediaStream | null> => {
    if (!streamRef.current) return null;

    try {
      const constraints: MediaStreamConstraints = {};
      
      if (type === 'audio') {
        constraints.audio = { deviceId: { exact: deviceId } };
        constraints.video = false;
      } else {
        constraints.video = { deviceId: { exact: deviceId } };
        constraints.audio = false;
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = newStream.getTracks()[0];

      if (!newTrack) {
        throw new Error('No track obtained');
      }

      // Replace the track in the current stream
      const oldTracks = type === 'audio' 
        ? streamRef.current.getAudioTracks() 
        : streamRef.current.getVideoTracks();

      oldTracks.forEach(track => {
        streamRef.current!.removeTrack(track);
        track.stop();
      });

      streamRef.current.addTrack(newTrack);

      // Update state
      if (type === 'audio') {
        setCurrentAudioDevice(deviceId);
      } else {
        setCurrentVideoDevice(deviceId);
      }

      // Save preferences
      savePreferences(
        type === 'audio' ? deviceId : currentAudioDevice,
        type === 'video' ? deviceId : currentVideoDevice
      );

      // Find device label for callback
      const deviceInfo = availableDevices.find(d => d.deviceId === deviceId);
      onDeviceChange?.({
        type,
        deviceId,
        label: deviceInfo?.label || `${type} device`
      });

      console.log(`[DeviceFallback] ✅ Switched ${type} to:`, deviceInfo?.label || deviceId);
      return streamRef.current;
    } catch (_e) {
      console.error(`[DeviceFallback] Failed to switch ${type} device:`, e);
      setFailedDevices(prev => new Set(prev).add(deviceId));
      return null;
    }
  }, [availableDevices, currentAudioDevice, currentVideoDevice, savePreferences, onDeviceChange]);

  // Handle device failure - attempt fallback
  const handleDeviceFailure = useCallback(async (type: 'audio' | 'video') => {
    if (isRecovering) return;

    setIsRecovering(true);
    console.log(`[DeviceFallback] 🔄 Attempting ${type} device recovery...`);

    const deviceKind = type === 'audio' ? 'audioinput' : 'videoinput';
    const nextDevice = getNextAvailableDevice(deviceKind as 'audioinput' | 'videoinput', failedDevices);

    if (nextDevice) {
      toast.warning(`${type === 'audio' ? 'Microphone' : 'Camera'} disconnected`, {
        description: `Switching to ${nextDevice.label || 'backup device'}...`,
        duration: 3000
      });

      const result = await switchToDevice(type, nextDevice.deviceId);
      
      if (result) {
        toast.success(`Switched to ${nextDevice.label || 'backup device'}`, {
          duration: 3000
        });
      } else {
        toast.error(`No available ${type === 'audio' ? 'microphones' : 'cameras'}`, {
          description: 'Please check your device connections'
        });
      }
    } else {
      toast.error(`No backup ${type === 'audio' ? 'microphones' : 'cameras'} available`, {
        description: 'All devices have failed or are disconnected'
      });
    }

    setIsRecovering(false);
  }, [isRecovering, getNextAvailableDevice, failedDevices, switchToDevice]);

  // Monitor track health
  const checkTrackHealth = useCallback(() => {
    if (!streamRef.current) return;

    const audioTracks = streamRef.current.getAudioTracks();
    const videoTracks = streamRef.current.getVideoTracks();

    // Check audio track
    audioTracks.forEach(track => {
      if (track.readyState === 'ended' || track.muted) {
        console.warn('[DeviceFallback] ⚠️ Audio track unhealthy:', track.readyState, 'muted:', track.muted);
        if (track.readyState === 'ended') {
          handleDeviceFailure('audio');
        }
      }
    });

    // Check video track
    videoTracks.forEach(track => {
      if (track.readyState === 'ended') {
        console.warn('[DeviceFallback] ⚠️ Video track ended');
        handleDeviceFailure('video');
      }
    });

    lastHealthCheckRef.current = Date.now();
  }, [handleDeviceFailure]);

  // Setup track ended listeners
  useEffect(() => {
    streamRef.current = localStream;

    if (!localStream || !enabled) return;

    const handleAudioEnded = () => {
      console.log('[DeviceFallback] 🎙️ Audio track ended event');
      handleDeviceFailure('audio');
    };

    const handleVideoEnded = () => {
      console.log('[DeviceFallback] 📹 Video track ended event');
      handleDeviceFailure('video');
    };

    // Track current device IDs
    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];

    if (audioTrack) {
      audioTrack.addEventListener('ended', handleAudioEnded);
      const settings = audioTrack.getSettings();
      setCurrentAudioDevice(settings.deviceId || null);
    }

    if (videoTrack) {
      videoTrack.addEventListener('ended', handleVideoEnded);
      const settings = videoTrack.getSettings();
      setCurrentVideoDevice(settings.deviceId || null);
    }

    return () => {
      if (audioTrack) {
        audioTrack.removeEventListener('ended', handleAudioEnded);
      }
      if (videoTrack) {
        videoTrack.removeEventListener('ended', handleVideoEnded);
      }
    };
  }, [localStream, enabled, handleDeviceFailure]);

  // Listen for device changes (plug/unplug)
  useEffect(() => {
    if (!enabled) return;

    const handleDeviceChange = async () => {
      console.log('[DeviceFallback] 🔌 Device change detected');
      const devices = await refreshDevices();

      // Check if current devices still exist
      if (currentAudioDevice) {
        const audioExists = devices.some(
          d => d.kind === 'audioinput' && d.deviceId === currentAudioDevice
        );
        if (!audioExists) {
          console.log('[DeviceFallback] Current audio device disconnected');
          handleDeviceFailure('audio');
        }
      }

      if (currentVideoDevice) {
        const videoExists = devices.some(
          d => d.kind === 'videoinput' && d.deviceId === currentVideoDevice
        );
        if (!videoExists) {
          console.log('[DeviceFallback] Current video device disconnected');
          handleDeviceFailure('video');
        }
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    // Initial device enumeration
    refreshDevices();

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enabled, currentAudioDevice, currentVideoDevice, refreshDevices, handleDeviceFailure]);

  // Periodic health check
  useEffect(() => {
    if (!enabled || !localStream) return;

    const interval = setInterval(checkTrackHealth, 5000);
    return () => clearInterval(interval);
  }, [enabled, localStream, checkTrackHealth]);

  // Get preferred device based on saved preferences
  const getPreferredDevice = useCallback((type: 'audioinput' | 'videoinput'): string | null => {
    const prefs = loadPreferences();
    if (!prefs) return null;

    if (type === 'audioinput') return prefs.audioInputId;
    if (type === 'videoinput') return prefs.videoInputId;
    return null;
  }, [loadPreferences]);

  return {
    availableDevices,
    currentAudioDevice,
    currentVideoDevice,
    isRecovering,
    failedDevices,
    switchToDevice,
    refreshDevices,
    getPreferredDevice,
    savePreferences,
    // Categorized devices
    audioInputDevices: availableDevices.filter(d => d.kind === 'audioinput'),
    audioOutputDevices: availableDevices.filter(d => d.kind === 'audiooutput'),
    videoInputDevices: availableDevices.filter(d => d.kind === 'videoinput')
  };
}
