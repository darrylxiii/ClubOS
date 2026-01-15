import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageAttachment } from './useMessages';

export const useAttachmentUrls = (attachments: MessageAttachment[]) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUrls = async () => {
      if (!attachments || attachments.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const newUrls: Record<string, string> = {};
        
        for (const attachment of attachments) {
          const { data } = await supabase.storage
            .from('message-attachments')
            .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry
          
          if (data?.signedUrl && mounted) {
            newUrls[attachment.id] = data.signedUrl;
          }
        }
        
        if (mounted) {
          setUrls(newUrls);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading attachment URLs:', error);
        if (mounted) setLoading(false);
      }
    };

    loadUrls();

    // Refresh URLs every 45 minutes (before 1 hour expiry)
    const refreshTimer = setInterval(loadUrls, 45 * 60 * 1000);
    
    return () => {
      mounted = false;
      clearInterval(refreshTimer);
    };
  }, [attachments]);

  return { urls, loading };
};
