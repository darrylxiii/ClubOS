# Meeting System Features Documentation

This document describes all the advanced meeting features available in The Quantum Club meeting system.

## Table of Contents

1. [Audio Processing](#audio-processing)
2. [Video Processing](#video-processing)
3. [Network Resilience](#network-resilience)
4. [AI Features](#ai-features)
5. [Performance Optimization](#performance-optimization)
6. [Feature Flags](#feature-flags)
7. [Browser Compatibility](#browser-compatibility)

---

## Audio Processing

### Noise Cancellation (RNNoise)
- **Hook:** `useRNNoise`
- **Description:** Real-time noise suppression using RNNoise algorithm
- **Settings:**
  - `enabled`: Boolean to enable/disable
  - `level`: 'low' | 'medium' | 'high'
- **Browser Support:** All modern browsers with WebAudio support

### Spatial Audio
- **Hook:** `useSpatialAudio`
- **Description:** 3D positional audio for immersive meeting experience
- **Settings:**
  - `enabled`: Boolean to enable/disable
  - `mode`: 'conference' | 'presentation'
- **Browser Support:** Chrome 66+, Firefox 63+, Safari 14.1+

### Adaptive VAD (Voice Activity Detection)
- **Hook:** `useAdaptiveVAD`
- **Description:** Intelligent voice detection that adapts to ambient noise
- **Features:**
  - Automatic threshold adjustment
  - Speaking probability estimation
  - Integration with transcription

### Audio Normalization
- **Hook:** `useAudioNormalization`
- **Description:** Levels audio volume across participants
- **Settings:**
  - `targetLevel`: Number (-20 to 0 dB)
  - `attackTime`: Number (ms)
  - `releaseTime`: Number (ms)

### Audio Ducking
- **Hook:** `useAudioDucking`
- **Description:** Automatically lowers background audio when speaking
- **Use Cases:**
  - Screen sharing with audio
  - Presentation mode

### Echo Detection & Cancellation
- **Hook:** `useEchoDetection`
- **Description:** Detects and reduces echo in audio streams

---

## Video Processing

### Low-Light Enhancement
- **Hook:** `useLowLightEnhancement`
- **Description:** Improves video quality in poor lighting conditions
- **Settings:**
  - `enabled`: Boolean
  - `intensity`: Number (0-1)
- **Requirements:** WebGL 2.0 support

### SVC (Scalable Video Coding)
- **Hook:** `useSVC`
- **Description:** Adaptive bitrate video with temporal/spatial layers
- **Features:**
  - Multiple quality layers
  - Bandwidth-aware switching
  - Graceful degradation

### Smart Bandwidth Allocation
- **Hook:** `useSmartBandwidth`
- **Description:** Prioritizes video quality based on speaker/screen share
- **Features:**
  - Active speaker boost
  - Screen share priority
  - Grid optimization

### HD Screen Share
- **Hook:** `useHDScreenShare`
- **Description:** High-quality screen sharing with optimization
- **Features:**
  - 1080p/4K capture
  - Frame rate optimization for content type
  - Tab audio capture

---

## Network Resilience

### Quality Recovery
- **Hook:** `useQualityRecovery`
- **Description:** Automatic quality restoration after network issues
- **Features:**
  - Hysteresis to prevent oscillation
  - Configurable recovery thresholds
  - Step-wise quality improvement

### Network Resilience Monitoring
- **Hook:** `useNetworkResilience`
- **Description:** Comprehensive network health monitoring
- **Metrics:**
  - RTT (Round Trip Time)
  - Packet loss
  - Jitter
  - Available bandwidth

### ICE Restart
- **Hook:** `useICERestart`
- **Description:** Automatic ICE candidate refresh on connection issues
- **Features:**
  - Configurable restart thresholds
  - Automatic triggering on quality degradation
  - Manual restart option

### State Preservation
- **Hook:** `useStatePreservation`
- **Description:** Saves and restores meeting state across reconnections
- **Preserved State:**
  - Chat messages
  - Reactions
  - Settings
  - Participant preferences

---

## AI Features

### Live Transcription
- **Hook:** `useAITranscription`
- **Description:** Real-time speech-to-text transcription
- **Features:**
  - Multi-language support
  - Speaker identification
  - Export to SRT/VTT/TXT
- **Browser Support:** Chrome 33+, Edge 79+

### Gesture Recognition
- **Hook:** `useGestureRecognition`
- **Description:** Hand gesture detection for reactions
- **Supported Gestures:**
  - Thumbs up/down
  - Wave
  - Raised hand
  - Clap
  - Peace sign
- **Requirements:** Camera access, adequate lighting

### Meeting Analytics
- **Hook:** `useMeetingAnalytics`
- **Description:** Engagement and participation tracking
- **Metrics:**
  - Speaking time distribution
  - Participation rate
  - Engagement scores
  - Event timeline

### Auto Highlights
- **Hook:** `useAutoHighlight`
- **Description:** Automatic detection of key moments
- **Detected Types:**
  - Action items
  - Decisions
  - Questions
  - Key points
- **Export:** JSON, Markdown

---

## Performance Optimization

### Resource Optimizer
- **Hook:** `useResourceOptimizer`
- **Description:** Automatic resource management based on device capabilities
- **Features:**
  - CPU usage monitoring
  - Memory management
  - Battery awareness
  - Thermal throttling response

### Memory Manager
- **Hook:** `useMemoryManager`
- **Description:** Proactive memory management
- **Features:**
  - Memory leak prevention
  - Garbage collection optimization
  - Component cleanup

### Performance Monitor
- **Hook:** `usePerformanceMonitor`
- **Description:** Real-time performance metrics
- **Metrics:**
  - FPS
  - Frame timing
  - Jank detection
  - Memory usage trends

---

## Feature Flags

All features can be controlled via the `useMeetingFeatureSettings` hook:

```typescript
const settings = {
  noiseCancel: {
    enabled: true,
    level: 'medium'
  },
  lowLight: {
    enabled: true,
    intensity: 0.5
  },
  spatialAudio: {
    enabled: false,
    mode: 'conference'
  },
  transcription: {
    enabled: true,
    language: 'en'
  },
  gestures: {
    enabled: false,
    sensitivity: 0.8
  },
  analytics: {
    enabled: true,
    trackEngagement: true
  }
};
```

### Default Values

| Feature | Default | Notes |
|---------|---------|-------|
| Noise Cancellation | Enabled (medium) | Auto-adjusts based on environment |
| Low-Light Enhancement | Enabled | Requires WebGL |
| Spatial Audio | Disabled | Higher CPU usage |
| Transcription | Disabled | Chrome/Edge only |
| Gesture Recognition | Disabled | Requires consent |
| Analytics | Enabled | Host only |
| SVC | Enabled | VP9/AV1 required |
| State Preservation | Enabled | LocalStorage |

---

## Browser Compatibility

### Full Support
- Chrome 90+
- Edge 90+
- Firefox 90+

### Partial Support
- Safari 14.1+
  - No Web Speech API (transcription)
  - Limited SVC support

### Unsupported Features by Browser

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Transcription | ✅ | ❌ | ❌ | ✅ |
| SVC (VP9) | ✅ | ✅ | ❌ | ✅ |
| Spatial Audio | ✅ | ✅ | ⚠️ | ✅ |
| Screen Audio | ✅ | ❌ | ❌ | ✅ |

---

## Usage Examples

### Basic Meeting Setup

```typescript
import { useMasterMeeting } from '@/hooks/useMasterMeeting';

function MeetingRoom() {
  const meeting = useMasterMeeting({
    channelId: 'meeting-123',
    userId: 'user-456',
    userName: 'John Doe',
    autoJoin: true,
    enableAllFeatures: true
  });

  return (
    <div>
      <video ref={meeting.voice.localVideoRef} />
      <button onClick={meeting.toggleMute}>
        {meeting.voice.isMuted ? 'Unmute' : 'Mute'}
      </button>
    </div>
  );
}
```

### Enabling Specific Features

```typescript
// Enable noise cancellation
meeting.settings.update('noiseCancel', { enabled: true, level: 'high' });

// Start transcription
meeting.transcription.startTranscription(meeting.voice.localStream);

// Enable gesture detection
meeting.gestures.enable(videoElement);
```

### Monitoring Performance

```typescript
const { performance, resources } = meeting;

// Check for alerts
if (performance.alerts.length > 0) {
  console.warn('Performance issues detected:', performance.alerts);
}

// Check resource usage
if (resources.cpuUsage > 80) {
  // Consider disabling some features
  meeting.settings.toggle('lowLight', false);
}
```

---

## Troubleshooting

### Common Issues

1. **Transcription not working**
   - Check browser support (Chrome/Edge only)
   - Ensure microphone permission granted
   - Check language setting

2. **Poor video quality**
   - Check network bandwidth
   - Verify SVC is enabled
   - Check device CPU usage

3. **Audio echo**
   - Enable echo cancellation
   - Use headphones
   - Check for multiple audio sources

4. **High CPU usage**
   - Disable low-light enhancement
   - Reduce video quality
   - Disable gesture recognition

### Debug Mode

Enable debug logging:

```typescript
localStorage.setItem('meeting_debug', 'true');
```

---

## API Reference

See individual hook documentation for complete API details.
