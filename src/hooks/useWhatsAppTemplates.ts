import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: string;
  text?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
}

export interface WhatsAppTemplate {
  id: string;
  template_name: string | null;
  template_category: string | null;
  language_code: string | null;
  components: WhatsAppTemplateComponent[] | Record<string, unknown> | unknown;
  approval_status: string | null;
  is_active: boolean | null;
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
