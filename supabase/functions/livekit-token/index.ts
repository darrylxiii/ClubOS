/**
 * LiveKit Room Token Generator
 * Creates access tokens for SFU-based video meetings (10+ participants)
 * With granular error handling to prevent crashes
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Log immediately to confirm function is receiving requests
  console.log('[LiveKit] 📥 Request received:', req.method, new Date().toISOString());
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[LiveKit] ✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 1: Load and validate environment variables
    console.log('[LiveKit] 🔧 Step 1: Loading secrets...');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    console.log('[LiveKit] 🔧 Secrets status:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      hasApiSecret: !!apiSecret,
      apiSecretLength: apiSecret?.length || 0,
      hasUrl: !!livekitUrl,
      urlValue: livekitUrl ? livekitUrl.slice(0, 40) + '...' : 'missing'
    });

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('[LiveKit] ❌ Missing required environment variables');
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
    console.log('[LiveKit] 📄 Step 2: Parsing request body...');
    let body: TokenRequest;
    try {
      const rawBody = await req.text();
      console.log('[LiveKit] 📄 Raw body length:', rawBody.length);
      body = JSON.parse(rawBody);
      console.log('[LiveKit] 📄 Body parsed successfully:', Object.keys(body));
    } catch (parseError) {
      console.error('[LiveKit] ❌ Body parse failed:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body - must be valid JSON',
        details: parseError instanceof Error ? parseError.message : 'Parse error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Validate required fields
    console.log('[LiveKit] ✓ Step 3: Validating fields...');
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
      console.error('[LiveKit] ❌ Missing required fields:', { 
        hasRoomName: !!roomName, 
        hasParticipantName: !!participantName, 
        hasParticipantId: !!participantId 
      });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: roomName, participantName, participantId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Build JWT claims
    console.log('[LiveKit] 🔑 Step 4: Building JWT for:', participantName, 'in room:', roomName);
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
    console.log('[LiveKit] 🔐 Step 5: Creating JWT...');
    let token: string;
    try {
      token = await createJWT(claims, apiSecret);
      console.log('[LiveKit] ✅ JWT created successfully, length:', token.length);
    } catch (jwtError) {
      console.error('[LiveKit] ❌ JWT creation failed:', jwtError);
      return new Response(JSON.stringify({ 
        error: 'Token generation failed',
        details: jwtError instanceof Error ? jwtError.message : 'JWT error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 6: Return successful response
    console.log('[LiveKit] 🎉 Step 6: Returning token for:', participantName);
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
    // Catch-all for any unhandled errors
    console.error('[LiveKit] ❌ Unhandled error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown server error',
      type: 'unhandled'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
