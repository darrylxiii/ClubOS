import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  trackPageView,
  trackJobSearch,
  trackJobInteraction,
  trackProfileView,
  trackCVDownload,
  trackMessageSent,
  trackJobView,
  trackJobSave,
  batchTrackEvents,
} from '../analyticsTracking';
import { supabase } from '@/integrations/supabase/client';

describe('analyticsTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('trackPageView', () => {
    it('should track page view with session ID', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackPageView('user-123', '/dashboard', 'navigation');
      expect(supabase.from).toHaveBeenCalledWith('user_activity_events');
    });

    it('should generate session ID if not exists', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackPageView('user-123', '/jobs');
      
      const sessionId = sessionStorage.getItem('analytics_session_id');
      expect(sessionId).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('DB error')),
      } as any);

      await expect(trackPageView('user-123', '/test')).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('trackJobSearch', () => {
    it('should track job search with filters', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackJobSearch('user-123', 'developer', { location: 'Amsterdam' }, 10);
      expect(supabase.from).toHaveBeenCalledWith('job_search_analytics');
    });
  });

  describe('trackJobInteraction', () => {
    it('should track job clicked action', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackJobInteraction('user-123', 'job-456', 'clicked');
      expect(supabase.from).toHaveBeenCalledWith('user_activity_events');
    });

    it('should track job saved action', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackJobInteraction('user-123', 'job-456', 'saved');
      expect(supabase.from).toHaveBeenCalled();
    });

    it('should track job applied action', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackJobInteraction('user-123', 'job-456', 'applied');
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('trackProfileView', () => {
    it('should track candidate profile view', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackProfileView('candidate-123', 'viewer-456', 'recruiter', 'company-1', 'job-1');
      expect(supabase.from).toHaveBeenCalledWith('candidate_engagement_events');
    });

    it('should work without optional parameters', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackProfileView('candidate-123', 'viewer-456', 'admin');
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('trackCVDownload', () => {
    it('should track CV download event', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackCVDownload('candidate-123', 'downloader-456', 'recruiter', 'company-1');
      expect(supabase.from).toHaveBeenCalledWith('candidate_engagement_events');
    });
  });

  describe('trackMessageSent', () => {
    it('should track message sent to candidate', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackMessageSent('user-123', 'recipient-456', 'candidate');
      expect(supabase.from).toHaveBeenCalledWith('user_activity_events');
    });

    it('should track message sent to partner', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackMessageSent('user-123', 'recipient-456', 'partner');
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('trackJobView', () => {
    it('should track job view event', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackJobView('user-123', 'job-456');
      expect(supabase.from).toHaveBeenCalledWith('user_activity_events');
    });
  });

  describe('trackJobSave', () => {
    it('should track job saved event', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackJobSave('user-123', 'job-456', true);
      expect(supabase.from).toHaveBeenCalled();
    });

    it('should track job unsaved event', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await trackJobSave('user-123', 'job-456', false);
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('batchTrackEvents', () => {
    it('should batch insert multiple events', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const events = [
        { user_id: 'user-1', event_type: 'page_view' },
        { user_id: 'user-1', event_type: 'click' },
      ];

      await batchTrackEvents(events);
      expect(supabase.from).toHaveBeenCalledWith('user_activity_events');
    });

    it('should handle empty events array', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      await expect(batchTrackEvents([])).resolves.not.toThrow();
    });
  });
});
