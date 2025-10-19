import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Check, X, Mail, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface JoinRequest {
  id: string;
  guest_name: string;
  guest_email: string | null;
  requested_at: string;
  request_status: string;
}

interface HostApprovalPanelProps {
  meetingId: string;
  isHost: boolean;
}

export function HostApprovalPanel({ meetingId, isHost }: HostApprovalPanelProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isHost) return;

    loadRequests();

    // Subscribe to new requests
    const channel = supabase
      .channel(`meeting-requests-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_join_requests',
          filter: `meeting_id=eq.${meetingId}`
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [meetingId, isHost]);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from('meeting_join_requests')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('request_status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('[HostApproval] Failed to load requests:', error);
      return;
    }

    setRequests(data || []);

    // Show toast for new requests
    if (data && data.length > 0) {
      const latestRequest = data[data.length - 1];
      const requestTime = new Date(latestRequest.requested_at).getTime();
      const now = Date.now();
      
      // Only show toast if request is less than 5 seconds old
      if (now - requestTime < 5000) {
        toast.info(`${latestRequest.guest_name} wants to join the meeting`, {
          duration: 5000
        });
      }
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      // Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('meeting_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        throw new Error('Failed to fetch request details');
      }

      console.log('[HostApproval] 👤 Approving guest:', request.guest_name, '| Session:', request.session_token);

      // First, mark any existing participant with this session as left
      console.log('[HostApproval] 🔄 Marking old sessions as left...');
      await supabase
        .from('meeting_participants')
        .update({ 
          left_at: new Date().toISOString(),
          status: 'left'
        })
        .eq('meeting_id', request.meeting_id)
        .eq('session_token', request.session_token)
        .is('left_at', null);

      // Create meeting participant entry for the guest
      console.log('[HostApproval] ➕ Creating new participant entry...');
      const { data: newParticipant, error: participantError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: request.meeting_id,
          user_id: null,
          guest_name: request.guest_name,
          guest_email: request.guest_email,
          session_token: request.session_token,
          status: 'accepted',
          joined_at: new Date().toISOString(),
          left_at: null
        })
        .select()
        .single();

      if (participantError) {
        console.error('[HostApproval] ❌ Failed to create participant:', participantError);
        throw participantError;
      }

      console.log('[HostApproval] ✅ Participant created:', newParticipant);

      // Update the request status
      console.log('[HostApproval] 📝 Updating request status...');
      const { error } = await supabase
        .from('meeting_join_requests')
        .update({
          request_status: 'approved',
          responded_at: new Date().toISOString(),
          responded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      console.log('[HostApproval] ✅ Guest approved and added to participants:', request.guest_name);
      console.log('[HostApproval] 🎯 Guest session token:', request.session_token);
      toast.success(`${request.guest_name} has been admitted to the meeting`);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('[HostApproval] ❌ Failed to approve:', error);
      toast.error('Failed to approve guest');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      const { error } = await supabase
        .from('meeting_join_requests')
        .update({
          request_status: 'rejected',
          responded_at: new Date().toISOString(),
          responded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.info('Guest request denied');
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('[HostApproval] Failed to reject:', error);
      toast.error('Failed to reject guest');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  if (!isHost || requests.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-[10000] max-w-sm">
      <Card className="backdrop-blur-2xl bg-black/80 border-white/10 shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-white">Join Requests</h3>
          <Badge variant="secondary" className="ml-auto">
            {requests.length}
          </Badge>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-2">
            {requests.map((request) => (
              <Card
                key={request.id}
                className={cn(
                  "p-4 space-y-3 backdrop-blur-xl bg-white/5 border-white/10",
                  processingIds.has(request.id) && "opacity-50"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-white">{request.guest_name}</p>
                      {request.guest_email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{request.guest_email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(request.requested_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={processingIds.has(request.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Admit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                    disabled={processingIds.has(request.id)}
                    className="flex-1 hover:bg-red-500/10 hover:text-red-500"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Deny
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
