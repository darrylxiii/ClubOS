import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  notifyNewMessage,
  notifyInterviewReminder,
  notifyApplicationUpdate,
  notifyJobMatch,
} from '../pushNotificationService';
import { supabase } from '@/integrations/supabase/client';

describe('pushNotificationService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('notifyNewMessage', () => {
    it('should send new message notification', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      const result = await notifyNewMessage('user-123', 'John', 'Hello', 'conv-456');
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });

  describe('notifyInterviewReminder', () => {
    it('should send interview reminder notification', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      await notifyInterviewReminder('user-123', 'Dev', 'TechCorp', new Date(), 'meeting-1');
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });

  describe('notifyApplicationUpdate', () => {
    it('should send status notification', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      await notifyApplicationUpdate('user-123', 'Dev', 'TechCorp', 'interview', 'app-1');
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });

  describe('notifyJobMatch', () => {
    it('should send job match notification', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      await notifyJobMatch('user-123', 'Dev', 'TechCorp', 85, 'job-1');
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });
});
