import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMProspect } from '@/types/crm-enterprise';

interface CreateTaskParams {
  prospect: CRMProspect;
  taskType: 'follow_up' | 'call' | 'email' | 'meeting' | 'review';
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: number;
}

export function useCRMPilotIntegration() {
  const createTaskForProspect = useCallback(async ({
    prospect,
    taskType,
    title,
    description,
    dueDate,
    priority = 3,
  }: CreateTaskParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const taskTitle = title || `${taskType === 'follow_up' ? 'Follow up with' : taskType === 'call' ? 'Call' : taskType === 'email' ? 'Email' : taskType === 'meeting' ? 'Schedule meeting with' : 'Review'} ${prospect.full_name}`;
      
      const taskDescription = description || `
**Prospect:** ${prospect.full_name}
**Company:** ${prospect.company_name || 'Unknown'}
**Email:** ${prospect.email}
**Stage:** ${prospect.stage}
**Lead Score:** ${prospect.lead_score}

${prospect.reply_sentiment === 'hot' ? '🔥 Hot lead - respond quickly!' : prospect.reply_sentiment === 'warm' ? '☀️ Warm lead - good engagement' : ''}
      `.trim();

      const { error } = await supabase.from('pilot_tasks').insert({
        user_id: user.id,
        title: taskTitle,
        description: taskDescription,
        task_type: taskType === 'follow_up' ? 'follow_up' : taskType === 'call' ? 'call' : 'email',
        priority_score: priority * 20,
        due_date: dueDate?.toISOString() || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        metadata: {
          source: 'crm',
          prospect_id: prospect.id,
          prospect_name: prospect.full_name,
          company_name: prospect.company_name,
          prospect_email: prospect.email,
          lead_score: prospect.lead_score,
          stage: prospect.stage,
        },
      });

      if (error) throw error;

      toast.success('Task created in Club Pilot');
      return true;
    } catch (error: any) {
      console.error('Failed to create pilot task:', error);
      toast.error('Failed to create task');
      return false;
    }
  }, []);

  const createFollowUpOnReply = useCallback(async (prospect: CRMProspect) => {
    // Determine priority based on sentiment
    const priority = prospect.reply_sentiment === 'hot' ? 5 : prospect.reply_sentiment === 'warm' ? 4 : 3;
    
    return createTaskForProspect({
      prospect,
      taskType: 'follow_up',
      title: `🔥 Hot reply from ${prospect.full_name}`,
      description: `New reply received. Follow up immediately to maintain momentum.`,
      dueDate: new Date(Date.now() + (priority === 5 ? 2 : 24) * 60 * 60 * 1000), // 2 hours for hot, 24 for others
      priority,
    });
  }, [createTaskForProspect]);

  return {
    createTaskForProspect,
    createFollowUpOnReply,
  };
}
