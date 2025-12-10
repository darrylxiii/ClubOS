import { useEffect, useCallback, createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMProspect } from '@/types/crm-enterprise';
import type { CRMActivity } from '@/types/crm-activities';
import type { CRMEmailReply } from '@/types/crm-enterprise';

interface CRMRealtimeContextValue {
  prospectChanges: CRMProspect[];
  activityChanges: CRMActivity[];
  replyChanges: CRMEmailReply[];
  lastUpdate: Date | null;
}

const CRMRealtimeContext = createContext<CRMRealtimeContextValue>({
  prospectChanges: [],
  activityChanges: [],
  replyChanges: [],
  lastUpdate: null,
});

export function useCRMRealtime() {
  return useContext(CRMRealtimeContext);
}

interface CRMRealtimeProviderProps {
  children: ReactNode;
  onProspectUpdate?: (prospect: CRMProspect, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  onActivityUpdate?: (activity: CRMActivity, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  onReplyUpdate?: (reply: CRMEmailReply, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

export function CRMRealtimeProvider({ 
  children, 
  onProspectUpdate, 
  onActivityUpdate,
  onReplyUpdate,
}: CRMRealtimeProviderProps) {
  const [prospectChanges, setProspectChanges] = useState<CRMProspect[]>([]);
  const [activityChanges, setActivityChanges] = useState<CRMActivity[]>([]);
  const [replyChanges, setReplyChanges] = useState<CRMEmailReply[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleProspectChange = useCallback((payload: any) => {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const prospect = payload.new as CRMProspect || payload.old as CRMProspect;
    
    setLastUpdate(new Date());
    
    if (eventType === 'UPDATE' && payload.new?.stage !== payload.old?.stage) {
      toast.info(`${payload.new.full_name} moved to ${payload.new.stage}`, {
        duration: 3000,
      });
    }
    
    if (eventType === 'INSERT') {
      setProspectChanges(prev => [...prev.slice(-9), prospect]);
      toast.success(`New prospect: ${prospect.full_name}`, { duration: 3000 });
    }
    
    onProspectUpdate?.(prospect, eventType);
  }, [onProspectUpdate]);

  const handleActivityChange = useCallback((payload: any) => {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const activity = payload.new as CRMActivity || payload.old as CRMActivity;
    
    setLastUpdate(new Date());
    
    if (eventType === 'UPDATE' && payload.new?.is_done && !payload.old?.is_done) {
      toast.success(`Activity completed: ${payload.new.subject}`, {
        duration: 3000,
      });
    }
    
    if (eventType === 'INSERT') {
      setActivityChanges(prev => [...prev.slice(-9), activity]);
    }
    
    onActivityUpdate?.(activity, eventType);
  }, [onActivityUpdate]);

  const handleReplyChange = useCallback((payload: any) => {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
    const reply = payload.new as CRMEmailReply || payload.old as CRMEmailReply;
    
    setLastUpdate(new Date());
    
    if (eventType === 'INSERT') {
      setReplyChanges(prev => [...prev.slice(-9), reply]);
      const classification = reply.classification;
      const isHot = classification === 'hot_lead';
      toast[isHot ? 'success' : 'info'](
        `${isHot ? '🔥' : '📬'} New reply from ${reply.from_name || reply.from_email}`,
        { duration: 5000 }
      );
    }
    
    onReplyUpdate?.(reply, eventType);
  }, [onReplyUpdate]);

  useEffect(() => {
    const channel = supabase
      .channel('crm-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_prospects',
        },
        handleProspectChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_activities',
        },
        handleActivityChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_email_replies',
        },
        handleReplyChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleProspectChange, handleActivityChange, handleReplyChange]);

  return (
    <CRMRealtimeContext.Provider value={{ prospectChanges, activityChanges, replyChanges, lastUpdate }}>
      {children}
    </CRMRealtimeContext.Provider>
  );
}
