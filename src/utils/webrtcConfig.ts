import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized WebRTC Configuration
 * 
 * This utility manages ICE server configuration for both Meeting Rooms and Live Hub.
 * It prioritizes paid/private TURN servers via environment variables for production reliability,
 * falling back to free community servers for development.
 * 
 * Supports dynamic TURN credential fetching from Twilio for enterprise-grade reliability.
 */

export interface TURNServerHealth {
  isConfigured: boolean;
  isPaidServer: boolean;
  servers: number;
  lastValidated: Date | null;
  validationErrors: string[];
}

let cachedHealth: TURNServerHealth | null = null;

/**
 * Validates TURN server configuration and returns health status
 */
export const validateTURNConfig = async (): Promise<TURNServerHealth> => {
  const envUrls = import.meta.env.VITE_TURN_URLS;
  const envUsername = import.meta.env.VITE_TURN_USERNAME;
  const envCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const health: TURNServerHealth = {
    isConfigured: false,
    isPaidServer: false,
    servers: 0,
    lastValidated: new Date(),
    validationErrors: []
  };

  if (envUrls && envUsername && envCredential) {
    health.isConfigured = true;
    health.isPaidServer = true;
    
    const urls = envUrls.split(',').map((url: string) => url.trim());
    health.servers = urls.length;

    // Validate URL format
    for (const url of urls) {
      if (!url.startsWith('turn:') && !url.startsWith('turns:')) {
        health.validationErrors.push(`Invalid TURN URL format: ${url}`);
      }
    }

    if (health.validationErrors.length === 0) {
      logger.info('[WebRTC Config] ✅ Production TURN servers validated', {
        serverCount: urls.length,
        urls: urls.map(u => u.split('@')[1] || u) // Hide credentials in logs
      });
    }
  } else {
    health.isConfigured = true;
    health.isPaidServer = false;
    health.servers = 3; // OpenRelay fallback
    health.validationErrors.push('Using free community TURN servers - not recommended for production');
  }

  cachedHealth = health;
  return health;
};

/**
 * Get cached TURN health status (for UI display)
 */
export const getTURNHealth = (): TURNServerHealth | null => cachedHealth;

export const getIceServers = (): RTCIceServer[] => {
  // 1. Check for paid/private TURN configuration from Env Vars
  const envUrls = import.meta.env.VITE_TURN_URLS;
  const envUsername = import.meta.env.VITE_TURN_USERNAME;
  const envCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (envUrls && envUsername && envCredential) {
    logger.info('[WebRTC Config] 🔒 Loading secure TURN servers from environment configuration');
    return [
      // Always include Google STUN for fast NAT discovery
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },

      // Paid TURN servers
      {
        urls: envUrls.split(',').map((url: string) => url.trim()),
        username: envUsername,
        credential: envCredential
      }
    ];
  }

  // 2. Fallback: Free OpenRelay Servers (Development / Low Scale)
  logger.warn('[WebRTC Config] ⚠️ Using free community TURN servers (OpenRelay). Not recommended for production scaling.');

  return [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },

    // OpenRelay TURN servers (free tier)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    // Backup Metered TURN (free tier)
    {
      urls: 'turn:a.relay.metered.ca:80',
      username: 'e2d1f0c6a4b2e8d9f3c5a7b0',
      credential: 'wKTpIwxj7tRY+1aV'
    },
    {
      urls: 'turn:a.relay.metered.ca:443',
      username: 'e2d1f0c6a4b2e8d9f3c5a7b0',
      credential: 'wKTpIwxj7tRY+1aV'
    }
  ];
};

// Cache for dynamic TURN credentials
let cachedTURNCredentials: {
  iceServers: RTCIceServer[];
  expiresAt: Date;
  provider: string;
} | null = null;

/**
 * Fetch dynamic TURN credentials from Twilio via edge function
 * Falls back to static configuration if fetch fails
 */
