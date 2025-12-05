import { supabase } from '@/integrations/supabase/client';

interface ErrorFingerprint {
  signature: string;
  normalizedStack: string;
  errorType: string;
  component: string;
}

interface DedupedError {
  fingerprint: string;
  message: string;
  occurrenceCount: number;
  firstSeen: Date;
  lastSeen: Date;
  samples: string[];
}

/**
 * Error Fingerprinting Utility
 * Normalizes stack traces and generates unique signatures for deduplication
 */
class ErrorFingerprintingService {
  private errorCache = new Map<string, DedupedError>();
  private readonly MAX_SAMPLES = 5;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Generate a unique fingerprint for an error
   */
  generateFingerprint(error: Error | unknown, componentName?: string): ErrorFingerprint {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const normalizedStack = this.normalizeStackTrace(errorObj.stack || '');
    const errorType = errorObj.name || 'Error';
    const component = componentName || this.extractComponentFromStack(errorObj.stack || '');

    // Create signature from key parts
    const signatureParts = [
      errorType,
      errorObj.message.replace(/\d+/g, 'N').substring(0, 100), // Normalize numbers
      component,
      this.getStackSignature(normalizedStack),
    ];

    const signature = this.hashString(signatureParts.join('|'));

    return {
      signature,
      normalizedStack,
      errorType,
      component,
    };
  }

  /**
   * Check if error is duplicate and track occurrence
   */
  isDuplicate(fingerprint: string, message: string): { isDuplicate: boolean; occurrenceCount: number } {
    const existing = this.errorCache.get(fingerprint);
    const now = new Date();

    if (existing) {
      // Update existing entry
      existing.occurrenceCount++;
      existing.lastSeen = now;
      
      if (existing.samples.length < this.MAX_SAMPLES) {
        existing.samples.push(message);
      }

      return { isDuplicate: true, occurrenceCount: existing.occurrenceCount };
    }

    // New error
    this.errorCache.set(fingerprint, {
      fingerprint,
      message,
      occurrenceCount: 1,
      firstSeen: now,
      lastSeen: now,
      samples: [message],
    });

    return { isDuplicate: false, occurrenceCount: 1 };
  }

  /**
   * Get all tracked errors with their occurrence counts
   */
  getTrackedErrors(): DedupedError[] {
    this.cleanCache();
    return Array.from(this.errorCache.values())
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  }

  /**
   * Get error by fingerprint
   */
  getError(fingerprint: string): DedupedError | undefined {
    return this.errorCache.get(fingerprint);
  }

  /**
   * Clear error from cache (e.g., when resolved)
   */
  clearError(fingerprint: string): void {
    this.errorCache.delete(fingerprint);
  }

  /**
   * Normalize a stack trace for comparison
   * Removes line numbers, column numbers, and dynamic parts
   */
  private normalizeStackTrace(stack: string): string {
    return stack
      .split('\n')
      .slice(0, 10) // Keep first 10 frames
      .map((line) => {
        // Remove line:column numbers
        return line
          .replace(/:\d+:\d+\)?$/g, '')
          .replace(/\?[^)]+\)/g, ')') // Remove query strings
          .replace(/https?:\/\/[^/]+/g, '') // Remove domain
          .replace(/\d+/g, 'N') // Normalize remaining numbers
          .trim();
      })
      .filter((line) => line.length > 0)
      .join('\n');
  }

  /**
   * Extract component name from stack trace
   */
  private extractComponentFromStack(stack: string): string {
    // Look for React component patterns
    const componentMatch = stack.match(/at\s+([A-Z][a-zA-Z0-9]+)\s+\(/);
    if (componentMatch) {
      return componentMatch[1];
    }

    // Look for file paths
    const fileMatch = stack.match(/\/([A-Z][a-zA-Z0-9]+)\.(tsx?|jsx?)/);
    if (fileMatch) {
      return fileMatch[1];
    }

    return 'Unknown';
  }

  /**
   * Get a signature from the normalized stack
   */
  private getStackSignature(normalizedStack: string): string {
    // Take first 3 meaningful frames
    const frames = normalizedStack
      .split('\n')
      .filter((line) => line.includes('at '))
      .slice(0, 3)
      .join('|');

    return this.hashString(frames);
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean expired entries from cache
   */
  private cleanCache(): void {
    const cutoff = Date.now() - this.CACHE_TTL_MS;
    
    for (const [key, value] of this.errorCache.entries()) {
      if (value.lastSeen.getTime() < cutoff) {
        this.errorCache.delete(key);
      }
    }
  }

  /**
   * Flush high-occurrence errors to database for persistence
   */
  async flushToDatabase(minOccurrences: number = 5): Promise<void> {
    const errorsToFlush = this.getTrackedErrors()
      .filter((e) => e.occurrenceCount >= minOccurrences);

    for (const error of errorsToFlush) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('error_logs')
          .select('id, metadata')
          .eq('error_message', error.message.substring(0, 500))
          .maybeSingle();

        if (existing) {
          // Update occurrence count in metadata
          const metadata = (existing.metadata as Record<string, unknown>) || {};
          await supabase
            .from('error_logs')
            .update({
              metadata: {
                ...metadata,
                fingerprint: error.fingerprint,
                occurrenceCount: error.occurrenceCount,
                firstSeen: error.firstSeen.toISOString(),
                lastSeen: error.lastSeen.toISOString(),
              },
              fingerprint: error.fingerprint,
              occurrence_count: error.occurrenceCount,
              last_seen_at: error.lastSeen.toISOString(),
            })
            .eq('id', existing.id);
        }
      } catch {
        // Silent fail - don't interrupt main flow
      }
    }
  }
}

// Singleton instance
export const errorFingerprinting = new ErrorFingerprintingService();
