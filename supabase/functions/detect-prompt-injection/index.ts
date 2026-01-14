import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

// Adversarial patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  { pattern: /ignore\s*(all\s*|previous\s*|above\s*|prior\s*)?instructions/i, name: 'ignore_instructions', threat: 'critical', block: true },
  { pattern: /act\s+as|pretend\s+(to\s+be|you\s+are)|you\s+are\s+now|from\s+now\s+on/i, name: 'role_hijacking', threat: 'high', block: false },
  { pattern: /system:|<system>|<\/system>|\[system\]/i, name: 'system_prompt_injection', threat: 'critical', block: true },
  { pattern: /reveal\s+(your\s+|the\s+)?prompt|show\s+(your\s+|the\s+)?instructions|what\s+are\s+your\s+instructions/i, name: 'prompt_extraction', threat: 'high', block: false },
  { pattern: /jailbreak|dan\s+mode|developer\s+mode|unrestricted\s+mode/i, name: 'jailbreak_attempt', threat: 'critical', block: true },
  { pattern: /\$\{|%\{|\{\{|<%|<\?|exec\(|eval\(/i, name: 'code_injection', threat: 'critical', block: true },
  { pattern: /sudo|admin\s+mode|root\s+access|override\s+all|bypass\s+security/i, name: 'privilege_escalation', threat: 'medium', block: false },
  { pattern: /forget\s+everything|disregard\s+all|new\s+instructions/i, name: 'memory_manipulation', threat: 'high', block: true },
  { pattern: /translate\s+to\s+.*:\s*ignore|respond\s+in\s+.*:\s*forget/i, name: 'language_bypass', threat: 'high', block: true },
  { pattern: /base64\s+decode|hex\s+decode|rot13/i, name: 'encoding_bypass', threat: 'medium', block: false },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId, ipAddress, userAgent } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Detect patterns
    const detectedPatterns: string[] = [];
    let maxThreat = 'low';
    let shouldBlock = false;
    const threatLevels = ['low', 'medium', 'high', 'critical'];

    for (const { pattern, name, threat, block } of INJECTION_PATTERNS) {
      if (pattern.test(query)) {
        detectedPatterns.push(name);
        if (threatLevels.indexOf(threat) > threatLevels.indexOf(maxThreat)) {
          maxThreat = threat;
        }
        if (block) shouldBlock = true;
      }
    }

    // Log if any patterns detected
    if (detectedPatterns.length > 0) {
      await supabase.from('adversarial_query_log').insert({
        user_id: userId || null,
        query_text: query.substring(0, 10000), // Limit stored query length
        detected_patterns: detectedPatterns,
        threat_level: maxThreat,
        blocked: shouldBlock,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata: { patterns_count: detectedPatterns.length }
      });
    }

    return new Response(JSON.stringify({
      safe: !shouldBlock,
      threat_level: maxThreat,
      detected_patterns: detectedPatterns,
      blocked: shouldBlock,
      message: shouldBlock 
        ? 'Query blocked due to detected prompt injection attempt' 
        : detectedPatterns.length > 0 
          ? 'Query allowed with warnings' 
          : 'Query passed security check'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Prompt injection detection error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message, safe: true }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
