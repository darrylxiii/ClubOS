import { logger } from "@/lib/logger";

/**
 * Centralized WebRTC Configuration
 * 
 * This utility manages ICE server configuration for both Meeting Rooms and Live Hub.
 * It prioritizes paid/private TURN servers via environment variables for production reliability,
 * falling back to free community servers for development.
 */

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

        // OpenRelay TURN servers
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
        }
    ];
};

export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
    iceServers: getIceServers(),
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 10
};
