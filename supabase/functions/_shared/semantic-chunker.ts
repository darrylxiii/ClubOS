/**
 * Semantic Chunking Utility
 * 
 * Splits content by semantic boundaries:
 * - Emails: Split by reply blocks
 * - Meetings: Split by speaker/topic changes
 * - Documents: Split at headings with overlap
 * 
 * Uses 512-1024 token chunks (research-proven optimal)
 * with 100-200 word overlap for context preservation.
 */

export interface ChunkOptions {
  maxTokens?: number;
  minTokens?: number;
  overlapWords?: number;
  preserveHeadings?: boolean;
}

export interface ContentChunk {
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
  chunkType: 'heading' | 'paragraph' | 'reply' | 'speaker' | 'topic' | 'code' | 'list';
  metadata?: Record<string, unknown>;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxTokens: 1024,
  minTokens: 256,
  overlapWords: 150,
  preserveHeadings: true,
};

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get last N words from text for overlap
 */
function getOverlapText(text: string, wordCount: number): string {
  const words = text.trim().split(/\s+/);
  return words.slice(-wordCount).join(' ');
}

/**
 * Detect email reply blocks (lines starting with > or quoted content)
 */
function splitEmailReplies(content: string): string[] {
  const blocks: string[] = [];
  const lines = content.split('\n');
  let currentBlock = '';
  let isQuoted = false;

  for (const line of lines) {
    const lineIsQuoted = line.trim().startsWith('>') || 
                         !!line.match(/^On .+ wrote:/) ||
                         !!line.match(/^From:.*Sent:.*To:/);

    if (lineIsQuoted !== isQuoted && currentBlock.trim()) {
      blocks.push(currentBlock.trim());
      currentBlock = '';
    }

    currentBlock += line + '\n';
    isQuoted = lineIsQuoted;
  }

  if (currentBlock.trim()) {
    blocks.push(currentBlock.trim());
  }

  return blocks.filter(b => b.length > 0);
}

/**
 * Detect speaker changes in meeting transcripts
 * Patterns: "Speaker Name:", "[Speaker]", "NAME:", timestamps with names
 */
function splitBySpeaker(content: string): string[] {
  const speakerPatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+):\s/gm,
    /^\[([^\]]+)\]\s/gm,
    /^([A-Z]{2,}[A-Z\s]*[A-Z]):\s/gm,
    /^\d{1,2}:\d{2}(?::\d{2})?\s+([A-Za-z\s]+):\s/gm,
  ];

  let splitContent = content;
  const delimiter = '|||SPEAKER_BREAK|||';

  for (const pattern of speakerPatterns) {
    splitContent = splitContent.replace(pattern, (match) => delimiter + match);
  }

  return splitContent
    .split(delimiter)
    .filter(block => block.trim().length > 0);
}

/**
 * Split by headings (markdown or plain text)
 */
