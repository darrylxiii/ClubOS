import { describe, it, expect } from 'vitest';
import { 
  getStageIcon, 
  getDefaultStageTip, 
  convertToApplicationStages, 
  formatStageDuration,
  getDefaultPipelineStages 
} from '../pipelineUtils';
import { FileText, Video, Users, CheckCircle2, UserCheck, ClipboardCheck, Briefcase } from 'lucide-react';

describe('pipelineUtils', () => {
  describe('getStageIcon', () => {
    it('should return FileText for applied stage', () => {
      expect(getStageIcon('Applied')).toBe(FileText);
    });

    it('should return FileText for review stage', () => {
      expect(getStageIcon('Application Review')).toBe(FileText);
    });

    it('should return Video for screen stage', () => {
      expect(getStageIcon('Phone Screen')).toBe(Video);
    });

    it('should return Users for interview stage', () => {
      expect(getStageIcon('Technical Interview')).toBe(Users);
    });

    it('should return Users for final stage', () => {
      expect(getStageIcon('Final Round')).toBe(Users);
    });

    it('should return CheckCircle2 for offer stage', () => {
      expect(getStageIcon('Offer Extended')).toBe(CheckCircle2);
    });

    it('should return UserCheck for hired stage', () => {
      expect(getStageIcon('Hired')).toBe(UserCheck);
    });

    it('should return ClipboardCheck for assignment stage', () => {
      expect(getStageIcon('Take-home Assignment')).toBe(ClipboardCheck);
    });

    it('should return Briefcase as default', () => {
      expect(getStageIcon('Unknown Stage')).toBe(Briefcase);
    });

    it('should be case insensitive', () => {
      expect(getStageIcon('APPLIED')).toBe(FileText);
      expect(getStageIcon('phone screen')).toBe(Video);
    });
  });

  describe('getDefaultStageTip', () => {
    it('should return review tip for applied stage', () => {
      expect(getDefaultStageTip('Applied')).toContain('being reviewed');
    });

    it('should return screen tip for screening stage', () => {
      expect(getDefaultStageTip('Phone Screen')).toContain('background');
    });

    it('should return interview tip for interview stage', () => {
      expect(getDefaultStageTip('Interview')).toContain('experience');
    });

    it('should return offer tip for offer stage', () => {
      expect(getDefaultStageTip('Offer')).toContain('compensation');
    });

    it('should return congratulations for hired stage', () => {
      expect(getDefaultStageTip('Hired')).toContain('Congratulations');
    });

    it('should return default tip for unknown stage', () => {
      expect(getDefaultStageTip('Random Stage')).toContain('prepared');
    });
  });

  describe('convertToApplicationStages', () => {
    it('should return fallback stages for empty array', () => {
      const result = convertToApplicationStages([]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Applied');
    });

    it('should return fallback stages for null/undefined', () => {
      const result = convertToApplicationStages(null as any);
      expect(result).toHaveLength(1);
    });

    it('should convert pipeline stages correctly', () => {
      const stages = [
        { id: '1', name: 'Applied', order: 0 },
        { id: '2', name: 'Interview', order: 1 },
      ];
      const result = convertToApplicationStages(stages, 0);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Applied');
      expect(result[0].status).toBe('in_progress');
      expect(result[1].status).toBe('pending');
    });

    it('should mark completed stages correctly', () => {
      const stages = [
        { id: '1', name: 'Applied', order: 0 },
        { id: '2', name: 'Interview', order: 1 },
        { id: '3', name: 'Offer', order: 2 },
      ];
      const result = convertToApplicationStages(stages, 2);
      
      expect(result[0].status).toBe('completed');
      expect(result[1].status).toBe('completed');
      expect(result[2].status).toBe('in_progress');
    });

    it('should preserve stage properties', () => {
      const stages = [
        { 
          id: '1', 
          name: 'Interview', 
          order: 0,
          duration_minutes: 60,
          format: 'video',
          description: 'Technical interview'
        },
      ];
      const result = convertToApplicationStages(stages, 0);
      
      expect((result[0] as any).duration_minutes).toBe(60);
      expect((result[0] as any).format).toBe('video');
      expect((result[0] as any).description).toBe('Technical interview');
    });
  });

  describe('formatStageDuration', () => {
    it('should format minutes only', () => {
      expect(formatStageDuration({ duration_minutes: 30 })).toBe('30 min');
    });

    it('should format hours only', () => {
      expect(formatStageDuration({ duration_minutes: 60 })).toBe('1 hour');
      expect(formatStageDuration({ duration_minutes: 120 })).toBe('2 hours');
    });

    it('should format hours and minutes', () => {
      expect(formatStageDuration({ duration_minutes: 90 })).toBe('1h 30m');
    });

    it('should use duration string if available', () => {
      expect(formatStageDuration({ duration: '2 hours' })).toBe('2 hours');
    });

    it('should return TBD for no duration', () => {
      expect(formatStageDuration({})).toBe('TBD');
    });
  });

  describe('getDefaultPipelineStages', () => {
    it('should return 5 default stages', () => {
      const stages = getDefaultPipelineStages();
      expect(stages).toHaveLength(5);
    });

    it('should have stages in correct order', () => {
      const stages = getDefaultPipelineStages();
      expect(stages[0].name).toBe('Applied');
      expect(stages[1].name).toBe('Screening');
      expect(stages[2].name).toBe('Interview');
      expect(stages[3].name).toBe('Final Round');
      expect(stages[4].name).toBe('Offer');
    });

    it('should have duration on screening and interview stages', () => {
      const stages = getDefaultPipelineStages();
      expect(stages[1].duration_minutes).toBe(30);
      expect(stages[2].duration_minutes).toBe(60);
    });
  });
});
