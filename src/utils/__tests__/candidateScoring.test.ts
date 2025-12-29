import { describe, it, expect } from 'vitest';
import { calculateCandidateScore, ScorableCandidate } from '../candidateScoring';

describe('candidateScoring', () => {
  describe('calculateCandidateScore', () => {
    it('should calculate score for candidate with all data', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        match_score: 80,
        current_stage_index: 3,
        profile_completeness: 100,
        last_activity_at: new Date().toISOString(), // Very recent
      };

      const result = calculateCandidateScore(candidate, 5);

      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
    });

    it('should handle candidate with missing optional data', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        current_stage_index: 0,
      };

      const result = calculateCandidateScore(candidate);

      expect(result.compositeScore).toBe(0);
      expect(result.breakdown.match).toBe(0);
      expect(result.breakdown.activity).toBe(0);
      expect(result.breakdown.completeness).toBe(0);
    });

    it('should calculate high activity score for recent activity', () => {
      const now = new Date();
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        current_stage_index: 0,
        last_activity_at: now.toISOString(),
      };

      const result = calculateCandidateScore(candidate);

      expect(result.breakdown.activity).toBe(100);
    });

    it('should calculate medium activity score for week-old activity', () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 5);
      
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        current_stage_index: 0,
        last_activity_at: weekAgo.toISOString(),
      };

      const result = calculateCandidateScore(candidate);

      expect(result.breakdown.activity).toBe(80);
    });

    it('should calculate low activity score for old activity', () => {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 45);
      
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        current_stage_index: 0,
        last_activity_at: monthAgo.toISOString(),
      };

      const result = calculateCandidateScore(candidate);

      expect(result.breakdown.activity).toBe(20);
    });

    it('should apply correct weights to score components', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        match_score: 100,
        current_stage_index: 0,
        profile_completeness: 0,
        last_activity_at: undefined,
      };

      const result = calculateCandidateScore(candidate);

      // 100 * 0.45 = 45
      expect(result.compositeScore).toBe(45);
    });

    it('should cap composite score at 100', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        match_score: 100,
        current_stage_index: 5,
        profile_completeness: 100,
        last_activity_at: new Date().toISOString(),
      };

      const result = calculateCandidateScore(candidate, 5);

      expect(result.compositeScore).toBeLessThanOrEqual(100);
    });

    it('should floor composite score at 0', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        match_score: -10, // Invalid but testing bounds
        current_stage_index: 0,
      };

      const result = calculateCandidateScore(candidate);

      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    });

    it('should generate AI recommendation for high score with skills match', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        match_score: 95,
        current_stage_index: 4,
        profile_completeness: 100,
        last_activity_at: new Date().toISOString(),
      };

      const result = calculateCandidateScore(candidate, 5);

      expect(result.aiRecommendation).toBe('Top 1% Skills Match');
    });

    it('should generate AI recommendation for high engagement', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        match_score: 70,
        current_stage_index: 4,
        profile_completeness: 100,
        last_activity_at: new Date().toISOString(),
      };

      const result = calculateCandidateScore(candidate, 5);

      expect(result.aiRecommendation).toBeDefined();
    });

    it('should not generate recommendation for low scores', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        match_score: 30,
        current_stage_index: 0,
        profile_completeness: 50,
      };

      const result = calculateCandidateScore(candidate);

      expect(result.aiRecommendation).toBeUndefined();
    });

    it('should use default maxStageIndex when not provided', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        current_stage_index: 5,
        match_score: 50,
      };

      const result = calculateCandidateScore(candidate);

      // With default maxStageIndex of 5, stage 5 = 100% progress
      expect(result.compositeScore).toBeGreaterThan(0);
    });

    it('should handle zero maxStageIndex', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        current_stage_index: 0,
        match_score: 50,
      };

      const result = calculateCandidateScore(candidate, 0);

      // Should not throw, stageProgress should be 0
      expect(result.compositeScore).toBe(23); // 50 * 0.45 = 22.5, rounded
    });

    it('should include breakdown in result', () => {
      const candidate: ScorableCandidate = {
        id: 'candidate-1',
        match_score: 80,
        current_stage_index: 2,
        profile_completeness: 75,
        last_activity_at: new Date().toISOString(),
      };

      const result = calculateCandidateScore(candidate);

      expect(result.breakdown).toEqual({
        match: 80,
        activity: 100,
        completeness: 75,
      });
    });
  });
});