function splitByHeadings(content: string): string[] {
  const headingPattern = /^(#{1,6}\s+.+|[A-Z][A-Za-z\s]{2,50}:?\s*$)/gm;
  const delimiter = '|||HEADING_BREAK|||';
  
  const splitContent = content.replace(headingPattern, (match) => delimiter + match);
  
  return splitContent
    .split(delimiter)
    .filter(block => block.trim().length > 0);
}

/**
 * Split long text into semantic paragraphs
 */
function splitIntoParagraphs(content: string): string[] {
  // Split on double newlines, horizontal rules, or multiple blank lines
  return content
    .split(/\n{2,}|---+|___+/)
    .filter(p => p.trim().length > 0)
    .map(p => p.trim());
}

/**
 * Detect topic shifts using heuristics
 * (In production, you'd use embeddings to detect semantic shifts)
 */
function detectTopicShifts(paragraphs: string[]): number[] {
  const shiftIndices: number[] = [0];
  
  for (let i = 1; i < paragraphs.length; i++) {
    const prev = paragraphs[i - 1].toLowerCase();
    const curr = paragraphs[i].toLowerCase();
    
    // Simple heuristics for topic shifts
    const hasTransitionWord = /^(however|additionally|furthermore|meanwhile|in contrast|on the other hand|next|finally|in conclusion)/i.test(curr);
    const hasNewSubject = curr.match(/^(regarding|about|concerning|as for|with respect to)/i);
    const significantLengthChange = Math.abs(prev.length - curr.length) > prev.length * 0.5;
    
    if (hasTransitionWord || hasNewSubject || significantLengthChange) {
      shiftIndices.push(i);
    }
  }

  return shiftIndices;
}

/**
 * Merge small chunks until they meet minimum size
 */
function mergeSmallChunks(
  chunks: string[],
  minTokens: number
): string[] {
  const merged: string[] = [];
  let currentChunk = '';

  for (const chunk of chunks) {
    const combined = currentChunk ? `${currentChunk}\n\n${chunk}` : chunk;
    
    if (estimateTokens(combined) >= minTokens || chunks.indexOf(chunk) === chunks.length - 1) {
      merged.push(combined);
      currentChunk = '';
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk) {
    if (merged.length > 0) {
      merged[merged.length - 1] += '\n\n' + currentChunk;
    } else {
      merged.push(currentChunk);
    }
  }

  return merged;
}

/**
 * Split large chunks that exceed max tokens
 */
function splitLargeChunks(
  chunks: string[],
  maxTokens: number,
  overlapWords: number
): string[] {
  const result: string[] = [];

  for (const chunk of chunks) {
    if (estimateTokens(chunk) <= maxTokens) {
      result.push(chunk);
      continue;
    }

    // Split by sentences
    const sentences = chunk.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    let overlap = '';

    for (const sentence of sentences) {
      const combined = currentChunk ? `${currentChunk} ${sentence}` : sentence;
      
      if (estimateTokens(combined) > maxTokens && currentChunk) {
        result.push(overlap ? `${overlap} ${currentChunk}` : currentChunk);
        overlap = getOverlapText(currentChunk, overlapWords);
        currentChunk = sentence;
      } else {
        currentChunk = combined;
      }
    }

    if (currentChunk) {
      result.push(overlap ? `${overlap} ${currentChunk}` : currentChunk);
    }
  }

  return result;
}

/**
 * Main semantic chunking function
 */
export function semanticChunk(
  content: string,
  contentType: 'email' | 'meeting' | 'document' | 'message' | 'generic',
  options: ChunkOptions = {}
): ContentChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let segments: string[];
  let chunkType: ContentChunk['chunkType'] = 'paragraph';

  // Step 1: Initial semantic splitting based on content type
  switch (contentType) {
    case 'email':
      segments = splitEmailReplies(content);
      chunkType = 'reply';
      break;
    
    case 'meeting':
      segments = splitBySpeaker(content);
      chunkType = 'speaker';
      break;
    
    case 'document':
      if (opts.preserveHeadings) {
        segments = splitByHeadings(content);
        chunkType = 'heading';
      } else {
        segments = splitIntoParagraphs(content);
      }
      break;
    
    case 'message':
      // Messages are usually short, split only if very long
      segments = [content];
      chunkType = 'paragraph';
      break;
    
    default:
      segments = splitIntoParagraphs(content);
      break;
  }

  // Step 2: Further split long segments
  let chunks = splitLargeChunks(segments, opts.maxTokens!, opts.overlapWords!);

  // Step 3: Merge very small chunks
  chunks = mergeSmallChunks(chunks, opts.minTokens!);

  // Step 4: Create final chunk objects with metadata
  let offset = 0;
  const result: ContentChunk[] = chunks.map((chunk, index) => {
    const startOffset = content.indexOf(chunk.slice(0, 50), offset);
    const endOffset = startOffset + chunk.length;
    offset = startOffset > 0 ? startOffset : offset;

    return {
      content: chunk,
      index,
      startOffset: startOffset >= 0 ? startOffset : 0,
      endOffset: endOffset >= 0 ? endOffset : chunk.length,
      tokenCount: estimateTokens(chunk),
      chunkType,
      metadata: {
        contentType,
        totalChunks: chunks.length,
      },
    };
  });

  return result;
}

/**
 * Chunk with overlap for better context preservation
 */
export function chunkWithOverlap(
  content: string,
  options: ChunkOptions = {}
): ContentChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: ContentChunk[] = [];
  const words = content.split(/\s+/);
  
  const wordsPerChunk = Math.floor(opts.maxTokens! / 1.3); // Approximate words from tokens
  const step = wordsPerChunk - opts.overlapWords!;
  
  let index = 0;
  for (let i = 0; i < words.length; i += step) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunkContent = chunkWords.join(' ');
    
    if (chunkContent.trim()) {
      chunks.push({
        content: chunkContent,
        index: index++,
        startOffset: content.indexOf(chunkWords[0]),
        endOffset: content.indexOf(chunkWords[chunkWords.length - 1]) + chunkWords[chunkWords.length - 1].length,
        tokenCount: estimateTokens(chunkContent),
        chunkType: 'paragraph',
        metadata: {
          hasOverlap: i > 0,
          overlapWords: i > 0 ? opts.overlapWords : 0,
        },
      });
    }
  }

  return chunks;
}
