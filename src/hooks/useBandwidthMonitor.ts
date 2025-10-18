import { useState, useEffect, useCallback } from 'react';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor';

interface BandwidthStats {
  quality: ConnectionQuality;
  bandwidth: number; // Mbps
  latency: number; // ms
  packetLoss: number; // percentage
  recommendedQuality: 'high' | 'medium' | 'low';
}

export function useBandwidthMonitor() {
  const [stats, setStats] = useState<BandwidthStats>({
    quality: 'excellent',
    bandwidth: 0,
    latency: 0,
    packetLoss: 0,
    recommendedQuality: 'high'
  });

  const measureBandwidth = useCallback(async () => {
    try {
      // Test latency
      const latencyStart = Date.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
      const latency = Date.now() - latencyStart;

      // Estimate bandwidth using performance API
      const connection = (navigator as any).connection;
      const bandwidth = connection?.downlink || 10; // Mbps

      // Simulate packet loss detection (in real impl, use WebRTC stats)
      const packetLoss = latency > 200 ? Math.random() * 5 : Math.random() * 1;

      // Determine quality
      let quality: ConnectionQuality;
      let recommendedQuality: 'high' | 'medium' | 'low';

      if (bandwidth > 5 && latency < 50 && packetLoss < 1) {
        quality = 'excellent';
        recommendedQuality = 'high';
      } else if (bandwidth > 2 && latency < 150 && packetLoss < 3) {
        quality = 'good';
        recommendedQuality = 'high';
      } else if (bandwidth > 1 && latency < 300 && packetLoss < 5) {
        quality = 'fair';
        recommendedQuality = 'medium';
      } else {
        quality = 'poor';
        recommendedQuality = 'low';
      }

      setStats({
        quality,
        bandwidth,
        latency,
        packetLoss,
        recommendedQuality
      });
    } catch (error) {
      console.error('Bandwidth monitoring error:', error);
    }
  }, []);

  useEffect(() => {
    // Initial measurement
    measureBandwidth();

    // Monitor every 5 seconds
    const interval = setInterval(measureBandwidth, 5000);

    return () => clearInterval(interval);
  }, [measureBandwidth]);

  const getVideoConstraints = useCallback(() => {
    switch (stats.recommendedQuality) {
      case 'high':
        return { width: 1280, height: 720, frameRate: 30 };
      case 'medium':
        return { width: 640, height: 480, frameRate: 24 };
      case 'low':
        return { width: 320, height: 240, frameRate: 15 };
    }
  }, [stats.recommendedQuality]);

  return {
    stats,
    measureBandwidth,
    getVideoConstraints
  };
}