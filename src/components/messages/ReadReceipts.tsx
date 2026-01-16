import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReadReceiptsProps {
  messageId: string;
  senderId: string;
  conversationId: string;
}

export const ReadReceipts = ({ messageId, senderId, conversationId }: ReadReceiptsProps) => {
  const [readBy, setReadBy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReadReceipts();

    const channel = supabase
      .channel(`read-receipts-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts',
          filter: `message_id=eq.${messageId}`,
        },
        () => loadReadReceipts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const loadReadReceipts = async () => {
    try {
      const { data: receipts, error } = await supabase
        .from('message_read_receipts')
        .select('*')
        .eq('message_id', messageId)
        .neq('user_id', senderId);

      if (error) throw error;

      if (receipts && receipts.length > 0) {
        const userIds = receipts.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const enriched = receipts.map(receipt => ({
          ...receipt,
          profile: profiles?.find(p => p.id === receipt.user_id)
        }));

        setReadBy(enriched);
      }
    } catch (_error) {
      console.error('Error loading read receipts:', _error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (readBy.length === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Check className="h-3 w-3" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <CheckCheck className="h-3 w-3 text-primary" />
            {readBy.length > 0 && (
              <div className="flex -space-x-2">
                {readBy.slice(0, 3).map((receipt) => (
                  <Avatar key={receipt.id} className="h-4 w-4 border-2 border-background">
                    <AvatarImage src={receipt.profile?.avatar_url || ''} />
                    <AvatarFallback className="text-[8px]">
                      {receipt.profile?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {readBy.length > 3 && (
                  <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                    <span className="text-[8px]">+{readBy.length - 3}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold text-xs">Read by:</p>
            {readBy.map((receipt) => (
              <div key={receipt.id} className="text-xs">
                {receipt.profile?.full_name} - {formatDistanceToNow(new Date(receipt.read_at), { addSuffix: true })}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
