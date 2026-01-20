/**
 * Dynamic TURN Credentials Edge Function
 * Fetches time-limited TURN credentials from Twilio for enterprise video calls
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioToken {
  username: string;
  password: string;
  ttl: number;
  ice_servers: Array<{
    url?: string;
    urls?: string | string[];
    username?: string;
    credential?: string;
  }>;
}

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface TURNCredentialsResponse {
  iceServers: IceServer[];
  ttl: number;
  provider: 'twilio' | 'fallback';
  expiresAt: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      console.warn('[TURN] Twilio credentials not configured, using fallback');
      return new Response(JSON.stringify({
        iceServers: getFallbackServers(),
        ttl: 3600,
        provider: 'fallback',
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Request TURN credentials from Twilio
    const credentials = btoa(`${accountSid}:${authToken}`);
    const ttl = 3600; // 1 hour validity

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `Ttl=${ttl}`,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TURN] Twilio API error:', response.status, errorText);
      throw new Error(`Twilio API error: ${response.status}`);
    }

    const twilioData: TwilioToken = await response.json();
    console.log('[TURN] ✅ Twilio credentials fetched, servers:', twilioData.ice_servers?.length);

    // Convert Twilio format to WebRTC ICE servers format
    const iceServers: IceServer[] = [
      // Always include Google STUN for fast NAT discovery
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // Add Twilio TURN servers
    for (const server of twilioData.ice_servers || []) {
      const urls = server.urls || server.url;
      if (urls) {
        iceServers.push({
          urls: Array.isArray(urls) ? urls : [urls],
          username: server.username || twilioData.username,
          credential: server.credential || twilioData.password,
        });
      }
    }

    const result: TURNCredentialsResponse = {
      iceServers,
      ttl: twilioData.ttl || ttl,
      provider: 'twilio',
      expiresAt: new Date(Date.now() + (twilioData.ttl || ttl) * 1000).toISOString()
    };

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${Math.floor(ttl * 0.9)}` // Cache for 90% of TTL
      },
    });

  } catch (error) {
    console.error('[TURN] Error fetching credentials:', error);
    
    // Return fallback servers on error
    return new Response(JSON.stringify({
      iceServers: getFallbackServers(),
      ttl: 3600,
      provider: 'fallback',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getFallbackServers(): IceServer[] {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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
  ];
}
