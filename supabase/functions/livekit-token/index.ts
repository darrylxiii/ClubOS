/**
 * LiveKit Room Token Generator
 * Creates access tokens for SFU-based video meetings (10+ participants)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

interface TokenRequest {
  roomName: string;
  participantName: string;
  participantId: string;
  isHost?: boolean;
  canPublish?: boolean;
  canSubscribe?: boolean;
  metadata?: Record<string, any>;
}

interface LiveKitGrant {
  roomJoin: boolean;
  room: string;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  hidden?: boolean;
  recorder?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('[LiveKit] Missing required environment variables');
      return new Response(JSON.stringify({ 
        error: 'LiveKit not configured',
        configured: false 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: TokenRequest = await req.json();
    const { 
      roomName, 
      participantName, 
      participantId,
      isHost = false,
      canPublish = true, 
      canSubscribe = true,
      metadata = {}
    } = body;

    if (!roomName || !participantName || !participantId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: roomName, participantName, participantId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create JWT token for LiveKit
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 6 * 60 * 60; // 6 hour expiry

    const videoGrant: LiveKitGrant = {
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
      canPublishData: true,
    };

    const claims = {
      iss: apiKey,
      sub: participantId,
      name: participantName,
      nbf: now,
      exp,
      video: videoGrant,
      metadata: JSON.stringify({
        ...metadata,
        isHost,
        joinedAt: new Date().toISOString()
      })
    };

    // Create JWT using Web Crypto API
    const token = await createJWT(claims, apiSecret);

    console.log('[LiveKit] ✅ Token generated for:', participantName, 'room:', roomName);

    return new Response(JSON.stringify({
      token,
      url: livekitUrl,
      roomName,
      participantId,
      expiresAt: new Date(exp * 1000).toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[LiveKit] Token generation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Token generation failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// JWT creation using Web Crypto API (Deno compatible)
async function createJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const data = `${encodedHeader}.${encodedPayload}`;
  
  // Import key for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the data
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const encodedSignature = base64UrlEncode(signature);
  
  return `${data}.${encodedSignature}`;
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  let base64: string;
  
  if (typeof input === 'string') {
    base64 = btoa(input);
  } else {
    const bytes = new Uint8Array(input);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
