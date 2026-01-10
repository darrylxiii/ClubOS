/**
 * Context Window Optimization Utility
 * 
 * Dynamically selects chunks based on 70% context window utilization
 * (research shows this is optimal for LLM performance).
 * Stops adding chunks when reaching 70% of LLM's max tokens.
 */

export interface ChunkWithScore {
  id: string;
  content: string;
  score: number;
  tokenCount: number;
  source_type?: string;
  metadata?: Record<string, unknown>;
}

export interface ContextOptimizationResult {
  selectedChunks: ChunkWithScore[];
  totalTokens: number;
  utilizationPercentage: number;
  droppedChunks: number;
  diversityScore: number;
}

export interface ModelConfig {
  name: string;
  maxContextTokens: number;
  optimalUtilization: number;
  reservedForResponse: number;
}

// Model configurations with their context limits
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'google/gemini-3-flash-preview': {
    name: 'Gemini 3 Flash Preview',
    maxContextTokens: 128000,
    optimalUtilization: 0.70,
    reservedForResponse: 4096,
  },
  'google/gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    maxContextTokens: 128000,
    optimalUtilization: 0.70,
    reservedForResponse: 4096,
  },
  'google/gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    maxContextTokens: 200000,
    optimalUtilization: 0.70,
    reservedForResponse: 8192,
  },
  'openai/gpt-5': {
    name: 'GPT-5',
    maxContextTokens: 128000,
    optimalUtilization: 0.70,
    reservedForResponse: 4096,
  },
  'openai/gpt-5-mini': {
    name: 'GPT-5 Mini',
    maxContextTokens: 64000,
    optimalUtilization: 0.70,
    reservedForResponse: 4096,
  },
};

const DEFAULT_CONFIG: ModelConfig = {
  name: 'Default',
  maxContextTokens: 32000,
  optimalUtilization: 0.70,
  reservedForResponse: 4096,
};

/**
 * Get model config by name or return default
 */
export function getModelConfig(modelName: string): ModelConfig {
  return MODEL_CONFIGS[modelName] || DEFAULT_CONFIG;
}

/**
 * Calculate optimal token budget based on model config
 */
export function calculateTokenBudget(
  modelName: string,
  systemPromptTokens: number = 500,
  queryTokens: number = 100
): number {
  const config = getModelConfig(modelName);
  
  // Available = (max * utilization) - reserved - system - query
  const available = Math.floor(
    (config.maxContextTokens * config.optimalUtilization) - 
    config.reservedForResponse - 
    systemPromptTokens - 
    queryTokens
  );

  return Math.max(available, 2000); // Minimum 2000 tokens for context
}

/**
 * Calculate diversity score based on source variety
 */
function calculateDiversityScore(chunks: ChunkWithScore[]): number {
  if (chunks.length === 0) return 0;
  
  const sourceTypes = new Set(chunks.map(c => c.source_type || 'unknown'));
  const maxPossibleTypes = 6; // email, meeting, message, document, sms, whatsapp
  
  return sourceTypes.size / Math.min(chunks.length, maxPossibleTypes);
}

/**
 * Greedy selection with diversity bonus
 * Slightly prefers chunks from underrepresented sources
 */
