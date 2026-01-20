import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionInput {
  query_id: string;
  response_text: string;
  source_chunks: SourceChunk[];
  conversation_id?: string;
}

interface SourceChunk {
  id: string;
  content: string;
  source_type: string;
  metadata?: any;
}

interface Claim {
  text: string;
  type: 'factual' | 'opinion' | 'inference';
  verified: boolean;
  supporting_chunks: string[];
  confidence: number;
}

interface DetectionResult {
  hallucination_score: number;
  claims: Claim[];
  verified_claims: number;
  unverified_claims: number;
  flagged_segments: FlaggedSegment[];
  recommendation: string;
}

interface FlaggedSegment {
  text: string;
  start: number;
  end: number;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id || null;
    }

    const input: DetectionInput = await req.json();

    if (!input.response_text || !input.source_chunks) {
      return new Response(JSON.stringify({ error: 'response_text and source_chunks are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect hallucinations
    const result = await detectHallucinations(input.response_text, input.source_chunks);

    // Log the detection
    await supabase
      .from('hallucination_detection_log')
      .insert({
        query_id: input.query_id || crypto.randomUUID(),
        conversation_id: input.conversation_id,
        user_id: userId,
        response_text: input.response_text,
        source_chunks: input.source_chunks,
        claims_extracted: result.claims,
        verified_claims: result.verified_claims,
        unverified_claims: result.unverified_claims,
        hallucination_score: result.hallucination_score,
        flagged_segments: result.flagged_segments,
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Hallucination detection error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function detectHallucinations(
  responseText: string,
  sourceChunks: SourceChunk[]
): Promise<DetectionResult> {
  // Extract claims from the response
  const claims = extractClaims(responseText);
  
  // Build a searchable corpus from source chunks
  const corpus = buildCorpus(sourceChunks);
  
  // Verify each claim against the corpus
  const verifiedClaims = claims.map(claim => verifyClaim(claim, corpus, sourceChunks));
  
  // Calculate hallucination score
  const verifiedCount = verifiedClaims.filter(c => c.verified).length;
  const unverifiedCount = verifiedClaims.filter(c => !c.verified && c.type === 'factual').length;
  
  const hallucinationScore = claims.length > 0 
    ? unverifiedCount / claims.filter(c => c.type === 'factual').length || 0
    : 0;
  
  // Flag problematic segments
  const flaggedSegments = identifyFlaggedSegments(responseText, verifiedClaims);
  
  // Generate recommendation
  const recommendation = generateRecommendation(hallucinationScore, flaggedSegments);

  return {
    hallucination_score: Math.round(hallucinationScore * 100) / 100,
    claims: verifiedClaims,
    verified_claims: verifiedCount,
    unverified_claims: unverifiedCount,
    flagged_segments: flaggedSegments,
    recommendation,
  };
}

function extractClaims(text: string): Claim[] {
  const claims: Claim[] = [];
  
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    
    // Classify the type of claim
    let type: 'factual' | 'opinion' | 'inference' = 'factual';
    
    // Opinion indicators
    if (/\b(I think|I believe|in my opinion|probably|might|could|possibly|seems|appears|suggests)\b/i.test(trimmed)) {
      type = 'opinion';
    }
    
    // Inference indicators
    if (/\b(therefore|thus|hence|consequently|as a result|this means|indicates that)\b/i.test(trimmed)) {
      type = 'inference';
    }
    
    // Skip very short claims or meta-statements
    if (trimmed.length < 20) continue;
    if (/\b(I can|I'll|let me|here is|here are|based on|according to)\b/i.test(trimmed)) continue;
    
    claims.push({
      text: trimmed,
      type,
      verified: false,
      supporting_chunks: [],
      confidence: 0,
    });
  }
  
  return claims;
}

function buildCorpus(chunks: SourceChunk[]): Map<string, Set<string>> {
  const corpus = new Map<string, Set<string>>();
  
  for (const chunk of chunks) {
    const words = chunk.content.toLowerCase().split(/\W+/);
    
    for (const word of words) {
      if (word.length < 3) continue;
      
      if (!corpus.has(word)) {
        corpus.set(word, new Set());
      }
      corpus.get(word)!.add(chunk.id);
    }
  }
  
  return corpus;
}

function verifyClaim(
  claim: Claim, 
  corpus: Map<string, Set<string>>,
  chunks: SourceChunk[]
): Claim {
  // Extract key terms from the claim
  const claimWords = claim.text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  // Remove common words
  const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'they', 'their', 'would', 'could', 'should', 'which', 'about', 'there', 'these', 'those']);
  const keyTerms = claimWords.filter(w => !stopWords.has(w));
  
  if (keyTerms.length === 0) {
    return { ...claim, verified: true, confidence: 1 }; // Generic statement
  }
  
  // Find chunks containing these terms
  const chunkScores = new Map<string, number>();
  
  for (const term of keyTerms) {
    const matchingChunks = corpus.get(term);
    if (matchingChunks) {
      for (const chunkId of matchingChunks) {
        chunkScores.set(chunkId, (chunkScores.get(chunkId) || 0) + 1);
      }
    }
  }
  
  // Calculate verification score
  const maxScore = keyTerms.length;
  let bestMatchScore = 0;
  const supportingChunks: string[] = [];
  
  for (const [chunkId, score] of chunkScores.entries()) {
    const coverage = score / maxScore;
    if (coverage > 0.4) { // At least 40% term overlap
      supportingChunks.push(chunkId);
      bestMatchScore = Math.max(bestMatchScore, coverage);
    }
  }
  
  // Additional semantic similarity check for factual claims
  if (claim.type === 'factual' && supportingChunks.length > 0) {
    // Check for specific entity mentions
    const entities = extractEntitiesFromText(claim.text);
    let entityVerified = true;
    
    for (const entity of entities) {
      const entityLower = entity.toLowerCase();
      let found = false;
      
      for (const chunkId of supportingChunks) {
        const chunk = chunks.find(c => c.id === chunkId);
        if (chunk && chunk.content.toLowerCase().includes(entityLower)) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        entityVerified = false;
        break;
      }
    }
    
    if (!entityVerified) {
      bestMatchScore *= 0.5; // Penalize unverified entity references
    }
  }
  
  const verified = bestMatchScore > 0.5 || claim.type !== 'factual';
  
  return {
    ...claim,
    verified,
    supporting_chunks: supportingChunks,
    confidence: Math.round(bestMatchScore * 100) / 100,
  };
}

function extractEntitiesFromText(text: string): string[] {
  const entities: string[] = [];
  
  // Names (capitalized sequences)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    if (match[1].length > 2) entities.push(match[1]);
  }
  
  // Numbers and dates
  const numberPattern = /\b(\d+(?:,\d{3})*(?:\.\d+)?%?|\$[\d,]+(?:\.\d{2})?)\b/g;
  while ((match = numberPattern.exec(text)) !== null) {
    entities.push(match[1]);
  }
  
  return entities;
}

function identifyFlaggedSegments(text: string, claims: Claim[]): FlaggedSegment[] {
  const flagged: FlaggedSegment[] = [];
  
  for (const claim of claims) {
    if (!claim.verified && claim.type === 'factual') {
      const start = text.indexOf(claim.text);
      if (start >= 0) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        
        // Higher severity for specific claims with numbers/names
        if (/\d+/.test(claim.text) || /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(claim.text)) {
          severity = claim.confidence < 0.3 ? 'high' : 'medium';
        }
        
        flagged.push({
          text: claim.text,
          start,
          end: start + claim.text.length,
          reason: `Claim not found in source documents (confidence: ${Math.round(claim.confidence * 100)}%)`,
          severity,
        });
      }
    }
  }
  
  return flagged;
}

function generateRecommendation(score: number, flagged: FlaggedSegment[]): string {
  if (score === 0) {
    return 'Response appears well-grounded in source documents.';
  }
  
  if (score < 0.2) {
    return 'Minor unsupported claims detected. Consider reviewing flagged segments.';
  }
  
  if (score < 0.5) {
    return 'Moderate hallucination detected. Some claims could not be verified against sources. Review flagged segments before sharing.';
  }
  
  const highSeverity = flagged.filter(f => f.severity === 'high').length;
  if (highSeverity > 0) {
    return `High hallucination risk! ${highSeverity} specific claims (names, numbers) could not be verified. Strongly recommend regenerating response or manual verification.`;
  }
  
  return 'Significant unsupported content detected. Consider regenerating with more specific source context.';
}
