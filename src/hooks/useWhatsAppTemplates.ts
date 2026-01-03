import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

export interface WhatsAppTemplate {
  id: string;
  template_name: string;
  template_category: string;
  language_code: string;
  components: any;
  approval_status: string;
  is_active: boolean;
}

export function useWhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncTemplates = async () => {
    try {
      setSyncing(true);
      const { error } = await supabase.functions.invoke('sync-whatsapp-templates');
      if (error) throw error;
      
      notify.success('Templates synced from Meta');
      await fetchTemplates();
    } catch (error) {
      notify.error('Failed to sync templates');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  return { templates, loading, syncing, syncTemplates, refetch: fetchTemplates };
}
