# TURN Server Setup for Production

## Overview

TURN (Traversal Using Relays around NAT) servers are essential for enterprise video calling. They enable WebRTC connections when direct peer-to-peer (P2P) connections fail due to firewalls, symmetric NATs, or restrictive corporate networks.

**Without TURN servers:** ~10-30% of connections will fail in enterprise environments.

## When TURN is Needed

TURN servers are required when:
- Participants are behind symmetric NATs
- Corporate firewalls block UDP traffic
- VPNs or restrictive network policies are in use
- Mobile networks with carrier-grade NAT

## Recommended Providers

### 1. Twilio Network Traversal (Recommended)
- **Cost:** Pay-per-use, starts ~$0.40/GB
- **Reliability:** 99.99% uptime SLA
- **Global:** 8+ regions worldwide
- **Setup:** API-based credential generation

```bash
# Add secrets
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

### 2. Cloudflare TURN
- **Cost:** Included with Cloudflare Stream
- **Reliability:** Enterprise-grade
- **Global:** 275+ data centers
- **Setup:** Dashboard configuration

### 3. Metered.ca
- **Cost:** From $0.10/GB
- **Reliability:** Good for mid-scale
- **Global:** 12 regions
- **Setup:** Static credentials or API

### 4. Self-Hosted (coturn)
- **Cost:** Server costs only
- **Reliability:** Depends on infrastructure
- **Complexity:** High (requires DevOps)
- **Setup:** Manual configuration

## Configuration

### Environment Variables

Add these to your Supabase secrets or environment:

```bash
# TURN Server URLs (comma-separated for multiple servers)
VITE_TURN_URLS="turn:turn.example.com:3478,turns:turn.example.com:5349"

# Static credentials (for testing/development)
VITE_TURN_USERNAME="your_username"
VITE_TURN_CREDENTIAL="your_credential"

# Or use Twilio for dynamic credentials
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
```

### Dynamic Credential Generation (Twilio)

For production, generate short-lived credentials:

```typescript
// supabase/functions/turn-credentials/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const data = await response.json();
  
  return new Response(
    JSON.stringify({
      iceServers: data.ice_servers
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

### WebRTC Configuration

Update `src/utils/webrtcConfig.ts`:

```typescript
export async function getRTCConfig(): Promise<RTCConfiguration> {
  // Try to get dynamic credentials
  try {
    const { data } = await supabase.functions.invoke('turn-credentials');
    if (data?.iceServers) {
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          ...data.iceServers
        ],
        iceCandidatePoolSize: 10,
      };
    }
  } catch (error) {
    console.warn('Failed to get TURN credentials, using fallback');
  }

  // Fallback to static config
  const turnUrls = import.meta.env.VITE_TURN_URLS?.split(',') || [];
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;

  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      ...(turnUrls.length && username && credential
        ? [{ urls: turnUrls, username, credential }]
        : [])
    ],
    iceCandidatePoolSize: 10,
  };
}
```

## Testing TURN Configuration

### 1. Browser Test

Use the built-in PreCallDiagnostics component or:

```javascript
// In browser console
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'turn:your-turn-server:3478', username: 'user', credential: 'pass' }
  ]
});

pc.createOffer()
  .then(offer => pc.setLocalDescription(offer))
  .then(() => {
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('Candidate type:', e.candidate.type);
        // Look for 'relay' type - that's TURN
      }
    };
  });
```

### 2. Trickle ICE Test

Visit [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/) and enter your TURN server details.

### 3. Connection Quality Monitor

The `useMeetingQualityMonitor` hook tracks TURN usage:

```typescript
// In your component
const { stats } = useMeetingQualityMonitor({ meetingId, userId, peerConnections });

// stats.turnUsed will be true if relay is being used
```

## Security Best Practices

1. **Never expose static credentials in frontend code** - Use edge functions for credential generation
2. **Short-lived credentials** - Twilio tokens expire after 24 hours by default
3. **Rate limiting** - Limit credential requests to prevent abuse
4. **IP allowlisting** - If possible, restrict TURN server access by IP
5. **Monitoring** - Track TURN usage to detect anomalies

## Cost Estimation

| Provider | Rate | 10K minutes/month | 100K minutes/month |
|----------|------|-------------------|-------------------|
| Twilio | $0.40/GB | ~$40-80 | ~$400-800 |
| Metered | $0.10/GB | ~$10-20 | ~$100-200 |
| Cloudflare | Included | $0* | $0* |
| Self-hosted | ~$50/server | ~$50 | ~$100-200 |

*With Cloudflare Stream subscription

## Troubleshooting

### Connection Still Failing

1. Check if TURN credentials are correct
2. Verify UDP ports 3478, 5349 are not blocked
3. Try TURNS (TLS) on port 443 if UDP is blocked
4. Check credential expiration

### High Latency via TURN

1. Use geographically close TURN servers
2. Consider multiple regional TURN servers
3. Monitor `latency_ms` in `meeting_connection_stats`

### Bandwidth Issues

1. TURN adds ~10-20% overhead
2. Consider adaptive bitrate settings
3. Monitor `bitrate_kbps` in connection stats