function applyDiversityBonus(
  chunks: ChunkWithScore[],
  diversityWeight: number = 0.1
): ChunkWithScore[] {
  const sourceTypeCounts = new Map<string, number>();
  
  return chunks.map(chunk => {
    const sourceType = chunk.source_type || 'unknown';
    const count = sourceTypeCounts.get(sourceType) || 0;
    sourceTypeCounts.set(sourceType, count + 1);
    
    // Reduce score for overrepresented sources
    const penalty = count * diversityWeight * 0.1;
    
    return {
      ...chunk,
      score: chunk.score * (1 - penalty),
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Main context optimization function
 * Selects chunks to fill 70% of context window optimally
 */
export function optimizeContext(
  chunks: ChunkWithScore[],
  modelName: string = 'google/gemini-3-flash-preview',
  options: {
    systemPromptTokens?: number;
    queryTokens?: number;
    diversityWeight?: number;
    minChunks?: number;
    maxChunks?: number;
  } = {}
): ContextOptimizationResult {
  const {
    systemPromptTokens = 500,
    queryTokens = 100,
    diversityWeight = 0.1,
    minChunks = 1,
    maxChunks = 50,
  } = options;

  const tokenBudget = calculateTokenBudget(modelName, systemPromptTokens, queryTokens);
  const config = getModelConfig(modelName);

  // Sort by score and apply diversity bonus
  const rankedChunks = applyDiversityBonus(
    [...chunks].sort((a, b) => b.score - a.score),
    diversityWeight
  );

  const selectedChunks: ChunkWithScore[] = [];
  let totalTokens = 0;
  let droppedChunks = 0;

  for (const chunk of rankedChunks) {
    // Check if we've hit max chunks
    if (selectedChunks.length >= maxChunks) {
      droppedChunks = rankedChunks.length - selectedChunks.length;
      break;
    }

    // Check if adding this chunk would exceed budget
    if (totalTokens + chunk.tokenCount > tokenBudget) {
      // If we have minimum chunks, we can stop
      if (selectedChunks.length >= minChunks) {
        droppedChunks = rankedChunks.length - selectedChunks.length;
        break;
      }
      
      // Otherwise, try to fit smaller chunks
      continue;
    }

    selectedChunks.push(chunk);
    totalTokens += chunk.tokenCount;
  }

  const utilizationPercentage = totalTokens / (config.maxContextTokens * config.optimalUtilization);
  const diversityScore = calculateDiversityScore(selectedChunks);

  return {
    selectedChunks,
    totalTokens,
    utilizationPercentage,
    droppedChunks,
    diversityScore,
  };
}

/**
 * Adaptive context selection based on query complexity
 * Allocates more context for complex queries
 */
export function adaptiveContextSelection(
  chunks: ChunkWithScore[],
  queryComplexity: 'simple' | 'moderate' | 'complex',
  modelName: string = 'google/gemini-3-flash-preview'
): ContextOptimizationResult {
  const complexityMultipliers = {
    simple: 0.5,    // Use 50% of optimal budget
    moderate: 0.75, // Use 75% of optimal budget
    complex: 1.0,   // Use full optimal budget
  };

  const multiplier = complexityMultipliers[queryComplexity];
  const config = getModelConfig(modelName);

  // Adjust token budget based on complexity
  const adjustedBudget = Math.floor(
    calculateTokenBudget(modelName) * multiplier
  );

  const selectedChunks: ChunkWithScore[] = [];
  let totalTokens = 0;

  for (const chunk of [...chunks].sort((a, b) => b.score - a.score)) {
    if (totalTokens + chunk.tokenCount > adjustedBudget) {
      break;
    }
    selectedChunks.push(chunk);
    totalTokens += chunk.tokenCount;
  }

  return {
    selectedChunks,
    totalTokens,
    utilizationPercentage: totalTokens / adjustedBudget,
    droppedChunks: chunks.length - selectedChunks.length,
    diversityScore: calculateDiversityScore(selectedChunks),
  };
}

/**
 * Format selected chunks into context string with citations
 */
export function formatContextWithCitations(
  chunks: ChunkWithScore[]
): string {
  return chunks.map((chunk, i) => {
    const source = chunk.source_type || 'document';
    const citation = `[${i + 1}:${source}]`;
    return `${citation}\n${chunk.content}`;
  }).join('\n\n---\n\n');
}

/**
 * Calculate context statistics for logging
 */
export function getContextStats(
  result: ContextOptimizationResult,
  modelName: string
): Record<string, unknown> {
  const config = getModelConfig(modelName);
  
  return {
    model: modelName,
    maxContextTokens: config.maxContextTokens,
    optimalUtilization: config.optimalUtilization,
    actualUtilization: result.utilizationPercentage,
    tokensUsed: result.totalTokens,
    chunksSelected: result.selectedChunks.length,
    chunksDropped: result.droppedChunks,
    diversityScore: result.diversityScore,
    sourceTypes: [...new Set(result.selectedChunks.map(c => c.source_type))],
    avgChunkTokens: result.totalTokens / result.selectedChunks.length,
  };
}
