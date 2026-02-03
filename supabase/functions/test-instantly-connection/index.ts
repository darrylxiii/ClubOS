import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check all possible env var names
    const checkedVars = ['INSTANTLY_API_KEY', 'InstantlyAPI', 'INSTANTLY_API'];
    const apiKey = Deno.env.get('INSTANTLY_API_KEY') 
      || Deno.env.get('InstantlyAPI')
      || Deno.env.get('INSTANTLY_API');
    
    // Get all env vars that contain 'instant' (case insensitive) for debugging
    const allEnvVars = Object.keys(Deno.env.toObject());
    const instantlyRelatedVars = allEnvVars.filter(k => 
      k.toLowerCase().includes('instant')
    );

    console.log('[test-instantly-connection] Checking for API key...');
    console.log('[test-instantly-connection] Checked vars:', checkedVars);
    console.log('[test-instantly-connection] Available instantly-related vars:', instantlyRelatedVars);
    
    if (!apiKey) {
      console.error('[test-instantly-connection] API key not found in any expected location');
      return new Response(JSON.stringify({
        connected: false,
        error: 'API key not found in environment',
        checked_vars: checkedVars,
        available_instantly_vars: instantlyRelatedVars,
        total_env_vars: allEnvVars.length,
        timestamp: new Date().toISOString(),
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Mask the key for logging
    const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`;
    console.log(`[test-instantly-connection] Found API key: ${maskedKey}`);

    // Test API call to /accounts/me
    const start = Date.now();
    const response = await fetch('https://api.instantly.ai/api/v2/accounts/me', {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });
    const latency = Date.now() - start;

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error(`[test-instantly-connection] API returned ${response.status}:`, responseData);
      return new Response(JSON.stringify({
        connected: false,
        error: `Instantly API returned ${response.status}`,
        api_response: responseData,
        latency_ms: latency,
        key_found: true,
        key_preview: maskedKey,
        timestamp: new Date().toISOString(),
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[test-instantly-connection] Successfully connected to Instantly API');

    return new Response(JSON.stringify({
      connected: true,
      workspace_name: responseData.workspace_name,
      workspace_id: responseData.workspace_id,
      email: responseData.email,
      name: responseData.name,
      latency_ms: latency,
      key_preview: maskedKey,
      timestamp: new Date().toISOString(),
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[test-instantly-connection] Error:', error);
    return new Response(JSON.stringify({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
