import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ReadReceipt {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  read_at: string;
}

interface DetailedReadReceiptsProps {
  messageId: string;
  conversationId: string;
  isGroup: boolean;
}

export function DetailedReadReceipts({ 
  messageId, 
  conversationId, 
  isGroup 
}: DetailedReadReceiptsProps) {
  const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);

  useEffect(() => {
    loadReceipts();
  }, [messageId]);

  const loadReceipts = async () => {
    if (!isGroup) return;

    // Get all participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    setTotalParticipants(participants?.length || 0);

    // Get read receipts
    const { data: message } = await supabase
      .from('messages')
      .select(`
        id,
        read_receipts:message_read_receipts(
          user_id,
          read_at,
          user:profiles(full_name, avatar_url)
        )
      `)
      .eq('id', messageId)
      .single();

    if (message?.read_receipts) {
      const formattedReceipts = message.read_receipts.map((r: any) => ({
        user_id: r.user_id,
        full_name: r.user.full_name,
        avatar_url: r.user.avatar_url,
        read_at: r.read_at
      }));
      setReceipts(formattedReceipts);
    }
  };

  if (!isGroup || receipts.length === 0) {
    return null;
  }

  const readCount = receipts.length;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <CheckCheck className="h-3.5 w-3.5" />
          <span>Seen by {readCount} of {totalParticipants}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Read by</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {receipts.map((receipt) => (
              <div key={receipt.user_id} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={receipt.avatar_url} />
                  <AvatarFallback>{receipt.full_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{receipt.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(receipt.read_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
