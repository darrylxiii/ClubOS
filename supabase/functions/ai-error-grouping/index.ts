/**
 * AI-Powered Error Grouping Edge Function
 * Uses Lovable AI to semantically analyze and group errors
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { withTracing, traceLog, createChildSpan, endSpan } from "../_shared/edge-tracing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, traceparent',
};

interface ErrorReport {
  message: string;
  stack?: string;
  type?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorGroup {
  fingerprint: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedTitle: string;
  rootCause?: string;
  suggestedFix?: string;
  relatedErrors?: string[];
}

async function analyzeErrorWithAI(
  error: ErrorReport,
  existingGroups: string[]
): Promise<ErrorGroup> {
  const prompt = `Analyze this error and provide structured grouping information.

ERROR:
Message: ${error.message}
Stack: ${error.stack || 'No stack trace'}
Type: ${error.type || 'Unknown'}
URL: ${error.url || 'Unknown'}

EXISTING ERROR GROUPS (for deduplication):
${existingGroups.slice(0, 20).join('\n') || 'None'}

Respond with JSON only:
{
  "fingerprint": "unique_identifier_for_grouping",
  "category": "one of: network, runtime, syntax, type, auth, api, ui, database, unknown",
  "severity": "one of: low, medium, high, critical",
  "suggestedTitle": "short descriptive title",
  "rootCause": "brief explanation of likely cause",
  "suggestedFix": "brief fix suggestion",
  "matchesExisting": "fingerprint of existing group if this is a duplicate, or null"
}`;

  try {
    // Use Lovable AI Gateway (no external API key required)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured, using fallback grouping');
      return generateFallbackGrouping(error);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert error analyzer. Analyze errors and provide structured grouping information to reduce noise and improve error management. Always respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      // Don't throw for rate limits, just use fallback
      if (response.status === 429 || response.status === 402) {
        console.log('AI rate limited or credits exhausted, using fallback');
        return generateFallbackGrouping(error);
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      fingerprint: parsed.fingerprint || generateFallbackFingerprint(error),
      category: parsed.category || 'unknown',
      severity: parsed.severity || 'medium',
      suggestedTitle: parsed.suggestedTitle || error.message.slice(0, 100),
      rootCause: parsed.rootCause,
      suggestedFix: parsed.suggestedFix,
      relatedErrors: parsed.matchesExisting ? [parsed.matchesExisting] : undefined,
    };
  } catch (err) {
    console.error('AI analysis failed:', err);
    
    // Fallback to rule-based grouping
    return generateFallbackGrouping(error);
  }
}

function generateFallbackFingerprint(error: ErrorReport): string {
  const parts = [
    error.type || 'Error',
    error.message?.slice(0, 50) || '',
    error.stack?.split('\n')[1]?.trim() || '',
  ];
  
  // Simple hash
  const str = parts.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(16)}`;
}

function generateFallbackGrouping(error: ErrorReport): ErrorGroup {
  const message = error.message?.toLowerCase() || '';
  const stack = error.stack?.toLowerCase() || '';
  
  // Determine category based on keywords
  let category = 'unknown';
  if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
    category = 'network';
  } else if (message.includes('type') || message.includes('undefined') || message.includes('null')) {
    category = 'type';
  } else if (message.includes('syntax') || message.includes('unexpected token')) {
    category = 'syntax';
  } else if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
    category = 'auth';
  } else if (stack.includes('supabase') || message.includes('database')) {
    category = 'database';
  } else if (stack.includes('react') || stack.includes('component')) {
    category = 'ui';
  }
  
  // Determine severity
  let severity: ErrorGroup['severity'] = 'medium';
  if (message.includes('critical') || message.includes('fatal')) {
    severity = 'critical';
  } else if (category === 'auth' || category === 'database') {
    severity = 'high';
  } else if (category === 'ui' || category === 'type') {
    severity = 'low';
  }
  
  return {
    fingerprint: generateFallbackFingerprint(error),
    category,
    severity,
    suggestedTitle: error.message?.slice(0, 100) || 'Unknown Error',
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { error, existingGroups = [] } = await req.json() as {
      error: ErrorReport;
      existingGroups?: string[];
    };

    if (!error || !error.message) {
      return new Response(
        JSON.stringify({ error: 'Error message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ai-error-grouping] Analyzing error:', error.message?.slice(0, 100));

    const grouping = await analyzeErrorWithAI(error, existingGroups);

    console.log('[ai-error-grouping] Grouping result:', {
      fingerprint: grouping.fingerprint,
      category: grouping.category,
      severity: grouping.severity,
    });

    return new Response(
      JSON.stringify({
        success: true,
        grouping,
        analyzed_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[ai-error-grouping] Error:', err);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(withTracing(handler, { name: 'ai-error-grouping' }));
