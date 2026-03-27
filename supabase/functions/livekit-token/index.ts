/**
 * LiveKit Room Token Generator
 * Creates access tokens for SFU-based video meetings (10+ participants)
 * With granular error handling to prevent crashes
 */
import { createHandler } from '../_shared/handler.ts';

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

Deno.serve(createHandler(async (req, ctx) => {
    const { corsHeaders } = ctx;

    // Step 1: Load and validate environment variables
    console.log('[LiveKit] Step 1: Loading secrets...');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('[LiveKit] Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'LiveKit not configured - missing API credentials',
        configured: false,
        missing: {
          apiKey: !apiKey,
          apiSecret: !apiSecret,
          livekitUrl: !livekitUrl
        }
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Parse request body with explicit error handling
    let body: TokenRequest;
    try {
      const rawBody = await req.text();
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[LiveKit] Body parse failed:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid request body - must be valid JSON',
        details: parseError instanceof Error ? parseError.message : 'Parse error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Validate required fields
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

    // Step 4: Build JWT claims
    console.log('[LiveKit] Building JWT for:', participantName, 'in room:', roomName);
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

    // Step 5: Create JWT with explicit error handling
    let token: string;
    try {
      token = await createJWT(claims, apiSecret);
      console.log('[LiveKit] JWT created successfully, length:', token.length);
    } catch (jwtError) {
      console.error('[LiveKit] JWT creation failed:', jwtError);
      return new Response(JSON.stringify({
        error: 'Token generation failed',
        details: jwtError instanceof Error ? jwtError.message : 'JWT error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 6: Return successful response
    return new Response(JSON.stringify({
      token,
      url: livekitUrl,
      roomName,
      participantId,
      expiresAt: new Date(exp * 1000).toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}));

// JWT creation using Web Crypto API (Deno compatible)
async function createJWT(payload: Record<string, any>, secret: string): Promise<string> {
  console.log('[LiveKit] 🔐 createJWT: Starting...');
  
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const data = `${encodedHeader}.${encodedPayload}`;
  
  console.log('[LiveKit] 🔐 createJWT: Importing key...');
  // Import key for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  console.log('[LiveKit] 🔐 createJWT: Signing...');
  // Sign the data
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const encodedSignature = base64UrlEncode(signature);
  
  console.log('[LiveKit] 🔐 createJWT: Complete');
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
