/**
 * Blog API Types
 */
import { z } from 'zod';

// ============ Reaction Types ============

export type ReactionType = 'helpful' | 'interesting' | 'learned';

export interface ReactionCounts {
  helpful: number;
  interesting: number;
  learned: number;
}

export const ReactionCountsSchema = z.object({
  helpful: z.number(),
  interesting: z.number(),
  learned: z.number(),
});