export const fetchDynamicTURNCredentials = async (): Promise<RTCIceServer[]> => {
  // Return cached credentials if still valid (with 5 min buffer)
  if (cachedTURNCredentials && cachedTURNCredentials.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    logger.debug('[WebRTC] 🔄 Using cached TURN credentials', {
      provider: cachedTURNCredentials.provider,
      expiresAt: cachedTURNCredentials.expiresAt.toISOString()
    });
    return cachedTURNCredentials.iceServers;
  }

  try {
    logger.info('[WebRTC] 📡 Fetching dynamic TURN credentials...');
    
    const { data, error } = await supabase.functions.invoke('turn-credentials');
    
    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    if (data && data.iceServers && Array.isArray(data.iceServers)) {
      cachedTURNCredentials = {
        iceServers: data.iceServers,
        expiresAt: new Date(data.expiresAt || Date.now() + 3600 * 1000),
        provider: data.provider || 'unknown'
      };
      
      logger.info('[WebRTC] ✅ Fetched dynamic TURN credentials', {
        provider: data.provider,
        servers: data.iceServers.length,
        expiresAt: data.expiresAt
      });
      
      return data.iceServers;
    }
    
    throw new Error('No ICE servers in response');
  } catch (error) {
    logger.warn('[WebRTC] ⚠️ Failed to fetch dynamic TURN credentials, using fallback:', error);
    return getIceServers(); // Fallback to static config
  }
};

/**
 * Get RTCConfiguration with dynamic TURN credentials
 * Attempts to fetch enterprise-grade credentials, falls back to static config
 */
export const getDynamicRTCConfig = async (options?: {
  forceRelay?: boolean;
  lowBandwidth?: boolean;
  enableE2EE?: boolean;
}): Promise<RTCConfiguration> => {
  const iceServers = await fetchDynamicTURNCredentials();
  
  const config: RTCConfiguration = {
    iceServers,
    iceTransportPolicy: options?.forceRelay ? 'relay' : 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: options?.lowBandwidth ? 3 : 10
  };
  
  if (options?.enableE2EE && supportsE2EEncryption()) {
    // @ts-ignore - encodedInsertableStreams is not in TypeScript types yet
    config.encodedInsertableStreams = true;
    logger.info('[WebRTC Config] 🔒 E2EE enabled with dynamic TURN credentials');
  }
  
  return config;
};

export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: getIceServers(),
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 10
};

/**
 * Check if browser supports Insertable Streams for E2E encryption
 */
export const supportsE2EEncryption = (): boolean => {
  return typeof RTCRtpSender !== 'undefined' && 
    'createEncodedStreams' in RTCRtpSender.prototype;
};

/**
 * Get RTCConfiguration with E2E encryption support
 * Requires encodedInsertableStreams for Insertable Streams API
 */
export const getE2EEConfig = (): RTCConfiguration => {
  const config = { ...DEFAULT_RTC_CONFIG };
  
  // Enable encoded insertable streams for E2EE
  // This is required for the Insertable Streams API
  // @ts-ignore - encodedInsertableStreams is not in TypeScript types yet
  config.encodedInsertableStreams = true;
  
  logger.info('[WebRTC Config] 🔒 E2EE configuration enabled with Insertable Streams');
  
  return config;
};

/**
 * Get RTCConfiguration with connection-specific optimizations
 */
export const getRTCConfigForConnection = (options?: {
  forceRelay?: boolean;
  lowBandwidth?: boolean;
  enableE2EE?: boolean;
}): RTCConfiguration => {
  // Start with E2EE config if requested, otherwise default
  const config = options?.enableE2EE ? getE2EEConfig() : { ...DEFAULT_RTC_CONFIG };
  
  if (options?.forceRelay) {
    // Force TURN relay for users behind restrictive firewalls
    config.iceTransportPolicy = 'relay';
  }

  if (options?.lowBandwidth) {
    // Reduce ICE candidate pool for faster connection on slow networks
    config.iceCandidatePoolSize = 3;
  }

  return config;
};
